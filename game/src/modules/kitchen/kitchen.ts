import type { Room } from '../building/placement';
import { getResourceCapacity, type ResourceEngine } from '../economy/resources';
import type { WaterProductionProcessor } from '../water/water';
import type { SurvivorRoster } from '../survivors/roster';

export interface CookingRecipe {
  readonly id: string;
  readonly name: { readonly fa: string; readonly en: string };
  readonly food: number;
  readonly cleanWater: number;
  readonly power: number;
  readonly meal: number;
  readonly durationMs: number;
  readonly minLevel: number;
  readonly technologyId: string | null;
}

/** Versioned balancing data, independent of Phaser and browser state. */
export const KITCHEN_CONFIG = {
  schemaVersion: 1,
  typeId: 'kitchen',
  outputBonusPerLevel: 2,
  minOperatingPower: 1,
  recipes: [
    { id: 'field-stew', name: { fa: 'خوراک پناهگاه', en: 'Shelter stew' },
      food: 2, cleanWater: 1, power: 2, meal: 4, durationMs: 10_000, minLevel: 1, technologyId: null },
    { id: 'fortified-ration', name: { fa: 'جیرهٔ تقویت‌شده', en: 'Fortified ration' },
      food: 3, cleanWater: 2, power: 3, meal: 6, durationMs: 15_000, minLevel: 2, technologyId: 'food-1' }
  ] satisfies readonly CookingRecipe[]
} as const;

export type CookingStatus = 'idle' | 'running' | 'paused' | 'completed' | 'blocked';
export type CookingBlock = 'room' | 'recipe' | 'locked' | 'busy' | 'staff' | 'food' | 'water' | 'power' | 'capacity' | 'duplicate';

export interface CookingCycle {
  roomId: string;
  status: CookingStatus;
  recipeId: string | null;
  level: number;
  elapsedMs: number;
  durationMs: number;
  output: number;
  enabled: boolean;
}
export interface CookingSnapshot {
  schemaVersion: 1;
  cycles: CookingCycle[];
  operations: string[];
  completed: number;
}
export interface CookingContext {
  rooms: readonly Room[];
  resources: ResourceEngine;
  water: WaterProductionProcessor;
  roster: SurvivorRoster;
  technologies: readonly string[];
}
export function recipeFor(id: string): CookingRecipe | undefined {
  return KITCHEN_CONFIG.recipes.find(r => r.id === id);
}
export function cookingOutput(recipe: CookingRecipe, level: number): number {
  return recipe.meal + (level - 1) * KITCHEN_CONFIG.outputBonusPerLevel;
}

/** Ingredients, power and clean water are debited once at start. Cancellation
 * or demolition forfeits ingredients; moving keeps work, upgrading benefits
 * the next batch. A completed cycle is never credited a second time. */
export class KitchenProcessor {
  private state: CookingSnapshot = { schemaVersion: 1, cycles: [], operations: [], completed: 0 };

  sync(rooms: readonly Room[]): void {
    this.state.cycles = rooms.filter(r => r.type === 'kitchen').map(room => {
      const previous = this.state.cycles.find(c => c.roomId === room.id);
      return previous ?? { roomId: room.id, status: 'idle', recipeId: null, level: room.level,
        elapsedMs: 0, durationMs: 0, output: 0, enabled: true };
    }).sort((a, b) => a.roomId.localeCompare(b.roomId));
  }

  block(roomId: string, recipeId: string, ctx: CookingContext): CookingBlock | null {
    const room = ctx.rooms.find(r => r.id === roomId && r.type === 'kitchen');
    if (!room) return 'room';
    const recipe = recipeFor(recipeId);
    if (!recipe) return 'recipe';
    this.sync(ctx.rooms);
    const current = this.state.cycles.find(c => c.roomId === roomId)!;
    if (current.status === 'running' || current.status === 'paused' || current.status === 'blocked') return 'busy';
    if (room.level < recipe.minLevel || (recipe.technologyId && !ctx.technologies.includes(recipe.technologyId))) return 'locked';
    if (!ctx.roster.assignments.some(a => a.roomId === roomId && a.kind === 'cook' && a.state === 'active')) return 'staff';
    if (ctx.resources.snapshot().stock.power < recipe.power + KITCHEN_CONFIG.minOperatingPower) return 'power';
    if (!ctx.resources.canSpend({ food: recipe.food, power: recipe.power })) return 'food';
    if (ctx.water.snapshot().clean < recipe.cleanWater) return 'water';
    const reserved = this.state.cycles.reduce((sum, cycle) =>
      sum + (cycle.roomId !== roomId && ['running', 'paused', 'blocked'].includes(cycle.status) ? cycle.output : 0), 0);
    if (ctx.resources.snapshot().stock.meal + reserved + cookingOutput(recipe, room.level) > getResourceCapacity(ctx.rooms)) return 'capacity';
    return null;
  }

  start(roomId: string, recipeId: string, operationId: string, ctx: CookingContext): CookingBlock | null {
    if (!operationId || this.state.operations.includes(operationId) || this.state.operations.length >= 5000) return 'duplicate';
    const reason = this.block(roomId, recipeId, ctx);
    if (reason) return reason;
    const recipe = recipeFor(recipeId)!;
    // All preconditions are checked before any debit, with no await or callback
    // between the two inventory writes.
    if (!ctx.resources.spend({ food: recipe.food, power: recipe.power })) return 'food';
    if (!ctx.water.spendClean(recipe.cleanWater)) {
      // This path cannot happen with the synchronous, validated water adapter.
      ctx.resources.credit('food', recipe.food, ctx.rooms);
      ctx.resources.credit('power', recipe.power, ctx.rooms);
      return 'water';
    }
    const room = ctx.rooms.find(r => r.id === roomId)!;
    const cycle = this.state.cycles.find(c => c.roomId === roomId)!;
    Object.assign(cycle, { status: 'running', recipeId, level: room.level, elapsedMs: 0,
      durationMs: recipe.durationMs, output: cookingOutput(recipe, room.level), enabled: true });
    this.state.operations.push(operationId);
    return null;
  }

  toggle(roomId: string): boolean {
    const c = this.state.cycles.find(c => c.roomId === roomId);
    if (!c || !['running', 'paused', 'blocked'].includes(c.status)) return false;
    c.enabled = !c.enabled;
    c.status = c.enabled ? 'blocked' : 'paused';
    return true;
  }

  cancel(roomId: string): boolean {
    const c = this.state.cycles.find(c => c.roomId === roomId);
    if (!c || !['running', 'paused', 'blocked'].includes(c.status)) return false;
    Object.assign(c, { status: 'idle', recipeId: null, elapsedMs: 0, durationMs: 0, output: 0, enabled: true });
    return true;
  }

  advance(deltaMs: number, ctx: CookingContext): void {
    if (!Number.isFinite(deltaMs) || deltaMs <= 0) return;
    this.sync(ctx.rooms);
    for (const cycle of this.state.cycles) {
      if (!['running', 'paused', 'blocked'].includes(cycle.status)) continue;
      if (!cycle.enabled) { cycle.status = 'paused'; continue; }
      const staffed = ctx.roster.assignments.some(a => a.roomId === cycle.roomId && a.kind === 'cook' && a.state === 'active');
      const powered = ctx.resources.snapshot().stock.power >= KITCHEN_CONFIG.minOperatingPower;
      if (!staffed || !powered || !ctx.resources.canCredit('meal', cycle.output, ctx.rooms)) {
        cycle.status = 'blocked'; continue;
      }
      cycle.status = 'running';
      cycle.elapsedMs = Math.min(cycle.durationMs, cycle.elapsedMs + Math.min(deltaMs, 60_000));
      if (cycle.elapsedMs === cycle.durationMs && ctx.resources.credit('meal', cycle.output, ctx.rooms)) {
        cycle.status = 'completed';
        this.state.completed++;
      }
    }
  }

  snapshot(): CookingSnapshot { return structuredClone(this.state); }

  static restore(raw: unknown): KitchenProcessor | null {
    if (!raw || typeof raw !== 'object') return null;
    const s = raw as CookingSnapshot;
    if (s.schemaVersion !== 1 || !Array.isArray(s.cycles) || s.cycles.length > 160 ||
      new Set(s.cycles.map(c => c?.roomId)).size !== s.cycles.length ||
      !Number.isSafeInteger(s.completed) || s.completed < 0 || s.completed > 100_000 ||
      !Array.isArray(s.operations) || s.operations.length > 5000 ||
      !s.operations.every(id => typeof id === 'string' && !!id) || new Set(s.operations).size !== s.operations.length ||
      !s.cycles.every(c => {
        if (!c || typeof c.roomId !== 'string' || !c.roomId || ![1,2,3].includes(c.level) ||
          !['idle','running','paused','completed','blocked'].includes(c.status) ||
          typeof c.enabled !== 'boolean' || !Number.isSafeInteger(c.elapsedMs) || c.elapsedMs < 0) return false;
        if (c.status === 'idle') return c.recipeId === null && c.elapsedMs === 0 && c.durationMs === 0 && c.output === 0;
        const recipe = recipeFor(c.recipeId ?? '');
        return !!recipe && c.level >= recipe.minLevel && c.durationMs === recipe.durationMs &&
          c.output === cookingOutput(recipe, c.level) && c.elapsedMs <= c.durationMs &&
          (c.status !== 'completed' || c.elapsedMs === c.durationMs) &&
          (c.status !== 'paused' || !c.enabled) &&
          (c.status === 'paused' || c.enabled);
      })) return null;
    const processor = new KitchenProcessor();
    processor.state = structuredClone(s);
    return processor;
  }
}
