/** Local-only sample leaderboard. Never represent these generated rows as real players. */
export interface ScoreSource {
  base: { rooms: readonly { level: number }[]; terrain: { excavated: readonly unknown[] } };
  resources: { tickCount: number };
  achievements: { unlocked: readonly string[] };
  wallet: { balance: number };
}

export interface Standing {
  username: string;
  score: number;
  coins: number;
  isCurrentPlayer: boolean;
}

const PERSIAN_NAMES_FINGLISH = [
  'amir', 'ali', 'reza', 'sara', 'nima', 'mahi', 'arash', 'nazanin',
  'mehdi', 'mina', 'parsa', 'shirin', 'kian', 'shayan', 'negar', 'yas',
  'mahsa', 'sam', 'sina', 'rozhin', 'hasti', 'soroush', 'pedram', 'setareh',
  'pouya', 'tina', 'bahar', 'soheil', 'elham', 'kasra', 'darya', 'sahar'
] as const;

function hashSeed(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Score is a transparent estimate of local shelter progress, not a server ranking. */
export function scoreFromSnapshot(source: ScoreSource): number {
  const rooms = source.base.rooms.length;
  const upgrades = source.base.rooms.reduce((total, room) => total + Math.max(0, room.level - 1), 0);
  const excavated = source.base.terrain.excavated.length;
  const cycles = Math.max(0, Math.floor(source.resources.tickCount));
  return rooms * 120 + upgrades * 180 + excavated * 25 +
    source.achievements.unlocked.length * 275 + Math.min(cycles, 50000) * 2;
}

/** The same UTC day yields the same sample rows; no accounts or network requests. */
export function sampleStandings(day: string, count = 16): Standing[] {
  const random = randomGenerator(hashSeed('underground-leaderboard:' + day));
  const rows: Standing[] = [];
  const used = new Set<string>();
  while (rows.length < Math.max(0, Math.min(count, 50))) {
    const name = PERSIAN_NAMES_FINGLISH[Math.floor(random() * PERSIAN_NAMES_FINGLISH.length)];
    const username = name + String(100 + Math.floor(random() * 9900));
    if (used.has(username)) continue;
    used.add(username);
    rows.push({
      username,
      score: 900 + Math.floor(random() * 18000),
      coins: 120 + Math.floor(random() * 9500),
      isCurrentPlayer: false
    });
  }
  return rows.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
}

export function leaderboardFor(source: ScoreSource, date: Date = new Date()): Standing[] {
  const day = date.toISOString().slice(0, 10);
  const rows = [
    ...sampleStandings(day),
    {
      username: 'you',
      score: scoreFromSnapshot(source),
      coins: source.wallet.balance,
      isCurrentPlayer: true
    }
  ];
  return rows.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
}
