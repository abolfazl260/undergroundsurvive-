import type { GameScene } from './GameScene';
import type { AudioManager } from '../modules/audio/AudioManager';
import type { AudioSettings } from '../modules/audio/settings';
import { loadMenuSettings, saveMenuSettings, type MenuSettings } from './menuSettings';
import { getLocale, setLocale, subscribeLocaleChange, t, formatNumber } from '../i18n';
import { renderPolicyContent } from './policyContent';

type MenuScreen = 'home' | 'pause' | 'settings' | 'policies' | 'confirm-new' | 'defeat';
type ReturnScreen = 'home' | 'pause';
type PolicyReturnScreen = ReturnScreen | 'settings';

/** The modal makes other DOM controls inert while the Phaser scene is paused. */
export function setupGameMenu(
  scene: GameScene,
  savedGameExists: boolean,
  audio: AudioManager,
  onAudioChange: () => void,
  onResumed: () => void = () => {}
): (forceDefeat?: boolean) => void {
  const dialog = document.querySelector<HTMLDialogElement>('#game-menu-dialog');
  const menuButton = document.querySelector<HTMLButtonElement>('#menu-toggle');
  const toolsPolicyButton = document.querySelector<HTMLButtonElement>('#menu-policies-from-tools');
  const continueButton = document.querySelector<HTMLButtonElement>('#menu-continue');
  const continueLabel = document.querySelector<HTMLElement>('[data-menu-continue-label]');
  const pauseTitle = document.querySelector<HTMLElement>('#menu-pause-title');
  const newButton = document.querySelector<HTMLButtonElement>('#menu-new');
  const reducedMotion = document.querySelector<HTMLInputElement>('#menu-reduced-motion');
  const language = document.querySelector<HTMLSelectElement>('#menu-language');
  const policyContent = document.querySelector<HTMLElement>('#menu-policy-content');
  const mute = document.querySelector<HTMLButtonElement>('#menu-audio-mute');
  const musicEnabled = document.querySelector<HTMLInputElement>('#menu-music-enabled');
  const effectsEnabled = document.querySelector<HTMLInputElement>('#menu-effects-enabled');
  const musicVolume = document.querySelector<HTMLInputElement>('#menu-music-volume');
  const effectsVolume = document.querySelector<HTMLInputElement>('#menu-effects-volume');
  const musicValue = document.querySelector<HTMLOutputElement>('#menu-music-volume-value');
  const effectsValue = document.querySelector<HTMLOutputElement>('#menu-effects-volume-value');
  if (!dialog || !menuButton || !continueButton || !continueLabel || !pauseTitle || !newButton || !reducedMotion || !mute ||
      !musicEnabled || !effectsEnabled || !musicVolume || !effectsVolume || !musicValue || !effectsValue || !language || !policyContent) return () => {};

  let playing = false;
  let hasSave = savedGameExists;
  let screen: MenuScreen = 'home';
  let returnScreen: ReturnScreen = 'home';
  let policyReturnScreen: PolicyReturnScreen = 'home';
  let settings: MenuSettings = loadMenuSettings();

  // Reuse the existing modal to prevent a second competing overlay on mobile.
  const defeat = document.createElement('section');
  defeat.className = 'menu-screen--defeat';
  defeat.dataset.menuScreen = 'defeat';
  defeat.hidden = true;
  const defeatKicker = document.createElement('p');
  defeatKicker.className = 'defeat-kicker';
  const defeatTitle = document.createElement('h2');
  defeatTitle.id = 'menu-defeat-title';
  defeatTitle.tabIndex = -1;
  const defeatMeter = document.createElement('div');
  defeatMeter.className = 'defeat-meter';
  defeatMeter.setAttribute('aria-label', 'Air 0 percent');
  defeatMeter.textContent = '0%';
  const defeatDescription = document.createElement('p');
  defeatDescription.className = 'defeat-description';
  const defeatRestart = document.createElement('button');
  defeatRestart.type = 'button';
  defeatRestart.dataset.menuAction = 'restart-after-defeat';
  defeatRestart.className = 'defeat-restart';
  defeat.append(defeatKicker, defeatTitle, defeatMeter, defeatDescription, defeatRestart);
  dialog.append(defeat);

  function renderDefeat(): void {
    const en = getLocale() === 'en';
    defeat.dir = en ? 'ltr' : 'rtl';
    defeatKicker.textContent = en ? 'SHELTER EMERGENCY' : 'وضعیت اضطراری پناهگاه';
    defeatTitle.textContent = en ? 'Game over' : 'بازی تمام شد';
    defeatMeter.setAttribute('aria-label', en ? 'Air quality zero percent' : 'کیفیت هوا صفر درصد');
    defeatDescription.textContent = en
      ? 'The shelter ran out of breathable air. You lost. Starting again permanently resets this run and its progress.'
      : 'هوای قابل تنفس پناهگاه به صفر رسید و شما شکست خوردید. شروع دوباره، پیشرفت این دور را به‌طور کامل بازنشانی می‌کند.';
    defeatRestart.textContent = en ? 'Start a new game' : 'شروع بازی جدید';
  }

  function showDefeat(): void {
    scene.pauseGameplay();
    playing = false;
    hasSave = true;
    renderDefeat();
    showScreen('defeat');
    menuButton!.hidden = true;
    if (!dialog!.open) dialog!.showModal();
    defeatRestart.focus();
  }

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

  function showScreen(next: MenuScreen): void {
    screen = next;
    dialog!.querySelectorAll<HTMLElement>('[data-menu-screen]').forEach((panel) => {
      panel.hidden = panel.dataset.menuScreen !== next;
    });
    dialog!.setAttribute('aria-labelledby', 'menu-' + next + '-title');
    if (next === 'settings') renderAudio();
    if (next === 'policies') renderPolicyContent(policyContent!, getLocale());
    dialog!.scrollTop = 0;
    dialog!.querySelector<HTMLElement>('#menu-' + next + '-title')?.focus();
  }

  function resume(): void {
    if (scene.isGameOver) { showDefeat(); return; }
    playing = true;
    hasSave = true;
    renderHome();
    audio.activate(); // The start/continue button is a user gesture.
    scene.resumeGameplay();
    dialog!.close();
    menuButton!.hidden = false;
    menuButton!.focus();
    onResumed();
  }

  function openPauseMenu(): void {
    if (scene.isGameOver) { showDefeat(); return; }
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
  // Let the game finish booting before placing this modal in the top layer.
  menuButton.addEventListener('click', openPauseMenu);
  toolsPolicyButton?.addEventListener('click', () => {
    if (!playing || dialog!.open) return;
    scene.pauseGameplay();
    policyReturnScreen = 'pause';
    showScreen('policies');
    dialog!.showModal();
  });

  language.addEventListener('change', () => setLocale(language.value));
  subscribeLocaleChange(() => {
    language.value = getLocale();
    renderHome();
    renderPauseHeading();
    renderAudio();
    if (screen === 'defeat') renderDefeat();
    if (screen === 'policies') renderPolicyContent(policyContent!, getLocale());
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
      case 'restart-after-defeat':
        scene.resetLayout();
        resume();
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
      case 'back':
        showScreen(screen === 'policies' ? policyReturnScreen : returnScreen);
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
    if (screen === 'defeat') return;
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
  return (forceDefeat = false) => {
    if (forceDefeat || scene.isGameOver) { showDefeat(); return; }
    if (!dialog.open) dialog.showModal();
  };
}
