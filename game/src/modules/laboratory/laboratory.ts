import type { Room } from '../building/placement';
import type { GuardAssignment } from '../survivors/roster';
import type { ResearchFacilityProvider } from '../research/research';
export const LABORATORY_CONFIG={schemaVersion:1,typeId:'laboratory',scientistCapacity:[1,2,3],power:2,speed:[1,1.1,1.2]} as const;
export interface LaboratoryFacility {
  roomId:string; level:number; scientistCapacity:number; assignedScientists:number;
  operationalPower:boolean; status:'active'|'unpowered'|'unstaffed';
}
export function laboratoryFacilities(rooms:readonly Room[],jobs:readonly GuardAssignment[],power:number):LaboratoryFacility[] {
  return rooms.filter(r=>r.type==='laboratory').map(r=>{
    const assignedScientists=jobs.filter(a=>a.roomId===r.id&&a.kind==='scientist'&&a.state==='active').length;
    const operationalPower=power>=LABORATORY_CONFIG.power;
    return {roomId:r.id,level:r.level,scientistCapacity:LABORATORY_CONFIG.scientistCapacity[r.level-1],assignedScientists,operationalPower,
      status:!operationalPower?'unpowered':!assignedScientists?'unstaffed':'active'};
  });
}
/** One selected facility feeds the existing global scheduler; never sum lab bonuses. */
export function researchFacility(facilities:readonly LaboratoryFacility[]):ResearchFacilityProvider {
  const ordered=[...facilities].sort((a,b)=>b.level-a.level||a.roomId.localeCompare(b.roomId));
  const lab=ordered.find(r=>r.status==='active')??ordered[0];
  return {level:lab?.level??0,powered:lab?.operationalPower??false,staffed:!!lab?.assignedScientists,
    speedMultiplier:lab?LABORATORY_CONFIG.speed[lab.level-1]:1};
}
