"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Publish = {
  id: string;
  platform: string;
  status: string;
  publishedUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  publishedAt: string | null;
  platformConfig: { id: string; name: string; siteUrl: string };
};

type Rewrite = {
  id: string;
  platform: string;
  title: string;
  contentHtml: string;
  metaDescription: string | null;
  slug: string | null;
  model: string;
  createdAt: string;
};

type PostDetail = {
  id: string;
  naverUrl: string;
  title: string;
  contentHtml: string;
  contentText: string | null;
  images: string[];
  tags: string[];
  capturedAt: string;
  rewrites: Rewrite[];
  publishes: Publish[];
};

type Config = {
  id: string;
  platform: string;
  name: string;
  siteUrl: string;
  isActive: boolean;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-200 text-slate-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [publishStatus, setPublishStatus] = useState<"draft" | "publish">(
    "draft",
  );
  const [publishing, setPublishing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`/api/posts/${params.id}`),
        fetch("/api/platform-configs"),
      ]);
      const pJson = await pRes.json();
      const cJson = await cRes.json();
      if (!pJson.ok) throw new Error(pJson.error);
      setPost(pJson.data);
      setConfigs((cJson.data || []).filter((c: Config) => c.isActive));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePublish = async () => {
    if (!selectedConfigId) {
      alert("플랫폼을 선택하세요");
      return;
    }
    setPublishing(true);
    setErr(null);
    try {
      const res = await fetch(`/api/posts/${params.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platformConfigId: selectedConfigId,
          status: publishStatus,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setPublishing(false);
    }
  };

  if (err && !post) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-red-600">에러: {err}</p>
      </main>
    );
  }
  if (!post) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-slate-500">로딩 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← 목록으로
          </Link>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold">{post.title}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            <a
              href={post.naverUrl}
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-slate-900"
            >
              {post.naverUrl}
            </a>
            <span>
              수집: {new Date(post.capturedAt).toLocaleString("ko-KR")}
            </span>
            <span>이미지 {post.images.length}개</span>
          </div>
          {post.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">🚀 배포</h2>
          {configs.length === 0 ? (
            <p className="text-sm text-slate-500">
              활성화된 플랫폼 계정이 없습니다.{" "}
              <Link href="/platforms" className="text-blue-600 underline">
                플랫폼 계정 등록
              </Link>
            </p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  플랫폼
                </label>
                <select
                  value={selectedConfigId}
                  onChange={(e) => setSelectedConfigId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">— 선택 —</option>
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.platform})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-600">
                  상태
                </label>
                <select
                  value={publishStatus}
                  onChange={(e) =>
                    setPublishStatus(e.target.value as "draft" | "publish")
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="draft">초안 (draft)</option>
                  <option value="publish">즉시 발행 (publish)</option>
                </select>
              </div>
              <button
                onClick={handlePublish}
                disabled={publishing || !selectedConfigId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {publishing
                  ? "리라이트 + 업로드 중..."
                  : "Claude 리라이트 후 배포"}
              </button>
            </div>
          )}
          {err && <p className="mt-3 text-sm text-red-600">에러: {err}</p>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">
            📤 배포 이력 ({post.publishes.length})
          </h2>
          {post.publishes.length === 0 ? (
            <p className="text-sm text-slate-500">아직 배포 내역이 없습니다</p>
          ) : (
            <ul className="space-y-2">
              {post.publishes.map((pb) => (
                <li
                  key={pb.id}
                  className="rounded-lg border border-slate-200 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[pb.status]}`}
                      >
                        {pb.status}
                      </span>
                      <span className="font-medium">
                        {pb.platform} · {pb.platformConfig.name}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(pb.createdAt).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  {pb.publishedUrl && (
                    <a
                      href={pb.publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block text-xs text-blue-600 underline"
                    >
                      {pb.publishedUrl}
                    </a>
                  )}
                  {pb.errorMessage && (
                    <p className="mt-1 text-xs text-red-600">
                      {pb.errorMessage}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {post.images.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 font-semibold">
              🖼️ 원본 이미지 ({post.images.length})
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {post.images.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`이미지 ${i + 1}`}
                    referrerPolicy="no-referrer"
                    className="h-32 w-full object-cover transition-transform group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-semibold">📝 원본 본문</h2>
          <div
            className="prose prose-sm max-w-none text-slate-800"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        </section>

        {post.rewrites.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 font-semibold">
              ✨ 리라이트 버전 ({post.rewrites.length})
            </h2>
            <div className="space-y-4">
              {post.rewrites.map((r) => (
                <details
                  key={r.id}
                  className="rounded-lg border border-slate-200 p-3"
                >
                  <summary className="cursor-pointer text-sm font-medium">
                    {r.platform} · {r.title}{" "}
                    <span className="text-xs text-slate-500">({r.model})</span>
                  </summary>
                  <div className="mt-2 text-xs text-slate-600">
                    <p>
                      <strong>Slug:</strong> {r.slug}
                    </p>
                    <p>
                      <strong>Meta:</strong> {r.metaDescription}
                    </p>
                  </div>
                  <div
                    className="prose prose-sm mt-2 max-w-none"
                    dangerouslySetInnerHTML={{ __html: r.contentHtml }}
                  />
                </details>
              ))}
            </div>
          </section>
        )}

        <div className="pt-4">
          <button
            onClick={async () => {
              if (!confirm("포스트를 삭제하시겠습니까?")) return;
              await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
              router.push("/");
            }}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            이 포스트 삭제
          </button>
        </div>
      </div>
    </main>
  );
}
