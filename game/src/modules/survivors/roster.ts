import { LABORATORY_CONFIG } from '../laboratory/laboratory';
import { ResidentTraffic } from '../characters/traffic';
import { WORLD } from '../world/grid';
import { isWalkableCell, findRoomPath } from '../characters/pathfinding';
import type { BuildingLayout } from '../building/layout';
import type { Room } from '../building/placement';

export const GUARD_CONFIG = {schemaVersion:1,typeId:'guardPost',capacity:[1,2,3],health:[100,150,200],defenseBonus:[1,1.15,1.3],power:1} as const;
export type ActivityKind = 'guard'|'scientist'|'cook';
export interface Survivor { id:string; name:string }
export interface GuardAssignment {
  id:string; survivorId:string; roomId:string; kind:ActivityKind;
  state:'enRoute'|'active'|'suspended'; roomPosition:string;
}
export interface RosterEvent {schemaVersion:1;id:number;kind:'assigned'|'released'|'arrived';survivorId:string;roomId:string}
export interface SurvivorSnapshot {
  schemaVersion:1; survivors:Survivor[]; assignments:GuardAssignment[];
  traffic:ReturnType<ResidentTraffic['snapshot']>; operations:string[]; events:RosterEvent[]; remainderMs:number;
}
export type AssignmentBlock = 'survivor'|'room'|'busy'|'capacity'|'path'|'duplicate';
const footprint=(r:Room)=>`${r.x}:${r.y}:${r.width}:${r.height}`;
export function activityCapacity(room:Room,kind:ActivityKind):number {
  return kind==='guard'&&room.type==='guardPost'?GUARD_CONFIG.capacity[room.level-1]:kind==='scientist'&&room.type==='laboratory'?LABORATORY_CONFIG.scientistCapacity[room.level-1]:kind==='cook'&&room.type==='kitchen'?room.level:0;
}
export class SurvivorRoster {
  readonly traffic:ResidentTraffic;
  private people:Survivor[];
  private jobs:GuardAssignment[]=[];
  private operations:string[]=[];
  private events:RosterEvent[]=[];
  private remainderMs=0;
  constructor(private layout:BuildingLayout) {
    const candidates=[{x:5,y:-1},{x:6,y:-1},{x:7,y:-1},
      ...Array.from({length:WORLD.cols*(WORLD.maxY-WORLD.minY+1)},(_,i)=>({x:i%WORLD.cols,y:WORLD.minY+Math.floor(i/WORLD.cols)}))];
    const cells=candidates.filter((p,i)=>isWalkableCell(layout,p)&&candidates.findIndex(q=>q.x===p.x&&q.y===p.y)===i).slice(0,3);
    this.people=cells.map((_,i)=>({id:`resident-${i+1}`,name:`Survivor ${i+1}`}));
    this.traffic=new ResidentTraffic(layout,cells.map((cell,i)=>({id:this.people[i].id,cell})));

  }
  get survivors():readonly Survivor[] {return structuredClone(this.people);}
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
    const room=this.layout.rooms.find(r=>r.id===roomId);
    if(!room||activityCapacity(room,kind)===0)return 'room';
    if(this.jobs.some(a=>a.survivorId===survivorId))return 'busy';
    if(this.jobs.filter(a=>a.roomId===roomId).length>=activityCapacity(room,kind))return 'capacity';
    if(!findRoomPath(this.layout,view.cell,roomId)||!this.traffic.goToRoom(survivorId,roomId))return 'path';
    const job:GuardAssignment={id:operationId,survivorId,roomId,kind,state:'enRoute',roomPosition:footprint(room)};
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
      if(arrived&&job.state==='enRoute')this.event('arrived',job);
      job.state=arrived?(power>=(job.kind==='scientist'?LABORATORY_CONFIG.power:GUARD_CONFIG.power)?'active':'suspended'):'enRoute';
    }
  }
  /** Fixed simulation steps make travel and presence deterministic across frame rates. */
  advance(deltaMs:number,power:number):void {
    if(!Number.isFinite(deltaMs)||deltaMs<=0)return;
    this.remainderMs+=Math.min(deltaMs,60000);
    while(this.remainderMs>=50){this.traffic.advance(50);this.reconcile(power);this.remainderMs-=50;}
  }
  snapshot():SurvivorSnapshot {
    return {schemaVersion:1,survivors:structuredClone(this.people),assignments:structuredClone(this.jobs),traffic:this.traffic.snapshot(),operations:[...this.operations],events:structuredClone(this.events),remainderMs:this.remainderMs};
  }
  static restore(layout:BuildingLayout,raw:unknown):SurvivorRoster|null {
    if(!raw||typeof raw!=='object')return null;const s=raw as SurvivorSnapshot;
    if(s.schemaVersion!==1||!Array.isArray(s.survivors)||s.survivors.length>100||new Set(s.survivors.map(p=>p?.id)).size!==s.survivors.length||
      !s.survivors.every(p=>p&&typeof p.id==='string'&&p.id&&typeof p.name==='string')||
      !Array.isArray(s.assignments)||s.assignments.length>s.survivors.length||new Set(s.assignments.map(a=>a?.survivorId)).size!==s.assignments.length||
      !s.assignments.every(a=>a&&typeof a.id==='string'&&a.id&&typeof a.survivorId==='string'&&typeof a.roomId==='string'&&['guard','scientist','cook'].includes(a.kind)&&['active','enRoute','suspended'].includes(a.state)&&typeof a.roomPosition==='string')||
      new Set(s.assignments.map(a=>a.id)).size!==s.assignments.length||
      !Array.isArray(s.operations)||s.operations.length>5000||new Set(s.operations).size!==s.operations.length||!s.operations.every(id=>typeof id==='string'&&id)||
      !Array.isArray(s.events)||s.events.length>200||!s.events.every(e=>e&&e.schemaVersion===1&&Number.isSafeInteger(e.id)&&e.id>0&&['assigned','released','arrived'].includes(e.kind)&&typeof e.survivorId==='string'&&typeof e.roomId==='string')||
      !Number.isFinite(s.remainderMs)||s.remainderMs<0||s.remainderMs>=50)return null;
    const traffic=ResidentTraffic.restore(layout,s.traffic);if(!traffic)return null;
    if(traffic.residents.length!==s.survivors.length||!traffic.residents.every(r=>s.survivors.some(p=>p.id===r.id)))return null;
    const roster=new SurvivorRoster(layout);
    Object.assign(roster,{people:structuredClone(s.survivors),jobs:structuredClone(s.assignments),operations:[...s.operations],events:structuredClone(s.events),remainderMs:s.remainderMs,traffic});
    roster.reconcile();return roster;
  }
}
