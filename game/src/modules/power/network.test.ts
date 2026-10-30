import { describe, expect, it } from 'vitest';
import { ROOM_DEFINITIONS, type RoomType } from '../building/catalog';
import type { Room } from '../building/placement';
import { ResourceEngine } from '../economy/resources';
import { GameSession } from '../economy/session';
import { TerrainMap } from '../world/terrain';
import {
  allocatePower, canActivateNetwork, canWire, installWire, legacyPower, removeWire,
  restorePower, setRoomPriority, starterPower, type PowerSnapshot
} from './network';

const modifiers={powerProduction:1,foodProduction:1};
const room=(type:RoomType,id:string,x:number,y=-1):Room=>({
  id,type,x,y,level:1,width:ROOM_DEFINITIONS[type].width,height:1
});
const cables=(positions:readonly number[],y=-1):PowerSnapshot=>({
  schemaVersion:1,mode:'physical',overrides:[],
  cables:positions.map(x=>({x,y,riser:false}))
});
const status=(allocation:ReturnType<typeof allocatePower>,id:string)=>
  allocation.rooms.find(s=>s.roomId===id)?.status;

describe('explicit deterministic power topology',()=>{
  it('requires physical wiring for consumption, even if global stored power exists',()=>{
    const rooms=[room('generator','g',1),room('command','c',3),
      room('habitat','h',6),room('mine','off',10)];
    const power=cables([1,2,3,4,5,6,10]);
    const allocation=allocatePower(power,rooms,modifiers);
    expect(status(allocation,'g')).toBe('online');
    expect(status(allocation,'c')).toBe('online');
    expect(status(allocation,'h')).toBe('online');
    expect(status(allocation,'off')).toBe('shed');
    const engine=ResourceEngine.create();
    engine.advance(5000,rooms,modifiers,allocation);
    expect(engine.snapshot().stock.power).toBe(20);
    expect(engine.snapshot().stock.meal).toBe(10);
    expect(engine.snapshot().stock.ore).toBe(0);
    expect(engine.snapshot().lastShortages).toContain('power');
    expect(engine.snapshot().inactiveRooms).toBe(1);
  });

  it('cutting a cable only isolates the downstream rooms; reconnect restores service',()=>{
    const rooms=[room('generator','g',1),room('command','c',3),room('habitat','h',6)];
    const complete=cables([1,2,3,4,5,6]);
    const cut=removeWire(complete,4,-1)!;
    expect(status(allocatePower(cut,rooms,modifiers),'c')).toBe('online');
    expect(status(allocatePower(cut,rooms,modifiers),'h')).toBe('shed');
    const fixed=installWire(cut,new TerrainMap(),4,-1)!;
    expect(allocatePower(fixed,rooms,modifiers)).toEqual(allocatePower(complete,rooms,modifiers));
  });

  it('sheds low-priority loads in a stable order with no partial recipe debit',()=>{
    const rooms=[room('generator','g',1),room('command','c',3),room('medbay','m',5),
      room('habitat','h',7),room('hydroponics','garden',9),room('mine','mine',11)];
    const allocation=allocatePower(cables([1,2,3,4,5,6,7,8,9,10,11]),rooms,modifiers);
    expect(status(allocation,'c')).toBe('online');
    expect(status(allocation,'m')).toBe('online');
    expect(status(allocation,'h')).toBe('online');
    expect(status(allocation,'garden')).toBe('online');
    expect(status(allocation,'mine')).toBe('shed');
    const engine=ResourceEngine.create();
    engine.advance(5000,rooms,modifiers,allocation);
    expect(engine.snapshot().stock.ore).toBe(0);
    const reordered=allocatePower(cables([11,4,5,8,10,7,1,9,6,3,2]),rooms.slice().reverse(),modifiers);
    expect(reordered.rooms).toEqual(allocation.rooms);
  });

  it('vertical conduction needs risers at both ends; elevator alone is not a conductor',()=>{
    const rooms=[room('generator','g',1,-2),room('command','c',1,-1)];
    const plain:PowerSnapshot={schemaVersion:1,mode:'physical',overrides:[],cables:[
      {x:1,y:-2,riser:false},{x:1,y:-1,riser:false}
    ]};
    expect(status(allocatePower(plain,rooms,modifiers),'c')).toBe('shed');
    const wired:PowerSnapshot={...plain,cables:plain.cables.map(c=>({...c,riser:true}))};
    expect(status(allocatePower(wired,rooms,modifiers),'c')).toBe('online');
    expect(canWire(wired,new TerrainMap(),4,-3,false)).not.toBeNull();
  });

  it('validates serialized wiring, duplicates, priority override limits and legacy mode',()=>{
    const layout=GameSession.create().layout;
    const old=legacyPower();
    expect(canActivateNetwork(old,layout.rooms,modifiers)).toBe(false);
    const migrated={...old,cables:starterPower().cables};
    expect(canActivateNetwork(migrated,layout.rooms,modifiers)).toBe(true);
    expect(restorePower(migrated,layout.rooms,layout.terrain)).not.toBeNull();
    expect(restorePower({...migrated,cables:[...migrated.cables,migrated.cables[0]]},
      layout.rooms,layout.terrain)).toBeNull();
    const command=layout.rooms.find(r=>r.type==='command')!;
    expect(setRoomPriority(migrated,command,2)).toBeNull();
    expect(setRoomPriority(migrated,command,1)?.overrides[0]?.priority).toBe(1);
    expect(restorePower({...migrated,cables:[{x:5,y:-4,riser:false}]},
      layout.rooms,layout.terrain)).toBeNull();
  });

  it('charges cables atomically and migrates pre-network saves without power outages',()=>{
    const session=GameSession.create();
    const initial=session.snapshot();
    expect(session.installCable(5,-4).ok).toBe(false);
    expect(session.snapshot()).toEqual(initial);
    expect(session.installCable(0,-1).ok).toBe(true);
    expect(session.wallet.balance).toBe(initial.wallet.balance-15);
    const paid=session.snapshot();
    expect(session.installCable(0,-1).ok).toBe(false);
    expect(session.snapshot()).toEqual(paid);
    expect(session.removeCable(0,-1).ok).toBe(true);
    expect(GameSession.restore(session.snapshot())?.snapshot()).toEqual(session.snapshot());

    const original=GameSession.create().snapshot();
    const old={...original,schemaVersion:13,power:undefined};
    const loaded=GameSession.restore(old)!;
    expect(loaded.power.mode).toBe('legacy');
    expect(loaded.powerStatus().rooms.every(r=>r.status==='legacy')).toBe(true);
    loaded.advanceTime(5000);
    expect(loaded.resources.snapshot().tickCount).toBe(1);
    expect(loaded.activatePowerNetwork().ok).toBe(false);
    for(const cable of starterPower().cables)expect(loaded.installCable(cable.x,cable.y,cable.riser).ok).toBe(true);
    expect(loaded.activatePowerNetwork().ok).toBe(true);
    expect(GameSession.restore(loaded.snapshot())?.power.mode).toBe('physical');
  });
});
