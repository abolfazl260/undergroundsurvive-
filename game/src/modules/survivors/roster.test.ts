import { describe, expect, it } from 'vitest';
import { GameSession } from '../economy/session';
import { BuildingLayout } from '../building/layout';
import { SurvivorRoster } from './roster';
import { GuardPosts } from '../defense/guardPost';
function setup() {
  const session=GameSession.create();
  expect(session.build('guardPost',8,-1).ok).toBe(true);
  return session;
}
describe('guard assignments and defense adapter',()=>{
 it('reserves capacity but activates only after physical arrival',()=>{
  const s=setup(),room=s.layout.rooms.find(r=>r.type==='guardPost')!;
  expect(s.assignGuard('resident-3',room.id,'a')).toBeNull();
  expect(s.guardPosts.getDefensePosts()[0]).toMatchObject({guards:0,enRoute:1,readiness:0});
  expect(s.survivors.assign('resident-2',room.id,'guard','b')).toBe('capacity');
  s.advanceTime(10000);
  expect(s.survivors.assignment('resident-3')?.state).toBe('active');
  expect(s.guardPosts.getDefensePosts()[0]).toMatchObject({guards:1,readiness:1});
  const cell=s.survivors.traffic.getResident('resident-3')!.cell;
  expect(s.layout.getRoomAt(cell.x,cell.y)?.id).toBe(room.id);

 });
 it('rejects duplicate and incompatible assignments and preserves movement across reload',()=>{
  const s=setup(),room=s.layout.rooms.find(r=>r.type==='guardPost')!;
  expect(s.assignGuard('resident-3',room.id,'a')).toBeNull();s.advanceTime(350);
  const before=s.survivors.traffic.getResident('resident-3')!.position;
  const restored=GameSession.restore(s.snapshot())!;
  expect(restored).not.toBeNull();
  expect(restored.survivors.traffic.getResident('resident-3')!.position).toEqual(before);
  expect(restored.survivors.assign('resident-3',room.id,'guard','b')).toBe('busy');
  expect(restored.survivors.release('resident-3')).toBe(true);
  expect(restored.survivors.assign('resident-3',room.id,'guard','a')).toBe('duplicate');
  expect(restored.survivors.traffic.residents).toHaveLength(3);
 });
 it('releases on demolition or movement without losing the survivor',()=>{
  const s=setup(),room=s.layout.rooms.find(r=>r.type==='guardPost')!;
  s.assignGuard('resident-3',room.id,'a');s.advanceTime(300);
  const position=s.survivors.traffic.getResident('resident-3')!.position;
  expect(s.removeRoom(room.id).ok).toBe(true);
  expect(s.survivors.assignments).toHaveLength(0);
  expect(s.survivors.traffic.getResident('resident-3')!.position).toEqual(position);
  expect(s.guardPosts.getDefensePosts()).toHaveLength(0);
 });
 it('reflects upgrades, health, power and externally owned equipment',()=>{
  const s=setup(),room=s.layout.rooms.find(r=>r.type==='guardPost')!;
  s.assignGuard('resident-3',room.id,'a');s.advanceTime(10000);
  expect(s.upgradeRoom(room.id).ok).toBe(true);
  expect(s.guardPosts.getDefensePosts()[0]).toMatchObject({guardCapacity:2,defenseBonus:1.15,maxHealth:150});
  s.guardPosts.setEquipmentProvider({getAssignedEquipment:()=>['inventory:rifle-1']});
  expect(s.guardPosts.getDefensePosts()[0].equipment).toEqual(['inventory:rifle-1']);
  s.guardPosts.setHealth(room.id,0);
  expect(s.guardPosts.getDefensePosts()[0]).toMatchObject({status:'damaged',readiness:0});
  const noPower=new GuardPosts(()=>s.layout.rooms,s.survivors,()=>0);
  expect(noPower.getDefensePosts()[0]).toMatchObject({status:'unpowered',readiness:0});
 });
 it('rejects unreachable jobs and repairs orphan assignments on reload',()=>{
  const s=setup(),room=s.layout.rooms.find(r=>r.type==='guardPost')!;
  s.assignGuard('resident-3',room.id,'a');
  const raw=s.survivors.snapshot();raw.assignments[0].survivorId='removed-person';
  const restored=SurvivorRoster.restore(s.layout,raw)!;
  expect(restored.assignments).toHaveLength(0);
  const old = new BuildingLayout().snapshot();
  // Keep x9-10 excavated, but close the vertical access through empty x11-12.
  old.terrain.excavated = old.terrain.excavated.filter(p => p.y !== -2 || (p.x !== 11 && p.x !== 12));
  old.rooms.push({ id:'orphan-guard', type:'guardPost', x:9, y:-2, width:2, height:1, level:1 });
  const isolated = BuildingLayout.restore(old)!;
  const roster=new SurvivorRoster(isolated);
  expect(roster.assign('resident-3',isolated.rooms.at(-1)!.id,'guard','a')).toBe('path');
 });
 it('migrates old saves with existing survivors and no jobs, without spawning per room',()=>{
  const raw={...setup().snapshot(),schemaVersion:8};
  const s=GameSession.restore(raw)!;
  expect(s.survivors.survivors).toHaveLength(3);expect(s.survivors.assignments).toHaveLength(0);
 });
 it('matches fixed-step movement for different frame partitions',()=>{
  const a=setup(),b=setup(),id=a.layout.rooms.find(r=>r.type==='guardPost')!.id;
  a.assignGuard('resident-3',id,'a');b.assignGuard('resident-3',id,'a');
  a.advanceTime(2400);for(let i=0;i<24;i++)b.advanceTime(100);
  expect(a.survivors.snapshot()).toEqual(b.survivors.snapshot());
 });
});
