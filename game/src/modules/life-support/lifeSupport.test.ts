import { describe, expect, it } from 'vitest';
import { ROOM_DEFINITIONS, type RoomType } from '../building/catalog';
import type { Room } from '../building/placement';
import { GameSession } from '../economy/session';
import { LifeSupportGraph, LifeSupportService, lifeSupportDemands, oxygenCapacity, linkKey, findLifeSupportRoute } from './lifeSupport';

function room(type: RoomType, id: string, x: number, level = 1): Room {
  return { id, type, x, y: -3, width: ROOM_DEFINITIONS[type].width,
    height: ROOM_DEFINITIONS[type].height, level };
}
const rooms = [room('waterTreatment', 'water', 0), room('habitat', 'home', 2),
  room('ventilation', 'vent', 4)];
function setup() {
  const service = new LifeSupportService();
  let water = 20, spent = 0;
  const adapter = {available: () => water, capacity: () => 30,
    spend: (amount: number) => { if (water < amount) return false; water -= amount; spent += amount; return true; }};
  const advance = (input: readonly Room[] = rooms, powered = true, population = 2) =>
    service.tick(input, adapter, {population:()=>population}, {powered:()=>powered},
      [{id:'vent', powered}]);
  return {service, adapter, advance, remaining:()=>water, spent:()=>spent, emptyWater:()=>{water=0;}};
}
describe('life-support graph and deterministic distribution', () => {
  it('uses physical port edges and separately controlled isolation valves', () => {
    const a = new LifeSupportGraph(rooms);
    expect(a.links.map(l=>linkKey(l.a,l.b))).toEqual(['home::vent','home::water']);
    expect(a.zones).toHaveLength(1);
    const b = new LifeSupportGraph(rooms, ['home::water']);
    expect(b.zones).toHaveLength(2);
    expect(b.zones.find(z=>z.ids.includes('water'))?.hasOxygen).toBe(false);
  });
  it('reserves bounded per-tick transport with reproducible routes', () => {
    const graph = new LifeSupportGraph(rooms);
    const cap = new Map(graph.links.map(l => [linkKey(l.a,l.b),l.capacity] as const));
    expect(findLifeSupportRoute(graph,['water'],'vent',2,cap)).toEqual(['home::vent','home::water']);
    expect(findLifeSupportRoute(graph,['water'],'vent',9,cap)).toBeNull();
    cap.set('home::water',1);
    expect(findLifeSupportRoute(graph,['water'],'vent',2,cap)).toBeNull();
  });
  it('sorts resident demand once, before medical and secondary demand', () => {
    const input = [room('hydroponics','garden', 6),room('medbay','med',8),room('habitat','b',2),
      room('habitat','a',0)];
    const demand = lifeSupportDemands(input, 5);
    expect(demand.map(d=>d.id)).toEqual(['a','b','med','garden']);
    expect(demand.filter(d=>d.priority==='vital').reduce((n,d)=>n+d.water,0)).toBe(5);
    expect(demand[0].oxygen).toBe(3);
  });
  it('respects the legacy grace window, produces oxygen and never double-debits', () => {
    const s=setup();
    for(let i=0;i<36;i++) s.advance();
    expect(s.spent()).toBe(0);
    expect(s.service.snapshot().graceTicks).toBe(0);
    s.advance();
    expect(s.spent()).toBe(2);
    expect(s.service.snapshot().lastOxygenUsed).toBe(2);
    expect(s.service.snapshot().oxygen).toBeGreaterThanOrEqual(0);
    expect(s.service.view(rooms,s.adapter).rooms.every(r=>r.status==='online')).toBe(true);
  });
  it('isolation degrades affected zone without disabling the connected ventilation zone', () => {
    const s=setup();
    for(let i=0;i<36;i++)s.advance();
    expect(s.service.toggleLink('home','water',rooms)).toBe(true);
    s.advance();
    const state=s.service.snapshot();
    expect(state.roomStatuses.find(r=>r.id==='home')).toMatchObject({status:'degraded',missing:['water']});
    expect(state.roomStatuses.find(r=>r.id==='vent')?.status).toBe('online');
    expect(state.events).toContainEqual({type:'survivor-exposure',resource:'water',roomId:'home',tick:37});
    expect(s.spent()).toBe(0);
    expect(s.service.toggleLink('home','water',rooms)).toBe(true);
    s.advance();
    expect(s.spent()).toBe(2);
  });
  it('does not consume oxygen when required water is missing', () => {
    const s=setup();
    for(let i=0;i<36;i++)s.advance(rooms,false);
    s.emptyWater();
    const before=s.service.snapshot().oxygen;
    s.advance(rooms,false);
    expect(s.service.snapshot().oxygen).toBe(before);
    expect(s.service.snapshot().lastOxygenUsed).toBe(0);
    expect(s.service.snapshot().roomStatuses.find(r=>r.id==='home')?.status).toBe('degraded');
  });

  it('keeps separate water and oxygen stocks in physically isolated networks', () => {
    const east=[room('waterTreatment','water2',10),room('habitat','home2',12),room('ventilation','vent2',14)];
    const both=[...rooms,...east];
    const life=new LifeSupportService();
    let balance=20;
    const ledger: {id:number;roomId:string;clean:number}[]=[];
    const w={available:()=>balance,capacity:()=>80,
      spend:(n:number)=>{if(balance<n)return false;balance-=n;return true;},
      records:()=>ledger};
    const step=()=>life.tick(both,w,{population:()=>4},{powered:()=>true},
      [{id:'vent',powered:true},{id:'vent2',powered:true}]);
    step();
    balance+=10;ledger.push({id:1,roomId:'water2',clean:10});step();
    for(let i=2;i<36;i++)step();
    expect(life.snapshot().waterLots.water2).toBe(10);
    expect(life.view(both,w).zones).toHaveLength(2);
    step();
    const states=life.snapshot().roomStatuses;
    expect(states.find(r=>r.id==='home')?.status).toBe('online');
    expect(states.find(r=>r.id==='home2')?.status).toBe('online');
    // Closing west water supply does not let west steal from east.
    expect(life.toggleLink('water','home',both)).toBe(true);
    step();
    expect(life.snapshot().roomStatuses.find(r=>r.id==='home')?.status).toBe('degraded');
    expect(life.snapshot().roomStatuses.find(r=>r.id==='home2')?.status).toBe('online');
    expect(LifeSupportService.restore(life.snapshot())?.snapshot()).toEqual(life.snapshot());
  });
  it('clamps capacity, invalidates stale links, and rejects corrupted persisted values', () => {
    const s=setup(), initial=s.service.snapshot();
    expect(oxygenCapacity([room('storage','store',10,2)])).toBe(80);
    expect(s.service.toggleLink('home','vent',rooms)).toBe(true);
    s.service.sync([rooms[0]]);
    expect(s.service.snapshot().closedLinks).toEqual([]);
    expect(LifeSupportService.restore(initial)?.snapshot()).toEqual(initial);
    expect(LifeSupportService.restore({...initial,oxygen:-1})).toBeNull();
    expect(LifeSupportService.restore({...initial,closedLinks:['a::b','a::b']})).toBeNull();
    expect(s.service.toggleLink('home','ghost',rooms)).toBe(false);
  });
  it('migrates v13 games to v14 with no lost world, wallet or resource progress', () => {
    const game=GameSession.create();
    const fresh=game.snapshot();
    const legacy= {...fresh,schemaVersion:13,lifeSupport:undefined,lifeSupportView:undefined};
    const restored=GameSession.restore(legacy);
    expect(restored).not.toBeNull();
    expect(restored!.snapshot().schemaVersion).toBe(16);
    expect(restored!.snapshot().base).toEqual(fresh.base);
    expect(restored!.snapshot().resources).toEqual(fresh.resources);
    expect(restored!.snapshot().lifeSupport.graceTicks).toBe(36);
    expect(GameSession.restore(restored!.snapshot())?.snapshot()).toEqual(restored!.snapshot());
  });
});
