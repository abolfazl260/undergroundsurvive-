import type { GameScene } from './GameScene';
import type { AudioManager } from '../modules/audio/AudioManager';
import type { AudioSettings } from '../modules/audio/settings';
import { loadMenuSettings, saveMenuSettings, type MenuSettings } from './menuSettings';
import { getLocale, setLocale, subscribeLocaleChange, t, formatNumber } from '../i18n';
import { getPolicyContent } from './policies';

type MenuScreen = 'home' | 'pause' | 'settings' | 'policies' | 'confirm-new';
type PolicyReturnScreen = 'home' | 'pause' | 'settings';
type ReturnScreen = 'home' | 'pause';

/** The modal makes other DOM controls inert while the Phaser scene is paused. */
export function setupGameMenu(
  scene: GameScene,
  savedGameExists: boolean,
  audio: AudioManager,
  onAudioChange: () => void
): void {
  const dialog = document.querySelector<HTMLDialogElement>('#game-menu-dialog');
  const menuButton = document.querySelector<HTMLButtonElement>('#menu-toggle');
  const continueButton = document.querySelector<HTMLButtonElement>('#menu-continue');
  const continueLabel = document.querySelector<HTMLElement>('[data-menu-continue-label]');
  const pauseTitle = document.querySelector<HTMLElement>('#menu-pause-title');
  const newButton = document.querySelector<HTMLButtonElement>('#menu-new');
  const reducedMotion = document.querySelector<HTMLInputElement>('#menu-reduced-motion');
  const language = document.querySelector<HTMLSelectElement>('#menu-language');
  const mute = document.querySelector<HTMLButtonElement>('#menu-audio-mute');
  const musicEnabled = document.querySelector<HTMLInputElement>('#menu-music-enabled');
  const effectsEnabled = document.querySelector<HTMLInputElement>('#menu-effects-enabled');
  const musicVolume = document.querySelector<HTMLInputElement>('#menu-music-volume');
  const effectsVolume = document.querySelector<HTMLInputElement>('#menu-effects-volume');
  const musicValue = document.querySelector<HTMLOutputElement>('#menu-music-volume-value');
  const effectsValue = document.querySelector<HTMLOutputElement>('#menu-effects-volume-value');
  const policiesIntro = document.querySelector<HTMLElement>('#menu-policies-intro');
  const policiesSections = document.querySelector<HTMLElement>('#menu-policies-sections');
  const policiesVersion = document.querySelector<HTMLElement>('#menu-policies-version');
  const policiesNotice = document.querySelector<HTMLElement>('#menu-policies-notice');
  if (!dialog || !menuButton || !continueButton || !continueLabel || !pauseTitle || !newButton || !reducedMotion || !mute ||
      !musicEnabled || !effectsEnabled || !musicVolume || !effectsVolume || !musicValue || !effectsValue ||
      !language || !policiesIntro || !policiesSections || !policiesVersion || !policiesNotice) return;

  let playing = false;
  let hasSave = savedGameExists;
  let screen: MenuScreen = 'home';
  let returnScreen: ReturnScreen = 'home';
  let policyReturnScreen: PolicyReturnScreen = 'home';
  let settings: MenuSettings = loadMenuSettings();

  function renderHome(): void {
    // Preserve the decorated button and its click handler when changing the label.
    continueLabel!.textContent = t(hasSave ? 'ادامهٔ بازی' : 'شروع بازی');
    newButton!.hidden = !hasSave;
  }

  function renderPauseHeading(): void {
    // A highlighted word remains readable and correctly ordered in both locales.
    const isPersian = getLocale() === 'fa';
    const accent = document.createElement('span');
    accent.className = 'menu-title-accent';
    accent.textContent = isPersian ? 'متوقف' : 'paused';
    pauseTitle!.replaceChildren(
      document.createTextNode(isPersian ? 'بازی ' : 'Game '),
      accent,
      document.createTextNode(isPersian ? ' شده است' : '')
    );
  }

  function renderAudio(): void {
    const state = audio.getSettings();
    mute!.setAttribute('aria-pressed', String(state.muted));
    mute!.textContent = t(state.muted ? 'فعال‌کردن صدا' : 'قطع همهٔ صداها');
    mute!.disabled = !audio.supported;
    musicEnabled!.checked = state.musicEnabled;
    effectsEnabled!.checked = state.effectsEnabled;
    musicEnabled!.disabled = !audio.supported;
    effectsEnabled!.disabled = !audio.supported;
    musicVolume!.value = String(Math.round(state.musicVolume * 100));
    effectsVolume!.value = String(Math.round(state.effectsVolume * 100));
    musicVolume!.disabled = !audio.supported || !state.musicEnabled;
    effectsVolume!.disabled = !audio.supported || !state.effectsEnabled;
    musicValue!.textContent = formatNumber(Math.round(state.musicVolume * 100)) + '%';
    effectsValue!.textContent = formatNumber(Math.round(state.effectsVolume * 100)) + '%';
  }

  function changeAudio(patch: Partial<AudioSettings>): void {
    audio.setSettings(patch);
    audio.activate(); // Called only from a direct user action, preserving autoplay policies.
    renderAudio();
    onAudioChange();
  }

  /** Build policy copy as text nodes, never as executable HTML. */
  function renderPolicies(): void {
    const policy = getPolicyContent(getLocale());
    policiesIntro!.textContent = policy.introduction;
    policiesVersion!.textContent = policy.versionLabel;
    policiesNotice!.textContent = policy.notice;

    const previous = policiesSections!.querySelectorAll<HTMLDetailsElement>('details[data-policy-section]');
    const expanded = new Set(Array.from(previous).filter((node) => node.open).map((node) => node.dataset.policySection));
    const firstRender = previous.length === 0;
    const panels = policy.sections.map((section, index) => {
      const panel = document.createElement('details');
      panel.className = 'menu-policy-section';
      panel.dataset.policySection = section.id;
      panel.open = firstRender ? index === 0 : expanded.has(section.id);

      const summary = document.createElement('summary');
      const heading = document.createElement('strong');
      heading.textContent = section.title;
      const subtitle = document.createElement('small');
      subtitle.textContent = section.description;
      summary.append(heading, subtitle);

      const items = document.createElement('div');
      items.className = 'menu-policy-items';
      for (const item of section.items) {
        const article = document.createElement('article');
        article.className = 'menu-policy-item';
        const title = document.createElement('h3');
        title.textContent = item.heading;
        const body = document.createElement('p');
        body.textContent = item.description;
        article.append(title, body);
        items.append(article);
      }
      panel.append(summary, items);
      return panel;
    });
    policiesSections!.replaceChildren(...panels);
  }

  function showScreen(next: MenuScreen): void {
    screen = next;
    dialog!.querySelectorAll<HTMLElement>('[data-menu-screen]').forEach((panel) => {
      panel.hidden = panel.dataset.menuScreen !== next;
    });
    dialog!.setAttribute('aria-labelledby', 'menu-' + next + '-title');
    if (next === 'settings') renderAudio();
    if (next === 'policies') renderPolicies();
    dialog!.querySelector<HTMLElement>('#menu-' + next + '-title')?.focus();
  }

  function resume(): void {
    playing = true;
    hasSave = true;
    renderHome();
    audio.activate(); // The start/continue button is a user gesture.
    scene.resumeGameplay();
    dialog!.close();
    menuButton!.hidden = false;
    menuButton!.focus();
  }

  function openPauseMenu(): void {
    if (!playing || dialog!.open) return;
    scene.pauseGameplay();
    showScreen('pause');
    dialog!.showModal();
  }

  function updateSettings(next: MenuSettings): void {
    settings = next;
    reducedMotion!.checked = settings.reducedMotion;
    dialog!.classList.toggle('reduce-motion', settings.reducedMotion);
    scene.applyMenuSettings(settings);
    saveMenuSettings(settings);
  }

  scene.applyMenuSettings(settings);
  dialog.classList.toggle('reduce-motion', settings.reducedMotion);
  renderPauseHeading();
  renderHome();
  language.value = getLocale();
  reducedMotion.checked = settings.reducedMotion;
  showScreen('home');
  dialog.showModal();
  menuButton.addEventListener('click', openPauseMenu);

  language.addEventListener('change', () => setLocale(language.value));
  subscribeLocaleChange(() => {
    language.value = getLocale();
    renderHome();
    renderPauseHeading();
    renderAudio();
    if (screen === 'policies') renderPolicies();
  });
  mute.addEventListener('click', () => changeAudio({ muted: !audio.getSettings().muted }));
  musicEnabled.addEventListener('change', () => changeAudio({ musicEnabled: musicEnabled.checked }));
  effectsEnabled.addEventListener('change', () => changeAudio({ effectsEnabled: effectsEnabled.checked }));
  musicVolume.addEventListener('input', () => changeAudio({ musicVolume: Number(musicVolume.value) / 100 }));
  effectsVolume.addEventListener('input', () => changeAudio({ effectsVolume: Number(effectsVolume.value) / 100 }));
  reducedMotion.addEventListener('change', () => {
    updateSettings({ ...settings, reducedMotion: reducedMotion.checked });
  });

  dialog.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('button[data-menu-action]');
    if (!button) return;
    switch (button.dataset.menuAction) {
      case 'continue':
      case 'resume':
        resume();
        break;
      case 'new':
        returnScreen = screen === 'pause' ? 'pause' : 'home';
        showScreen('confirm-new');
        break;
      case 'confirm-new':
        scene.resetLayout();
        resume();
        break;
      case 'settings':
        returnScreen = screen === 'pause' ? 'pause' : 'home';
        showScreen('settings');
        break;
      case 'policies':
        policyReturnScreen = screen === 'settings' ? 'settings' : screen === 'pause' ? 'pause' : 'home';
        showScreen('policies');
        break;
      case 'policy-back':
        showScreen(policyReturnScreen);
        break;
      case 'back':
        showScreen(returnScreen);
        break;
      case 'main':
        hasSave = true;
        renderHome();
        showScreen('home');
        break;
    }
  });

  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (screen === 'pause') resume();
    else if (screen === 'policies') showScreen(policyReturnScreen);
    else if (screen !== 'home') showScreen(returnScreen);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && playing && !dialog.open) {
      event.preventDefault();
      openPauseMenu();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) openPauseMenu();
  });
}
