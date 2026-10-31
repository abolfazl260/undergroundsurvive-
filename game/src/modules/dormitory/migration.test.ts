import { readFileSync } from 'node:fs';
import { expect,it } from 'vitest';
import { GameSession } from '../economy/session';
// Captured using actual schema-16 main (80e24b2), not a downgraded v17 snapshot.
const saved16=JSON.parse(readFileSync(new URL('./fixtures/schema16.json',import.meta.url),'utf8'));
it('migrates real v16 paid research, physical power, life support and all existing progress without replacement',()=>{
 const game=GameSession.restore(saved16);expect(game).not.toBeNull();const next=game!.snapshot();
 expect(next.schemaVersion).toBe(17);
 for(const key of ['base','wallet','resources','power','lifeSupport','air','water','kitchen','research','radiation','commandCenter','achievements','guardPosts'] as const)expect(next[key],key).toEqual(saved16[key]);
 expect(next.research.activeResearchId).toBe('food-1');expect(next.research.operations).toContain('fixture-paid-research');
 expect(next.survivors.traffic).toEqual(saved16.survivors.traffic);
 expect(next.survivors.assignments).toEqual(saved16.survivors.assignments);
 expect(next.survivors.survivors.map(p=>p.morale)).toEqual(saved16.survivors.survivors.map((p:{morale:number})=>p.morale));
 expect(next.survivors.survivors.every(p=>p.fatigue===50)).toBe(true);
 expect(next.dormitory.beds).toHaveLength(0);
 expect(GameSession.restore(next)!.snapshot()).toEqual(next);
});
it('respects live circuit power during rest without losing paid reservation or granting reload recovery',()=>{
 const game=GameSession.create();expect(game.build('habitat',8,-1).ok).toBe(true);const id=game.layout.rooms.at(-1)!.id;
 expect(game.startRest('resident-3',id,'powered-rest')).toBeNull();game.advanceTime(5000);
 expect(game.survivors.assignment('resident-3')?.state).toBe('active');
 expect(game.resources.snapshot().stock.power).toBeGreaterThan(1);
 expect(game.removeCable(7,-1).ok).toBe(true);
 expect(game.survivors.assignment('resident-3')?.state).toBe('suspended');
 const elapsed=game.survivors.assignment('resident-3')!.elapsedMs,before=game.survivors.survivors[2].fatigue;
 game.advanceTime(1000);
 expect(game.survivors.assignment('resident-3')!.elapsedMs).toBe(elapsed);
 expect(game.survivors.survivors[2].fatigue).toBeGreaterThanOrEqual(before);
 const saved=game.snapshot(),loaded=GameSession.restore(saved)!;
 expect(loaded.snapshot()).toEqual(saved);expect(loaded.dormitory.assignments).toHaveLength(1);
 expect(loaded.installCable(7,-1).ok).toBe(true);loaded.advanceTime(1000);
 expect(loaded.survivors.assignment('resident-3')?.state).toBe('active');
 expect(loaded.survivors.survivors[2].fatigue).toBeLessThan(before);
});
it('freezes rest and rejects new admission and rest once breathable air reaches zero',()=>{
 const game=GameSession.create();game.startRest('resident-1','initial-habitat','sleep');game.advanceTime(2000);
 const raw=game.snapshot();raw.air.quality=0;const ended=GameSession.restore(raw)!;
 const before=ended.snapshot();expect(ended.advanceTime(5000)).toBe(0);
 expect(ended.startRest('resident-2','initial-habitat','end')).not.toBeNull();
 expect(ended.admitSurvivor('new','New',{x:0,y:-1})).toBe(false);
 expect(ended.snapshot()).toEqual(before);
});
it('rejects invalid fatigue in new saves rather than resetting the run or fabricating recovery',()=>{
 const raw=GameSession.create().snapshot();
 for(const fatigue of [-1,101,NaN,Infinity]){const bad=structuredClone(raw);bad.survivors.survivors[0].fatigue=fatigue;expect(GameSession.restore(bad)).toBeNull();}
});
it('uses all upgraded bunk beds with current nonblocking room navigation',()=>{
 const game=GameSession.create();game.upgradeRoom('initial-habitat');
 expect(game.dormitory.populationCapacity).toBe(4);
 for(const id of ['resident-1','resident-2','resident-3'])expect(game.startRest(id,'initial-habitat','sleep-'+id)).toBeNull();
 game.advanceTime(5000);expect(game.dormitory.rooms[0]).toMatchObject({bedCapacity:4,occupiedBeds:3,resting:3});
});
