import { describe, expect, it } from 'vitest';
import { initialTutorialStep, nextTutorialStep, type TutorialStep } from './firstRunTutorial';
import { GameSession, type GameSnapshot } from '../modules/economy/session';

const makeSnapshot = (rooms: Array<{ type: 'waterTreatment' | 'habitat'; level: number }>) => ({
  base: { rooms }
}) as unknown as Pick<GameSnapshot, 'base'>;

describe('first-run tutorial', () => {
  it('starts only for new players, and resumes an interrupted step', () => {
    expect(initialTutorialStep(null, false)).toBe('story');
    expect(initialTutorialStep(null, true)).toBe('done');
    expect(initialTutorialStep('water', true)).toBe('water');
    expect(initialTutorialStep('upgrade', true)).toBe('upgrade');
    expect(initialTutorialStep('done', false)).toBe('done');
    expect(initialTutorialStep('corrupted', true)).toBe('done');
  });

  it('recognizes a real paid build and upgrade via the GameSession economy', () => {
    const session = GameSession.create();
    expect(nextTutorialStep('water', session.snapshot())).toBe('water');
    expect(session.canBuild('waterTreatment', 8, -1).ok).toBe(true);
    expect(session.build('waterTreatment', 8, -1).ok).toBe(true);
    expect(nextTutorialStep('water', session.snapshot())).toBe('upgrade');
    expect(nextTutorialStep('upgrade', session.snapshot())).toBe('upgrade');
    expect(session.upgradeRoom('initial-habitat').ok).toBe(true);
    expect(nextTutorialStep('upgrade', session.snapshot())).toBe('done');
    expect(session.wallet.balance).toBeLessThan(1500);
  });

  it('requires construction of a real water-treatment room', () => {
    const rooms = makeSnapshot([{ type: 'habitat', level: 1 }]);
    expect(nextTutorialStep('water', rooms)).toBe('water');
    const built = makeSnapshot([{ type: 'waterTreatment', level: 1 }, { type: 'habitat', level: 1 }]);
    expect(nextTutorialStep('water', built)).toBe('upgrade');
  });

  it('requires a room to reach level two, and never repeats completed steps', () => {
    const built = makeSnapshot([{ type: 'waterTreatment', level: 1 }, { type: 'habitat', level: 1 }]);
    expect(nextTutorialStep('upgrade', built)).toBe('upgrade');
    const upgraded = makeSnapshot([{ type: 'waterTreatment', level: 1 }, { type: 'habitat', level: 2 }]);
    expect(nextTutorialStep('upgrade', upgraded)).toBe('done');
    expect(nextTutorialStep('water', upgraded)).toBe('done');
    for (const step of ['story', 'done'] as TutorialStep[]) {
      expect(nextTutorialStep(step, upgraded)).toBe(step);
    }
  });
});
