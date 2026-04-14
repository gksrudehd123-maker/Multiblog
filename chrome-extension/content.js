// MultiBlog content script — 네이버 블로그 본문 페이지에 "멀티배포" 버튼 주입
// 지원 에디터: SmartEditor ONE (.se-* 계열) — 네이버 블로그 기본 에디터
// 모바일(m.blog.naver.com)은 별도 패턴

(function () {
  const SELECTORS = {
    title: [".se-title-text", ".pcol1 .htitle", ".se_title", "h3.se_textarea"],
    body: [".se-main-container", "#postViewArea", ".se_component_wrap"],
  };

  function pickFirst(doc, list) {
    for (const sel of list) {
      const el = doc.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function getPostDoc() {
    // 외부 URL(blog.naver.com/:blogId/:logNo) — mainFrame iframe 내부에 본문 렌더됨
    const frame = document.querySelector("iframe#mainFrame");
    if (frame && frame.contentDocument) {
      return frame.contentDocument;
    }
    // PostView.nhn 직접 URL 또는 모바일
    return document;
  }

  function extractTags(doc, logNo) {
    // 네이버는 AJAX로 tagList_{logNo} 안에 <a>로 태그 삽입
    const tagRoot =
      (logNo && doc.getElementById("tagList_" + logNo)) ||
      doc.querySelector('[id^="tagList_"]');
    if (!tagRoot) return [];
    return Array.from(tagRoot.querySelectorAll("a"))
      .map((a) => (a.textContent || "").trim().replace(/^#/, ""))
      .filter((t) => t && !/^태그$/.test(t));
  }

  function extractImages(container) {
    return Array.from(container.querySelectorAll("img"))
      .map((img) => img.getAttribute("data-lazy-src") || img.src)
      .filter(Boolean)
      .filter((src) => /^https?:\/\//i.test(src))
      .filter((src) => !/\/(blank|spacer|pixel|dummy)\.(gif|png)/i.test(src))
      .filter((src) => !/\/skin\//i.test(src));
  }

  function extractPost(mode) {
    const doc = getPostDoc();
    if (!doc) return null;

    const titleEl = pickFirst(doc, SELECTORS.title);
    const contentEl = pickFirst(doc, SELECTORS.body);
    if (!titleEl || !contentEl) return null;

    const url = location.href;
    const match =
      url.match(/blog\.naver\.com\/([^/?#]+)\/(\d+)/) ||
      url.match(/blogId=([^&]+).*logNo=(\d+)/);
    const blogId = match ? match[1] : "";
    const logNo = match ? match[2] : "";

    // 참고용(REFERENCE) 모드: 이미지 수집 안 함 — 저작권/SEO 리스크 회피
    const isReference = mode === "REFERENCE";

    return {
      naverUrl: url,
      naverBlogId: blogId,
      naverLogNo: logNo,
      title: (titleEl.innerText || titleEl.textContent || "").trim(),
      contentHtml: contentEl.innerHTML,
      contentText: (contentEl.innerText || contentEl.textContent || "").trim(),
      images: isReference ? [] : extractImages(contentEl),
      tags: extractTags(doc, logNo),
      mode: isReference ? "REFERENCE" : "OWN",
    };
  }

  function makeButton({ id, label, bg, bottom, mode }) {
    const btn = document.createElement("button");
    btn.id = id;
    btn.textContent = label;
    btn.style.cssText = `
      position: fixed;
      bottom: ${bottom}px;
      right: 24px;
      z-index: 99999;
      padding: 12px 18px;
      background: ${bg};
      color: #fff;
      border: none;
      border-radius: 999px;
      font-weight: 600;
      box-shadow: 0 4px 16px rgba(0,0,0,0.18);
      cursor: pointer;
    `;
    btn.addEventListener("click", async () => {
      const payload = extractPost(mode);
      if (!payload || !payload.title) {
        alert("본문을 찾지 못했습니다. 블로그 글 상세 페이지에서 눌러주세요.");
        return;
      }
      const originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = "전송 중...";
      chrome.runtime.sendMessage({ type: "SEND_POST", payload }, (res) => {
        btn.disabled = false;
        btn.textContent = originalLabel;
        if (res && res.ok) {
          alert(
            (mode === "REFERENCE" ? "[참고용] " : "[내 블로그] ") +
              "전송 완료! (제목: " +
              payload.title +
              ")",
          );
        } else {
          alert("전송 실패: " + (res && res.error));
        }
      });
    });
    return btn;
  }

  function injectButton(myBlogIds) {
    if (
      document.getElementById("multiblog-send-btn-own") ||
      document.getElementById("multiblog-send-btn-ref")
    )
      return true;

    // 본문 로드 확인 (iframe 지연 대응)
    const preview = extractPost("OWN");
    if (!preview || !preview.title) {
      return false; // 다시 시도
    }

    // 현재 blogId가 "내 블로그 ID" 목록에 있으면 OWN 버튼만, 아니면 REFERENCE 버튼만
    const isMine =
      preview.naverBlogId &&
      myBlogIds.some(
        (id) => id.toLowerCase() === preview.naverBlogId.toLowerCase(),
      );

    const btn = isMine
      ? makeButton({
          id: "multiblog-send-btn-own",
          label: "📤 내 블로그 전송",
          bg: "#2563eb",
          bottom: 24,
          mode: "OWN",
        })
      : makeButton({
          id: "multiblog-send-btn-ref",
          label: "📝 참고용 전송 (이미지X)",
          bg: "#6b7280",
          bottom: 24,
          mode: "REFERENCE",
        });

    document.body.appendChild(btn);
    return true;
  }

  // 블로그 포스트 페이지에서만 주입. iframe 로드 대기를 위해 최대 10초간 재시도
  if (
    location.hostname === "blog.naver.com" ||
    location.hostname === "m.blog.naver.com"
  ) {
    chrome.storage.sync.get(["myBlogIds"], (cfg) => {
      const myBlogIds = Array.isArray(cfg.myBlogIds) ? cfg.myBlogIds : [];
      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (injectButton(myBlogIds) || attempts >= 20) {
          clearInterval(timer);
        }
      }, 500);
    });
  }
})();
