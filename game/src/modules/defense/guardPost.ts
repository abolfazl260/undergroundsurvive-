import type { Room } from '../building/placement';
import { GUARD_CONFIG, type SurvivorRoster } from '../survivors/roster';
export interface GuardPostState {roomId:string;level:number;guardCapacity:number;guards:number;enRoute:number;readiness:number;health:number;maxHealth:number;defenseBonus:number;equipment:readonly string[];status:'ready'|'unpowered'|'empty'|'damaged'}
export interface DefensePostProvider {getDefensePosts():readonly GuardPostState[]}
/** Adapter implemented by the weapons inventory when that module is available. */
export interface GuardEquipmentProvider {getAssignedEquipment(survivorId:string):readonly string[]}
export class GuardPosts implements DefensePostProvider {
  private health=new Map<string,number>();
  constructor(private rooms:()=>readonly Room[],private roster:SurvivorRoster,private power:(roomId:string)=>number|boolean,private equipment?:GuardEquipmentProvider){}
  setEquipmentProvider(provider:GuardEquipmentProvider):void {this.equipment=provider;}
  setHealth(roomId:string,health:number):boolean {
    const room=this.rooms().find(r=>r.id===roomId&&r.type==='guardPost');
    if(!room||!Number.isFinite(health)||health<0)return false;
    this.health.set(roomId,Math.min(GUARD_CONFIG.health[room.level-1],health));return true;
  }
  getDefensePosts():readonly GuardPostState[] {
    const rooms=this.rooms().filter(r=>r.type==='guardPost');
    for(const id of this.health.keys())if(!rooms.some(r=>r.id===id))this.health.delete(id);
    return rooms.map(r=>{
      const assignments=this.roster.assignments.filter(a=>a.roomId===r.id&&a.kind==='guard');
      const present=assignments.filter(a=>a.state==='active'),maxHealth=GUARD_CONFIG.health[r.level-1],health=Math.min(maxHealth,this.health.get(r.id)??maxHealth);
      const value=this.power(r.id),powered=typeof value==='number'?value>=GUARD_CONFIG.power:value;
      return {roomId:r.id,level:r.level,guardCapacity:GUARD_CONFIG.capacity[r.level-1],guards:present.length,enRoute:assignments.filter(a=>a.state==='enRoute').length,
        readiness:powered&&health>0?present.length/GUARD_CONFIG.capacity[r.level-1]:0,health,maxHealth,defenseBonus:GUARD_CONFIG.defenseBonus[r.level-1],
        equipment:present.flatMap(a=>[...(this.equipment?.getAssignedEquipment(a.survivorId)??[])]),status:!health?'damaged':!powered?'unpowered':present.length?'ready':'empty'};
    });
  }
  snapshot(){this.getDefensePosts();return {schemaVersion:1 as const,posts:this.getDefensePosts(),health:[...this.health].map(([roomId,value])=>({roomId,value}))};}
  restore(raw:unknown):boolean {
    if(!raw||typeof raw!=='object')return false;const s=raw as ReturnType<GuardPosts['snapshot']>;
    if(s.schemaVersion!==1||!Array.isArray(s.health)||s.health.length>100||new Set(s.health.map(h=>h?.roomId)).size!==s.health.length||!s.health.every(h=>h&&typeof h.roomId==='string'&&Number.isFinite(h.value)&&h.value>=0&&h.value<=200))return false;
    this.health=new Map(s.health.map(h=>[h.roomId,h.value]));this.getDefensePosts();return true;
  }
}
