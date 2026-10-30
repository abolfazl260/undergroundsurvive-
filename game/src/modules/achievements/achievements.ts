/** Achievement catalog. Progress comes from the authoritative game snapshot. */
export type AchievementMetric = 'builds' | 'digs' | 'upgrades' | 'floors' | 'cycles' | 'roomTypes';
interface AchievementDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly metric: AchievementMetric;
  readonly target: number;
}
export const ACHIEVEMENTS = [
  { id: 'first-room', title: 'اولین قدم', description: 'یک اتاق جدید بسازید.', metric: 'builds', target: 1 },
  { id: 'builder', title: 'معمار پناهگاه', description: '۵ اتاق جدید بسازید.', metric: 'builds', target: 5 },
  { id: 'first-dig', title: 'زیر سطح', description: 'یک خانه حفاری کنید.', metric: 'digs', target: 1 },
  { id: 'excavator', title: 'کاوشگر', description: '۱۰ خانه حفاری کنید.', metric: 'digs', target: 10 },
  { id: 'first-upgrade', title: 'رو به پیشرفت', description: 'یک اتاق را ارتقا دهید.', metric: 'upgrades', target: 1 },
  { id: 'upgrader', title: 'مهندس پناهگاه', description: '۳ ارتقای اتاق انجام دهید.', metric: 'upgrades', target: 3 },
  { id: 'upper-floor', title: 'رو به آسمان', description: 'اولین طبقهٔ بالایی را باز کنید.', metric: 'floors', target: 1 },
  { id: 'skyline', title: 'بر فراز ویرانه‌ها', description: '۲ طبقهٔ بالایی را باز کنید.', metric: 'floors', target: 2 },
  { id: 'first-cycles', title: 'چرخهٔ بقا', description: '۵ چرخهٔ تولید منابع را پشت سر بگذارید.', metric: 'cycles', target: 5 },
  { id: 'steady-shelter', title: 'پناهگاه پایدار', description: '۲۵ چرخهٔ تولید منابع را پشت سر بگذارید.', metric: 'cycles', target: 25 },
  { id: 'diverse-shelter', title: 'پناهگاهی برای همه', description: '۶ نوع اتاق متفاوت داشته باشید.', metric: 'roomTypes', target: 6 }
] as const satisfies readonly AchievementDefinition[];

export type AchievementId = typeof ACHIEVEMENTS[number]['id'];
export interface AchievementSnapshot {
  schemaVersion: 1;
  unlocked: AchievementId[];
}
export interface AchievementSource {
  base: { rooms: readonly { type: string }[]; terrain: { highestFloor: number } };
  wallet: { transactions: readonly { kind: string }[] };
  resources: { tickCount: number };
}
export interface AchievementView {
  id: AchievementId;
  title: string;
  description: string;
  target: number;
  progress: number;
  unlocked: boolean;
}
const validIds = new Set<string>(ACHIEVEMENTS.map((definition) => definition.id));

export function progressFor(metric: AchievementMetric, source: AchievementSource): number {
  if (metric === 'floors') return source.base.terrain.highestFloor;
  if (metric === 'cycles') return source.resources.tickCount;
  if (metric === 'roomTypes') return new Set(source.base.rooms.map((room) => room.type)).size;
  const kind = metric === 'builds' ? 'build' : metric === 'digs' ? 'dig' : 'upgrade';
  return source.wallet.transactions.filter((entry) => entry.kind === kind).length;
}

/** Unlocks are never revoked if a room is removed. */
export class AchievementTracker {
  private readonly completed = new Set<AchievementId>();

  static restore(input: unknown): AchievementTracker | null {
    if (!input || typeof input !== 'object') return null;
    const value = input as Partial<AchievementSnapshot>;
    if (value.schemaVersion !== 1 || !Array.isArray(value.unlocked) ||
        value.unlocked.length > ACHIEVEMENTS.length ||
        value.unlocked.some((id) => typeof id !== 'string' || !validIds.has(id)) ||
        new Set(value.unlocked).size !== value.unlocked.length) return null;
    const result = new AchievementTracker();
    for (const id of value.unlocked) result.completed.add(id);
    return result;
  }

  evaluate(source: AchievementSource): AchievementId[] {
    const newlyUnlocked: AchievementId[] = [];
    for (const definition of ACHIEVEMENTS) {
      if (!this.completed.has(definition.id) &&
          progressFor(definition.metric, source) >= definition.target) {
        this.completed.add(definition.id);
        newlyUnlocked.push(definition.id);
      }
    }
    return newlyUnlocked;
  }

  snapshot(): AchievementSnapshot {
    return {
      schemaVersion: 1,
      unlocked: ACHIEVEMENTS.filter((entry) => this.completed.has(entry.id)).map((entry) => entry.id)
    };
  }
}

export function getAchievementViews(source: AchievementSource & { achievements: AchievementSnapshot }): AchievementView[] {
  const unlocked = new Set(source.achievements.unlocked);
  return ACHIEVEMENTS.map((entry) => ({
    id: entry.id,
    title: entry.title,
    description: entry.description,
    target: entry.target,
    progress: Math.min(entry.target, Math.max(0, progressFor(entry.metric, source))),
    unlocked: unlocked.has(entry.id)
  }));
}
