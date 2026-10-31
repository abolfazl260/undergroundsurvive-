import type { Room } from '../building/placement';
import type { SurvivorRoster, AssignmentBlock, WorkerAssignment } from '../survivors/roster';
import { DORMITORY_CONFIG } from './config';
export interface BedAssignment {id:string;survivorId:string;roomId:string;slot:number;roomPosition:string}
export interface DormitoryState {roomId:string;level:number;bedCapacity:number;occupiedBeds:number;freeBeds:number;resting:number;restSlots:number;restRate:number}
export interface RestVisit extends WorkerAssignment {kind:'rest'}
const position=(r:Room)=>`${r.x}:${r.y}:${r.width}:${r.height}`;
/** Uses the shared exclusive jobs and fixed-step roster clock; no parallel rest clock. */
export class RestScheduler {
  constructor(private roster:SurvivorRoster){}
  start(id:string,roomId:string,operationId:string):AssignmentBlock|null {return this.roster.assign(id,roomId,'rest',operationId);}
  stop(id:string):boolean {return this.roster.assignment(id)?.kind==='rest'&&this.roster.release(id);}
  get visits():readonly RestVisit[] {return this.roster.assignments.filter(a=>a.kind==='rest') as RestVisit[];}
}
export class Dormitories {
  private beds:BedAssignment[]=[];
  readonly scheduler:RestScheduler;
  constructor(private roomSource:()=>readonly Room[],private roster:SurvivorRoster){this.scheduler=new RestScheduler(roster);}
  sync():void {
    const valid:BedAssignment[]=[];
    for(const bed of this.beds) {
      const room=this.roomSource().find(r=>r.id===bed.roomId&&r.type==='habitat');
      if(!room||!this.roster.survivors.some(p=>p.id===bed.survivorId)||bed.roomPosition!==position(room)||
        bed.slot>=DORMITORY_CONFIG.bedCapacity[room.level-1]||valid.some(b=>b.survivorId===bed.survivorId||(b.roomId===bed.roomId&&b.slot===bed.slot))) {
        this.scheduler.stop(bed.survivorId);continue;
      }
      valid.push(bed);
    }
    this.beds=valid;
    for(const visit of this.scheduler.visits)if(!valid.some(b=>b.survivorId===visit.survivorId&&b.roomId===visit.roomId))this.scheduler.stop(visit.survivorId);
  }
  get assignments():readonly BedAssignment[] {this.sync();return structuredClone(this.beds);}
  get rooms():readonly DormitoryState[] {
    this.sync();return this.roomSource().filter(r=>r.type==='habitat').map(r=>{
      const capacity=DORMITORY_CONFIG.bedCapacity[r.level-1],occupied=this.beds.filter(b=>b.roomId===r.id).length;
      return {roomId:r.id,level:r.level,bedCapacity:capacity,occupiedBeds:occupied,freeBeds:capacity-occupied,
        restSlots:capacity,resting:this.scheduler.visits.filter(v=>v.roomId===r.id&&v.state==='active').length,restRate:DORMITORY_CONFIG.restPerSecond[r.level-1]};
    });
  }
  get populationCapacity():number {return this.rooms.reduce((n,r)=>n+r.bedCapacity,0);}
  startRest(id:string,roomId:string,operationId:string):AssignmentBlock|null {
    this.sync();const room=this.roomSource().find(r=>r.id===roomId&&r.type==='habitat');if(!room)return 'room';
    const old=this.beds.find(b=>b.survivorId===id);
    if(old&&old.roomId!==roomId)return 'busy';
    const slot=old?.slot??Array.from({length:DORMITORY_CONFIG.bedCapacity[room.level-1]},(_,i)=>i).find(i=>!this.beds.some(b=>b.roomId===roomId&&b.slot===i));
    if(slot===undefined)return 'capacity';
    const reason=this.scheduler.start(id,roomId,operationId);if(reason)return reason;
    if(!old)this.beds.push({id:operationId,survivorId:id,roomId,slot,roomPosition:position(room)});
    return null;
  }
  releaseBed(id:string):boolean {
    this.sync();if(!this.beds.some(b=>b.survivorId===id))return false;
    this.scheduler.stop(id);this.beds=this.beds.filter(b=>b.survivorId!==id);return true;
  }
  snapshot(){
    this.sync();return {schemaVersion:1 as const,beds:structuredClone(this.beds),rooms:this.rooms,populationCapacity:this.populationCapacity,
      overCapacity:Math.max(0,this.roster.survivors.length-this.populationCapacity),unhousedIds:this.roster.survivors.filter(p=>!this.beds.some(b=>b.survivorId===p.id)).map(p=>p.id)};
  }
  restore(raw:unknown):boolean {
    if(!raw||typeof raw!=='object')return false;const s=raw as ReturnType<Dormitories['snapshot']>;
    if(s.schemaVersion!==1||!Array.isArray(s.beds)||s.beds.length>100||new Set(s.beds.map(b=>b?.survivorId)).size!==s.beds.length||new Set(s.beds.map(b=>b?.id)).size!==s.beds.length||
      new Set(s.beds.map(b=>b?.roomId+':'+b?.slot)).size!==s.beds.length||!s.beds.every(b=>b&&typeof b.id==='string'&&b.id&&typeof b.survivorId==='string'&&typeof b.roomId==='string'&&typeof b.roomPosition==='string'&&Number.isSafeInteger(b.slot)&&b.slot>=0&&b.slot<6))return false;
    this.beds=structuredClone(s.beds);this.sync();return true;
  }
}
