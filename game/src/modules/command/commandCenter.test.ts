import { expect,it } from 'vitest';
import { CapabilityGate } from './commandCenter';
import { GameSession } from '../economy/session';
import { BuildingLayout } from '../building/layout';
it('rejects a second center, surface construction and insufficient upgrades atomically',()=>{
 const s=GameSession.create(),before=s.snapshot();
 expect(s.build('command',1,-1).ok).toBe(false);expect(s.build('command',1,0).ok).toBe(false);
 expect(s.snapshot()).toEqual(before);
 s.wallet.spend(s.wallet.balance,'build');const poor=s.snapshot();expect(s.upgradeRoom('initial-command','poor').ok).toBe(false);expect(s.snapshot()).toEqual(poor);
});
it('unlocks actual industry actions once; power loss blocks new work without deleting existing progress',()=>{
 const s=GameSession.create(),before=s.snapshot();
 expect(s.build('mine',3,-1).ok).toBe(false);expect(s.snapshot()).toEqual(before);
 expect(s.upgradeRoom('initial-command','upgrade-1').ok).toBe(true);expect(s.commandStatus().earned).toEqual(['overview','industry']);
 const upgraded=s.snapshot();expect(s.upgradeRoom('initial-command','upgrade-1').ok).toBe(false);expect(s.snapshot()).toEqual(upgraded);
 expect(s.build('mine',3,-1).ok).toBe(true);
 s.resources.spendPower(s.resources.snapshot().stock.power);
 const dark=s.snapshot();expect(s.build('workshop',8,-1).ok).toBe(false);expect(s.snapshot()).toEqual(dark);
 expect(s.commandStatus().powered).toBe(false);expect(s.commandStatus().earned).toContain('industry');
 expect(s.upgradeRoom('initial-power').ok).toBe(true);
 s.advanceTime(5000);expect(s.commandStatus().powered).toBe(true);expect(s.build('workshop',8,-1).ok).toBe(true);
 expect(s.layout.rooms.some(r=>r.type==='mine')).toBe(true);
 expect(s.commandCenter.block('repairRobots',s.layout.rooms,100)).toBe('disabled');
 const restored=GameSession.restore(s.snapshot())!;expect(restored.snapshot()).toEqual(s.snapshot());expect(restored.upgradeRoom('initial-command','upgrade-1').ok).toBe(false);
});
it('preserves earned permissions through move, demolition, reload and rebuild; research remains independent',()=>{
 const s=GameSession.create();expect(s.upgradeRoom('initial-command','first').ok).toBe(true);
 expect(s.moveRoom('initial-command',4,-1).ok).toBe(true);expect(s.commandStatus().activeRoomId).toBe('initial-command');
 expect(s.removeRoom('initial-command').ok).toBe(true);expect(s.commandStatus().activeRoomId).toBeNull();
 const saved=s.snapshot(),restored=GameSession.restore(saved)!;expect(restored.snapshot()).toEqual(saved);
 expect(restored.commandStatus().earned).toContain('industry');expect(restored.build('mine',3,-1).ok).toBe(false);
 expect(restored.build('command',1,-1).ok).toBe(true);expect(restored.commandStatus().activeRoomId).not.toBeNull();
 expect(restored.commandStatus().level).toBe(1);expect(restored.build('mine',5,-1).ok).toBe(true);
 const without=new BuildingLayout();without.remove('initial-command');expect(BuildingLayout.restore(without.snapshot())).not.toBeNull();
 expect(restored.research.modifiers()).toEqual({powerProduction:1,foodProduction:1});
});
it('migrates old zero/multiple-center saves, picks one active room and validates capability snapshots',()=>{
 const s=GameSession.create(),save=s.snapshot();save.base.rooms.push({id:'legacy-second',type:'command',x:1,y:-1,width:3,height:1,level:2});
 const loaded=GameSession.restore({...save,schemaVersion:7,commandCenter:undefined})!;
 expect(loaded).not.toBeNull();expect(loaded.commandStatus().activeRoomId).toBe('initial-command');
 expect(loaded.removeRoom('initial-command').ok).toBe(true);expect(loaded.commandStatus().activeRoomId).toBe('legacy-second');
 expect(loaded.commandStatus().earned).toContain('industry');
 expect(CapabilityGate.restore({...loaded.commandCenter.snapshot(),earned:['repairRobots']})).toBeNull();
 expect(CapabilityGate.restore({...loaded.commandCenter.snapshot(),earned:['industry','industry']})).toBeNull();
 const old=GameSession.restore({...s.snapshot(),schemaVersion:7,commandCenter:undefined})!;expect(old.commandStatus().level).toBe(1);
});
