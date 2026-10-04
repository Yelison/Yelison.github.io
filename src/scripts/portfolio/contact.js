import { t } from './i18n.js';
import { onLanguageChange } from './language.js';

const MESSAGES = { copied: 'emailCopied', failed: 'emailCopyFailed' };

export function initContact() {
  const status = document.querySelector('.copy-status');
  const email = document.querySelector('.email').textContent.trim();
  document.querySelector('.copy-email').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(email);
      status.dataset.state = 'copied';
    } catch {
      status.dataset.state = 'failed';
    }
    status.textContent = t(MESSAGES[status.dataset.state]);
  });
  onLanguageChange(() => {
    const message = MESSAGES[status.dataset.state];
    if (message) status.textContent = t(message);
  });
}
