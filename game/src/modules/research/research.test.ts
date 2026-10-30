import { expect, it } from 'vitest';
import { ResearchScheduler, RESEARCH_GRAPH, validateResearchGraph } from './research';
import { GameSession } from '../economy/session';
const facility={level:1,powered:true};
it('validates IDs, topological order, cycles, costs and effects',()=>{
 expect(validateResearchGraph(RESEARCH_GRAPH)).toBe(true);
 for(const bad of [
  [...RESEARCH_GRAPH,RESEARCH_GRAPH[0]],
  [{...RESEARCH_GRAPH[0],prerequisites:['power-2']},RESEARCH_GRAPH[1]],
  [{...RESEARCH_GRAPH[0],cost:-1}],
  [{...RESEARCH_GRAPH[0],durationMs:NaN}],
  [{...RESEARCH_GRAPH[0],id:''}],
  [{...RESEARCH_GRAPH[0],prerequisites:['missing']}],
  [{...RESEARCH_GRAPH[0],effect:{kind:'unknown',multiplier:2}}]
 ])expect(validateResearchGraph(bad as typeof RESEARCH_GRAPH)).toBe(false);
});
it('checks facilities, funds and prerequisites before one atomic payment; prevents duplicate requests',()=>{
 const r=new ResearchScheduler();let spent=0;const pay=(n:number)=>{spent+=n;return true;};
 expect(r.start('power-1','no-lab',{level:0,powered:true},1000,pay)).toBe(false);
 expect(r.start('power-1','no-power',{level:1,powered:false},1000,pay)).toBe(false);
 expect(r.start('power-2','locked',facility,1000,pay)).toBe(false);
 expect(r.start('power-1','poor',facility,0,pay)).toBe(false);expect(spent).toBe(0);
 expect(r.start('power-1','first',facility,1000,pay)).toBe(true);
 expect(r.start('food-1','second',facility,1000,pay)).toBe(false);
 expect(r.start('power-1','first',facility,1000,pay)).toBe(false);expect(spent).toBe(80);
 expect(r.advanceTo(15000,facility)).toBe('power-1');
 expect(r.start('food-1','first',facility,1000,pay)).toBe(false);
 expect(r.advanceTo(15000,facility)).toBeNull();expect(r.modifiers().powerProduction).toBe(1.2);
});
it('preserves remaining time through facility/power loss and reload, rejects time regression and invalid saves',()=>{
 const r=new ResearchScheduler();r.start('power-1','op',facility,1000,()=>true);r.advanceTo(5000,facility);
 r.advanceTo(10000,{level:0,powered:false});expect(r.snapshot().completeAt).toBe(20000);
 const loaded=ResearchScheduler.restore(r.snapshot())!;expect(loaded.advanceTo(20000,facility)).toBe('power-1');
 const before=loaded.snapshot();loaded.advanceTo(1000,facility);loaded.advanceTo(NaN,facility);expect(loaded.snapshot()).toEqual(before);
 expect(ResearchScheduler.restore({...before,unlockedTechnologyIds:['power-2']})).toBeNull();
 expect(ResearchScheduler.restore({...before,activeResearchId:'food-1',startedAt:0,completeAt:NaN})).toBeNull();
});
it('integrates actual output, upgrade/reload, frame partitioning and legacy migration',()=>{
 const a=GameSession.create();expect(a.build('laboratory',8,-1).ok).toBe(true);
 const baseline=GameSession.restore(a.snapshot())!;
 expect(a.startResearch('power-1','one')).toBe(true);expect(a.startResearch('power-1','one')).toBe(false);
 a.advanceTime(15000);baseline.advanceTime(15000);
 const saved=GameSession.restore(a.snapshot())!;a.advanceTime(5000);for(let i=0;i<50;i++)saved.advanceTime(100);baseline.advanceTime(5000);
 expect(saved.snapshot()).toEqual(a.snapshot());expect(a.resources.snapshot().stock.power-baseline.resources.snapshot().stock.power).toBe(2);
 expect(a.layout.upgrade('initial-power').ok).toBe(true);expect(a.research.modifiers().powerProduction).toBe(1.2);
 expect(GameSession.restore(a.snapshot())!.research.modifiers()).toEqual(a.research.modifiers());
 const legacy=GameSession.restore({...a.snapshot(),schemaVersion:5,research:undefined})!;
 expect(legacy.research.snapshot().nowMs).toBe(a.resources.tickCount*5000);expect(legacy.research.modifiers().powerProduction).toBe(1);
 const noLab=GameSession.create(), before=noLab.snapshot();expect(noLab.startResearch('power-1','x')).toBe(false);expect(noLab.snapshot()).toEqual(before);
});
