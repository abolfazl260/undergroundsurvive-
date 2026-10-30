import { expect,it } from 'vitest';
import { GameSession } from '../economy/session';
import { ResearchScheduler } from '../research/research';
import { laboratoryFacilities,researchFacility } from './laboratory';
function setup(){const s=GameSession.create();expect(s.build('laboratory',3,-1).ok).toBe(true);return s;}
it('rejects unstaffed research without charging and waits for real arrival',()=>{
 const s=setup(),id=s.layout.rooms.find(r=>r.type==='laboratory')!.id,balance=s.wallet.balance;
 expect(s.startResearch('power-1','no-staff')).toBe(false);expect(s.wallet.balance).toBe(balance);
 expect(s.assignScientist('resident-1',id,'staff')).toBeNull();
 expect(s.startResearch('power-1','in-transit')).toBe(false);
 s.advanceTime(5000);expect(s.researchFacility()).toMatchObject({level:1,powered:true,staffed:true});
 expect(s.startResearch('power-1','research')).toBe(true);
 expect(s.startResearch('food-1','parallel')).toBe(false);
});
it('suspends on removal and resumes with progress and payment intact after rebuilding',()=>{
 const s=setup(),id=s.layout.rooms.find(r=>r.type==='laboratory')!.id;
 s.assignScientist('resident-1',id,'staff');s.advanceTime(5000);s.startResearch('power-1','research');s.advanceTime(5000);
 const before=s.research.snapshot(),remaining=before.completeAt!-before.nowMs,balance=s.wallet.balance;
 expect(s.removeRoom(id).ok).toBe(true);s.advanceTime(10000);
 expect(s.research.snapshot().completeAt!-s.research.snapshot().nowMs).toBe(remaining);
 expect(s.wallet.balance).toBe(balance);
 const loaded=GameSession.restore(s.snapshot())!;
 expect(loaded.research.snapshot()).toEqual(s.research.snapshot());
 expect(loaded.build('laboratory',3,-1).ok).toBe(true);const newId=loaded.layout.rooms.at(-1)!.id;
 expect(loaded.assignScientist('resident-1',newId,'new-staff')).toBeNull();loaded.advanceTime(15000);
 expect(loaded.research.snapshot().unlockedTechnologyIds).toContain('power-1');
 expect(loaded.research.snapshot().operations).toEqual(['research']);
});
it('enforces unique scientists and capacity, and applies a single facility modifier',()=>{
 const s=setup(),id=s.layout.rooms.find(r=>r.type==='laboratory')!.id;
 s.assignScientist('resident-1',id,'staff');
 expect(s.assignScientist('resident-1',id,'again')).toBe('busy');
 expect(s.assignScientist('resident-2',id,'full')).toBe('capacity');
 expect(s.upgradeRoom(id).ok).toBe(true);
 expect(s.assignScientist('resident-2',id,'second')).toBeNull();s.advanceTime(5000);
 expect(s.researchFacility().speedMultiplier).toBe(1.1);
 const facilities=laboratoryFacilities(s.layout.rooms,s.survivors.assignments,10);
 expect(researchFacility([...facilities,...facilities]).speedMultiplier).toBe(1.1);
 expect(GameSession.restore(s.snapshot())!.researchFacility()).toEqual(s.researchFacility());
});
it('preserves progress while no staff or power is available and cannot finish at outage',()=>{
 const r=new ResearchScheduler(),active={level:1,powered:true,staffed:true};r.start('power-1','one',active,100,()=>true);
 r.advanceTo(10000,active);r.advanceTo(15000,{...active,staffed:false});
 expect(r.snapshot().activeResearchId).toBe('power-1');expect(r.snapshot().completeAt).toBe(20000);
 r.advanceTo(20000,{...active,powered:false});expect(r.snapshot().completeAt).toBe(25000);
 expect(r.advanceTo(25000,active)).toBe('power-1');
});
