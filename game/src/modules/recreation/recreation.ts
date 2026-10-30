export const RECREATION_CONFIG = {schemaVersion:1,typeId:'recreation',capacity:[1,2,2],durationMs:30000,moralePerSecond:[1,1.5,2],activationPower:1,power:1} as const;
export interface RecreationVisit {
  id:string;survivorId:string;roomId:string;kind:'recreation';
  state:'enRoute'|'active'|'suspended';assignedAt:number;startedAt:number|null;elapsedMs:number;
}
