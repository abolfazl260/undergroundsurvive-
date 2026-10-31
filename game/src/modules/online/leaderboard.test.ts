import { describe, expect, it } from 'vitest';
import { leaderboardFor, sampleStandings, scoreFromSnapshot, type ScoreSource } from './leaderboard';

const source: ScoreSource = {
  base: {
    rooms: [{ level: 1 }, { level: 2 }, { level: 3 }],
    terrain: { excavated: [{}, {}, {}] }
  },
  resources: { tickCount: 10 },
  achievements: { unlocked: ['first-room', 'first-dig'] },
  wallet: { balance: 1234 }
};

describe('sample online leaderboard', () => {
  it('uses distinct Finglish names with numeric username suffixes', () => {
    const rows = sampleStandings('2026-10-31', 40);
    expect(new Set(rows.map((row) => row.username)).size).toBe(40);
    expect(rows.every((row) => /^[a-z]+[0-9]+$/.test(row.username))).toBe(true);
    expect(rows.every((row) => row.score >= 0 && row.coins >= 0)).toBe(true);
  });
  it('is stable within one day and changes with a new day', () => {
    expect(sampleStandings('2026-10-31')).toEqual(sampleStandings('2026-10-31'));
    expect(sampleStandings('2026-10-31')).not.toEqual(sampleStandings('2026-11-01'));
  });
  it('derives the local score from shelter progress without changing the wallet', () => {
    expect(scoreFromSnapshot(source)).toBe(3 * 120 + 3 * 180 + 3 * 25 + 2 * 275 + 10 * 2);
    expect(source.wallet.balance).toBe(1234);
  });
  it('merges the current player exactly once with their actual local coins', () => {
    const rows = leaderboardFor(source, new Date('2026-10-31T14:00:00Z'));
    expect(rows).toHaveLength(17);
    expect(rows.filter((row) => row.isCurrentPlayer)).toEqual([
      { username: 'you', score: scoreFromSnapshot(source), coins: 1234, isCurrentPlayer: true }
    ]);
    expect(rows.every((row, index) => index === 0 || rows[index - 1].score >= row.score)).toBe(true);
  });
});
