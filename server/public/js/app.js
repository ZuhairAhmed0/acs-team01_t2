import { fetchHealth } from './api.js';

const statusEl = document.getElementById('status');

if (statusEl) {
  fetchHealth()
    .then((data) => {
      const dbStatus = data.database || data.db || 'up';
      statusEl.textContent = `System Status: ${data.status} (DB: ${dbStatus})`;
      statusEl.style.color = '#059669';
    })
    .catch(() => {
      statusEl.textContent = 'System Status: unavailable';
      statusEl.style.color = '#dc2626';
    });
}

