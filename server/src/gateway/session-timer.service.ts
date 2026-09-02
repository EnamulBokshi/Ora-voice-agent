import { Injectable, Logger } from '@nestjs/common';

/** Default session duration in seconds (5 minutes). Can be overridden per-merchant. */
export const DEFAULT_SESSION_DURATION_SECONDS = 300;

/** Seconds before hard max-duration expiry at which a pre-expiry warning event is emitted. */
export const SESSION_WARNING_LEAD_SECONDS = 60;

/**
 * Seconds of user silence before an idle warning is emitted.
 * After this, the user has IDLE_TERMINATE_SECONDS to respond before the session auto-closes.
 */
export const IDLE_WARNING_SECONDS = 15;

/**
 * Seconds after the idle warning before the session is auto-terminated.
 * Total idle before termination = IDLE_WARNING_SECONDS + IDLE_TERMINATE_SECONDS = 35s.
 */
export const IDLE_TERMINATE_SECONDS = 20;

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
   * Self-scheduling one-shot timer. When it fires it reads lastActivityAt to decide
   * whether to emit a warning or reschedule for the remaining idle time.
   * Never restarted per audio-chunk — only rescheduled (at most once per 15s window).
   */
  idleCheckTimer: NodeJS.Timeout | null;
  /** Fires IDLE_TERMINATE_SECONDS after the idle warning, if no activity in between. */
  idleTerminationTimer: NodeJS.Timeout | null;
  /**
   * Stored reference to the idle-check scheduling closure.
   * Allows markActivity() to reschedule after the user responds to a warning.
   */
  scheduleIdleCheck: (delayMs: number) => void;
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
   *    - onIdleWarning  → fires after IDLE_WARNING_SECONDS (15s) of silence
   *    - onIdleExpiry   → fires IDLE_TERMINATE_SECONDS (20s) after the warning if still silent
   *
   * Call markActivity(socketId) when the USER speaks or sends a message.
   * Call markAgentTurnComplete(socketId) when the AGENT finishes speaking.
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
      this.timers.delete(socketId);
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

          // Schedule termination after 20 more seconds of silence
          e.idleTerminationTimer = setTimeout(() => {
            const t = this.timers.get(socketId);
            // Only terminate if still in 'warned' phase (no markActivity reset it)
            if (!t || t.idlePhase !== 'warned') return;

            t.idlePhase = 'terminated';
            this.logger.log(
              `[SessionTimer] Idle termination — session: ${sessionId}, no response after ${IDLE_TERMINATE_SECONDS}s`,
            );
            this.timers.delete(socketId);
            try { onIdleExpiry(); } catch (err: any) {
              this.logger.warn(`[SessionTimer] onIdleExpiry error: ${err?.message}`);
            }
          }, idleTerminateMs);

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
      idleCheckTimer: null,
      idleTerminationTimer: null,
      scheduleIdleCheck,
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

      // Reschedule the idle check (user is active again)
      entry.scheduleIdleCheck(IDLE_WARNING_SECONDS * 1000);

      this.logger.log(
        `[SessionTimer] User activity after warning — session: ${entry.sessionId}, idle watch reset to 15s`,
      );
    }
  }

  /**
   * Called when the AGENT finishes speaking its turn (e.g. answering a question or greeting).
   *
   * Updates lastActivityAt ONLY if we are in 'watching' mode so the 15s idle countdown
   * starts AFTER ORA finishes talking.
   *
   * CRITICAL: If the agent just spoke the idle warning (phase === 'warned'), this is a NO-OP.
   * It must NEVER cancel the warning or reset the termination timer!
   */
  markAgentTurnComplete(socketId: string): void {
    const entry = this.timers.get(socketId);
    if (!entry || entry.idlePhase !== 'watching') return;

    entry.lastActivityAt = new Date();
  }

  /**
   * Clears ALL timers (max duration + idle) for a socket.
   * Safe to call even if no timer exists. Always call on disconnect or explicit stop.
   */
  clearTimer(socketId: string): void {
    const entry = this.timers.get(socketId);
    if (!entry) return;

    if (entry.maxWarningTimer) clearTimeout(entry.maxWarningTimer);
    clearTimeout(entry.maxExpiryTimer);
    if (entry.idleCheckTimer) clearTimeout(entry.idleCheckTimer);
    if (entry.idleTerminationTimer) clearTimeout(entry.idleTerminationTimer);

    // Mark as terminated so any in-flight timer callbacks are no-ops
    entry.idlePhase = 'terminated';

    this.timers.delete(socketId);

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
