import type { RoomType } from './catalog';

export const MAX_ROOM_LEVEL = 3;

interface RoomEffectDefinition {
  readonly label: string;
  readonly unit: string;
  readonly base: number;
  readonly perLevel: number;
}

// Nominal room capacities; actual resource production is a separate feature.
const ROOM_EFFECTS: Record<RoomType, RoomEffectDefinition> = {
  guardPost: {label:'ظرفیت نگهبانی',unit:'نفر',base:1,perLevel:1},
  command: { label: 'ظرفیت هماهنگی', unit: 'واحد', base: 1, perLevel: 1 },
  habitat: { label: 'ظرفیت اسکان', unit: 'نفر', base: 2, perLevel: 2 },
  generator: { label: 'توان اسمی برق', unit: 'واحد', base: 10, perLevel: 5 },
  hydroponics: { label: 'ظرفیت کشت', unit: 'واحد', base: 8, perLevel: 4 },
  medbay: { label: 'ظرفیت درمان', unit: 'نفر', base: 2, perLevel: 1 },
  workshop: { label: 'ظرفیت کارگاه', unit: 'واحد', base: 5, perLevel: 3 },
  storage: { label: 'ظرفیت ذخیره', unit: 'واحد', base: 50, perLevel: 25 },
  laboratory: { label: 'سطح پژوهش', unit: 'واحد', base: 1, perLevel: 1 },
  kitchen: { label: 'جیره در هر پخت', unit: 'واحد', base: 4, perLevel: 2 },
  ventilation: { label: 'ظرفیت هوای سالم', unit: 'نفر', base: 5, perLevel: 3 },
  waterTreatment: { label: 'آب تمیز در هر چرخه', unit: 'واحد', base: 2, perLevel: 2 },
  mine: { label: 'توان اسمی استخراج', unit: 'واحد', base: 5, perLevel: 3 }
};

export interface RoomPerformance {
  readonly label: string;
  readonly unit: string;
  readonly value: number;
}

export function getRoomPerformance(type: RoomType, level: number): RoomPerformance {
  if (!Number.isInteger(level) || level < 1 || level > MAX_ROOM_LEVEL) {
    throw new Error('Invalid room level');
  }
  const effect = ROOM_EFFECTS[type];
  if (!effect) throw new Error('Invalid room type');
  return { label: effect.label, unit: effect.unit, value: effect.base + (level - 1) * effect.perLevel };
}
