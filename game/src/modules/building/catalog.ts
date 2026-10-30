export type RoomType = 'command' | 'habitat' | 'generator' | 'hydroponics' | 'medbay' | 'workshop' | 'storage' | 'mine' | 'waterTreatment';
export type BuildableRoomType = Exclude<RoomType, 'command'>;

export interface RoomDefinition {
  readonly label: string;
  readonly width: number;
  readonly height: number;
  readonly color: number;
  readonly accent: number;
}

export const ROOM_DEFINITIONS: Record<RoomType, RoomDefinition> = {
  command: { label: 'COMMAND', width: 3, height: 1, color: 0x294d59, accent: 0x9fdbd8 },
  habitat: { label: 'HABITAT', width: 2, height: 1, color: 0x424f79, accent: 0xc2cbff },
  generator: { label: 'POWER', width: 2, height: 1, color: 0x6b5034, accent: 0xf2c782 },
  hydroponics: { label: 'GARDEN', width: 2, height: 1, color: 0x315847, accent: 0x96daa9 },
  medbay: { label: 'MEDBAY', width: 2, height: 1, color: 0x664650, accent: 0xffbbc6 },
  workshop: { label: 'WORKSHOP', width: 2, height: 1, color: 0x57523d, accent: 0xe9b978 },
  storage: { label: 'STORAGE', width: 2, height: 1, color: 0x5b4837, accent: 0xc7ac7f },
  waterTreatment: { label: 'WATER', width: 2, height: 1, color: 0x245a70, accent: 0x98e4ff },
  mine: { label: 'MINE', width: 2, height: 1, color: 0x4b4036, accent: 0xe2b56c }
};

