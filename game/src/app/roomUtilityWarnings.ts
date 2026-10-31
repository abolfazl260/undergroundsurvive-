import type { Room } from '../modules/building/placement';
import type { PowerAllocation } from '../modules/power/network';
import type { LifeSupportRoomStatus } from '../modules/life-support/lifeSupport';
import { WATER_CONFIG, type WaterCycle } from '../modules/water/water';
import type { VentState } from '../modules/air/air';

/** Presentation-only state; never changes production, saved resources or room status. */
export interface RoomUtilityWarning {
  power: boolean;
  water: boolean;
}

export interface RoomUtilityInputs {
  rooms: readonly Pick<Room, 'id' | 'type'>[];
  power: PowerAllocation;
  powerStock: number;
  lifeSupportRooms: readonly LifeSupportRoomStatus[];
  waterRaw: number;
  waterCycles: readonly Pick<WaterCycle, 'id' | 'enabled'>[];
  vents: readonly Pick<VentState, 'id' | 'enabled' | 'health' | 'powered'>[];
  /** Before the first ventilation tick, a new vent has not yet been evaluated. */
  ventilationHasTicked: boolean;
}

/**
 * Combine authoritative per-room grid and life-support results with immediate
 * operating-budget checks. Storage and producers should never be marked as
 * consumers solely because a disconnected circuit exists nearby.
 */
export function roomUtilityWarnings(input: RoomUtilityInputs): Map<string, RoomUtilityWarning> {
  const grid = new Map(input.power.rooms.map(room => [room.roomId, room]));
  const waterStatus = new Map(input.lifeSupportRooms.map(room => [room.id, room]));
  const cycles = new Map(input.waterCycles.map(cycle => [cycle.id, cycle]));
  const vents = new Map(input.vents.map(vent => [vent.id, vent]));
  const result = new Map<string, RoomUtilityWarning>();

  for (const room of input.rooms) {
    const circuit = grid.get(room.id);
    // Dedicated processors consume electricity without a recipe in the
    // shared ResourceEngine, so their minimum operating cost is explicit.
    const appliancePower = room.type === 'waterTreatment' ? WATER_CONFIG.recipe.power :
      room.type === 'kitchen' || room.type === 'ventilation' ? 1 : 0;
    const requiredPower = Math.max(circuit?.demand ?? 0, appliancePower);
    const disconnected = input.power.mode === 'physical' &&
      circuit !== undefined && circuit.status !== 'online';
    const vent = vents.get(room.id);
    const unpoweredVent = room.type === 'ventilation' && input.ventilationHasTicked &&
      !!vent?.enabled && vent.health > 0 && !vent.powered;
    const power = requiredPower > 0 &&
      (disconnected || input.powerStock < requiredPower || unpoweredVent);

    // Life support records actual allocation failure (including closed
    // valves and isolated zones), not a guessed global water shortage.
    const dryLifeSupport = waterStatus.get(room.id)?.missing.includes('water') ?? false;
    const cycle = cycles.get(room.id);
    const dryTreatment = room.type === 'waterTreatment' && !!cycle?.enabled &&
      input.waterRaw < WATER_CONFIG.recipe.raw;
    result.set(room.id, { power, water: dryLifeSupport || dryTreatment });
  }
  return result;
}
