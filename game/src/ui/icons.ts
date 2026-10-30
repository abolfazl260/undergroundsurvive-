/** Resolution-independent, local outline icons. No network or font dependency. */
export const ICON_PATHS = {
  bunker: ['M3 21V10l9-7 9 7v11','M7 21v-8h10v8','M10 21v-4h4v4'],
  coin: ['M12 2.5a9.5 9.5 0 1 0 0 19a9.5 9.5 0 1 0 0-19','M15 8.5c-.9-1-2-1.5-3.4-1.5-1.8 0-3.1.9-3.1 2.3 0 3.5 7 1.2 7 5 0 1.5-1.5 2.7-3.5 2.7-1.5 0-2.8-.5-3.7-1.6','M12 5.5v13'],
  home: ['M3 11.5 12 4l9 7.5','M5.5 10v10h13V10','M10 20v-6h4v6'],
  bolt: ['M13.5 2 5 13h6l-.5 9L19 11h-6z'],
  wrench: ['M14.5 6.1a5 5 0 0 0-6.4 6.4L3 17.5a2.1 2.1 0 0 0 3 3l5.1-5.1a5 5 0 0 0 6.5-6.5l-3 3-3.5-3.5z'],
  package: ['M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z','M3 7.5 12 12l9-4.5','M12 12v9','M7.5 5.2 16.5 9.8'],
  pickaxe: ['M4 21 15.5 9.5','M11 4c4-1 7.7.1 10 3.5-4-.7-6.5 1.1-8.5 3.1','M7.5 7.5l5 5'],
  sprout: ['M12 21v-9','M12 15c-5 0-8.5-3.5-8.5-8.5 5 0 8.5 3.5 8.5 8.5z','M12 12c0-5 3.5-8.5 8.5-8.5 0 5-3.5 8.5-8.5 8.5z'],
  medical: ['M9 3h6v6h6v6h-6v6H9v-6H3V9h6z'],
  move: ['M4 12h16','m16 8 4 4-4 4','m8 8-4 4 4 4','M12 4v16','m8 8 4-4 4 4','m8 16 4 4 4-4'],
  'arrow-up': ['M12 20V4','m5 9-5-5-5 5'],
  trash: ['M4 7h16','M9 7V4h6v3','M6 7l1 14h10l1-14','M10 11v6','M14 11v6'],
  plus: ['M12 5v14','M5 12h14'],
  minus: ['M5 12h14'],
  reset: ['M3 11a9 9 0 1 1 3.2 7.2','M3 4v7h7'],
  'arrow-left': ['M19 12H5','m11 18-6-6 6-6'],
  gift: ['M3 10h18v11H3z','M2 7h20v3H2z','M12 7v14','M12 7c-5 0-7-1-7-3 0-3 5-3 7 3z','M12 7c5 0 7-1 7-3 0-3-5-3-7 3z'],
  layers: ['M3 8 12 3l9 5-9 5z','m3 5 9 5 9-5','m-18 5 9 5 9-5'],
  save: ['M4 3h14l3 3v15H3V3z','M7 3v6h10V3','M7 21v-8h10v8'],
  check: ['m4 12 5 5L20 6'],
  info: ['M12 2.5a9.5 9.5 0 1 0 0 19a9.5 9.5 0 1 0 0-19','M12 11v6','M12 7h.01'],
  'zoom-in': ['M10.5 3a7.5 7.5 0 1 0 0 15a7.5 7.5 0 1 0 0-15','m16 16 5 5','M7 10.5h7','M10.5 7v7'],
  'zoom-out': ['M10.5 3a7.5 7.5 0 1 0 0 15a7.5 7.5 0 1 0 0-15','m16 16 5 5','M7 10.5h7']
} as const;
export type IconName = keyof typeof ICON_PATHS;
export function isIconName(value: string): value is IconName {
  return Object.prototype.hasOwnProperty.call(ICON_PATHS, value);
}
/** Decorative SVG; keep the accessible name on the parent control. */
export function createIcon(name: IconName, size = 20): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [key, value] of Object.entries({
    viewBox: '0 0 24 24', width: String(size), height: String(size),
    fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true', focusable: 'false'
  })) svg.setAttribute(key, value);
  svg.classList.add('ui-icon');
  for (const d of ICON_PATHS[name]) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}
