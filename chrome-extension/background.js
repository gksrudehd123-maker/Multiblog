// Service worker — content script가 보낸 본문을 MultiBlog 서버로 POST

const DEFAULT_SERVER = 'http://localhost:3000';

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== 'SEND_POST') return;

  chrome.storage.sync.get(['serverUrl', 'webhookSecret'], async (config) => {
    const serverUrl = config.serverUrl || DEFAULT_SERVER;
    const secret = config.webhookSecret || '';

    try {
      const res = await fetch(`${serverUrl}/api/webhook/naver-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(msg.payload),
      });
      const data = await res.json();
      if (res.ok) {
        sendResponse({ ok: true, id: data.id });
      } else {
        sendResponse({ ok: false, error: data.error || `HTTP ${res.status}` });
      }
    } catch (err) {
      sendResponse({ ok: false, error: String(err) });
    }
  });

  return true; // async sendResponse 유지
});
