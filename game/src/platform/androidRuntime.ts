import { App } from '@capacitor/app';
import { Capacitor, SystemBars } from '@capacitor/core';

export type AndroidBackTarget = 'dialog' | 'sheet' | 'resources' | 'pause' | 'minimize';

export function androidBackTarget(state: {
  dialogOpen: boolean; sheetOpen: boolean; resourcesOpen: boolean; canPause: boolean;
}): AndroidBackTarget {
  if (state.dialogOpen) return 'dialog';
  if (state.sheetOpen) return 'sheet';
  if (state.resourcesOpen) return 'resources';
  return state.canPause ? 'pause' : 'minimize';
}

/** Android lifecycle and back dispatch; browser keyboard navigation is unchanged. */
export function installAndroidRuntime(controls: {
  getSheet: () => string | null; closeSheet: () => void; save: () => void;
}): void {
  if (Capacitor.getPlatform() !== 'android') return;
  document.documentElement.classList.add('native-android');
  const immersive = () => { void SystemBars.hide().catch(() => {}); };
  immersive();
  const resources = document.querySelector<HTMLElement>('#resource-panel');
  const resourceToggle = document.querySelector<HTMLButtonElement>('#resource-details-toggle');
  const menu = document.querySelector<HTMLButtonElement>('#menu-toggle');

  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) immersive(); else controls.save();
  });
  void App.addListener('backButton', () => {
    controls.save();
    const dialogs = Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]'));
    const dialog = dialogs.at(-1);
    if (dialog?.id === 'game-menu-dialog' &&
        dialog.querySelector('[data-menu-screen="home"]:not([hidden])')) {
      void App.minimizeApp();
      return;
    }
    const action = androidBackTarget({
      dialogOpen: !!dialog, sheetOpen: controls.getSheet() !== null,
      resourcesOpen: resources?.dataset.expanded === 'true', canPause: !!menu && !menu.hidden
    });
    switch (action) {
      case 'dialog': {
        if (!dialog) return;
        const allowed = dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
        if (allowed && dialog.open) dialog.close();
        return;
      }
      case 'sheet': controls.closeSheet(); return;
      case 'resources': resourceToggle?.click(); return;
      case 'pause': menu?.click(); return;
      case 'minimize': void App.minimizeApp();
    }
  });
}
