/** Native modal confirmation for irreversible shelter actions. No action is performed on cancel. */
export interface DestructivePrompt {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
}

let pending = false;

export function confirmDestructiveAction(prompt: DestructivePrompt, root: Document = document): Promise<boolean> {
  if (pending) return Promise.resolve(false);
  pending = true;
  const dialog = root.createElement('dialog');
  dialog.className = 'game-confirm-dialog';
  dialog.setAttribute('aria-labelledby', 'game-confirm-title');
  dialog.setAttribute('aria-describedby', 'game-confirm-description');
  const title = root.createElement('h2');
  title.id = 'game-confirm-title';
  title.textContent = prompt.title;
  const description = root.createElement('p');
  description.id = 'game-confirm-description';
  description.textContent = prompt.description;
  const actions = root.createElement('div');
  actions.className = 'game-confirm-actions';
  const cancel = root.createElement('button');
  cancel.type = 'button';
  cancel.className = 'game-confirm-cancel';
  cancel.textContent = prompt.cancelLabel;
  cancel.autofocus = true;
  const confirm = root.createElement('button');
  confirm.type = 'button';
  confirm.className = 'game-confirm-accept';
  confirm.textContent = prompt.confirmLabel;
  actions.append(cancel, confirm);
  dialog.append(title, description, actions);
  root.body.append(dialog);
  return new Promise<boolean>((resolve) => {
    dialog.addEventListener('close', () => {
      const accepted = dialog.returnValue === 'confirm';
      dialog.remove();
      pending = false;
      resolve(accepted);
    }, { once: true });
    cancel.addEventListener('click', () => dialog.close('cancel'));
    confirm.addEventListener('click', () => dialog.close('confirm'));
    try {
      dialog.showModal();
      cancel.focus();
    } catch {
      dialog.remove();
      pending = false;
      resolve(false);
    }
  });
}
