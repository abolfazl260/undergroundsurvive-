import type { GameScene } from './GameScene';
import { loadMenuSettings, saveMenuSettings, type MenuSettings } from './menuSettings';

type MenuScreen = 'home' | 'pause' | 'settings' | 'confirm-new';
type ReturnScreen = 'home' | 'pause';

/**
 * The menu is a native modal dialog: the rest of the document is inert on
 * desktop and mobile, while the Phaser scene is separately paused.
 */
export function setupGameMenu(scene: GameScene, savedGameExists: boolean): void {
  const dialog = document.querySelector<HTMLDialogElement>('#game-menu-dialog');
  const menuButton = document.querySelector<HTMLButtonElement>('#menu-toggle');
  const continueButton = document.querySelector<HTMLButtonElement>('#menu-continue');
  const newButton = document.querySelector<HTMLButtonElement>('#menu-new');
  const volume = document.querySelector<HTMLInputElement>('#menu-volume');
  const volumeValue = document.querySelector<HTMLOutputElement>('#menu-volume-value');
  const reducedMotion = document.querySelector<HTMLInputElement>('#menu-reduced-motion');
  if (!dialog || !menuButton || !continueButton || !newButton ||
      !volume || !volumeValue || !reducedMotion) return;

  let playing = false;
  let hasSave = savedGameExists;
  let screen: MenuScreen = 'home';
  let returnScreen: ReturnScreen = 'home';
  let settings: MenuSettings = loadMenuSettings();

  function renderHome(): void {
    continueButton!.textContent = hasSave ? 'ادامهٔ بازی' : 'شروع بازی';
    newButton!.hidden = !hasSave;
  }

  function showScreen(next: MenuScreen): void {
    screen = next;
    dialog!.querySelectorAll<HTMLElement>('[data-menu-screen]').forEach((panel) => {
      panel.hidden = panel.dataset.menuScreen !== next;
    });
    dialog!.setAttribute('aria-labelledby', 'menu-' + next + '-title');
    dialog!.querySelector<HTMLElement>('#menu-' + next + '-title')?.focus();
  }

  function resume(): void {
    playing = true;
    hasSave = true;
    renderHome();
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

  function goBack(): void {
    showScreen(returnScreen);
  }

  function updateSettings(next: MenuSettings): void {
    settings = next;
    volume!.value = String(settings.masterVolume);
    volumeValue!.textContent = new Intl.NumberFormat('fa-IR').format(settings.masterVolume) + '٪';
    reducedMotion!.checked = settings.reducedMotion;
    scene.applyMenuSettings(settings);
    saveMenuSettings(settings);
  }

  scene.applyMenuSettings(settings);
  renderHome();
  volume.value = String(settings.masterVolume);
  volumeValue.textContent = new Intl.NumberFormat('fa-IR').format(settings.masterVolume) + '٪';
  reducedMotion.checked = settings.reducedMotion;
  showScreen('home');
  dialog.showModal();

  menuButton.addEventListener('click', openPauseMenu);
  volume.addEventListener('input', () => {
    updateSettings({ ...settings, masterVolume: Number(volume.value) });
  });
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
        goBack();
        break;
      case 'main':
        hasSave = true;
        renderHome();
        showScreen('home');
        break;
    }
  });

  // Escape resumes an active game, but never bypasses the startup menu.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    if (screen === 'pause') resume();
    else if (screen !== 'home') goBack();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && playing && !dialog.open) {
      event.preventDefault();
      openPauseMenu();
    }
  });
  // Backgrounding the tab pauses the simulation and prevents unintended input.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) openPauseMenu();
  });
}
