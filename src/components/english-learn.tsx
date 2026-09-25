"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Compass, BookOpen, Library, ArrowRight } from "lucide-react";
import { useData, PageTitle, Loading, SopCard, Empty } from "./ui";
import { useRecords } from "./provider";
import { searchSops, normalizeSearch } from "@/lib/catalog";
import { englishRescue, englishQueryAliases } from "@/lib/english";
import type { Chapter, SopSummary } from "@/lib/types";
export function EnglishLearn() {
  const { data: sops, error } = useData<SopSummary[]>(
    "/data/english/catalog.json",
  );
  const { data: chapters, error: chapterError } = useData<Chapter[]>(
    "/data/english/chapters.json",
  );
  const [mode, setMode] = useState("map");
  const [chapter, setChapter] = useState("");
  const [query, setQuery] = useState("");
  const [frequency, setFrequency] = useState(0);
  const [group, setGroup] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [full, setFull] = useState<Record<string, string>>({});
  const [searchError, setSearchError] = useState("");
  const progress = useRecords("progress");
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get("mode") === "rescue") setMode("rescue");
    if (p.get("chapter")) setChapter(p.get("chapter")!);
  }, []);
  useEffect(() => {
    if (mode !== "search" && mode !== "toolbox") return;
    const controller = new AbortController();
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/english/search.json`,
      { signal: controller.signal },
    )
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((rows: { id: string; text: string }[]) => {
        setFull(Object.fromEntries(rows.map((r) => [r.id, r.text])));
        setSearchError("");
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setSearchError("全文暂时未加载，仍可搜索题型、编号和关键词。");
      });
    return () => controller.abort();
  }, [mode]);
  if (!sops || !chapters) return <Loading error={error || chapterError} />;
  const sopCount = sops.filter((s) => s.kind === "sop").length;
  const learned = progress.filter(
    (p) =>
      sops.some((s) => s.id === p.sopId && s.kind === "sop") &&
      p.status !== "seen",
  ).length;
  const q = normalizeSearch(query);
  const aliasCodes = q
    ? Object.entries(englishQueryAliases)
        .filter(([word]) => q.includes(normalizeSearch(word)))
        .flatMap(([, codes]) => codes)
    : [];
  const pool = sops.filter(
    (s) =>
      (!chapter || s.chapter_id === chapter) &&
      (!frequency || s.frequency === frequency) &&
      (mode !== "toolbox" || s.kind === "resource"),
  );
  const matched = searchSops(pool, query, full);
  const results = [
    ...pool.filter((s) => aliasCodes.includes(s.code)),
    ...matched,
  ].filter((s, i, a) => a.findIndex((r) => r.id === s.id) === i);
  const chosen = chapters.find((c) => c.id === chapter);
  return (
    <>
      <PageTitle
        eyebrow="THE ENGLISH PRACTICE ROOM"
        title="英语练习室"
        description="先找到卡住的地方，再决定下一步。正确 → 完整 → 清楚 → 自然 → 高级。"
        action={
          <Link
            className="button secondary"
            href="/mistakes/new?subject=english"
          >
            记一道英语错题 +
          </Link>
        }
      />
      <section className="panel english-overview">
        <div>
          <strong>{sopCount}</strong>
          <span>解题 SOP</span>
        </div>
        <div>
          <strong>{sops.length - sopCount}</strong>
          <span>工具与资料</span>
        </div>
        <div>
          <strong>{learned}</strong>
          <span>已掌握 SOP</span>
        </div>
        <p className="muted small">
          来自你提供的 136
          页英语宝典。星级沿用原文复习优先级；考试结构为资料中的参考说明。
          <Link href="/sop/EN-GUIDE">查看使用说明 ↗</Link>
        </p>
      </section>
      <div className="tabs">
        {[
          { id: "map", label: "题型地图", icon: BookOpen },
          { id: "rescue", label: "我卡住了", icon: Compass },
          { id: "search", label: "搜索题型", icon: Search },
          { id: "toolbox", label: "知识工具箱", icon: Library },
        ].map((tab) => (
          <button
            key={tab.id}
            className={mode === tab.id ? "selected" : ""}
            onClick={() => {
              setMode(tab.id);
              setChapter("");
              setQuery("");
              setFrequency(0);
            }}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>
      {mode === "rescue" ? (
        <section className="panel rescue">
          <p className="eyebrow">从你看得懂的问题开始</p>
          <h2>
            {group === null ? "这道英语题卡在哪里？" : "再选一个最接近的情况"}
          </h2>
          <p className="muted">按原文关键词定位思路，请核对具体题目条件。</p>
          {group === null ? (
            <div className="choice-grid">
              {englishRescue.map((r, i) => (
                <button
                  key={r.name}
                  onClick={() => {
                    setGroup(i);
                    setCode("");
                  }}
                >
                  {r.name}
                  <ArrowRight size={18} />
                </button>
              ))}
            </div>
          ) : (
            <>
              <button
                className="text-button"
                onClick={() => {
                  setGroup(null);
                  setCode("");
                }}
              >
                ← 重新选择题型
              </button>
              <div className="choice-grid">
                {englishRescue[group].choices.map(([label, id]) => (
                  <button
                    key={id}
                    onClick={() => setCode(id)}
                    className={code === id ? "selected" : ""}
                  >
                    {label}
                    <ArrowRight size={18} />
                  </button>
                ))}
              </div>
              {code && (
                <div className="sop-grid">
                  {sops
                    .filter((s) => s.code === code)
                    .map((s) => (
                      <SopCard key={s.id} sop={s} />
                    ))}
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <>
          {(mode === "search" || mode === "toolbox") && (
            <>
              <label className="searchbox">
                <Search size={20} />
                <input
                  aria-label="搜索英语内容"
                  placeholder="试试 infer、where、非谓语、邀请信、L0…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {searchError && (
                <p role="status" className="muted">
                  {searchError}
                </p>
              )}
            </>
          )}
          {(mode !== "map" || chapter) && (
            <div className="row wrap english-filters">
              <label>
                模块
                <select
                  aria-label="英语模块"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                >
                  <option value="">全部模块</option>
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>
              {mode !== "toolbox" && (
                <label>
                  复习优先级
                  <select
                    aria-label="英语优先级"
                    value={frequency}
                    onChange={(e) => setFrequency(Number(e.target.value))}
                  >
                    <option value={0}>全部优先级</option>
                    {[5, 4, 3].map((n) => (
                      <option key={n} value={n}>
                        {"★".repeat(n)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
          {mode === "map" && !chapter ? (
            <div className="chapter-grid">
              {chapters.map((c, i) => (
                <button
                  key={c.id}
                  className="chapter-card"
                  onClick={() => setChapter(c.id)}
                >
                  <span className="chapter-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <small>{i >= 8 ? "知识与工具" : "从题型到方法"}</small>
                    <h3>{c.title}</h3>
                    <p>
                      {sops.filter((s) => s.chapter_id === c.id).length} 篇内容
                    </p>
                  </div>
                  <ArrowRight size={19} />
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="section-heading">
                <h2>
                  {chosen?.title ||
                    (mode === "toolbox"
                      ? "随用随查的知识工具"
                      : "找到这些思路")}
                  <span>{results.length} 篇</span>
                </h2>
                {chapter && (
                  <button
                    className="text-button"
                    onClick={() => setChapter("")}
                  >
                    查看全部模块
                  </button>
                )}
              </div>
              {chapter === "en-listening" && (
                <p className="panel">
                  这里提供听力方法与文字识别微练习。真正的声音辨识训练，请结合学校录音或真题音频。
                </p>
              )}
              {results.length ? (
                <div className="sop-grid">
                  {results.map((s) => (
                    <SopCard key={s.id} sop={s} />
                  ))}
                </div>
              ) : (
                <Empty title="暂时没有匹配内容">
                  <p>换个短一点的关键词，或从“我卡住了”开始。</p>
                </Empty>
              )}
            </>
          )}
        </>
      )}
      <div className="quiet-banner">
        <span>✎</span>
        <p>把错误代码和一句改法记下来，让这次卡住成为下次的提示。</p>
        <Link href="/mistakes?subject=english">我的英语错题 →</Link>
      </div>
    </>
  );
}
