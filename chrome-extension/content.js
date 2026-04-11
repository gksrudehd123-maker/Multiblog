// MultiBlog content script — 네이버 블로그 본문 페이지에 "멀티배포" 버튼 주입
// TODO: 실제 네이버 블로그 DOM 구조에 맞게 셀렉터/파싱 로직 조정 필요

(function () {
  function extractPost() {
    // 네이버 블로그는 iframe 내부(mainFrame)에 본문이 렌더됨
    const frame = document.querySelector('iframe#mainFrame');
    const doc = frame ? frame.contentDocument : document;
    if (!doc) return null;

    const title = doc.querySelector('.se-title-text')?.innerText?.trim() ||
      doc.querySelector('.pcol1 .htitle')?.innerText?.trim() || '';
    const contentEl =
      doc.querySelector('.se-main-container') ||
      doc.querySelector('#postViewArea');
    const contentHtml = contentEl ? contentEl.innerHTML : '';
    const contentText = contentEl ? contentEl.innerText : '';

    const images = Array.from(doc.querySelectorAll('.se-main-container img'))
      .map((img) => img.src)
      .filter(Boolean);

    const url = location.href;
    const match = url.match(/blog\.naver\.com\/([^/]+)\/(\d+)/) ||
      url.match(/blogId=([^&]+).*logNo=(\d+)/);

    return {
      naverUrl: url,
      naverBlogId: match ? match[1] : '',
      naverLogNo: match ? match[2] : '',
      title,
      contentHtml,
      contentText,
      images,
      tags: [],
    };
  }

  function injectButton() {
    if (document.getElementById('multiblog-send-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'multiblog-send-btn';
    btn.textContent = '📤 MultiBlog 전송';
    btn.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      padding: 12px 18px;
      background: #2563eb;
      color: #fff;
      border: none;
      border-radius: 999px;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      cursor: pointer;
    `;

    btn.addEventListener('click', async () => {
      const payload = extractPost();
      if (!payload || !payload.title) {
        alert('본문을 찾지 못했습니다. 블로그 글 상세 페이지에서 눌러주세요.');
        return;
      }
      btn.disabled = true;
      btn.textContent = '전송 중...';
      chrome.runtime.sendMessage({ type: 'SEND_POST', payload }, (res) => {
        btn.disabled = false;
        btn.textContent = '📤 MultiBlog 전송';
        if (res && res.ok) {
          alert('전송 완료!');
        } else {
          alert('전송 실패: ' + (res && res.error));
        }
      });
    });

    document.body.appendChild(btn);
  }

  // 블로그 포스트 페이지에서만 주입
  if (location.href.includes('blog.naver.com')) {
    setTimeout(injectButton, 1000);
  }
})();
