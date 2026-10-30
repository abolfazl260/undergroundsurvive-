import { expect,it } from 'vitest';
import { GameSession } from '../economy/session';
function setup(){const s=GameSession.create();expect(s.build('recreation',8,-1).ok).toBe(true);return {s,id:s.layout.rooms.at(-1)!.id};}
it('reserves capacity and charges once but grants no morale before arrival',()=>{
 const {s,id}=setup(),before=s.survivors.survivors[2].morale,power=s.resources.snapshot().stock.power;
 expect(s.assignRecreation('resident-3',id,'visit')).toBeNull();
 expect(s.resources.snapshot().stock.power).toBe(power-1);
 expect(s.survivors.survivors[2].morale).toBe(before);
 expect(s.assignRecreation('resident-2',id,'full')).toBe('capacity');
 expect(s.assignRecreation('resident-3',id,'visit')).toBe('duplicate');
 s.advanceTime(50);expect(s.survivors.survivors[2].morale).toBeLessThanOrEqual(before);
 s.advanceTime(5000);expect(s.survivors.survivors[2].morale).toBeGreaterThan(before);
 expect(s.survivors.recreationVisits[0].startedAt).not.toBeNull();
});
it('persists remaining visit time and never rewards repeated reload or rapid reassignment',()=>{
 const {s,id}=setup();s.assignRecreation('resident-3',id,'visit');s.advanceTime(6000);
 const before=s.snapshot();let loaded=GameSession.restore(before)!;
 for(let i=0;i<5;i++)loaded=GameSession.restore(loaded.snapshot())!;
 expect(loaded.snapshot()).toEqual(before);
 const morale=loaded.survivors.survivors[2].morale;
 loaded.survivors.release('resident-3');expect(loaded.assignRecreation('resident-3',id,'again')).toBeNull();
 expect(loaded.survivors.survivors[2].morale).toBe(morale);
 expect(loaded.assignScientist('resident-3',id,'work')).not.toBeNull();
});
it('stops safely on power loss, releases on demolition and applies upgrade rate/capacity',()=>{
 const {s,id}=setup();s.assignRecreation('resident-3',id,'visit');s.advanceTime(5000);
 const elapsed=s.survivors.recreationVisits[0].elapsedMs,morale=s.survivors.survivors[2].morale;
 s.resources.spendPower(s.resources.snapshot().stock.power);s.advanceTime(500);
 expect(s.survivors.recreationVisits[0].elapsedMs).toBe(elapsed);
 expect(s.survivors.survivors[2].morale).toBeLessThanOrEqual(morale);
 expect(s.removeRoom(id).ok).toBe(true);expect(s.survivors.assignments).toHaveLength(0);
 const next=setup();expect(next.s.upgradeRoom(next.id).ok).toBe(true);
 expect(next.s.assignRecreation('resident-3',next.id,'a')).toBeNull();
 expect(next.s.assignRecreation('resident-2',next.id,'b')).toBeNull();
 next.s.advanceTime(10000);expect(next.s.survivors.recreationVisits.every(v=>v.state==='active')).toBe(true);
 expect(next.s.survivors.traffic.residents.slice(1,3).every(r=>
   next.s.layout.getRoomAt(r.cell.x,r.cell.y)?.id===next.id)).toBe(true);
 expect(next.s.survivors.survivors[2].morale).toBeGreaterThan(60);
});
it('caps morale, ends visits, validates clocks/stats and migrates legacy survivor saves',()=>{
 const {s,id}=setup(),raw=s.snapshot();raw.survivors.survivors[2].morale=99;
 const high=GameSession.restore(raw)!;high.assignRecreation('resident-3',id,'a');high.advanceTime(5000);
 expect(high.survivors.survivors[2].morale).toBeLessThanOrEqual(100);
 expect(high.survivors.recreationVisits).toHaveLength(0);
 const full=high.snapshot();full.survivors.survivors[2].morale=100;
 expect(GameSession.restore(full)!.assignRecreation('resident-3',id,'full')).toBe('satisfied');
 const clock=structuredClone(full);clock.survivors.nowMs+=50;expect(GameSession.restore(clock)).toBeNull();
 const bad=structuredClone(full);bad.survivors.survivors[2].morale=NaN;expect(GameSession.restore(bad)).toBeNull();
 const old={...raw,schemaVersion:10,survivors:{...raw.survivors,schemaVersion:1,nowMs:undefined,survivors:raw.survivors.survivors.map(({id,name})=>({id,name}))}};
 expect(GameSession.restore(old)!.survivors.survivors[2].morale).toBe(50);
});
it('produces identical morale and visit progress across frame partitions',()=>{
 const a=setup(),b=setup();a.s.assignRecreation('resident-3',a.id,'a');b.s.assignRecreation('resident-3',b.id,'a');
 a.s.advanceTime(12000);for(let i=0;i<120;i++)b.s.advanceTime(100);
 expect(a.s.snapshot()).toEqual(b.s.snapshot());
});
