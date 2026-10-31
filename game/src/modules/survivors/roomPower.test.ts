import { describe, expect, it } from 'vitest';
import { GameSession } from '../economy/session';
import { GUARD_CONFIG, activityPowerRequirement } from './roster';

const guard=()=>{
  const game=GameSession.create();
  expect(game.build('guardPost',8,-1).ok).toBe(true);
  const id=game.layout.rooms.find(r=>r.type==='guardPost')!.id;
  expect(game.assignGuard('resident-3',id,'guard-duty')).toBeNull();
  game.advanceTime(10_000);
  expect(game.survivors.assignment('resident-3')?.state).toBe('active');
  return {game,id};
};

describe('jobs require power on their own circuit (#115)',()=>{
  it('suspends a guard immediately on cable failure despite sufficient stored battery',()=>{
    const {game,id}=guard();
    expect(game.resources.snapshot().stock.power).toBeGreaterThan(GUARD_CONFIG.power);
    expect(game.guardPosts.getDefensePosts()[0].readiness).toBeGreaterThan(0);
    expect(game.removeCable(7,-1).ok).toBe(true);
    expect(game.powerStatus().activeRoomIds).not.toContain(id);
    expect(game.survivors.assignment('resident-3')?.state).toBe('suspended');
    expect(game.guardPosts.getDefensePosts()[0]).toMatchObject({
      guards:0,readiness:0,status:'unpowered'
    });
    const saved=game.snapshot();
    const recovered=GameSession.restore(saved)!;
    expect(recovered.survivors.assignment('resident-3')?.state).toBe('suspended');
    expect(recovered.snapshot()).toEqual(saved);
    expect(game.installCable(7,-1).ok).toBe(true);
    expect(game.survivors.assignment('resident-3')?.state).toBe('active');
    expect(game.guardPosts.getDefensePosts()[0].readiness).toBeGreaterThan(0);
  });

  it('stops morale gain in a disconnected recreation room, then resumes',()=>{
    const game=GameSession.create();
    expect(game.build('recreation',8,-1).ok).toBe(true);
    const id=game.layout.rooms.find(r=>r.type==='recreation')!.id;
    expect(game.assignRecreation('resident-3',id,'recreation-visit')).toBeNull();
    game.advanceTime(5_000);
    expect(game.survivors.assignment('resident-3')?.state).toBe('active');
    const elapsed=game.survivors.assignment('resident-3')!.elapsedMs;
    expect(game.removeCable(7,-1).ok).toBe(true);
    game.advanceTime(1_000);
    expect(game.survivors.assignment('resident-3')?.state).toBe('suspended');
    expect(game.survivors.assignment('resident-3')!.elapsedMs).toBe(elapsed);
    expect(game.installCable(7,-1).ok).toBe(true);
    game.advanceTime(500);
    expect(game.survivors.assignment('resident-3')?.state).toBe('active');
    expect(game.survivors.assignment('resident-3')!.elapsedMs).toBeGreaterThan(elapsed);
  });

  it('stops staff credit in a disconnected laboratory and recovers without reassignment',()=>{
    const game=GameSession.create();
    expect(game.build('laboratory',8,-1).ok).toBe(true);
    const id=game.layout.rooms.find(r=>r.type==='laboratory')!.id;
    expect(game.assignScientist('resident-3',id,'science')).toBeNull();
    game.advanceTime(5_000);
    expect(game.survivors.assignment('resident-3')?.state).toBe('active');
    expect(game.laboratories().find(l=>l.roomId===id)?.assignedScientists).toBe(1);
    expect(game.removeCable(7,-1).ok).toBe(true);
    expect(game.survivors.assignment('resident-3')?.state).toBe('suspended');
    expect(game.researchFacility().powered).toBe(false);
    expect(game.installCable(7,-1).ok).toBe(true);
    expect(game.survivors.assignment('resident-3')?.state).toBe('active');
  });

  it('suspends cooks in disconnected kitchens, and supports legacy saves',()=>{
    const game=GameSession.create();
    expect(game.build('kitchen',8,-1).ok).toBe(true);
    const id=game.layout.rooms.find(r=>r.type==='kitchen')!.id;
    expect(game.assignCook('resident-3',id,'chef')).toBeNull();
    game.advanceTime(5_000);
    expect(game.survivors.assignment('resident-3')?.state).toBe('active');
    expect(game.removeCable(7,-1).ok).toBe(true);
    expect(game.survivors.assignment('resident-3')?.state).toBe('suspended');
    expect(game.installCable(7,-1).ok).toBe(true);
    expect(game.survivors.assignment('resident-3')?.state).toBe('active');
    const saved=game.snapshot();
    expect(GameSession.restore(saved)?.snapshot()).toEqual(saved);
    const legacy=GameSession.restore({...saved,schemaVersion:13,power:undefined});
    expect(legacy?.power.mode).toBe('legacy');
    expect(legacy?.survivors.assignment('resident-3')?.state).toBe('active');
  });

  it('keeps activity-specific costs distinct and rejects insufficient inventory',()=>{
    expect(activityPowerRequirement('guard')).toBe(1);
    expect(activityPowerRequirement('recreation')).toBe(1);
    expect(activityPowerRequirement('cook')).toBe(1);
    expect(activityPowerRequirement('scientist')).toBe(2);
    const {game,id}=guard();
    game.resources.spendPower(game.resources.snapshot().stock.power);
    game.advanceTime(50);
    expect(game.survivors.assignment('resident-3')?.roomId).toBe(id);
    expect(game.survivors.assignment('resident-3')?.state).toBe('suspended');
  });
});
