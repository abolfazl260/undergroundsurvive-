import { describe, expect, it } from 'vitest';
import { ROOM_DEFINITIONS, type RoomType } from '../building/catalog';
import type { Room } from '../building/placement';
import { GameSession } from '../economy/session';
import { ResourceEngine } from '../economy/resources';
import { WATER_CONFIG, WaterProductionProcessor } from '../water/water';
import { allocatePower, appliancePowerDemand, setRoomPriority, type PowerSnapshot } from './network';

const mods = { powerProduction: 1, foodProduction: 1 };
const room = (type: RoomType, id: string, x: number, level = 1, y = -1): Room =>
  ({id,type,x,y,level,width:ROOM_DEFINITIONS[type].width,height:1});
const circuit = (xs:number[]):PowerSnapshot => ({schemaVersion:1,mode:'physical',overrides:[],
  cables:xs.map(x=>({x,y:-1,riser:false}))});
const entry = (a:ReturnType<typeof allocatePower>,id:string)=>a.rooms.find(r=>r.roomId===id)!;

describe('appliance loads count toward actual network capacity (#114)',()=>{
  it('includes all three dedicated processors, with level-dependent ventilation',()=>{
    const rooms=[room('generator','g',1),room('waterTreatment','water',3),
      room('ventilation','vent',5,3),room('kitchen','cook',7)];
    const result=allocatePower(circuit([1,2,3,4,5,6,7]),rooms,mods);
    expect(entry(result,'water').demand).toBe(WATER_CONFIG.recipe.power);
    expect(entry(result,'vent').demand).toBe(3);
    expect(entry(result,'cook').demand).toBe(1);
    expect(result.networks[0]).toMatchObject({supply:10,demand:6,allocated:6,shortage:0});
    expect(result.activeRoomIds).toEqual(expect.arrayContaining(['water','vent','cook']));
  });

  it('sheds lower-priority appliances when a single circuit exceeds production',()=>{
    const rooms=[room('generator','g',1),room('command','c',3),
      room('waterTreatment','water',6),room('ventilation','vent',8),
      room('kitchen','cook',10),room('mine','zzz-mine',12),room('workshop','work',14)];
    const wire=circuit(Array.from({length:16},(_,i)=>i+1));
    const result=allocatePower(wire,rooms,mods);
    expect(entry(result,'water').status).toBe('online');
    expect(entry(result,'vent').status).toBe('online');
    expect(entry(result,'cook').status).toBe('online');
    expect(entry(result,'zzz-mine').status).toBe('shed');
    expect(result.networks[0].shortage).toBeGreaterThan(0);
    // Raising a low-priority load changes the deterministic allocation.
    const prioritized=setRoomPriority(wire,rooms.find(r=>r.id==='zzz-mine')!,1)!;
    const changed=allocatePower(prioritized,rooms,mods);
    expect(entry(changed,'zzz-mine').status).toBe('online');
    expect(changed.networks[0].allocated).toBeLessThanOrEqual(changed.networks[0].supply);
  });

  it('does not borrow power across independent generators or isolated circuits',()=>{
    const rooms=[room('generator','g1',1),room('waterTreatment','w1',3),
      room('generator','g2',9),room('ventilation','v2',11)];
    const grid=circuit([1,2,3,9,10,11]);
    const allocation=allocatePower(grid,rooms,mods);
    expect(allocation.networks).toHaveLength(2);
    expect(entry(allocation,'w1').networkId).not.toBe(entry(allocation,'v2').networkId);
    const disconnected=allocatePower(circuit([1,2,9,10,11]),rooms,mods);
    expect(entry(disconnected,'w1').status).toBe('disconnected');
    expect(entry(disconnected,'v2').status).toBe('online');
  });

  it('releases capacity for deliberately paused or disabled appliances',()=>{
    const rooms=[room('generator','g',1),room('waterTreatment','w',3),
      room('ventilation','v',5),room('kitchen','k',7)];
    const grid=circuit([1,2,3,4,5,6,7]);
    const enabled=allocatePower(grid,rooms,mods);
    const disabled=allocatePower(grid,rooms,mods,new Map([['w',0],['v',0],['k',0]]));
    expect(disabled.networks[0].demand).toBe(0);
    expect(enabled.networks[0].demand).toBe(4);
    expect(appliancePowerDemand(rooms[2])).toBe(1);
  });

  it('reserves capacity without debiting an appliance twice in the resource engine',()=>{
    const rooms=[room('generator','g',1),room('waterTreatment','w',3)];
    const allocation=allocatePower(circuit([1,2,3]),rooms,mods);
    const engine=ResourceEngine.create();
    engine.advance(5000,rooms,mods,allocation);
    expect(engine.snapshot().stock.power).toBe(22); // 12 initial + 10 generated; no phantom water debit.
    const water=new WaterProductionProcessor();
    water.advance(10_000,rooms,{
      available:()=>engine.snapshot().stock.power,
      spend:(n:number)=>engine.spendPower(n)
    },new Set(allocation.activeRoomIds));
    expect(engine.snapshot().stock.power).toBe(22-WATER_CONFIG.recipe.power);
    expect(water.snapshot().completed).toBe(1);
  });

  it('preserves saved network schema and restores live allocations after reload',()=>{
    const game=GameSession.create();
    const state=game.snapshot();
    expect(GameSession.restore(state)?.snapshot()).toEqual(state);
    expect(state.power.schemaVersion).toBe(1);
  });
});
