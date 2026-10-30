/** Versioned local research: all times are active simulation time, never wall time. */
export type EffectModifier = { kind: 'powerProduction' | 'foodProduction'; multiplier: number };
export interface ResearchDefinition {
  id: string; branch: 'power' | 'food'; name: {fa:string;en:string}; cost: number;
  durationMs: number; prerequisites: string[]; facilityLevel: number; effect: EffectModifier;
}
export const RESEARCH_CONFIG = { schemaVersion: 1, maxConcurrent: 1, labPower: 2 } as const;
export const RESEARCH_GRAPH: readonly ResearchDefinition[] = [
 {id:'power-1',branch:'power',name:{fa:'توربین بهینه',en:'Efficient turbines'},cost:80,durationMs:15000,prerequisites:[],facilityLevel:1,effect:{kind:'powerProduction',multiplier:1.2}},
 {id:'power-2',branch:'power',name:{fa:'بازیافت حرارت',en:'Heat recovery'},cost:120,durationMs:30000,prerequisites:['power-1'],facilityLevel:1,effect:{kind:'powerProduction',multiplier:1.25}},
 {id:'power-3',branch:'power',name:{fa:'شبکهٔ هوشمند',en:'Smart grid'},cost:180,durationMs:45000,prerequisites:['power-2'],facilityLevel:2,effect:{kind:'powerProduction',multiplier:1.2}},
 {id:'food-1',branch:'food',name:{fa:'نور کشت بهینه',en:'Grow lighting'},cost:80,durationMs:15000,prerequisites:[],facilityLevel:1,effect:{kind:'foodProduction',multiplier:1.25}},
 {id:'food-2',branch:'food',name:{fa:'کشت چندلایه',en:'Layered crops'},cost:120,durationMs:30000,prerequisites:['food-1'],facilityLevel:1,effect:{kind:'foodProduction',multiplier:1.2}},
 {id:'food-3',branch:'food',name:{fa:'بذر مقاوم',en:'Resilient seeds'},cost:180,durationMs:45000,prerequisites:['food-2'],facilityLevel:2,effect:{kind:'foodProduction',multiplier:1.25}}
];
export function validateResearchGraph(graph: readonly ResearchDefinition[]): boolean {
  const seen=new Set<string>();
  for(const n of graph) {
    if(!n || typeof n.id!=='string' || !/^[a-z][a-z0-9-]*$/.test(n.id) || seen.has(n.id) || !['power','food'].includes(n.branch) ||
      !n.name || typeof n.name.fa!=='string' || !n.name.fa || typeof n.name.en!=='string' || !n.name.en || !Number.isSafeInteger(n.cost) || n.cost<=0 ||
      !Number.isSafeInteger(n.durationMs) || n.durationMs<=0 || ![1,2,3].includes(n.facilityLevel) ||
      !n.effect || !['powerProduction','foodProduction'].includes(n.effect.kind) || !Number.isFinite(n.effect.multiplier) ||
      n.effect.multiplier<1 || n.effect.multiplier>3 || !Array.isArray(n.prerequisites) ||
      new Set(n.prerequisites).size!==n.prerequisites.length || !n.prerequisites.every(p=>seen.has(p))) return false;
    seen.add(n.id);
  }
  return true;
}
export interface ResearchFacilityProvider { level: number; powered: boolean; staffed?:boolean; speedMultiplier?:number }
export interface TechnologyModifiers { powerProduction: number; foodProduction: number }
export type ResearchBlock = 'facility'|'power'|'prerequisites'|'busy'|'balance'|'completed'|'level'|'unknown'|'staff';
export interface ResearchSnapshot {
 schemaVersion: 1; graphVersion: 1; unlockedTechnologyIds: string[]; activeResearchId: string|null;
 startedAt: number|null; completeAt: number|null; nowMs: number; operations: string[];
}
export class ResearchScheduler {
 private state: ResearchSnapshot = {schemaVersion:1,graphVersion:1,unlockedTechnologyIds:[],activeResearchId:null,startedAt:null,completeAt:null,nowMs:0,operations:[]};
 constructor(readonly graph:readonly ResearchDefinition[]=RESEARCH_GRAPH) {
  if(!validateResearchGraph(graph))throw Error('Invalid research graph');
 }
 block(id:string,facility:ResearchFacilityProvider,coins:number): ResearchBlock|null {
  const node=this.graph.find(n=>n.id===id);if(!node)return 'unknown';
  if(this.state.unlockedTechnologyIds.includes(id))return 'completed';
  if(this.state.activeResearchId)return 'busy';
  if(!facility.level)return 'facility';if(!facility.powered)return 'power';if(facility.staffed===false)return 'staff';
  if(facility.level<node.facilityLevel)return 'level';
  if(!node.prerequisites.every(p=>this.state.unlockedTechnologyIds.includes(p)))return 'prerequisites';
  if(coins<node.cost)return 'balance';return null;
 }
 start(id:string,operationId:string,facility:ResearchFacilityProvider,coins:number,spend:(amount:number)=>boolean):boolean {
  if(!operationId || this.state.operations.includes(operationId) || this.state.operations.length>=5000 || this.block(id,facility,coins))return false;
  const node=this.graph.find(n=>n.id===id)!;if(!spend(node.cost))return false;
  this.state.activeResearchId=id;this.state.startedAt=this.state.nowMs;
  this.state.completeAt=this.state.nowMs+node.durationMs;this.state.operations.push(operationId);return true;
 }
 /** Injected monotonic simulation clock; pause/offline callers do not advance it. */
 advanceTo(nowMs:number,facility:ResearchFacilityProvider):string|null {
  if(!Number.isSafeInteger(nowMs)||nowMs<this.state.nowMs||nowMs-this.state.nowMs>60000)return null;
  const delta=nowMs-this.state.nowMs;this.state.nowMs=nowMs;
  const node=this.graph.find(n=>n.id===this.state.activeResearchId);if(!node)return null;
  if(!facility.powered||facility.staffed===false||facility.level<node.facilityLevel){this.state.completeAt!+=delta;return null;}
  const speed=facility.speedMultiplier??1;
  if(Number.isFinite(speed)&&speed>=1&&speed<=2)this.state.completeAt!-=Math.round(delta*(speed-1));
  if(nowMs<this.state.completeAt!)return null;
  this.state.unlockedTechnologyIds.push(node.id);this.state.activeResearchId=null;
  this.state.startedAt=null;this.state.completeAt=null;return node.id;
 }
 modifiers():TechnologyModifiers {
  const result={powerProduction:1,foodProduction:1};
  for(const n of this.graph)if(this.state.unlockedTechnologyIds.includes(n.id))result[n.effect.kind]*=n.effect.multiplier;
  return result;
 }
 snapshot():ResearchSnapshot{return structuredClone(this.state);}
 static restore(raw:unknown):ResearchScheduler|null {
  if(!raw||typeof raw!=='object')return null;const s=raw as ResearchSnapshot;
  if(s.schemaVersion!==1||s.graphVersion!==1||!Number.isSafeInteger(s.nowMs)||s.nowMs<0||
    !Array.isArray(s.operations)||s.operations.length>5000||!s.operations.every(id=>typeof id==='string'&&id.length>0)||new Set(s.operations).size!==s.operations.length||
    !Array.isArray(s.unlockedTechnologyIds)||s.unlockedTechnologyIds.length>RESEARCH_GRAPH.length||new Set(s.unlockedTechnologyIds).size!==s.unlockedTechnologyIds.length)return null;
  const known=new Set(RESEARCH_GRAPH.map(n=>n.id));
  if(!s.unlockedTechnologyIds.every(id=>known.has(id))||RESEARCH_GRAPH.some(n=>s.unlockedTechnologyIds.includes(n.id)&&!n.prerequisites.every(p=>s.unlockedTechnologyIds.includes(p))))return null;
  if(s.activeResearchId===null){if(s.startedAt!==null||s.completeAt!==null)return null;}
  else {
   const node=RESEARCH_GRAPH.find(n=>n.id===s.activeResearchId);
   if(!node||s.unlockedTechnologyIds.includes(node.id)||!node.prerequisites.every(p=>s.unlockedTechnologyIds.includes(p))||
    !Number.isSafeInteger(s.startedAt)||s.startedAt!<0||s.startedAt!>s.nowMs||!Number.isSafeInteger(s.completeAt)||s.completeAt!<=s.nowMs||s.completeAt!-s.nowMs>node.durationMs)return null;
  }
  const scheduler=new ResearchScheduler();scheduler.state=structuredClone(s);return scheduler;
 }
}
