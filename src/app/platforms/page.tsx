"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Config = {
  id: string;
  platform: "WORDPRESS" | "BLOGSPOT" | "TISTORY";
  name: string;
  siteUrl: string;
  username: string | null;
  apiKey: string | null;
  isActive: boolean;
  createdAt: string;
  extra: Record<string, unknown> | null;
};

const DEFAULT_PROMPT_HINT = `예) 너는 한국어 블로그 콘텐츠 리라이터다. {PLATFORM} 플랫폼에 맞게 재작성한다.

규칙:
1. 핵심 내용과 사실은 절대 바꾸지 말 것
2. 표현/문장 구조/어휘는 최대한 바꾸어 SEO 중복 페널티 회피
3. 본문은 HTML (h2, h3, p, ul, strong)
4. 이미지 URL 목록이 있으면 본문 흐름에 <img> 삽입

JSON 형식으로만 응답:
{ "title": "...", "contentHtml": "...", "metaDescription": "...", "slug": "..." }`;

const PLATFORMS = [
  { value: "WORDPRESS", label: "WordPress" },
  { value: "BLOGSPOT", label: "Blogger (Blogspot)" },
  { value: "TISTORY", label: "Tistory" },
] as const;

export default function PlatformsPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<{
    id: string;
    value: string;
  } | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [form, setForm] = useState({
    platform: "WORDPRESS" as Config["platform"],
    name: "",
    siteUrl: "",
    username: "",
    apiKey: "",
    refreshToken: "",
    blogId: "",
    labels: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/platform-configs");
    const json = await res.json();
    setConfigs(json.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const extra: Record<string, unknown> = {};
      if (form.platform === "BLOGSPOT") {
        if (form.blogId.trim()) extra.blogId = form.blogId.trim();
        if (form.labels.trim()) extra.labels = form.labels.trim();
      }
      const res = await fetch("/api/platform-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: form.platform,
          name: form.name,
          siteUrl: form.siteUrl,
          username: form.username,
          apiKey: form.apiKey,
          refreshToken: form.refreshToken || undefined,
          extra: Object.keys(extra).length ? extra : undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setForm({
        platform: "WORDPRESS",
        name: "",
        siteUrl: "",
        username: "",
        apiKey: "",
        refreshToken: "",
        blogId: "",
        labels: "",
      });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제할까요? 관련 배포 이력도 함께 삭제됩니다.")) return;
    const res = await fetch(`/api/platform-configs/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.ok) {
      alert("삭제 실패: " + json.error);
      return;
    }
    load();
  };

  const toggleActive = async (c: Config) => {
    await fetch(`/api/platform-configs/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    load();
  };

  const openPromptEditor = (c: Config) => {
    const existing =
      (c.extra as { promptTemplate?: string } | null)?.promptTemplate || "";
    setEditingPrompt({ id: c.id, value: existing });
  };

  const savePrompt = async () => {
    if (!editingPrompt) return;
    setSavingPrompt(true);
    try {
      const target = configs.find((c) => c.id === editingPrompt.id);
      const currentExtra = (target?.extra as Record<string, unknown>) || {};
      const nextExtra = { ...currentExtra };
      if (editingPrompt.value.trim()) {
        nextExtra.promptTemplate = editingPrompt.value;
      } else {
        delete nextExtra.promptTemplate;
      }
      await fetch(`/api/platform-configs/${editingPrompt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extra: nextExtra }),
      });
      setEditingPrompt(null);
      load();
    } finally {
      setSavingPrompt(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="text-sm text-slate-500 hover:text-slate-900"
            >
              ← 대시보드
            </Link>
            <h1 className="mt-2 text-2xl font-bold">플랫폼 계정 관리</h1>
          </div>
          <a
            href="/api/auth/google/start"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google로 Blogspot 추가
          </a>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">새 계정 등록</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-600">
                플랫폼
              </label>
              <select
                value={form.platform}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    platform: e.target.value as Config["platform"],
                  }))
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">별칭</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="예: 내 블로그"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-600">
                사이트 URL
              </label>
              <input
                type="text"
                value={form.siteUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, siteUrl: e.target.value }))
                }
                placeholder="https://example.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">
                사용자명 {form.platform === "WORDPRESS" && "(WP 로그인 ID)"}
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-600">
                {form.platform === "WORDPRESS"
                  ? "Application Password"
                  : form.platform === "BLOGSPOT"
                    ? "Access Token"
                    : "API Key"}
              </label>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) =>
                  setForm((f) => ({ ...f, apiKey: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            {form.platform === "BLOGSPOT" && (
              <>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    Blog ID (Blogger)
                  </label>
                  <input
                    type="text"
                    value={form.blogId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, blogId: e.target.value }))
                    }
                    placeholder="3200759645754873582"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-600">
                    Refresh Token (OAuth)
                  </label>
                  <input
                    type="password"
                    value={form.refreshToken}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, refreshToken: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-slate-600">
                    기본 라벨 (쉼표 구분)
                  </label>
                  <input
                    type="text"
                    value={form.labels}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, labels: e.target.value }))
                    }
                    placeholder="일상, 재테크"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
          </div>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          <div className="mt-4">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.siteUrl.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "등록"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-3">
            <h2 className="font-semibold">등록된 계정 ({configs.length})</h2>
          </div>
          {configs.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">등록된 계정이 없습니다</p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {configs.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700">
                        {c.platform}
                      </span>
                      {!c.isActive && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-red-700">
                          비활성
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {c.siteUrl}
                      {c.username && ` · ${c.username}`}
                      {c.apiKey && ` · ${c.apiKey}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openPromptEditor(c)}
                      className="rounded-md border border-blue-200 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                      title="Claude 리라이트 프롬프트 편집"
                    >
                      프롬프트
                      {(c.extra as { promptTemplate?: string } | null)
                        ?.promptTemplate
                        ? " ✓"
                        : ""}
                    </button>
                    <button
                      onClick={() => toggleActive(c)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      {c.isActive ? "비활성화" : "활성화"}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="font-semibold">Claude 리라이트 프롬프트</h3>
              <button
                onClick={() => setEditingPrompt(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <p className="mb-2 text-xs text-slate-600">
                이 플랫폼으로 배포할 때 Claude에게 전달할 시스템 프롬프트를
                지정합니다. 비워두면 기본 프롬프트가 사용됩니다.
                <br />
                <code className="rounded bg-slate-100 px-1">
                  {"{PLATFORM}"}
                </code>
                는 플랫폼 이름(WORDPRESS/BLOGSPOT/TISTORY)으로 치환됩니다.
                <br />
                <strong>
                  반드시 JSON 형식(title, contentHtml, metaDescription,
                  slug)으로 응답하도록 지시해야 합니다.
                </strong>
              </p>
              <textarea
                value={editingPrompt.value}
                onChange={(e) =>
                  setEditingPrompt({
                    ...editingPrompt,
                    value: e.target.value,
                  })
                }
                rows={16}
                placeholder={DEFAULT_PROMPT_HINT}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button
                onClick={() => setEditingPrompt(null)}
                disabled={savingPrompt}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={() =>
                  setEditingPrompt(
                    editingPrompt ? { ...editingPrompt, value: "" } : null,
                  )
                }
                disabled={savingPrompt}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                기본값으로 초기화
              </button>
              <button
                onClick={savePrompt}
                disabled={savingPrompt}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingPrompt ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
