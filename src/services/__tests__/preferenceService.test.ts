import { preferenceService } from '@/src/services/preferenceService';
import { Climber } from '@/src/types/climber';

const makeClimber = (id: string): Climber => ({ id, name: `Climber ${id}` } as Climber);

beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('preferenceService — in-memory state', () => {
  beforeEach(() => {
    preferenceService.reset();
  });

  describe('accept with dating intent', () => {
    it('marks climber as accepted', async () => {
      await preferenceService.accept(makeClimber('c1'), null, 'user1', 'dating');
      expect(preferenceService.isAccepted('c1')).toBe(true);
    });
    it('adds to dating set', async () => {
      await preferenceService.accept(makeClimber('c1'), null, 'user1', 'dating');
      expect(preferenceService.isAcceptedForDating('c1')).toBe(true);
    });
    it('does not add to partner set', async () => {
      await preferenceService.accept(makeClimber('c1'), null, 'user1', 'dating');
      expect(preferenceService.isAcceptedForPartner('c1')).toBe(false);
    });
    it('records a preference entry with correct intent', async () => {
      await preferenceService.accept(makeClimber('c1'), null, 'user1', 'dating');
      const prefs = preferenceService.getPreferences();
      expect(prefs).toHaveLength(1);
      expect(prefs[0].climberId).toBe('c1');
      expect(prefs[0].action).toBe('accept');
      expect(prefs[0].intent).toBe('dating');
    });
  });

  describe('accept with partner intent', () => {
    it('adds to partner set', async () => {
      await preferenceService.accept(makeClimber('c2'), null, 'user1', 'partner');
      expect(preferenceService.isAcceptedForPartner('c2')).toBe(true);
    });
    it('does not add to dating set', async () => {
      await preferenceService.accept(makeClimber('c2'), null, 'user1', 'partner');
      expect(preferenceService.isAcceptedForDating('c2')).toBe(false);
    });
    it('switching from dating to partner clears dating set', async () => {
      const c = makeClimber('c3');
      await preferenceService.accept(c, null, 'user1', 'dating');
      await preferenceService.accept(c, null, 'user1', 'partner');
      expect(preferenceService.isAcceptedForDating('c3')).toBe(false);
      expect(preferenceService.isAcceptedForPartner('c3')).toBe(true);
    });
    it('switching from partner to dating clears partner set', async () => {
      const c = makeClimber('c4');
      await preferenceService.accept(c, null, 'user1', 'partner');
      await preferenceService.accept(c, null, 'user1', 'dating');
      expect(preferenceService.isAcceptedForPartner('c4')).toBe(false);
      expect(preferenceService.isAcceptedForDating('c4')).toBe(true);
    });
  });

  describe('reject', () => {
    it('marks climber as rejected', () => {
      preferenceService.reject(makeClimber('c5'));
      expect(preferenceService.isRejected('c5')).toBe(true);
    });
    it('isSeen returns true after reject', () => {
      preferenceService.reject(makeClimber('c5'));
      expect(preferenceService.isSeen('c5')).toBe(true);
    });
    it('reject removes from accepted set', async () => {
      const c = makeClimber('c5');
      await preferenceService.accept(c, null, 'user1', 'dating');
      preferenceService.reject(c);
      expect(preferenceService.isAccepted('c5')).toBe(false);
      expect(preferenceService.isRejected('c5')).toBe(true);
    });
  });

  describe('accept undoes a rejection', () => {
    it('removes from rejected set after accept', async () => {
      const c = makeClimber('c6');
      preferenceService.reject(c);
      await preferenceService.accept(c, null, 'user1', 'dating');
      expect(preferenceService.isRejected('c6')).toBe(false);
      expect(preferenceService.isAccepted('c6')).toBe(true);
    });
  });

  describe('isSeen', () => {
    it('returns false for unknown climber', () => {
      expect(preferenceService.isSeen('unknown')).toBe(false);
    });
    it('returns true for accepted climber', async () => {
      await preferenceService.accept(makeClimber('c7'), null, 'user1', 'dating');
      expect(preferenceService.isSeen('c7')).toBe(true);
    });
    it('returns true for rejected climber', () => {
      preferenceService.reject(makeClimber('c7'));
      expect(preferenceService.isSeen('c7')).toBe(true);
    });
  });

  describe('reset', () => {
    it('clears accepted, rejected, and preferences', async () => {
      await preferenceService.accept(makeClimber('c8'), null, 'user1', 'dating');
      preferenceService.reject(makeClimber('c9'));
      preferenceService.reset();
      expect(preferenceService.isAccepted('c8')).toBe(false);
      expect(preferenceService.isRejected('c9')).toBe(false);
      expect(preferenceService.getPreferences()).toHaveLength(0);
    });
    it('clears both intent-specific sets', async () => {
      await preferenceService.accept(makeClimber('c10'), null, 'user1', 'dating');
      await preferenceService.accept(makeClimber('c11'), null, 'user1', 'partner');
      preferenceService.reset();
      expect(preferenceService.isAcceptedForDating('c10')).toBe(false);
      expect(preferenceService.isAcceptedForPartner('c11')).toBe(false);
    });
  });

  describe('accept without userId does nothing', () => {
    it('returns without modifying state when userId is missing', async () => {
      await preferenceService.accept(makeClimber('c12'), null, undefined, 'dating');
      expect(preferenceService.isAccepted('c12')).toBe(false);
    });
  });
});
