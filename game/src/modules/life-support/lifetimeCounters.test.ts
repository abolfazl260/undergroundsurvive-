import { describe, expect, it } from 'vitest';
import { GameSession } from '../economy/session';
import { LifeSupportService } from './lifeSupport';
import { WaterProductionProcessor } from '../water/water';

describe('long-lived life-support and water counters (issue #117)', () => {
  it.each([100_000, 100_001, 1_000_000])('loads life-support at %i completed ticks', (count) => {
    const state = new LifeSupportService().snapshot();
    state.ticks = count;
    state.graceTicks = 0;
    state.events = [{type:'life-support-shortage',resource:'water',roomId:'home',tick:count}];
    const restored = LifeSupportService.restore(state);
    expect(restored?.snapshot()).toEqual(state);
  });

  it('continues counting and persists events beyond the former limit', () => {
    const state = new LifeSupportService().snapshot();
    state.ticks = 100_000;
    state.graceTicks = 0;
    const life = LifeSupportService.restore(state)!;
    const water = {available:()=>0,capacity:()=>30,spend:(_n:number)=>false};
    const habitat = {id:'home',type:'habitat' as const,x:2,y:-3,width:2,height:1,level:1};
    life.tick([habitat],water,{population:()=>1},{powered:()=>false},[]);
    expect(life.snapshot().ticks).toBe(100_001);
    expect(life.snapshot().events).toContainEqual({
      type:'life-support-shortage',resource:'water',roomId:'home',tick:100_001
    });
    expect(LifeSupportService.restore(life.snapshot())?.snapshot()).toEqual(life.snapshot());
  });

  it('keeps the independent inventory bounds and rejects invalid counter types', () => {
    const original = new LifeSupportService().snapshot();
    expect(LifeSupportService.restore({...original,ticks:-1})).toBeNull();
    expect(LifeSupportService.restore({...original,ticks:0.5})).toBeNull();
    expect(LifeSupportService.restore({...original,ticks:Number.MAX_SAFE_INTEGER + 1})).toBeNull();
    expect(LifeSupportService.restore({...original,oxygen:100_001})).toBeNull();
    expect(LifeSupportService.restore({...original,waterLedgerSeen:100_001})).not.toBeNull();
    expect(LifeSupportService.restore({...original,ticks:100_001,events:[
      {type:'life-support-shortage',resource:'oxygen',roomId:'home',tick:100_002}
    ]})).toBeNull();
  });

  it('accepts high completed-water ledger IDs without mistaking them for inventory', () => {
    const state = new WaterProductionProcessor().snapshot();
    state.completed = 100_001;
    state.ledger = [{id:100_001,raw:-2,clean:2,power:-2,roomId:'filter'}];
    expect(WaterProductionProcessor.restore(state)?.snapshot()).toEqual(state);
    expect(WaterProductionProcessor.restore({...state,completed:-1})).toBeNull();
    expect(WaterProductionProcessor.restore({...state,completed:1.2})).toBeNull();
  });

  it('restores the full game when life-support has passed 100k cycles', () => {
    const state=GameSession.create().snapshot();
    state.lifeSupport.ticks=100_001;
    state.lifeSupport.graceTicks=0;
    state.lifeSupport.waterLedgerSeen=100_001;
    const recovered=GameSession.restore(JSON.parse(JSON.stringify(state)));
    expect(recovered).not.toBeNull();
    expect(recovered!.snapshot().lifeSupport.ticks).toBe(100_001);
  });
});
