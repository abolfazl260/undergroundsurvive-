import type { GameSnapshot } from '../modules/economy/session';
import { getLocale, subscribeLocaleChange } from '../i18n';
import './firstRunTutorial.css';

export type TutorialStep = 'story' | 'water' | 'upgrade' | 'done';
export const TUTORIAL_KEY = 'underground-survive:first-run:v1';

export function initialTutorialStep(stored: string | null, hasSave: boolean): TutorialStep {
  if (stored === 'story' || stored === 'water' || stored === 'upgrade' || stored === 'done') return stored;
  // Existing players should not be dropped into a new tutorial after an update.
  return hasSave ? 'done' : 'story';
}

/** Only the authoritative saved room state can complete gameplay objectives. */
export function nextTutorialStep(step: TutorialStep, snapshot: Pick<GameSnapshot, 'base'>): TutorialStep {
  if (step === 'water' && snapshot.base.rooms.some((room) => room.type === 'waterTreatment')) {
    step = 'upgrade';
  }
  if (step === 'upgrade' && snapshot.base.rooms.some((room) => room.level >= 2)) {
    return 'done';
  }
  return step;
}

interface FirstRunTutorialOptions {
  hasSave: boolean;
  openStory: () => void;
  selectWater: () => void;
  selectUpgrade: () => void;
  doc?: Document;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
}

export interface FirstRunTutorial {
  start(): void;
  storyFinished(): void;
  sync(snapshot: Pick<GameSnapshot, 'base'>): void;
  getStep(): TutorialStep;
}

const copy = {
  fa: {
    marker: 'راهنمای شروع بازی',
    skip: 'رد کردن راهنما',
    progress: (step: number) => `مرحله ${step} از ۳`,
    story: ['داستان پناهگاه', 'سه ماه از بسته‌شدن درهای پناهگاه گذشته است. پیش از شروع، روایت آلودگی مرموز تهران را ببینید.', 'نمایش داستان'],
    water: ['اولین تصفیه‌خانه آب', 'ساخت را انتخاب کنید، سپس در فضای سبز و خالی کنار اتاق‌های موجود روی زمین بزنید. تصفیه‌خانه دو خانه جا می‌گیرد.', 'انتخاب تصفیه‌خانه'],
    upgrade: ['اولین ارتقای پناهگاه', 'ابزار ارتقا را انتخاب کنید، روی یک اتاق سطح ۱ بزنید و پرداخت ارتقا به سطح ۲ را تأیید کنید.', 'انتخاب ابزار ارتقا']
  },
  en: {
    marker: 'Getting started',
    skip: 'Skip tutorial',
    progress: (step: number) => `Step ${step} of 3`,
    story: ['The shelter story', 'Three months have passed since the shelter doors sealed. Discover what happened in Tehran before you begin.', 'Watch story'],
    water: ['Build your first water plant', 'Select Build, then tap a free green area next to the existing rooms. The water plant needs two cells.', 'Select water treatment'],
    upgrade: ['Upgrade your first room', 'Choose Upgrade, tap any level 1 room, then confirm the payment to reach level 2.', 'Choose upgrade tool']
  }
} as const;

/** Lightweight HUD coach: it never changes the economy or builds rooms on behalf of the player. */
export function mountFirstRunTutorial(options: FirstRunTutorialOptions): FirstRunTutorial {
  const doc = options.doc ?? document;
  const storage = options.storage === undefined ? (() => {
    try { return doc.defaultView?.localStorage ?? null; } catch { return null; }
  })() : options.storage;
  let stored: string | null = null;
  try { stored = storage?.getItem(TUTORIAL_KEY) ?? null; } catch { /* Storage may be blocked. */ }
  let step = initialTutorialStep(stored, options.hasSave);
  let started = false;
  const panel = doc.createElement('aside');
  panel.className = 'first-run-coach';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'راهنمای آغاز بازی');
  panel.innerHTML = `
    <div class="first-run-coach__head">
      <span class="first-run-coach__marker"></span>
      <button type="button" class="first-run-coach__skip"></button>
    </div>
    <div class="first-run-coach__progress" aria-live="polite"></div>
    <h2 class="first-run-coach__title"></h2>
    <p class="first-run-coach__description"></p>
    <button type="button" class="first-run-coach__action"></button>
  `;
  doc.body.append(panel);
  const marker = panel.querySelector<HTMLElement>('.first-run-coach__marker')!;
  const progress = panel.querySelector<HTMLElement>('.first-run-coach__progress')!;
  const title = panel.querySelector<HTMLElement>('.first-run-coach__title')!;
  const description = panel.querySelector<HTMLElement>('.first-run-coach__description')!;
  const action = panel.querySelector<HTMLButtonElement>('.first-run-coach__action')!;
  const skip = panel.querySelector<HTMLButtonElement>('.first-run-coach__skip')!;

  function persist(): void {
    try { storage?.setItem(TUTORIAL_KEY, step); } catch { /* Playable without persistent storage. */ }
  }
  // Persist before the first game save is created, so a reload resumes the story.
  if (stored === null && !options.hasSave) persist();

  function render(): void {
    panel.hidden = !started || step === 'done';
    if (panel.hidden) return;
    const lang = getLocale() === 'en' ? 'en' : 'fa';
    const strings = copy[lang];
    const current = step === 'story' ? 1 : step === 'water' ? 2 : 3;
    const [heading, body, button] = strings[step === 'story' ? 'story' : step === 'water' ? 'water' : 'upgrade'];
    panel.dir = lang === 'fa' ? 'rtl' : 'ltr';
    panel.setAttribute('aria-label', strings.marker);
    marker.textContent = strings.marker;
    skip.textContent = strings.skip;
    progress.textContent = strings.progress(current);
    title.textContent = heading;
    description.textContent = body;
    action.textContent = button;
  }

  function setStep(next: TutorialStep): void {
    if (next === step) return;
    step = next;
    persist();
    render();
  }

  action.addEventListener('click', () => {
    if (step === 'story') options.openStory();
    if (step === 'water') options.selectWater();
    if (step === 'upgrade') options.selectUpgrade();
  });
  skip.addEventListener('click', () => setStep('done'));
  subscribeLocaleChange(render);
  return {
    start() {
      if (started) return;
      started = true;
      render();
      if (step === 'story') options.openStory();
    },
    storyFinished() {
      if (step !== 'story') return;
      setStep('water');
      options.selectWater();
    },
    sync(snapshot) {
      const before = step;
      setStep(nextTutorialStep(step, snapshot));
      if (before === 'water' && step === 'upgrade' && started) options.selectUpgrade();
    },
    getStep: () => step
  };
}
