const $ = (id) => document.getElementById(id);

chrome.storage.sync.get(['serverUrl', 'webhookSecret'], (cfg) => {
  $('serverUrl').value = cfg.serverUrl || 'http://localhost:3000';
  $('webhookSecret').value = cfg.webhookSecret || '';
});

$('saveBtn').addEventListener('click', () => {
  chrome.storage.sync.set(
    {
      serverUrl: $('serverUrl').value.trim(),
      webhookSecret: $('webhookSecret').value.trim(),
    },
    () => {
      $('status').textContent = '저장됨';
      setTimeout(() => ($('status').textContent = ''), 1500);
    },
  );
});
