import { isInsideWorld, type GridPosition } from './grid';
export type ElevatorSegment = GridPosition;
export const ELEVATOR_DEFINITION = { typeId: 'elevator', width: 1, height: 1, cost: 150, schemaVersion: 1 } as const;
export function connectedSegments(segments: readonly ElevatorSegment[]): ElevatorSegment[] {
  return segments.filter(s => {
    if (!isInsideWorld(s.x,s.y)) return false;
    const step = s.y < 0 ? 1 : -1;
    for (let y=s.y; y!==0; y+=step) if(!segments.some(p=>p.x===s.x && p.y===y)) return false;
    return segments.some(p=>p.x===s.x && p.y===0);
  });
}
export function accessibleFloors(segments: readonly ElevatorSegment[]): Set<number> {
  return new Set([0,...connectedSegments(segments).map(s=>s.y)]);
}
export function validElevators(raw: unknown): raw is ElevatorSegment[] {
  return Array.isArray(raw) && raw.length <= 98 && raw.every(p => p && isInsideWorld(p.x,p.y)) &&
    new Set(raw.map(p=>`${p.x}:${p.y}`)).size===raw.length && connectedSegments(raw).length===raw.length;
}
