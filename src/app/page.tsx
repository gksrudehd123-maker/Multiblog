"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Post = {
  id: string;
  naverUrl: string;
  naverBlogId: string;
  title: string;
  capturedAt: string;
  images: string[];
  tags: string[];
  mode: "OWN" | "REFERENCE";
  publishes: {
    id: string;
    platform: string;
    status: string;
    publishedUrl: string | null;
  }[];
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-200 text-slate-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

const PLATFORM_LABELS: Record<string, string> = {
  WORDPRESS: "WordPress",
  BLOGSPOT: "Blogger",
  TISTORY: "Tistory",
};

export default function Home() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/posts");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "fetch error");
      setPosts(json.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("이 포스트를 삭제할까요? (리라이트/배포 기록 포함)")) return;
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">MultiBlog</h1>
            <p className="mt-1 text-sm text-slate-600">
              네이버 블로그 → Claude 리라이트 → WordPress/Blogspot/Tistory 자동
              배포
            </p>
          </div>
          <nav className="flex gap-2">
            <Link
              href="/prompts"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              프롬프트
            </Link>
            <Link
              href="/platforms"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              플랫폼 계정
            </Link>
            <button
              onClick={load}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              새로고침
            </button>
          </nav>
        </header>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-3">
            <h2 className="font-semibold">
              수집된 포스트 ({posts?.length ?? 0})
            </h2>
          </div>
          {err ? (
            <div className="p-6 text-sm text-red-600">에러: {err}</div>
          ) : !posts ? (
            <div className="p-6 text-sm text-slate-500">로딩 중...</div>
          ) : posts.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              아직 수집된 포스트가 없습니다.
              <br />
              크롬 확장프로그램에서 네이버 블로그 포스트를 전송하거나,
              webhook으로 테스트하세요.
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {posts.map((p) => (
                <li key={p.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <Link href={`/posts/${p.id}`} className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {p.mode === "REFERENCE" && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            참고용
                          </span>
                        )}
                        <h3 className="truncate font-medium text-slate-900">
                          {p.title}
                        </h3>
                        {p.images.length > 0 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                            📷 {p.images.length}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>블로그: {p.naverBlogId}</span>
                        <span>·</span>
                        <span>
                          수집일:{" "}
                          {new Date(p.capturedAt).toLocaleString("ko-KR")}
                        </span>
                      </div>
                      {p.publishes.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.publishes.map((pb) => (
                            <span
                              key={pb.id}
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[pb.status] || "bg-slate-200"}`}
                            >
                              {PLATFORM_LABELS[pb.platform] || pb.platform} ·{" "}
                              {pb.status}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-red-50 hover:text-red-600"
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
