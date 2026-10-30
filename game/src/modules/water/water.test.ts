import { expect, it } from 'vitest';
import { WaterProductionProcessor } from './water';
import type { Room } from '../building/placement';
import { GameSession } from '../economy/session';
const room: Room = { id:'water',type:'waterTreatment',x:3,y:-1,width:2,height:1,level:1 };
function account(initial = 10) { let stock = initial; return { available: () => stock, spend: (n:number) => { if(stock<n)return false;stock-=n;return true; } }; }
it('commits exact atomic recipes and preserves suspended progress across reload', () => {
  const w = new WaterProductionProcessor(), power = account();
  w.advance(5000,[room],power); expect(w.snapshot().raw).toBe(20);
  w.advance(5000,[room],account(0)); expect(w.snapshot().cycles[0].elapsedMs).toBe(5000);
  const restored = WaterProductionProcessor.restore(w.snapshot())!;
  restored.advance(5000,[room],power);
  expect(restored.snapshot()).toMatchObject({raw:18,clean:2,completed:1}); expect(power.available()).toBe(8);
  expect(WaterProductionProcessor.restore(restored.snapshot())!.snapshot()).toEqual(restored.snapshot());
});
it('rejects missing input, full tank and duplicate pumping without partial expense', () => {
  for (const stock of [{raw:0,clean:0},{raw:20,clean:30},{raw:20,clean:29}]) {
    const w = WaterProductionProcessor.restore({...new WaterProductionProcessor().snapshot(),...stock})!;
    const p = account(); const before = w.snapshot(); w.advance(10000,[room],p);
    expect(w.snapshot().raw).toBe(before.raw); expect(w.snapshot().clean).toBe(before.clean); expect(p.available()).toBe(10);
  }
  const w = new WaterProductionProcessor(), p = account();
  expect(w.collect('pump',[],p)).toBe(true); expect(w.collect('pump',[],p)).toBe(false);
  expect(w.snapshot()).toMatchObject({raw:30,reserve:190}); expect(p.available()).toBe(9);
});
it('scales output, cancels upgrade progress, preserves pause and drops demolished cycles', () => {
  const w = new WaterProductionProcessor(), p = account();
  w.advance(5000,[room],p); w.toggle(room.id); w.advance(5000,[room],p); expect(w.snapshot().cycles[0].elapsedMs).toBe(5000);
  w.toggle(room.id); w.advance(5000,[{...room,level:2}],p); expect(w.snapshot().clean).toBe(0);
  w.advance(5000,[{...room,level:2}],p); expect(w.snapshot().clean).toBe(4); w.sync([]); expect(w.snapshot().cycles).toEqual([]);
});
it('integrates construction, tick partitioning, migration and malformed saves', () => {
  const a=GameSession.create(); expect(a.build('waterTreatment',8,-1).ok).toBe(true);
  const b=GameSession.restore(a.snapshot())!; a.advanceTime(10000); for(let i=0;i<100;i++) b.advanceTime(100);
  expect(b.snapshot()).toEqual(a.snapshot()); expect(a.water.snapshot().clean).toBe(2);
  expect(GameSession.restore(a.snapshot())!.snapshot()).toEqual(a.snapshot());
  expect(WaterProductionProcessor.restore({...a.water.snapshot(),raw:NaN})).toBeNull();
  expect(GameSession.restore({...a.snapshot(),schemaVersion:4,water:undefined})).not.toBeNull();
});
