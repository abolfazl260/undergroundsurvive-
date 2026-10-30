import type { GameScene } from './GameScene';
import type { AudioManager } from '../modules/audio/AudioManager';
import type { AudioSettings } from '../modules/audio/settings';
import { loadMenuSettings, saveMenuSettings, type MenuSettings } from './menuSettings';
import { getLocale, setLocale, subscribeLocaleChange, t, formatNumber } from '../i18n';

type MenuScreen = 'home' | 'pause' | 'settings' | 'confirm-new';
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
  if (!dialog || !menuButton || !continueButton || !newButton || !reducedMotion || !mute ||
      !musicEnabled || !effectsEnabled || !musicVolume || !effectsVolume || !musicValue || !effectsValue || !language) return;

  let playing = false;
  let hasSave = savedGameExists;
  let screen: MenuScreen = 'home';
  let returnScreen: ReturnScreen = 'home';
  let settings: MenuSettings = loadMenuSettings();

  function renderHome(): void {
    continueButton!.textContent = t(hasSave ? 'ادامهٔ بازی' : 'شروع بازی');
    newButton!.hidden = !hasSave;
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

  function showScreen(next: MenuScreen): void {
    screen = next;
    dialog!.querySelectorAll<HTMLElement>('[data-menu-screen]').forEach((panel) => {
      panel.hidden = panel.dataset.menuScreen !== next;
    });
    dialog!.setAttribute('aria-labelledby', 'menu-' + next + '-title');
    if (next === 'settings') renderAudio();
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
    scene.applyMenuSettings(settings);
    saveMenuSettings(settings);
  }

  scene.applyMenuSettings(settings);
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
    renderAudio();
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
