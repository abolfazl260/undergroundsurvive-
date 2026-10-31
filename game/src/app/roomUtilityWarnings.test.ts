import { describe, expect, it } from 'vitest';
import { roomUtilityWarnings, type RoomUtilityInputs } from './roomUtilityWarnings';

const inputs = (): RoomUtilityInputs => ({
  rooms: [{ id: 'home', type: 'habitat' }, { id: 'plant', type: 'generator' }],
  power: {
    mode: 'physical', networks: [], activeRoomIds: ['plant'],
    rooms: [
      { roomId: 'home', networkId: null, demand: 2, production: 0, priority: 1, status: 'disconnected' },
      { roomId: 'plant', networkId: null, demand: 0, production: 8, priority: 2, status: 'disconnected' }
    ]
  },
  powerStock: 12,
  lifeSupportRooms: [],
  waterRaw: 20,
  waterCycles: [],
  vents: [],
  ventilationHasTicked: false
});

describe('room utility warning classification', () => {
  it('shows a lightning bolt only for an unpowered consumer, not a generator', () => {
    const statuses = roomUtilityWarnings(inputs());
    expect(statuses.get('home')).toEqual({ power: true, water: false });
    expect(statuses.get('plant')).toEqual({ power: false, water: false });
  });

  it('restores normal visuals when the circuit comes back online', () => {
    const state = inputs();
    state.power = {
      ...state.power,
      activeRoomIds: ['home', 'plant'],
      rooms: state.power.rooms.map(room => ({ ...room, status: 'online' as const }))
    };
    expect(roomUtilityWarnings(state).get('home')).toEqual({ power: false, water: false });
  });

  it('uses room-specific water shortages even with clean water elsewhere', () => {
    const state = inputs();
    state.power = {
      ...state.power, activeRoomIds: ['home'],
      rooms: state.power.rooms.map(room => ({ ...room, status: 'online' as const }))
    };
    state.lifeSupportRooms = [
      { id: 'home', status: 'degraded', missing: ['water'] },
      { id: 'plant', status: 'online', missing: [] }
    ];
    expect(roomUtilityWarnings(state).get('home')).toEqual({ power: false, water: true });
    expect(roomUtilityWarnings(state).get('plant')).toEqual({ power: false, water: false });
  });

  it('shows both icons when electricity and water are missing', () => {
    const state = inputs();
    state.lifeSupportRooms = [{ id: 'home', status: 'degraded', missing: ['water'] }];
    expect(roomUtilityWarnings(state).get('home')).toEqual({ power: true, water: true });
  });

  it('detects insufficient stock in legacy mode without an incorrect disconnected warning', () => {
    const state = inputs();
    state.power = {
      ...state.power, mode: 'legacy',
      rooms: state.power.rooms.map(room => ({ ...room, status: 'legacy' as const }))
    };
    expect(roomUtilityWarnings(state).get('home')?.power).toBe(false);
    state.powerStock = 0;
    expect(roomUtilityWarnings(state).get('home')?.power).toBe(true);
  });

  it('indicates missing raw water at an enabled water-treatment machine', () => {
    const state = inputs();
    state.rooms = [{ id: 'filter', type: 'waterTreatment' }];
    state.power = { mode: 'legacy', activeRoomIds: ['filter'], networks: [],
      rooms: [{ roomId: 'filter', networkId: 'legacy', demand: 0, production: 0, priority: 1, status: 'legacy' }] };
    state.waterCycles = [{ id: 'filter', enabled: true }];
    state.waterRaw = 0;
    expect(roomUtilityWarnings(state).get('filter')).toEqual({ power: false, water: true });
    state.waterRaw = 3;
    expect(roomUtilityWarnings(state).get('filter')?.water).toBe(false);
  });

  it('does not misidentify an intentionally disabled or not-yet-ticked vent as an outage', () => {
    const state = inputs();
    state.rooms = [{ id: 'vent', type: 'ventilation' }];
    state.power = { mode: 'legacy', activeRoomIds: ['vent'], networks: [],
      rooms: [{ roomId: 'vent', networkId: 'legacy', demand: 0, production: 0, priority: 1, status: 'legacy' }] };
    state.vents = [{ id: 'vent', enabled: true, health: 100, powered: false }];
    expect(roomUtilityWarnings(state).get('vent')?.power).toBe(false);
    state.ventilationHasTicked = true;
    expect(roomUtilityWarnings(state).get('vent')?.power).toBe(true);
    state.vents = [{ id: 'vent', enabled: false, health: 100, powered: false }];
    expect(roomUtilityWarnings(state).get('vent')?.power).toBe(false);
  });
});
