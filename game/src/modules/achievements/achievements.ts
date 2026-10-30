/** Achievement catalog. Progress comes from the authoritative game snapshot. */
export type AchievementMetric = 'builds' | 'digs' | 'upgrades' | 'floors' | 'cycles' | 'roomTypes';
interface AchievementDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly metric: AchievementMetric;
  readonly target: number;
  readonly rewardCoins: number;
}
export const ACHIEVEMENTS = [
  { id: 'first-room', title: 'اولین قدم', description: 'یک اتاق جدید بسازید.', metric: 'builds', target: 1, rewardCoins: 40 },
  { id: 'builder', title: 'معمار پناهگاه', description: '۵ اتاق جدید بسازید.', metric: 'builds', target: 5, rewardCoins: 150 },
  { id: 'first-dig', title: 'زیر سطح', description: 'یک خانه حفاری کنید.', metric: 'digs', target: 1, rewardCoins: 25 },
  { id: 'excavator', title: 'کاوشگر', description: '۱۰ خانه حفاری کنید.', metric: 'digs', target: 10, rewardCoins: 160 },
  { id: 'first-upgrade', title: 'رو به پیشرفت', description: 'یک اتاق را ارتقا دهید.', metric: 'upgrades', target: 1, rewardCoins: 30 },
  { id: 'upgrader', title: 'مهندس پناهگاه', description: '۳ ارتقای اتاق انجام دهید.', metric: 'upgrades', target: 3, rewardCoins: 75 },
  { id: 'upper-floor', title: 'رو به آسمان', description: 'اولین طبقهٔ بالایی را باز کنید.', metric: 'floors', target: 1, rewardCoins: 100 },
  { id: 'skyline', title: 'بر فراز ویرانه‌ها', description: '۲ طبقهٔ بالایی را باز کنید.', metric: 'floors', target: 2, rewardCoins: 220 },
  { id: 'first-cycles', title: 'چرخهٔ بقا', description: '۵ چرخهٔ تولید منابع را پشت سر بگذارید.', metric: 'cycles', target: 5, rewardCoins: 60 },
  { id: 'steady-shelter', title: 'پناهگاه پایدار', description: '۲۵ چرخهٔ تولید منابع را پشت سر بگذارید.', metric: 'cycles', target: 25, rewardCoins: 140 },
  { id: 'diverse-shelter', title: 'پناهگاهی برای همه', description: '۶ نوع اتاق متفاوت داشته باشید.', metric: 'roomTypes', target: 6, rewardCoins: 180 }
] as const satisfies readonly AchievementDefinition[];

export type AchievementId = typeof ACHIEVEMENTS[number]['id'];
export interface AchievementSnapshot {
  schemaVersion: 2;
  unlocked: AchievementId[];
  rewardGrantedAchievementIds: AchievementId[];
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
  rewardCoins: number;
  rewardGranted: boolean;
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
  private readonly rewarded = new Set<AchievementId>();

  static restore(input: unknown): AchievementTracker | null {
    if (!input || typeof input !== 'object') return null;
    const value = input as Omit<Partial<AchievementSnapshot>, 'schemaVersion'> & { schemaVersion?: number };
    if ((value.schemaVersion !== 1 && value.schemaVersion !== 2) ||
        !Array.isArray(value.unlocked) ||
        value.unlocked.length > ACHIEVEMENTS.length ||
        value.unlocked.some((id) => typeof id !== 'string' || !validIds.has(id)) ||
        new Set(value.unlocked).size !== value.unlocked.length) return null;
    const grants = value.schemaVersion === 2 ? value.rewardGrantedAchievementIds : [];
    if (!Array.isArray(grants) || grants.length > value.unlocked.length ||
        grants.some((id) => typeof id !== 'string' || !validIds.has(id) || !value.unlocked!.includes(id)) ||
        new Set(grants).size !== grants.length) return null;
    const result = new AchievementTracker();
    for (const id of value.unlocked) result.completed.add(id);
    for (const id of grants) result.rewarded.add(id);
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

  /** Only a successfully credited, already-unlocked achievement may be marked paid. */
  pendingRewards(): AchievementId[] {
    return ACHIEVEMENTS.filter((entry) => this.completed.has(entry.id) && !this.rewarded.has(entry.id))
      .map((entry) => entry.id);
  }

  markRewardGranted(id: AchievementId): void {
    if (!this.completed.has(id)) throw new Error('Cannot pay a locked achievement');
    this.rewarded.add(id);
  }

  snapshot(): AchievementSnapshot {
    return {
      schemaVersion: 2,
      unlocked: ACHIEVEMENTS.filter((entry) => this.completed.has(entry.id)).map((entry) => entry.id),
      rewardGrantedAchievementIds: ACHIEVEMENTS.filter((entry) => this.rewarded.has(entry.id)).map((entry) => entry.id)
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
    unlocked: unlocked.has(entry.id),
    rewardCoins: entry.rewardCoins,
    rewardGranted: source.achievements.rewardGrantedAchievementIds.includes(entry.id)
  }));
}

/** Reward amounts belong to the catalog; invalid future entries must not be paid. */
export function rewardForAchievement(id: AchievementId): number {
  const reward = ACHIEVEMENTS.find((entry) => entry.id === id)?.rewardCoins;
  if (!Number.isSafeInteger(reward) || (reward ?? 0) <= 0) throw new Error('Invalid achievement reward: ' + id);
  return reward!;
}
