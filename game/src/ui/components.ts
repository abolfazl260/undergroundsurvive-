import { createIcon, isIconName, type IconName } from './icons';
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type BadgeTone = 'neutral' | 'success' | 'warning';
export function buttonClassNames(variant: ButtonVariant = 'secondary'): string {
  return 'ui-button ui-button--' + variant;
}
export function badgeClassNames(tone: BadgeTone = 'neutral'): string {
  return 'ui-badge ui-badge--' + tone;
}
/** Replaces fallback glyphs without rebuilding any parent buttons or listeners. */
export function enhanceIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-ui-icon]').forEach((slot) => {
    const name = slot.dataset.uiIcon;
    if (!name || !isIconName(name)) return;
    slot.replaceChildren(createIcon(name));
    slot.classList.add('ui-icon-slot');
    slot.setAttribute('aria-hidden', 'true');
  });
}
export function setButtonLabel(button: HTMLButtonElement, label: string, icon?: IconName): void {
  const text = document.createElement('span');
  text.className = 'ui-control-label';
  text.textContent = label;
  if (!icon) { button.replaceChildren(text); return; }
  const graphic = document.createElement('span');
  graphic.className = 'ui-control-icon';
  graphic.setAttribute('aria-hidden', 'true');
  graphic.append(createIcon(icon));
  button.replaceChildren(graphic, text);
}
export function setPressed(button: HTMLButtonElement, pressed: boolean): void {
  button.classList.toggle('active', pressed);
  button.setAttribute('aria-pressed', String(pressed));
}
export function createActionButton(options: {
  label: string; icon?: IconName; variant?: ButtonVariant; onClick?: () => void;
}): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = buttonClassNames(options.variant);
  setButtonLabel(button, options.label, options.icon);
  if (options.onClick) button.addEventListener('click', options.onClick);
  return button;
}
export function createBadge(label: string, tone: BadgeTone = 'neutral', icon?: IconName): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.className = badgeClassNames(tone);
  if (icon) badge.append(createIcon(icon));
  const text = document.createElement('span');
  text.textContent = label;
  badge.append(text);
  return badge;
}
export function createPanel(title: string, description: string): HTMLElement {
  const panel = document.createElement('section');
  panel.className = 'ui-panel';
  const heading = document.createElement('h2');
  heading.className = 'ui-panel-title';
  heading.textContent = title;
  const body = document.createElement('p');
  body.className = 'ui-panel-description';
  body.textContent = description;
  panel.append(heading, body);
  return panel;
}
