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
};

const PLATFORMS = [
  { value: "WORDPRESS", label: "WordPress" },
  { value: "BLOGSPOT", label: "Blogger (Blogspot)" },
  { value: "TISTORY", label: "Tistory" },
] as const;

export default function PlatformsPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [form, setForm] = useState({
    platform: "WORDPRESS" as Config["platform"],
    name: "",
    siteUrl: "",
    username: "",
    apiKey: "",
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
      const res = await fetch("/api/platform-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setForm({
        platform: "WORDPRESS",
        name: "",
        siteUrl: "",
        username: "",
        apiKey: "",
      });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await fetch(`/api/platform-configs/${id}`, { method: "DELETE" });
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
    </main>
  );
}
