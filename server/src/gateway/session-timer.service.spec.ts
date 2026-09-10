import { Test, TestingModule } from '@nestjs/testing';
import {
  SessionTimerService,
  IDLE_WARNING_SECONDS,
  IDLE_TERMINATE_SECONDS,
  SESSION_WARNING_LEAD_SECONDS,
  AGENT_SPEAKING_MAX_MS,
} from './session-timer.service';

const SOCKET = 'socket-1';
const SESSION = 'sess-1';
const BUSINESS = 'biz-1';
const MAX_DURATION = 300;

describe('SessionTimerService', () => {
  let service: SessionTimerService;
  let onMaxWarning: jest.Mock;
  let onMaxExpiry: jest.Mock;
  let onIdleWarning: jest.Mock;
  let onIdleExpiry: jest.Mock;

  /** Starts a timer with the standard fixture callbacks. */
  const start = (maxDurationSeconds = MAX_DURATION) =>
    service.startTimer(
      SOCKET,
      SESSION,
      BUSINESS,
      maxDurationSeconds,
      onMaxWarning,
      onMaxExpiry,
      onIdleWarning,
      onIdleExpiry,
    );

  const advanceSeconds = (seconds: number) =>
    jest.advanceTimersByTime(seconds * 1000);

  beforeEach(async () => {
    jest.useFakeTimers();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionTimerService],
    }).compile();

    service = module.get<SessionTimerService>(SessionTimerService);

    onMaxWarning = jest.fn();
    onMaxExpiry = jest.fn();
    onIdleWarning = jest.fn();
    onIdleExpiry = jest.fn();
  });

  afterEach(() => {
    service.clearTimer(SOCKET);
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('idle detection', () => {
    it('warns after IDLE_WARNING_SECONDS of silence', () => {
      start();

      advanceSeconds(IDLE_WARNING_SECONDS - 1);
      expect(onIdleWarning).not.toHaveBeenCalled();

      advanceSeconds(2);
      expect(onIdleWarning).toHaveBeenCalledTimes(1);
      expect(onIdleExpiry).not.toHaveBeenCalled();
    });

    it('terminates IDLE_TERMINATE_SECONDS after the warning when still silent', () => {
      start();

      advanceSeconds(IDLE_WARNING_SECONDS + 1);
      expect(onIdleWarning).toHaveBeenCalledTimes(1);

      advanceSeconds(IDLE_TERMINATE_SECONDS - 2);
      expect(onIdleExpiry).not.toHaveBeenCalled();

      advanceSeconds(3);
      expect(onIdleExpiry).toHaveBeenCalledTimes(1);
    });

    it('does not warn while the user keeps speaking', () => {
      start();

      // Recognised speech every 10s across three idle windows.
      for (let i = 0; i < 9; i++) {
        advanceSeconds(10);
        service.markActivity(SOCKET);
      }

      expect(onIdleWarning).not.toHaveBeenCalled();
      expect(onIdleExpiry).not.toHaveBeenCalled();
    });

    it('lets user activity after a warning rescue the session', () => {
      start();

      advanceSeconds(IDLE_WARNING_SECONDS + 1);
      expect(onIdleWarning).toHaveBeenCalledTimes(1);

      // The user answers "yes I'm here" — this must cancel the pending termination.
      service.markActivity(SOCKET);
      advanceSeconds(IDLE_TERMINATE_SECONDS + 5);

      expect(onIdleExpiry).not.toHaveBeenCalled();
    });
  });

  describe('agent speech suppression', () => {
    it('never warns while ORA is mid-turn, however long the answer runs', () => {
      start();
      service.markAgentSpeaking(SOCKET);

      // A 90-second answer — three times the old 15s warning window.
      advanceSeconds(90);

      expect(onIdleWarning).not.toHaveBeenCalled();
      expect(onIdleExpiry).not.toHaveBeenCalled();
    });

    it('resumes idle detection once the agent turn completes', () => {
      start();
      service.markAgentSpeaking(SOCKET);
      advanceSeconds(40);
      expect(onIdleWarning).not.toHaveBeenCalled();

      service.markAgentTurnComplete(SOCKET);
      advanceSeconds(IDLE_WARNING_SECONDS + 40);

      expect(onIdleWarning).toHaveBeenCalledTimes(1);
    });

    it('resumes idle detection if turnComplete is never delivered (staleness guard)', () => {
      start();
      service.markAgentSpeaking(SOCKET);

      // Gemini drops turnComplete. The flag must not disable idle detection forever.
      advanceSeconds(AGENT_SPEAKING_MAX_MS / 1000 + IDLE_WARNING_SECONDS + 1);

      expect(onIdleWarning).toHaveBeenCalledTimes(1);
    });

    it('does not let ORA speaking the warning itself cancel termination', () => {
      start();

      advanceSeconds(IDLE_WARNING_SECONDS + 1);
      expect(onIdleWarning).toHaveBeenCalledTimes(1);

      // ORA speaks "are you still there?" — agent audio must NOT rescue the session,
      // only a real user response may.
      service.markAgentSpeaking(SOCKET);
      service.markAgentTurnComplete(SOCKET);

      advanceSeconds(IDLE_TERMINATE_SECONDS + 1);
      expect(onIdleExpiry).toHaveBeenCalledTimes(1);
    });
  });

  describe('max duration', () => {
    it('warns at T-SESSION_WARNING_LEAD_SECONDS and expires at the ceiling', () => {
      start();

      // Keep the user active so idle detection never fires.
      const activityInterval = 10;
      for (let t = 0; t < MAX_DURATION; t += activityInterval) {
        advanceSeconds(activityInterval);
        service.markActivity(SOCKET);
      }

      expect(onMaxWarning).toHaveBeenCalledWith(SESSION_WARNING_LEAD_SECONDS);
      expect(onMaxExpiry).toHaveBeenCalledTimes(1);
      expect(onIdleExpiry).not.toHaveBeenCalled();
    });

    it('does not fire onMaxExpiry after the session already closed on idle', () => {
      start();

      advanceSeconds(IDLE_WARNING_SECONDS + IDLE_TERMINATE_SECONDS + 2);
      expect(onIdleExpiry).toHaveBeenCalledTimes(1);

      // Run well past the hard ceiling — the max timers must have been disposed.
      advanceSeconds(MAX_DURATION + 60);

      expect(onMaxExpiry).not.toHaveBeenCalled();
      expect(onMaxWarning).not.toHaveBeenCalled();
      expect(service.getActiveTimerCount()).toBe(0);
    });
  });

  describe('lifecycle', () => {
    it('clearTimer stops every callback', () => {
      start();
      service.clearTimer(SOCKET);

      advanceSeconds(MAX_DURATION + 60);

      expect(onIdleWarning).not.toHaveBeenCalled();
      expect(onIdleExpiry).not.toHaveBeenCalled();
      expect(onMaxWarning).not.toHaveBeenCalled();
      expect(onMaxExpiry).not.toHaveBeenCalled();
      expect(service.getActiveTimerCount()).toBe(0);
    });

    it('starting twice on one socket leaves a single active timer', () => {
      start();
      start();

      expect(service.getActiveTimerCount()).toBe(1);

      advanceSeconds(IDLE_WARNING_SECONDS + 1);
      expect(onIdleWarning).toHaveBeenCalledTimes(1);
    });

    it('marking activity on an unknown socket is a no-op', () => {
      expect(() => service.markActivity('nope')).not.toThrow();
      expect(() => service.markAgentSpeaking('nope')).not.toThrow();
      expect(() => service.markAgentTurnComplete('nope')).not.toThrow();
      expect(() => service.clearTimer('nope')).not.toThrow();
    });
  });
});
