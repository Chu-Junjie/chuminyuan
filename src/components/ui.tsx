"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { ArrowUpRight, Bookmark } from "lucide-react";
import type { SopSummary, Block } from "@/lib/types";
import { useRecords, useStore } from "./provider";
import { supabase } from "@/lib/supabase";
export function mergeContent<T extends { id: string }>(
  bundled: T[],
  incoming: T[],
) {
  const rows = new Map(bundled.map((row) => [row.id, row]));
  for (const row of incoming) rows.set(row.id, { ...rows.get(row.id), ...row });
  return Array.from(rows.values());
}
export function useData<T>(path: string) {
  const { scope } = useStore();
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const requestPath = `${basePath}${path}`;
    setData(null);
    setError("");
    async function load() {
      let local: unknown = null;
      try {
        const response = await fetch(requestPath, { signal: abort.signal });
        if (response.ok) local = await response.json();
        if (path === "/data/catalog.json" || path === "/data/chapters.json") {
          const english = await fetch(
            `${basePath}/data/english/${path.split("/").pop()}`,
            { signal: abort.signal },
          );
          if (!english.ok) throw Error("English content unavailable");
          local = mergeContent(
            (local ?? []) as { id: string }[],
            await english.json(),
          );
        }
      } catch (e) {
        if (abort.signal.aborted) return;
      }
      if (local && !abort.signal.aborted) setData(local as T);
      if (
        local &&
        path.startsWith("/data/sops/") &&
        "serviceWorker" in navigator &&
        process.env.NODE_ENV === "production"
      ) {
        const id = path.split("/").pop()!.replace(".json", "");
        void navigator.serviceWorker.ready
          .then(() => caches.open("gaokao-quest-v3"))
          .then((cache) => cache.add(`${basePath}/sop/${id}`))
          .catch(() => {});
      }
      if (
        local &&
        "caches" in window &&
        process.env.NODE_ENV === "production"
      ) {
        const snapshot = JSON.stringify(local);
        void caches
          .open("gaokao-quest-v3")
          .then((cache) =>
            cache.put(
              requestPath,
              new Response(snapshot, {
                headers: { "Content-Type": "application/json" },
              }),
            ),
          )
          .catch(() => {});
      }
      if (supabase && scope !== "local" && navigator.onLine) {
        try {
          if (path === "/data/catalog.json") {
            const { data: rows, error } = await supabase
              .from("sops")
              .select("id,code,title,chapter_id,frequency,keywords,sort_order")
              .order("sort_order");
            if (error) throw error;
            if (rows?.length) {
              const existing = (local ?? []) as SopSummary[];
              local = mergeContent(
                existing,
                rows.map((row) => ({
                  ...existing.find((s) => s.id === row.id),
                  brain_first:
                    existing.find((s) => s.id === row.id)?.brain_first ?? "",
                  chapter: existing.find((s) => s.id === row.id)?.chapter ?? "",
                  ...row,
                })),
              );
            }
          } else if (path === "/data/chapters.json") {
            const { data: rows, error } = await supabase
              .from("chapters")
              .select("*")
              .order("sort_order");
            if (error) throw error;
            if (rows?.length)
              local = mergeContent((local ?? []) as { id: string }[], rows);
          } else if (path.startsWith("/data/sops/")) {
            const id = path.split("/").pop()!.replace(".json", "");
            const { data: row, error } = await supabase
              .from("sops")
              .select("content_json")
              .eq("id", id)
              .maybeSingle();
            if (error) throw error;
            if (row) local = row.content_json;
          }
          if (local && "caches" in window) {
            const cache = await caches.open("gaokao-quest-v3");
            await cache.put(
              requestPath,
              new Response(JSON.stringify(local), {
                headers: { "Content-Type": "application/json" },
              }),
            );
          }
        } catch {
          /* The bundled source remains available when cloud content cannot be read. */
        }
      }
      if (!abort.signal.aborted) {
        if (local) setData(local as T);
        else setError("内容暂时无法加载，联网后重试");
      }
    }
    void load();
    return () => abort.abort();
  }, [path, scope]);
  return { data, error };
}
export function Loading({ error }: { error?: string }) {
  return (
    <div className="empty" role="status">
      {error || "正在打开学习内容…"}
      {error && <button onClick={() => location.reload()}>重新加载</button>}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-symbol">✧</span>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </header>
  );
}
export function SopCard({ sop }: { sop: SopSummary }) {
  const progress = useRecords("progress").find((p) => p.sopId === sop.id);
  const saved = useRecords("bookmarks").some((b) => b.sopId === sop.id);
  return (
    <Link className="sop-card" href={`/sop/${sop.id}`}>
      <div className="row between">
        <span className="code">{sop.code.replace("SOP", "SOP ")}</span>
        <span
          className="stars"
          aria-label={sop.frequency ? `${sop.frequency}星频次` : "知识工具"}
        >
          {"★".repeat(sop.frequency)}
          {sop.frequency ? "☆".repeat(5 - sop.frequency) : "知识工具"}
        </span>
      </div>
      <h3>{sop.title}</h3>
      <p>{sop.brain_first}</p>
      <div className="row between card-footer">
        <span>
          {sop.chapter.replace(/.*第\d+章 /, "")}
          {progress &&
            " · " +
              { seen: "见过", can: "会做", fluent: "熟练" }[progress.status]}
        </span>
        {saved ? (
          <Bookmark size={17} fill="currentColor" />
        ) : (
          <ArrowUpRight size={18} />
        )}
      </div>
    </Link>
  );
}
export function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false, trust: false }]]}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
export function SourceBlock({ block }: { block: Block }) {
  if (block.type === "markdown") return <Markdown text={block.text} />;
  if (block.type === "table")
    return (
      <div className="source-table">
        <table>
          <tbody>
            {block.rows?.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (block.style === "Heading3") return null;
  return (
    <p
      className={
        block.text.startsWith("草稿纸")
          ? "draft"
          : block.text.startsWith("白话解释")
            ? "explanation"
            : ""
      }
    >
      {block.text}
    </p>
  );
}
