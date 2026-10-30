import { WORLD, isInsideWorld, type GridPosition } from '../world/grid';
import type { Room } from '../building/placement';
import type { TerrainMap } from '../world/terrain';
/** Fictional game risk points, NOT physical/medical dose units. */
export const RADIATION_CONFIG = {schemaVersion:1,tickMs:5000,maxLevel:100,maxDose:1_000_000,
 surface:70,underground:2,leak:55,spread:0.08,decay:0.98,depthTransmission:0.8,
 roomShielding:0.5,levelShielding:0.1,filterShielding:0.5,filterDecay:0.7,
 cleanupCost:25,cleanupFraction:0.5,filterCost:50,surgeDurationMs:30000,surgeCooldownMs:120000,surgeBoost:25} as const;
export interface RadiationSource {id:string;x:number;y:number;level:number}
export const LEAK_SOURCE:RadiationSource={id:'leaking-pipe',x:12,y:-1,level:RADIATION_CONFIG.leak};
export interface ShieldingProvider {
 permeable(x:number,y:number):boolean;
 shielding(x:number,y:number):number;
 ventilation(x:number,y:number):number;
 canTransmit?(from:GridPosition,to:GridPosition):boolean;
}
export interface RadiationOccupant extends GridPosition {id:string;protection:number}
export interface RadiationExposureEvent {id:string;survivorId:string;dose:number;totalDose:number;at:number;schemaVersion:1}
export interface SurvivorHealthAdapter { onRadiationExposure(event:RadiationExposureEvent):void }
export type ContaminationState='low'|'medium'|'high';
export const contaminationState=(n:number):ContaminationState=>n>=50?'high':n>=20?'medium':'low';
export interface RadiationSnapshot {
 schemaVersion:1;levels:number[];exposures:{id:string;dose:number}[];nowMs:number;
 filters:string[];operations:string[];surgeUntil:number;nextSurgeAt:number;
}
const CELLS=WORLD.cols*(WORLD.maxY-WORLD.minY+1);
const index=(x:number,y:number)=>(y-WORLD.minY)*WORLD.cols+x;
const clamp=(n:number,max:number=RADIATION_CONFIG.maxLevel)=>Math.min(max,Math.max(0,n));
export class RadiationField {
 private state:RadiationSnapshot={schemaVersion:1,levels:Array.from({length:CELLS},(_,i)=>Math.floor(i/WORLD.cols)+WORLD.minY>=0?RADIATION_CONFIG.surface:RADIATION_CONFIG.underground),exposures:[],nowMs:0,filters:[],operations:[],surgeUntil:0,nextSurgeAt:0};
 constructor(){this.state.levels[index(LEAK_SOURCE.x,LEAK_SOURCE.y)]=LEAK_SOURCE.level;}
 getRiskForLocation(x:number,y:number):number{return isInsideWorld(x,y)?this.state.levels[index(x,y)]:0;}
 world(terrain:TerrainMap,rooms:readonly Room[]):ShieldingProvider {
  const roomAt=(x:number,y:number)=>rooms.find(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height);
  return {permeable:(x,y)=>y>=0||terrain.isOpen(x,y),shielding:(x,y)=>{
    const room=roomAt(x,y);return room?Math.max(0.1,RADIATION_CONFIG.roomShielding-(room.level-1)*RADIATION_CONFIG.levelShielding)*(this.state.filters.includes(room.id)?RADIATION_CONFIG.filterShielding:1):1;
   },ventilation:(x,y)=>{const r=roomAt(x,y);return r&&this.state.filters.includes(r.id)?RADIATION_CONFIG.filterDecay:RADIATION_CONFIG.decay;}};
 }
 roomStatus(room:Room,world:ShieldingProvider) {
  const level=Array.from({length:room.width},(_,i)=>this.getRiskForLocation(room.x+i,room.y)).reduce((a,b)=>a+b,0)/room.width;
  return {radiationLevel:level,ShieldingFactor:world.shielding(room.x,room.y),ContaminationState:contaminationState(level)};
 }
 triggerSurge(sourceId:string):boolean {
  if(sourceId!==LEAK_SOURCE.id||this.state.nowMs<this.state.nextSurgeAt||this.state.surgeUntil>this.state.nowMs)return false;
  this.state.surgeUntil=this.state.nowMs+RADIATION_CONFIG.surgeDurationMs;
  this.state.nextSurgeAt=this.state.nowMs+RADIATION_CONFIG.surgeCooldownMs;return true;
 }
 private operation(id:string,spend:()=>boolean,apply:()=>void):boolean {
  if(!id||this.state.operations.includes(id)||this.state.operations.length>=5000||!spend())return false;
  apply();this.state.operations.push(id);return true;
 }
 cleanup(x:number,y:number,id:string,spend:(n:number)=>boolean):boolean {
  if(!isInsideWorld(x,y)||this.getRiskForLocation(x,y)<=0)return false;
  return this.operation(id,()=>spend(RADIATION_CONFIG.cleanupCost),()=>{this.state.levels[index(x,y)]*=RADIATION_CONFIG.cleanupFraction;});
 }
 reconcileRooms(rooms:readonly Room[]):void {this.state.filters=this.state.filters.filter(id=>rooms.some(r=>r.id===id));}
 installFilter(roomId:string,rooms:readonly Room[],id:string,spend:(n:number)=>boolean):boolean {
  this.reconcileRooms(rooms);
  if(!rooms.some(r=>r.id===roomId)||this.state.filters.includes(roomId)||this.state.filters.length>=160)return false;
  return this.operation(id,()=>spend(RADIATION_CONFIG.filterCost),()=>{this.state.filters.push(roomId);});
 }
 /** Only the shared monotonic game clock advances this simulation. Double buffering prevents traversal-order leaks. */
 advanceTo(nowMs:number,world:ShieldingProvider,occupants:readonly RadiationOccupant[],health?:SurvivorHealthAdapter):number {
  if(!Number.isSafeInteger(nowMs)||nowMs<this.state.nowMs||nowMs-this.state.nowMs>60000||(nowMs-this.state.nowMs)%RADIATION_CONFIG.tickMs!==0)return 0;
  let ticks=0;
  while(this.state.nowMs<nowMs) {
   this.state.nowMs+=RADIATION_CONFIG.tickMs;ticks++;
   const old=this.state.levels,next=[...old];
   for(let y:number=WORLD.minY;y<=WORLD.maxY;y++)for(let x=0;x<WORLD.cols;x++) {
    const i=index(x,y);let value=old[i];
    if(world.permeable(x,y)) for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
     if(!isInsideWorld(nx,ny)||!world.permeable(nx,ny)||(world.canTransmit?.({x,y},{x:nx,y:ny})===false||world.canTransmit?.({x:nx,y:ny},{x,y})===false))continue;
     value+=(old[index(nx,ny)]-old[i])*RADIATION_CONFIG.spread*(ny===y?1:RADIATION_CONFIG.depthTransmission);
    }
    const source=y>=0?RADIATION_CONFIG.surface:(x===LEAK_SOURCE.x&&y===LEAK_SOURCE.y?LEAK_SOURCE.level+(this.state.nowMs<this.state.surgeUntil?RADIATION_CONFIG.surgeBoost:0):0);
    const ventilation=world.ventilation(x,y);
    next[i]=clamp(Math.max(source,value)*(Number.isFinite(ventilation)?clamp(ventilation,1):RADIATION_CONFIG.decay));
   }
   this.state.levels=next;
   const seen=new Set<string>();
   for(const person of occupants) {
    if(!person||typeof person.id!=='string'||!person.id||seen.has(person.id)||!isInsideWorld(person.x,person.y)||!Number.isFinite(person.protection)||person.protection<0||person.protection>1)continue;
    seen.add(person.id);let entry=this.state.exposures.find(e=>e.id===person.id);
    if(!entry){if(this.state.exposures.length>=160)continue;entry={id:person.id,dose:0};this.state.exposures.push(entry);}
    const shielding=world.shielding(person.x,person.y);
    const requested=this.getRiskForLocation(person.x,person.y)*5*(1-person.protection)*(Number.isFinite(shielding)?clamp(shielding,1):1);
    const dose=Math.min(requested,RADIATION_CONFIG.maxDose-entry.dose);entry.dose+=dose;
    // Default adapter is intentionally absent: current survivor health is unchanged.
    health?.onRadiationExposure({id:`radiation:${this.state.nowMs}:${person.id}`,schemaVersion:1,survivorId:person.id,dose,totalDose:entry.dose,at:this.state.nowMs});
   }
  }
  return ticks;
 }
 snapshot():RadiationSnapshot{return structuredClone(this.state);}
 static restore(raw:unknown):RadiationField|null {
  if(!raw||typeof raw!=='object')return null;const s=raw as RadiationSnapshot;
  if(s.schemaVersion!==1||!Array.isArray(s.levels)||s.levels.length!==CELLS||!s.levels.every(n=>Number.isFinite(n)&&n>=0&&n<=100)||
    ![s.nowMs,s.surgeUntil,s.nextSurgeAt].every(n=>Number.isSafeInteger(n)&&n>=0)||s.nowMs%5000!==0||s.surgeUntil>s.nowMs+RADIATION_CONFIG.surgeDurationMs||s.nextSurgeAt>s.nowMs+RADIATION_CONFIG.surgeCooldownMs||
    !Array.isArray(s.exposures)||s.exposures.length>160||!s.exposures.every(e=>e&&typeof e.id==='string'&&e.id&&Number.isFinite(e.dose)&&e.dose>=0&&e.dose<=RADIATION_CONFIG.maxDose)||new Set(s.exposures.map(e=>e.id)).size!==s.exposures.length)return null;
  for(const [list,max] of [[s.filters,160],[s.operations,5000]] as const)if(!Array.isArray(list)||list.length>max||!list.every(id=>typeof id==='string'&&id.length>0)||new Set(list).size!==list.length)return null;
  const f=new RadiationField();f.state=structuredClone(s);return f;
 }
}
