import type { Room } from '../building/placement';
import type { RoomType } from '../building/catalog';
import { getRoomPerformance } from '../building/upgrades';
export type CapabilityId='overview'|'industry'|'repairRobots';
export interface CommandCenterDefinition {
 schemaVersion:1;typeId:'command';singleton:boolean;
 unlocksAtLevel:readonly {id:CapabilityId;level:number;implemented:boolean;enabled:boolean;name:{fa:string;en:string}}[];
}
export const COMMAND_CENTER_DEFINITION:CommandCenterDefinition={schemaVersion:1,typeId:'command',singleton:true,unlocksAtLevel:[
 {id:'overview',level:1,implemented:true,enabled:true,name:{fa:'مدیریت پناهگاه',en:'Shelter overview'}},
 {id:'industry',level:2,implemented:true,enabled:true,name:{fa:'ساخت معدن و کارگاه',en:'Mine and workshop construction'}},
 {id:'repairRobots',level:3,implemented:false,enabled:false,name:{fa:'ربات تعمیرکار (آینده)',en:'Repair robots (planned)'}}
]};
export type CapabilityBlock='disabled'|'missing'|'power'|'level';
export interface CommandCenterStatus {activeRoomId:string|null;level:number;powered:boolean;earned:readonly CapabilityId[]}
export interface CommandCenterSnapshot {schemaVersion:1;activeRoomId:string|null;earned:CapabilityId[];operations:string[]}
export class CapabilityGate {
 private state:CommandCenterSnapshot={schemaVersion:1,activeRoomId:null,earned:[],operations:[]};
 constructor(readonly definition:CommandCenterDefinition=COMMAND_CENTER_DEFINITION){}
 reconcile(rooms:readonly Room[]):void {
  const commands=rooms.filter(r=>r.type==='command');
  const active=commands.find(r=>r.id===this.state.activeRoomId)??[...commands].sort((a,b)=>a.id.localeCompare(b.id))[0];
  this.state.activeRoomId=active?.id??null;
  for(const rule of this.definition.unlocksAtLevel)if(active&&rule.implemented&&rule.enabled&&active.level>=rule.level&&!this.state.earned.includes(rule.id))this.state.earned.push(rule.id);
 }
 status(rooms:readonly Room[],power:number):CommandCenterStatus {
  this.reconcile(rooms);const active=rooms.find(r=>r.id===this.state.activeRoomId);
  return {activeRoomId:this.state.activeRoomId,level:active?.level??0,powered:!!active&&power>=getRoomPerformance('command',active.level).value,earned:[...this.state.earned]};
 }
 block(id:CapabilityId,rooms:readonly Room[],power:number):CapabilityBlock|null {
  const rule=this.definition.unlocksAtLevel.find(r=>r.id===id);if(!rule||!rule.enabled||!rule.implemented)return 'disabled';
  const s=this.status(rooms,power);if(!s.activeRoomId)return 'missing';if(!s.powered)return 'power';
  return s.earned.includes(id)?null:'level';
 }
 forRoom(type:RoomType):CapabilityId|null{return type==='mine'||type==='workshop'?'industry':null;}
 hasOperation(id:string):boolean{return !id||this.state.operations.includes(id)||this.state.operations.length>=5000;}
 recordOperation(id:string):void{this.state.operations.push(id);}
 snapshot():CommandCenterSnapshot{return structuredClone(this.state);}
 static restore(raw:unknown):CapabilityGate|null {
  if(!raw||typeof raw!=='object')return null;const s=raw as CommandCenterSnapshot;
  if(s.schemaVersion!==1||(s.activeRoomId!==null&&(typeof s.activeRoomId!=='string'||!s.activeRoomId))||
   !Array.isArray(s.earned)||new Set(s.earned).size!==s.earned.length||!s.earned.every(id=>COMMAND_CENTER_DEFINITION.unlocksAtLevel.some(r=>r.id===id&&r.implemented&&r.enabled))||
   !Array.isArray(s.operations)||s.operations.length>5000||new Set(s.operations).size!==s.operations.length||!s.operations.every(id=>typeof id==='string'&&id.length>0))return null;
  const gate=new CapabilityGate();gate.state=structuredClone(s);return gate;
 }
}
export const CAPABILITY_REASONS:Record<CapabilityBlock,string>={disabled:'این قابلیت هنوز فعال نشده است.',missing:'اتاق فرماندهی فعال لازم است.',power:'فرماندهی برق کافی ندارد.',level:'فرماندهی سطح ۲ لازم است.'};
