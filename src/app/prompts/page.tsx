"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Template = {
  id: string;
  name: string;
  description: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type Editing =
  | { mode: "create"; name: string; description: string; body: string }
  | {
      mode: "edit";
      id: string;
      name: string;
      description: string;
      body: string;
    }
  | null;

export default function PromptsPage() {
  const [list, setList] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Editing>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const res = await fetch("/api/prompt-templates");
    const json = await res.json();
    setList(json.data || []);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () =>
    setEditing({ mode: "create", name: "", description: "", body: "" });
  const openEdit = (t: Template) =>
    setEditing({
      mode: "edit",
      id: t.id,
      name: t.name,
      description: t.description || "",
      body: t.body,
    });

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.mode === "create") {
        await fetch("/api/prompt-templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editing.name,
            description: editing.description,
            body: editing.body,
          }),
        });
      } else {
        await fetch(`/api/prompt-templates/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editing.name,
            description: editing.description,
            body: editing.body,
          }),
        });
      }
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await fetch(`/api/prompt-templates/${id}`, { method: "DELETE" });
    load();
  };

  const seed = async () => {
    if (!confirm("샘플 프롬프트 3개(SEO 정보성/리뷰/뉴스)를 추가할까요?"))
      return;
    await fetch("/api/prompt-templates/seed", { method: "POST" });
    load();
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
            <h1 className="mt-2 text-2xl font-bold">프롬프트 템플릿</h1>
            <p className="mt-1 text-sm text-slate-600">
              배포 시 선택할 Claude 리라이트 프롬프트를 관리합니다.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={seed}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              샘플 불러오기
            </button>
            <button
              onClick={openCreate}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              + 새 프롬프트
            </button>
          </div>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {list.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              아직 저장된 프롬프트가 없습니다. "샘플 불러오기" 또는 "새
              프롬프트"로 시작하세요.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {list.map((t) => (
                <li key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium">{t.name}</h3>
                      {t.description && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {t.description}
                        </p>
                      )}
                      <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                        {t.body.slice(0, 200)}
                        {t.body.length > 200 ? "..." : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        편집
                      </button>
                      <button
                        onClick={() => remove(t.id)}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 className="font-semibold">
                {editing.mode === "create" ? "새 프롬프트" : "프롬프트 편집"}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-auto p-4">
              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  이름 *
                </label>
                <input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  placeholder="예: SEO 정보성 (WP 구글 상위노출)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  설명
                </label>
                <input
                  value={editing.description}
                  onChange={(e) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  placeholder="어떤 글에 쓰는 프롬프트인지 간단히"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  프롬프트 본문 * (
                  <code className="rounded bg-slate-100 px-1">
                    {"{PLATFORM}"}
                  </code>{" "}
                  치환 지원, 반드시 JSON 응답 지시 포함)
                </label>
                <textarea
                  value={editing.body}
                  onChange={(e) =>
                    setEditing({ ...editing, body: e.target.value })
                  }
                  rows={18}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs leading-relaxed"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button
                onClick={() => setEditing(null)}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={save}
                disabled={
                  saving || !editing.name.trim() || !editing.body.trim()
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
