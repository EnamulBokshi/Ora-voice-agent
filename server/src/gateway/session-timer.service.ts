import { Injectable, Logger } from '@nestjs/common';

/** Default session duration in seconds (5 minutes). Can be overridden per-merchant. */
export const DEFAULT_SESSION_DURATION_SECONDS = 300;

/** Seconds before hard max-duration expiry at which a pre-expiry warning event is emitted. */
export const SESSION_WARNING_LEAD_SECONDS = 60;

/**
 * Seconds of user silence before an idle warning is emitted.
 * After this, the user has IDLE_TERMINATE_SECONDS to respond before the session auto-closes.
 *
 * Kept generous on purpose: a shopper reading a product page mid-conversation is not idle,
 * and a single ORA answer can itself run 15s+. Silence is only meaningful over a longer window.
 *
 * Raised from 30s: silence is only ever *inferred* here, from recognised speech
 * (transcripts and barge-ins). Raw mic audio deliberately does not count, so every gap
 * in recognition reads as silence even when the customer is talking. A window shorter
 * than a shopper's natural pause to look at a product turns that inference into a
 * wrong answer.
 */
export const IDLE_WARNING_SECONDS = 90;

/**
 * Seconds after the idle warning before the session is auto-terminated.
 * Total idle before termination = IDLE_WARNING_SECONDS + IDLE_TERMINATE_SECONDS = 125s,
 * which is aligned with the widget's own CLIENT_STANDBY_MS (120s) so the client suspends
 * to standby rather than the server closing the socket out from under it.
 *
 * The window is measured from when the customer has actually *heard* the warning —
 * see the re-arm in markAgentTurnComplete().
 */
export const IDLE_TERMINATE_SECONDS = 35;

/**
 * Upper bound on how long the agent-speaking flag may suppress idle detection.
 * A real ORA turn is a few seconds; anything past this means the turnComplete signal
 * was lost, so idle detection resumes rather than being disabled for the session.
 */
export const AGENT_SPEAKING_MAX_MS = 120_000;

/** Idle phase state machine values. */
type IdlePhase = 'watching' | 'warned' | 'terminated';

interface SessionTimerEntry {
  sessionId: string;
  businessId: string;
  startedAt: Date;
  maxDurationSeconds: number;

  // --- Max duration timers (hard session ceiling) ---
  maxWarningTimer: NodeJS.Timeout | null;  // fires at T-60s of max duration
  maxExpiryTimer: NodeJS.Timeout;          // fires at T-0s of max duration

  // --- Idle inactivity timers ---
  /** Updated on every user activity event (O(1) timestamp write — no timer restart). */
  lastActivityAt: Date;
  /** Current phase of idle detection. */
  idlePhase: IdlePhase;
  /**
   * True while the AGENT is mid-turn (audio is streaming out to the client).
   * Set on the first audio chunk of a turn, cleared on turn completion.
   *
   * While set, the 'watching' idle check reschedules instead of warning — the user cannot
   * be considered silent while ORA is still talking over them, and on the widget the mic
   * uplink is gated shut during agent speech so no user signal can arrive anyway.
   *
   * Deliberately NOT consulted by the termination timer: once we are in the 'warned' phase,
   * ORA speaking the warning itself must never postpone termination.
   */
  isAgentSpeaking: boolean;
  /**
   * When the current agent turn started streaming. Used only as a staleness guard:
   * if Gemini never sends turnComplete, the flag must not disable idle detection forever.
   */
  agentSpeakingSince: Date | null;
  /**
   * Self-scheduling one-shot timer. When it fires it reads lastActivityAt to decide
   * whether to emit a warning or reschedule for the remaining idle time.
   * Never restarted per audio-chunk — only rescheduled (at most once per 15s window).
   */
  idleCheckTimer: NodeJS.Timeout | null;
  /** Fires IDLE_TERMINATE_SECONDS after the idle warning, if no activity in between. */
  idleTerminationTimer: NodeJS.Timeout | null;
  /**
   * True once the termination window has been restarted from the end of the warning's
   * own playback. One restart only: ORA must not be able to postpone termination
   * repeatedly by continuing to talk.
   */
  terminationRearmed: boolean;
  /**
   * Stored reference to the idle-check scheduling closure.
   * Allows markActivity() to reschedule after the user responds to a warning.
   */
  scheduleIdleCheck: (delayMs: number) => void;
  /** Stored so the termination deadline can be re-armed from outside startTimer(). */
  onIdleExpiry: () => void;
}

@Injectable()
export class SessionTimerService {
  private readonly logger = new Logger(SessionTimerService.name);
  private readonly timers = new Map<string, SessionTimerEntry>();

  /**
   * Starts all timers for a session.
   *
   * TWO independent timer tracks:
   *
   * 1. MAX DURATION (hard ceiling):
   *    - onMaxWarning  → fires at (maxDurationSeconds - 60s)
   *    - onMaxExpiry   → fires at maxDurationSeconds
   *
   * 2. IDLE INACTIVITY (user silence detection):
   *    - onIdleWarning  → fires after IDLE_WARNING_SECONDS (30s) of silence
   *    - onIdleExpiry   → fires IDLE_TERMINATE_SECONDS (20s) after the warning if still silent
   *
   * Call markActivity(socketId) when the USER speaks or sends a message.
   * Call markAgentSpeaking(socketId) when the AGENT starts streaming audio.
   * Call markAgentTurnComplete(socketId) when the AGENT finishes speaking or is barged in on.
   */
  startTimer(
    socketId: string,
    sessionId: string,
    businessId: string,
    maxDurationSeconds: number,
    onMaxWarning: (remainingSeconds: number) => void,
    onMaxExpiry: () => void,
    onIdleWarning: () => void,
    onIdleExpiry: () => void,
  ): void {
    // Defensive: clear any stale timer for this socket first
    this.clearTimer(socketId);

    const now = new Date();

    // ─── 1. MAX DURATION TIMERS ──────────────────────────────────────────────

    const maxExpiryMs = maxDurationSeconds * 1000;
    const maxWarningMs = maxExpiryMs - SESSION_WARNING_LEAD_SECONDS * 1000;

    let maxWarningTimer: NodeJS.Timeout | null = null;
    if (maxWarningMs > 0) {
      maxWarningTimer = setTimeout(() => {
        this.logger.debug(
          `[SessionTimer] Max-duration warning — session: ${sessionId}, remaining: ${SESSION_WARNING_LEAD_SECONDS}s`,
        );
        try { onMaxWarning(SESSION_WARNING_LEAD_SECONDS); } catch (err: any) {
          this.logger.warn(`[SessionTimer] onMaxWarning error: ${err?.message}`);
        }
      }, maxWarningMs);
    }

    const maxExpiryTimer = setTimeout(() => {
      this.logger.log(
        `[SessionTimer] Max-duration reached — session: ${sessionId}, socketId: ${socketId}`,
      );
      this.disposeEntry(socketId);
      try { onMaxExpiry(); } catch (err: any) {
        this.logger.warn(`[SessionTimer] onMaxExpiry error: ${err?.message}`);
      }
    }, maxExpiryMs);

    // ─── 2. IDLE INACTIVITY TIMERS ────────────────────────────────────────────

    const idleWarningMs = IDLE_WARNING_SECONDS * 1000;
    const idleTerminateMs = IDLE_TERMINATE_SECONDS * 1000;

    let scheduleIdleCheck: (delayMs: number) => void;

    scheduleIdleCheck = (delayMs: number) => {
      const entry = this.timers.get(socketId);
      if (!entry || entry.idlePhase === 'terminated') return;

      entry.idleCheckTimer = setTimeout(() => {
        const e = this.timers.get(socketId);
        if (!e || e.idlePhase !== 'watching') return;

        // ORA is still speaking — the user is not idle, they are listening.
        // Reschedule a full window rather than warning mid-answer (which made ORA
        // interrupt its own reply to ask "are you still there?").
        if (e.isAgentSpeaking) {
          const speakingFor = e.agentSpeakingSince
            ? Date.now() - e.agentSpeakingSince.getTime()
            : 0;

          if (speakingFor < AGENT_SPEAKING_MAX_MS) {
            this.logger.debug(
              `[SessionTimer] Idle check deferred (agent speaking ${Math.round(speakingFor / 1000)}s) — session: ${sessionId}`,
            );
            scheduleIdleCheck(idleWarningMs);
            return;
          }

          // Staleness guard: no turnComplete arrived within AGENT_SPEAKING_MAX_MS.
          // Assume the turn ended and fall through to normal idle evaluation, otherwise
          // a dropped turnComplete would disable idle detection for the whole session.
          this.logger.warn(
            `[SessionTimer] Agent-speaking flag stale after ${Math.round(speakingFor / 1000)}s ` +
            `(no turnComplete) — session: ${sessionId}. Resuming idle detection.`,
          );
          e.isAgentSpeaking = false;
          e.agentSpeakingSince = null;
        }

        const elapsed = Date.now() - e.lastActivityAt.getTime();

        if (elapsed >= idleWarningMs) {
          // User has been truly idle for >= 15s — emit warning
          e.idlePhase = 'warned';
          this.logger.log(
            `[SessionTimer] Idle warning — session: ${sessionId}, idle: ${Math.round(elapsed / 1000)}s`,
          );
          try { onIdleWarning(); } catch (err: any) {
            this.logger.warn(`[SessionTimer] onIdleWarning error: ${err?.message}`);
          }

          // Schedule termination after IDLE_TERMINATE_SECONDS more of silence.
          // markAgentTurnComplete() restarts this once, so the window is measured from
          // the moment the customer finished hearing the warning.
          e.idleTerminationTimer = setTimeout(
            () => this.terminateIfStillWarned(socketId),
            idleTerminateMs,
          );

        } else {
          // User was active recently — reschedule check for the remaining idle time
          const remaining = idleWarningMs - elapsed;
          scheduleIdleCheck(remaining);
        }
      }, delayMs);
    };

    // ─── 3. BUILD ENTRY & SCHEDULE ───────────────────────────────────────────

    const entry: SessionTimerEntry = {
      sessionId,
      businessId,
      startedAt: now,
      maxDurationSeconds,
      maxWarningTimer,
      maxExpiryTimer,
      lastActivityAt: now,  // session start counts as activity
      idlePhase: 'watching',
      isAgentSpeaking: false,
      agentSpeakingSince: null,
      idleCheckTimer: null,
      idleTerminationTimer: null,
      terminationRearmed: false,
      scheduleIdleCheck,
      onIdleExpiry,
    };

    this.timers.set(socketId, entry);

    // Kick off the initial idle check (fires after 15s if user is silent)
    scheduleIdleCheck(idleWarningMs);

    this.logger.log(
      `[SessionTimer] Started — session: ${sessionId}, maxDuration: ${maxDurationSeconds}s, ` +
      `idle warning: ${IDLE_WARNING_SECONDS}s, idle terminate: ${IDLE_TERMINATE_SECONDS}s after warning`,
    );
  }

  /**
   * Fires the idle expiry for a socket, but only if it is still in the 'warned' phase —
   * markActivity() moves it back to 'watching', which must cancel the termination.
   */
  private terminateIfStillWarned(socketId: string): void {
    const entry = this.timers.get(socketId);
    if (!entry || entry.idlePhase !== 'warned') return;

    entry.idlePhase = 'terminated';
    this.logger.log(
      `[SessionTimer] Idle termination — session: ${entry.sessionId}, no response after ${IDLE_TERMINATE_SECONDS}s`,
    );
    const onIdleExpiry = entry.onIdleExpiry;
    this.disposeEntry(socketId);
    try { onIdleExpiry(); } catch (err: any) {
      this.logger.warn(`[SessionTimer] onIdleExpiry error: ${err?.message}`);
    }
  }

  /**
   * Marks USER activity for a socket (called when the user speaks or sends a text message).
   *
   * If the user responds after a warning (phase = 'warned'), this cancels the
   * pending termination timer and restarts the idle watch cycle.
   */
  markActivity(socketId: string): void {
    const entry = this.timers.get(socketId);
    if (!entry || entry.idlePhase === 'terminated') return;

    entry.lastActivityAt = new Date();

    if (entry.idlePhase === 'warned') {
      // User responded to the warning — cancel termination and go back to watching
      if (entry.idleTerminationTimer) {
        clearTimeout(entry.idleTerminationTimer);
        entry.idleTerminationTimer = null;
      }
      entry.idlePhase = 'watching';
      entry.terminationRearmed = false;

      // Reschedule the idle check (user is active again)
      entry.scheduleIdleCheck(IDLE_WARNING_SECONDS * 1000);

      this.logger.log(
        `[SessionTimer] User activity after warning — session: ${entry.sessionId}, idle watch reset to ${IDLE_WARNING_SECONDS}s`,
      );
    }
  }

  /**
   * Called when the AGENT starts streaming audio for a turn (first audio chunk).
   *
   * Suppresses the idle warning for as long as ORA is talking. Safe to call on every
   * audio chunk — it is an idempotent flag write.
   *
   * NOTE: this does NOT touch lastActivityAt and does NOT affect the termination timer,
   * so it cannot rescue a session that is already in the 'warned' phase.
   */
  markAgentSpeaking(socketId: string): void {
    const entry = this.timers.get(socketId);
    if (!entry || entry.idlePhase === 'terminated') return;

    if (!entry.isAgentSpeaking) {
      entry.isAgentSpeaking = true;
      entry.agentSpeakingSince = new Date();
    }
  }

  /**
   * Called when the AGENT finishes speaking its turn (e.g. answering a question or greeting),
   * or when its turn is cut short by a barge-in.
   *
   * Always clears the agent-speaking flag, then updates lastActivityAt ONLY if we are in
   * 'watching' mode so the idle countdown starts AFTER ORA finishes talking.
   *
   * CRITICAL: If the agent just spoke the idle warning (phase === 'warned'), the
   * lastActivityAt refresh is a NO-OP. It must NEVER cancel the warning or reset the
   * termination timer — only real user activity may do that.
   */
  markAgentTurnComplete(socketId: string): void {
    const entry = this.timers.get(socketId);
    if (!entry) return;

    entry.isAgentSpeaking = false;
    entry.agentSpeakingSince = null;

    if (entry.idlePhase === 'warned') {
      // The turn that just ended is ORA speaking "are you still there?". The customer
      // could not answer while it played — the widget gates the mic uplink shut for the
      // whole of an agent turn — so the window they are being judged on has to start
      // here, not at the moment the warning was decided on.
      //
      // This does NOT cancel the warning or clear the phase: only real user activity
      // does that. It only moves the deadline, and only once per warning, so ORA
      // talking on cannot defer termination indefinitely.
      if (!entry.terminationRearmed && entry.idleTerminationTimer) {
        entry.terminationRearmed = true;
        clearTimeout(entry.idleTerminationTimer);
        entry.idleTerminationTimer = setTimeout(
          () => this.terminateIfStillWarned(socketId),
          IDLE_TERMINATE_SECONDS * 1000,
        );
        this.logger.debug(
          `[SessionTimer] Termination window restarted from end of warning playback — session: ${entry.sessionId}`,
        );
      }
      return;
    }

    if (entry.idlePhase !== 'watching') return;

    entry.lastActivityAt = new Date();
  }

  /**
   * Clears every timer handle on an entry, marks it terminated so any in-flight timer
   * callback becomes a no-op, and removes it from the map.
   *
   * Both expiry paths must go through this. Previously they called timers.delete() directly
   * and left the OTHER track's timers armed — and because clearTimer() early-returns on a
   * missing entry, the gateway's cleanup() could never clear them afterwards. An idle close
   * therefore left the max-duration timers running, firing onMaxExpiry on a dead session.
   */
  private disposeEntry(socketId: string): void {
    const entry = this.timers.get(socketId);
    if (!entry) return;

    if (entry.maxWarningTimer) clearTimeout(entry.maxWarningTimer);
    clearTimeout(entry.maxExpiryTimer);
    if (entry.idleCheckTimer) clearTimeout(entry.idleCheckTimer);
    if (entry.idleTerminationTimer) clearTimeout(entry.idleTerminationTimer);

    entry.idlePhase = 'terminated';
    entry.isAgentSpeaking = false;
    entry.agentSpeakingSince = null;

    this.timers.delete(socketId);
  }

  /**
   * Clears ALL timers (max duration + idle) for a socket.
   * Safe to call even if no timer exists. Always call on disconnect or explicit stop.
   */
  clearTimer(socketId: string): void {
    const entry = this.timers.get(socketId);
    if (!entry) return;

    this.disposeEntry(socketId);

    this.logger.debug(
      `[SessionTimer] Cleared — session: ${entry.sessionId}, socketId: ${socketId}`,
    );
  }

  /** Returns the remaining seconds for the max-duration timer, or null if no timer exists. */
  getRemainingSeconds(socketId: string): number | null {
    const entry = this.timers.get(socketId);
    if (!entry) return null;
    const elapsedMs = Date.now() - entry.startedAt.getTime();
    const remainingMs = entry.maxDurationSeconds * 1000 - elapsedMs;
    return Math.max(0, Math.round(remainingMs / 1000));
  }

  /** Returns the number of currently active session timers (for health monitoring). */
  getActiveTimerCount(): number {
    return this.timers.size;
  }
}
