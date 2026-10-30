import { RECREATION_CONFIG, type RecreationVisit } from '../recreation/recreation';
import { SURVIVOR_STATS_CONFIG, changeMorale, type SurvivorStats } from './stats';
import { LABORATORY_CONFIG } from '../laboratory/laboratory';
import { ResidentTraffic } from '../characters/traffic';
import { WORLD } from '../world/grid';
import { isWalkableCell, findRoomPath } from '../characters/pathfinding';
import type { BuildingLayout } from '../building/layout';
import type { Room } from '../building/placement';

export const GUARD_CONFIG = {schemaVersion:1,typeId:'guardPost',capacity:[1,2,3],health:[100,150,200],defenseBonus:[1,1.15,1.3],power:1} as const;
export type ActivityKind = 'guard'|'scientist'|'recreation'|'cook';
export interface Survivor extends SurvivorStats { id:string; name:string }
export interface WorkerAssignment {
  id:string; survivorId:string; roomId:string; kind:ActivityKind;
  state:'enRoute'|'active'|'suspended'; roomPosition:string;
  assignedAt:number;startedAt:number|null;elapsedMs:number;
}
export type GuardAssignment=WorkerAssignment;
export interface RosterEvent {schemaVersion:1;id:number;kind:'assigned'|'released'|'arrived'|'completed';survivorId:string;roomId:string}
export interface SurvivorSnapshot {
  schemaVersion:2; nowMs:number; survivors:Survivor[]; assignments:GuardAssignment[];
  traffic:ReturnType<ResidentTraffic['snapshot']>; operations:string[]; events:RosterEvent[]; remainderMs:number;
}
export type AssignmentBlock = 'survivor'|'room'|'busy'|'capacity'|'path'|'duplicate'|'satisfied'|'power';
const footprint=(r:Room)=>`${r.x}:${r.y}:${r.width}:${r.height}`;
export function activityCapacity(room:Room,kind:ActivityKind):number {
  return kind==='guard'&&room.type==='guardPost'?GUARD_CONFIG.capacity[room.level-1]:kind==='scientist'&&room.type==='laboratory'?LABORATORY_CONFIG.scientistCapacity[room.level-1]:kind==='recreation'&&room.type==='recreation'?RECREATION_CONFIG.capacity[room.level-1]:kind==='cook'&&room.type==='kitchen'?room.level:0;
}
export class SurvivorRoster {
  readonly traffic:ResidentTraffic;
  private people:Survivor[];
  private jobs:GuardAssignment[]=[];
  private operations:string[]=[];
  private events:RosterEvent[]=[];
  private remainderMs=0;
  private nowMs=0;
  constructor(private layout:BuildingLayout) {
    const candidates=[{x:5,y:-1},{x:6,y:-1},{x:7,y:-1},
      ...Array.from({length:WORLD.cols*(WORLD.maxY-WORLD.minY+1)},(_,i)=>({x:i%WORLD.cols,y:WORLD.minY+Math.floor(i/WORLD.cols)}))];
    const cells=candidates.filter((p,i)=>isWalkableCell(layout,p)&&candidates.findIndex(q=>q.x===p.x&&q.y===p.y)===i).slice(0,3);
    this.people=cells.map((_,i)=>({id:`resident-${i+1}`,name:`Survivor ${i+1}`,morale:SURVIVOR_STATS_CONFIG.initialMorale}));
    this.traffic=new ResidentTraffic(layout,cells.map((cell,i)=>({id:this.people[i].id,cell})));

  }
  initializeLegacyClock(totalMs:number):void {
    if(this.nowMs!==0||this.remainderMs!==0||this.jobs.length||!Number.isFinite(totalMs)||totalMs<0)return;
    this.nowMs=Math.floor(totalMs/50)*50;this.remainderMs=totalMs-this.nowMs;
  }
  get survivors():readonly Survivor[] {return structuredClone(this.people);}
  get recreationVisits():readonly RecreationVisit[] {return this.assignments.filter(a=>a.kind==='recreation') as RecreationVisit[];}
  get assignments():readonly GuardAssignment[] {return structuredClone(this.jobs);}
  assignment(id:string):GuardAssignment|undefined {return this.assignments.find(a=>a.survivorId===id);}
  private event(kind:RosterEvent['kind'],a:GuardAssignment):void {
    this.events.push({schemaVersion:1,id:(this.events.at(-1)?.id??0)+1,kind,survivorId:a.survivorId,roomId:a.roomId});
    if(this.events.length>200)this.events.shift();
  }
  assign(survivorId:string,roomId:string,kind:ActivityKind,operationId:string):AssignmentBlock|null {
    if(!operationId||this.operations.includes(operationId)||this.operations.length>=5000)return 'duplicate';
    const person=this.people.find(p=>p.id===survivorId),view=this.traffic.getResident(survivorId);
    if(!person||!view)return 'survivor';
    if(kind==='recreation'&&person.morale>=SURVIVOR_STATS_CONFIG.maxMorale)return 'satisfied';
    const room=this.layout.rooms.find(r=>r.id===roomId);
    if(!room||activityCapacity(room,kind)===0)return 'room';
    if(this.jobs.some(a=>a.survivorId===survivorId))return 'busy';
    if(this.jobs.filter(a=>a.roomId===roomId).length>=activityCapacity(room,kind))return 'capacity';
    if(!findRoomPath(this.layout,view.cell,roomId)||!this.traffic.goToRoom(survivorId,roomId))return 'path';
    const job:GuardAssignment={id:operationId,survivorId,roomId,kind,state:'enRoute',roomPosition:footprint(room),assignedAt:this.nowMs,startedAt:null,elapsedMs:0};
    this.jobs.push(job);this.operations.push(operationId);this.event('assigned',job);this.reconcile();return null;
  }
  release(survivorId:string):boolean {
    const job=this.jobs.find(a=>a.survivorId===survivorId);if(!job)return false;
    this.jobs=this.jobs.filter(a=>a!==job);this.traffic.cancel(survivorId);this.event('released',job);return true;
  }
  setLayout(layout:BuildingLayout):void {this.layout=layout;this.traffic.setLayout(layout);this.reconcile();}
  reconcile(power=Infinity):void {
    const counts=new Map<string,number>();
    for(const job of [...this.jobs]) {
      const room=this.layout.rooms.find(r=>r.id===job.roomId),view=this.traffic.getResident(job.survivorId);
      const count=(counts.get(job.roomId)??0)+1;counts.set(job.roomId,count);
      if(!room||!view||!this.people.some(p=>p.id===job.survivorId)||job.roomPosition!==footprint(room)||
        count>activityCapacity(room,job.kind)||view.destinationId!==room.id) {this.release(job.survivorId);continue;}
      const arrived=!view.isMoving&&this.layout.getRoomAt(view.cell.x,view.cell.y)?.id===room.id;
      if(arrived&&job.startedAt===null){job.startedAt=this.nowMs;this.event('arrived',job);}
      job.state=arrived?(power>=(job.kind==='scientist'?LABORATORY_CONFIG.power:GUARD_CONFIG.power)?'active':'suspended'):'enRoute';
    }
  }
  /** Fixed simulation steps make travel and presence deterministic across frame rates. */
  advance(deltaMs:number,power:number):void {
    if(!Number.isFinite(deltaMs)||deltaMs<=0)return;
    this.remainderMs+=Math.min(deltaMs,60000);
    while(this.remainderMs>=50){
      // Credit only presence established at the beginning of this simulation step.
      this.reconcile(power);
      for(const person of this.people) {
        const job=this.jobs.find(a=>a.survivorId===person.id);
        if(job?.kind==='recreation'&&job.state==='active') {
          const room=this.layout.rooms.find(r=>r.id===job.roomId)!;
          const elapsed=Math.min(50,RECREATION_CONFIG.durationMs-job.elapsedMs);
          changeMorale(person,RECREATION_CONFIG.moralePerSecond[room.level-1]*elapsed/1000);
          job.elapsedMs+=elapsed;
          if(job.elapsedMs>=RECREATION_CONFIG.durationMs||person.morale>=SURVIVOR_STATS_CONFIG.maxMorale){this.event('completed',job);this.release(person.id);}
        } else changeMorale(person,-SURVIVOR_STATS_CONFIG.moraleDecayPerMinute*50/60000);
      }
      this.traffic.advance(50);this.nowMs+=50;this.reconcile(power);this.remainderMs-=50;
    }
  }
  snapshot():SurvivorSnapshot {
    return {schemaVersion:2,nowMs:this.nowMs,survivors:structuredClone(this.people),assignments:structuredClone(this.jobs),traffic:this.traffic.snapshot(),operations:[...this.operations],events:structuredClone(this.events),remainderMs:this.remainderMs};
  }
  static restore(layout:BuildingLayout,raw:unknown,simulationMs=0):SurvivorRoster|null {
    if(!raw||typeof raw!=='object')return null;
    let s=structuredClone(raw) as SurvivorSnapshot;
    if((s as {schemaVersion:number}).schemaVersion===1 && Array.isArray(s.survivors)&&Array.isArray(s.assignments)) {
      s={...s,schemaVersion:2,nowMs:Math.max(0,Math.round(simulationMs-(s.remainderMs??0))),
        survivors:s.survivors.map(p=>({...p,morale:SURVIVOR_STATS_CONFIG.initialMorale})),
        assignments:s.assignments.map(a=>({...a,assignedAt:0,startedAt:a.state==='enRoute'?null:0,elapsedMs:0}))};
    }
    if(s.schemaVersion!==2||!Number.isSafeInteger(s.nowMs)||s.nowMs<0||!Array.isArray(s.survivors)||s.survivors.length>100||new Set(s.survivors.map(p=>p?.id)).size!==s.survivors.length||
      !s.survivors.every(p=>p&&typeof p.id==='string'&&p.id&&typeof p.name==='string'&&Number.isFinite(p.morale)&&p.morale>=0&&p.morale<=100)||
      !Array.isArray(s.assignments)||s.assignments.length>s.survivors.length||new Set(s.assignments.map(a=>a?.survivorId)).size!==s.assignments.length||
      !s.assignments.every(a=>a&&typeof a.id==='string'&&a.id&&typeof a.survivorId==='string'&&typeof a.roomId==='string'&&['guard','scientist','recreation','cook'].includes(a.kind)&&['active','enRoute','suspended'].includes(a.state)&&typeof a.roomPosition==='string'&&Number.isSafeInteger(a.assignedAt)&&a.assignedAt>=0&&a.assignedAt<=s.nowMs&&(a.startedAt===null||(Number.isSafeInteger(a.startedAt)&&a.startedAt>=a.assignedAt&&a.startedAt<=s.nowMs))&&Number.isFinite(a.elapsedMs)&&a.elapsedMs>=0&&a.elapsedMs<=RECREATION_CONFIG.durationMs)||
      new Set(s.assignments.map(a=>a.id)).size!==s.assignments.length||
      !Array.isArray(s.operations)||s.operations.length>5000||new Set(s.operations).size!==s.operations.length||!s.operations.every(id=>typeof id==='string'&&id)||
      !Array.isArray(s.events)||s.events.length>200||!s.events.every(e=>e&&e.schemaVersion===1&&Number.isSafeInteger(e.id)&&e.id>0&&['assigned','released','arrived','completed'].includes(e.kind)&&typeof e.survivorId==='string'&&typeof e.roomId==='string')||
      !Number.isFinite(s.remainderMs)||s.remainderMs<0||s.remainderMs>=50)return null;
    const traffic=ResidentTraffic.restore(layout,s.traffic);if(!traffic)return null;
    if(traffic.residents.length!==s.survivors.length||!traffic.residents.every(r=>s.survivors.some(p=>p.id===r.id)))return null;
    const roster=new SurvivorRoster(layout);
    Object.assign(roster,{people:structuredClone(s.survivors),jobs:structuredClone(s.assignments),operations:[...s.operations],events:structuredClone(s.events),remainderMs:s.remainderMs,nowMs:s.nowMs,traffic});
    roster.reconcile();return roster;
  }
}
