/** A single source of truth lives on each roster survivor record. */
export interface SurvivorStats {morale:number}
export const SURVIVOR_STATS_CONFIG={schemaVersion:1,minMorale:0,maxMorale:100,initialMorale:50,moraleDecayPerMinute:0.5} as const;
export function changeMorale(stats:SurvivorStats,delta:number):void {
  if(!Number.isFinite(delta))return;
  stats.morale=Math.round(Math.max(SURVIVOR_STATS_CONFIG.minMorale,Math.min(SURVIVOR_STATS_CONFIG.maxMorale,stats.morale+delta))*1e6)/1e6;
}
