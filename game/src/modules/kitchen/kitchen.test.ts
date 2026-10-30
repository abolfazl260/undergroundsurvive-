import { describe, expect, it } from 'vitest';
import { BuildingLayout } from '../building/layout';
import { ResourceEngine } from '../economy/resources';
import { GameSession } from '../economy/session';
import { SurvivorRoster } from '../survivors/roster';
import { WaterProductionProcessor } from '../water/water';
import { KitchenProcessor, KITCHEN_CONFIG } from './kitchen';

function fixture() {
  const layout = new BuildingLayout();
  expect(layout.place('kitchen', 8, -1).ok).toBe(true);
  const kitchen = layout.rooms.find(r => r.type === 'kitchen')!;
  const resources = ResourceEngine.create();
  const initialWater = new WaterProductionProcessor().snapshot();
  const water = WaterProductionProcessor.restore({ ...initialWater, clean: 10 })!;
  const roster = new SurvivorRoster(layout);
  const processor = new KitchenProcessor();
  processor.sync(layout.rooms);
  const ctx = (technologies: string[] = []) =>
    ({ rooms: layout.rooms, resources, water, roster, technologies });
  return { layout, kitchen, resources, water, roster, processor, ctx };
}
function staff(f: ReturnType<typeof fixture>) {
  expect(f.roster.assign('resident-1', f.kitchen.id, 'cook', 'chef-operation')).toBeNull();
  f.roster.advance(30_000, f.resources.snapshot().stock.power);
  expect(f.roster.assignments.some(a => a.kind === 'cook' && a.state === 'active')).toBe(true);
}

describe('kitchen deterministic cooking', () => {
  it('validates staff and all inputs before debiting any resource', () => {
    const f = fixture();
    const before = { resources: f.resources.snapshot(), water: f.water.snapshot() };
    expect(f.processor.start(f.kitchen.id, 'field-stew', 'try-1', f.ctx())).toBe('staff');
    expect(f.processor.start(f.kitchen.id, 'invalid', 'try-2', f.ctx())).toBe('recipe');
    expect(f.resources.snapshot()).toEqual(before.resources);
    expect(f.water.snapshot()).toEqual(before.water);
    staff(f);
    expect(f.processor.start(f.kitchen.id, 'fortified-ration', 'locked', f.ctx())).toBe('locked');
    expect(f.processor.start(f.kitchen.id, 'field-stew', 'start-one', f.ctx())).toBeNull();
    const charged = f.resources.snapshot().stock;
    expect(charged.food).toBe(before.resources.stock.food - 2);
    expect(charged.power).toBe(before.resources.stock.power - 2);
    expect(f.water.snapshot().clean).toBe(before.water.clean - 1);
    expect(f.processor.start(f.kitchen.id, 'field-stew', 'start-one', f.ctx())).toBe('duplicate');
    expect(f.processor.start(f.kitchen.id, 'field-stew', 'start-two', f.ctx())).toBe('busy');
    expect(f.resources.snapshot().stock).toEqual(charged);
  });

  it('issues one meal reward, resumes from saved progress and never duplicates it', () => {
    const f = fixture(); staff(f);
    expect(f.processor.start(f.kitchen.id, 'field-stew', 'op-1', f.ctx())).toBeNull();
    f.processor.advance(5_000, f.ctx());
    expect(f.processor.snapshot().cycles[0].elapsedMs).toBe(5_000);
    const restored = KitchenProcessor.restore(f.processor.snapshot())!;
    expect(restored.snapshot()).toEqual(f.processor.snapshot());
    restored.advance(5_000, f.ctx());
    expect(restored.snapshot().cycles[0].status).toBe('completed');
    expect(restored.snapshot().completed).toBe(1);
    const credited = f.resources.snapshot().stock.meal;
    expect(credited).toBe(16);
    restored.advance(60_000, f.ctx());
    expect(f.resources.snapshot().stock.meal).toBe(credited);
    expect(restored.snapshot().completed).toBe(1);
    expect(KitchenProcessor.restore(restored.snapshot())?.snapshot()).toEqual(restored.snapshot());
    expect(restored.start(f.kitchen.id, 'field-stew', 'op-1', f.ctx())).toBe('duplicate');
  });

  it('suspends for pause, power loss, missing cook and returns to the exact remaining time', () => {
    const f = fixture(); staff(f);
    expect(f.processor.start(f.kitchen.id, 'field-stew', 'op-1', f.ctx())).toBeNull();
    expect(f.processor.toggle(f.kitchen.id)).toBe(true);
    f.processor.advance(8_000, f.ctx());
    expect(f.processor.snapshot().cycles[0].elapsedMs).toBe(0);
    expect(f.processor.toggle(f.kitchen.id)).toBe(true);
    expect(f.resources.spendPower(f.resources.snapshot().stock.power)).toBe(true);
    f.roster.reconcile(0);
    f.processor.advance(5_000, f.ctx());
    expect(f.processor.snapshot().cycles[0].status).toBe('blocked');
    expect(f.processor.snapshot().cycles[0].elapsedMs).toBe(0);
    expect(f.resources.credit('power', 5, f.layout.rooms)).toBe(true);
    f.roster.reconcile(5);
    f.processor.advance(5_000, f.ctx());
    expect(f.processor.snapshot().cycles[0].elapsedMs).toBe(5_000);
    expect(f.roster.release('resident-1')).toBe(true);
    f.processor.advance(5_000, f.ctx());
    expect(f.processor.snapshot().cycles[0].status).toBe('blocked');
    expect(f.processor.snapshot().cycles[0].elapsedMs).toBe(5_000);
  });

  it('scales yield on upgrade, enforces tech gate and respects bounded storage', () => {
    const f = fixture(); staff(f);
    expect(f.layout.upgrade(f.kitchen.id).ok).toBe(true);
    expect(f.processor.block(f.kitchen.id, 'fortified-ration', f.ctx())).toBe('locked');
    expect(f.processor.start(f.kitchen.id, 'fortified-ration', 'upgraded', f.ctx(['food-1']))).toBeNull();
    expect(f.processor.snapshot().cycles[0].output).toBe(8);
    expect(f.processor.snapshot().cycles[0].durationMs).toBe(15_000);
    f.processor.advance(15_000, f.ctx(['food-1']));
    expect(f.resources.snapshot().stock.meal).toBe(20);

    const crowded = fixture(); staff(crowded);
    expect(crowded.resources.credit('meal', 15, crowded.layout.rooms)).toBe(true);
    const before = crowded.resources.snapshot();
    expect(crowded.processor.start(crowded.kitchen.id, 'field-stew', 'full', crowded.ctx())).toBe('capacity');
    expect(crowded.resources.snapshot()).toEqual(before);
  });

  it('keeps move progress, forfeits inputs on cancel/demolition and rejects corrupted saves', () => {
    const f = fixture(); staff(f);
    expect(f.processor.start(f.kitchen.id, 'field-stew', 'op-1', f.ctx())).toBeNull();
    f.processor.advance(5_000, f.ctx());
    const charged = f.resources.snapshot();
    // Changing coordinates of the same room preserves its paid cycle.
    const moved = f.layout.move(f.kitchen.id, 8, -2);
    if (moved.ok) {
      f.processor.sync(f.layout.rooms);
      expect(f.processor.snapshot().cycles[0].elapsedMs).toBe(5_000);
    }
    expect(f.processor.cancel(f.kitchen.id)).toBe(true);
    expect(f.resources.snapshot()).toEqual(charged);
    expect(f.processor.snapshot().cycles[0].status).toBe('idle');
    expect(f.processor.start(f.kitchen.id, 'field-stew', 'op-1', f.ctx())).toBe('duplicate');
    const invalid = f.processor.snapshot();
    invalid.cycles[0].output = -1;
    expect(KitchenProcessor.restore(invalid)).toBeNull();
    expect(f.layout.remove(f.kitchen.id).ok).toBe(true);
    f.processor.sync(f.layout.rooms);
    expect(f.processor.snapshot().cycles).toHaveLength(0);
  });

  it('migrates legacy session and resource snapshots without resetting established games', () => {
    const game = GameSession.create();
    const current = game.snapshot();
    const legacy = { ...current, schemaVersion: 10 };
    expect(GameSession.restore(legacy)?.snapshot().kitchen).toEqual(current.kitchen);
    const resources = ResourceEngine.create();
    const stock = resources.snapshot().stock;
    const previous = { ...resources.snapshot(), schemaVersion: 1,
      stock: { power: stock.power, food: stock.food, ore: stock.ore, supplies: stock.supplies } };
    expect(ResourceEngine.restore(previous)?.snapshot().stock.meal).toBe(stock.food);
    expect(KITCHEN_CONFIG.recipes).toHaveLength(2);
  });
});
