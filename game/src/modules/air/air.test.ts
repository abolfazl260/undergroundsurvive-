import { describe, it, expect } from 'vitest';
import { AIR_CONFIG, AirSystem, airModifiers, airStatus, simulateAir, ventPower } from './air';
import { GameSession } from '../economy/session';
import type { Room } from '../building/placement';

const vent = (id: string, level = 1): Room => ({ id, type: 'ventilation', x: 3, y: -1, width: 2, height: 1, level });
const power = (initial: number) => {
  let remaining = initial;
  return { available: () => remaining, spend: (n: number) => {
    if (remaining < n) return false;
    remaining -= n; return true;
  }};
};
describe('air simulation', () => {
  it('keeps air within bounds with enough capacity and deterministic power allocation', () => {
    const units = ['b','a'].map(id => ({ id, level: 1, enabled: true, health: 100, powered: false }));
    const a = simulateAir(5000, 6, 0.2, {quality: 90, units}, 2);
    const b = simulateAir(5000, 6, 0.2, {quality: 90, units: [...units].reverse()}, 2);
    expect(a).toEqual(b);
    expect(a.quality).toBeGreaterThan(90);
    expect(a.coverage).toBe(10);
    expect(a.powerUsed).toBe(2);
    expect(a.poweredIds).toEqual(['a','b']);
    expect(simulateAir(5000, 0, 0, {quality: 100, units}, 2).quality).toBe(100);
    expect(airStatus(39)).toBe('critical');
    expect(airModifiers(39).efficiency).toBeLessThan(1);
  });
  it('gradually worsens on overload or power cuts without instantaneous failure', () => {
    const units = [{ id:'a',level:1,enabled:true,health:100,powered:false }];
    const low = simulateAir(5000, 10, 0, {quality:80, units}, 0);
    const overloaded = simulateAir(5000, 10, 0, {quality:80, units}, 1);
    expect(low.quality).toBeLessThan(overloaded.quality);
    expect(overloaded.reason).toBe('overload');
    expect(low.reason).toBe('power');
    expect(low.quality).toBeGreaterThan(78);
    expect(simulateAir(5000, 100, 20, {quality:0,units}, 0).quality).toBe(0);
  });
  it('charges once per tick, pauses at unchanged clock and restores enabled/health', () => {
    const a = new AirSystem(), rooms = [vent('fan')];
    const budget = power(10);
    a.sync(rooms);
    expect(a.advanceTo(5000, rooms, 3, 0, budget)).toBe(1);
    expect(budget.available()).toBe(10-ventPower(1));
    expect(a.advanceTo(5000, rooms, 3, 0, budget)).toBe(0);
    const snap = a.snapshot();
    expect(a.toggle('fan','toggle-1')).toBe(true);
    expect(a.toggle('fan','toggle-1')).toBe(false);
    expect(a.damage('fan',50,'damage-1')).toBe(true);
    const reload = AirSystem.restore(a.snapshot())!;
    expect(reload.snapshot().vents[0].health).toBeLessThan(51);
    expect(reload.snapshot().vents[0].enabled).toBe(false);
    expect(reload.advanceTo(10000, rooms, 3, 0, budget)).toBe(1);
    expect(reload.snapshot().quality).toBeLessThan(snap.quality);
    expect(AirSystem.restore({...snap,quality:101})).toBeNull();
    expect(AirSystem.restore({...snap,nowMs:5001})).toBeNull();
  });
  it('integrates a new room, upgrades, save migration, repairs and partitioned time', () => {
    const a = GameSession.create();
    expect(a.build('ventilation',8,-1).ok).toBe(true);
    const id = a.layout.getRoomAt(8,-1)!.id;
    const b = GameSession.restore(a.snapshot())!;
    a.advanceTime(10000);
    for(let i=0;i<100;i++) b.advanceTime(100);
    expect(b.snapshot()).toEqual(a.snapshot());
    expect(a.air.snapshot().powerUsed).toBe(1);
    expect(a.upgradeRoom(id).ok).toBe(true);
    expect(a.air.damage(id,35,'accident')).toBe(true);
    expect(a.repairVent(id,'repair')).toBe(true);
    expect(a.repairVent(id,'repair')).toBe(false);
    const after = a.snapshot();
    expect(GameSession.restore(after)?.snapshot()).toEqual(after);
    const old = {...after,schemaVersion:9,air:undefined};
    expect(GameSession.restore(old)?.air.snapshot().nowMs).toBe(after.resources.tickCount * AIR_CONFIG.tickMs);
  });
});
