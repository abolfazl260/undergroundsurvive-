import { expect,it } from 'vitest';
import { GameSession } from '../economy/session';
function setup(){const s=GameSession.create();expect(s.build('habitat',8,-1).ok).toBe(true);return {s,id:s.layout.rooms.at(-1)!.id};}
it('adds exact capacity without spawning and gates admission by real beds',()=>{
 const s=GameSession.create();expect(s.dormitory.populationCapacity).toBe(2);expect(s.survivors.survivors).toHaveLength(3);
 expect(s.admitSurvivor('new','Newcomer',{x:0,y:-1})).toBe(false);
 expect(s.build('habitat',8,-1).ok).toBe(true);expect(s.dormitory.populationCapacity).toBe(4);expect(s.survivors.survivors).toHaveLength(3);
 expect(s.admitSurvivor('new','Newcomer',{x:0,y:-1})).toBe(true);
 expect(s.admitSurvivor('new','Newcomer',{x:10,y:-1})).toBe(false);
 expect(s.admitSurvivor('extra','Extra',{x:10,y:-1})).toBe(false);
 expect(GameSession.restore(s.snapshot())!.survivors.survivors).toHaveLength(4);
});
it('reserves a unique bed but reduces fatigue only after arrival and preserves residence after stopping',()=>{
 const {s,id}=setup(),before=s.survivors.survivors[2].fatigue;
 expect(s.startRest('resident-3',id,'rest')).toBeNull();
 expect(s.dormitory.assignments).toHaveLength(1);expect(s.survivors.assignment('resident-3')?.state).toBe('enRoute');
 expect(s.survivors.survivors[2].fatigue).toBe(before);
 s.advanceTime(50);expect(s.survivors.survivors[2].fatigue).toBeGreaterThanOrEqual(before);
 s.advanceTime(5000);expect(s.survivors.survivors[2].fatigue).toBeLessThan(before);
 expect(s.startRest('resident-3',id,'rest')).toBe('duplicate');
 expect(s.startRest('resident-3',id,'other')).toBe('busy');
 expect(s.dormitory.scheduler.stop('resident-3')).toBe(true);expect(s.dormitory.assignments).toHaveLength(1);
 expect(s.survivors.assignments).toHaveLength(0);
});
it('enforces bed and active-rest capacity without conflicting work, and frees beds on deletion',()=>{
 const {s,id}=setup();s.startRest('resident-3',id,'a');expect(s.startRest('resident-2',id,'b')).toBeNull();
 expect(s.startRest('resident-1',id,'c')).toBe('capacity');
 expect(new Set(s.dormitory.assignments.map(b=>b.roomId+':'+b.slot)).size).toBe(2);
 s.advanceTime(12000);expect(s.dormitory.rooms.find(r=>r.roomId===id)?.resting).toBe(2);
 expect(s.survivors.assign('resident-3',id,'guard','work')).not.toBeNull();
 expect(s.removeRoom(id).ok).toBe(true);expect(s.dormitory.assignments).toHaveLength(0);
 expect(s.survivors.survivors).toHaveLength(3);expect(s.dormitory.populationCapacity).toBe(2);
 expect(s.dormitory.snapshot().overCapacity).toBe(1);expect(s.survivors.assignments).toHaveLength(0);
});
it('preserves fatigue, bed ownership and rest progress through repeated reload and pause',()=>{
 const {s,id}=setup();s.startRest('resident-3',id,'a');s.advanceTime(7000);
 const snapshot=s.snapshot();let loaded=GameSession.restore(snapshot)!;
 for(let i=0;i<4;i++)loaded=GameSession.restore(loaded.snapshot())!;
 expect(loaded.snapshot()).toEqual(snapshot);
 const before=loaded.survivors.survivors[2].fatigue;
 loaded.dormitory.scheduler.stop('resident-3');expect(loaded.startRest('resident-3',id,'again')).toBeNull();
 expect(loaded.survivors.survivors[2].fatigue).toBe(before);
 expect(loaded.dormitory.assignments).toHaveLength(1);
});
it('upgrades exact bed capacity and recovery rate, completes safely at zero fatigue',()=>{
 const {s,id}=setup();expect(s.upgradeRoom(id).ok).toBe(true);
 expect(s.dormitory.rooms.find(r=>r.roomId===id)).toMatchObject({bedCapacity:4,restRate:1.5});
 const raw=s.snapshot();raw.survivors.survivors[2].fatigue=1;
 const rested=GameSession.restore(raw)!;rested.startRest('resident-3',id,'a');rested.advanceTime(5000);
 expect(rested.survivors.survivors[2].fatigue).toBeGreaterThanOrEqual(0);
 expect(rested.survivors.assignment('resident-3')).toBeUndefined();expect(rested.dormitory.assignments).toHaveLength(1);
 const full=rested.snapshot();full.survivors.survivors[2].fatigue=0;
 expect(GameSession.restore(full)!.startRest('resident-3',id,'fully-rested')).toBe('satisfied');
});
it('cleans deleted survivors and orphan beds and does not resurrect retired IDs',()=>{
 const {s,id}=setup();s.startRest('resident-3',id,'a');expect(s.survivors.remove('resident-3')).toBe(true);
 expect(s.dormitory.assignments).toHaveLength(0);expect(s.survivors.traffic.getResident('resident-3')).toBeUndefined();
 expect(s.admitSurvivor('resident-3','Duplicate',{x:7,y:-1})).toBe(false);
 const loaded=GameSession.restore(s.snapshot())!;expect(loaded.survivors.survivors).toHaveLength(2);
 const raw=setup();raw.s.startRest('resident-3',raw.id,'a');const orphan=raw.s.snapshot();orphan.dormitory.beds[0].survivorId='deleted';
 const fixed=GameSession.restore(orphan)!;expect(fixed.dormitory.assignments).toHaveLength(0);expect(fixed.survivors.assignments).toHaveLength(0);
});
it('rejects corrupt or duplicate beds and migrates old saves without creating bed claims',()=>{
 const {s,id}=setup();s.startRest('resident-3',id,'a');const raw=s.snapshot();raw.dormitory.beds.push({...raw.dormitory.beds[0]});
 expect(GameSession.restore(raw)).toBeNull();
 const old={...s.snapshot(),schemaVersion:16,dormitory:undefined,survivors:{...s.snapshot().survivors,schemaVersion:2,retiredIds:undefined,assignments:[]}};
 const loaded=GameSession.restore(old)!;expect(loaded.dormitory.assignments).toHaveLength(0);expect(loaded.survivors.survivors[0].fatigue).toBe(50);
});
it('matches rest and stats across frame partitions without wall-clock gains',()=>{
 const a=setup(),b=setup();a.s.startRest('resident-3',a.id,'a');b.s.startRest('resident-3',b.id,'a');
 a.s.advanceTime(12000);for(let i=0;i<120;i++)b.s.advanceTime(100);
 expect(a.s.snapshot()).toEqual(b.s.snapshot());
});
it('releases residence and rest on relocation without teleporting the resident',()=>{
 const {s,id}=setup();s.startRest('resident-3',id,'a');s.advanceTime(600);
 const before=s.survivors.traffic.getResident('resident-3')!.position;
 expect(s.dig(4,-2).ok).toBe(true);expect(s.moveRoom(id,3,-2).ok).toBe(true);
 expect(s.dormitory.assignments).toHaveLength(0);expect(s.survivors.assignment('resident-3')).toBeUndefined();
 expect(s.survivors.traffic.getResident('resident-3')!.position).toEqual(before);
});
