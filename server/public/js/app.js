import { fetchHealth } from './api.js';

const statusEl = document.getElementById('status');

if (statusEl) {
  fetchHealth()
    .then((data) => {
      statusEl.textContent = `System Status: ${data.status} (DB: ${data.db})`;
    })
    .catch(() => {
      statusEl.textContent = 'System Status: unavailable';
    });
}

