"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Search,
  Compass,
  Map,
  Flame,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useData, Loading, PageTitle, SopCard, Empty } from "./ui";
import { searchSops, frequencyLabels } from "@/lib/catalog";
import type { SopSummary, Chapter } from "@/lib/types";
const rescue = [
  {
    name: "有 f(x)",
    keywords: "函数",
    choices: [
      ["问 x 能取什么", "定义域"],
      ["出现 f(-x)", "奇偶"],
      ["问方程有几个解", "零点"],
      ["问越来越大还是小", "单调"],
    ],
  },
  {
    name: "有 sin / cos / tan",
    keywords: "三角",
    choices: [
      ["角度太大或有负号", "诱导"],
      ["有 A、ω、φ", "振幅"],
      ["要求一个角", "三角方程"],
    ],
  },
  {
    name: "有数列 an / Sn",
    keywords: "数列",
    choices: [
      ["已知 Sn，求 an", "S_n与a_n"],
      ["两个挨着的数乘起来", "裂项"],
      ["相邻两项差相同", "等差"],
      ["相邻两项比相同", "等比"],
    ],
  },
  {
    name: "有概率",
    keywords: "概率",
    choices: [
      ["出现“至少一个”", "至少一个"],
      ["一个发生不影响另一个", "独立事件"],
      ["数所有可能的情况", "古典概型"],
    ],
  },
  {
    name: "有立体图形",
    keywords: "立体几何",
    choices: [
      ["需要证明平行", "平行证明"],
      ["需要证明垂直", "垂直证明"],
      ["要求角度", "空间角"],
    ],
  },
  {
    name: "有直线 / 圆 / 椭圆",
    keywords: "方程",
    choices: [
      ["两个根但是不想算", "两个根但是不想算"],
      ["圆和直线碰在一起", "直线与圆"],
      ["有焦点", "焦点"],
    ],
  },
  {
    name: "有导数",
    keywords: "导数",
    choices: [
      ["求切线", "切线"],
      ["求最值", "极值"],
      ["求单调区间", "导数判断"],
    ],
  },
  {
    name: "不知道",
    keywords: "",
    choices: [
      ["从章节看看", ""],
      ["先找高频基础题", ""],
    ],
  },
];
export function Learn({ chapterId }: { chapterId?: string }) {
  const { data: sops, error } = useData<SopSummary[]>("/data/catalog.json");
  const { data: chapters } = useData<Chapter[]>("/data/chapters.json");
  const [mode, setMode] = useState("map"),
    [query, setQuery] = useState(""),
    [frequency, setFrequency] = useState(0),
    [full, setFull] = useState<Record<string, string>>({}),
    [group, setGroup] = useState<number | null>(null),
    [answer, setAnswer] = useState<string | null>(null),
    [searchError, setSearchError] = useState("");
  useEffect(() => {
    if (new URLSearchParams(location.search).get("mode") === "rescue")
      setMode("rescue");
  }, []);
  useEffect(() => {
    if (mode === "search")
      fetch("/data/search.json")
        .then((r) => {
          if (!r.ok) throw Error();
          return r.json();
        })
        .then((rows: { id: string; text: string }[]) =>
          setFull(Object.fromEntries(rows.map((x) => [x.id, x.text]))),
        )
        .catch(() =>
          setSearchError(
            "当前只能搜索标题和关键词。联网后重新打开，可搜索全文。",
          ),
        );
  }, [mode]);
  if (!sops || !chapters) return <Loading error={error} />;
  const filtered = searchSops(
    sops.filter(
      (s) =>
        (!chapterId || s.chapter_id === chapterId) &&
        (!frequency || s.frequency === frequency),
    ),
    query,
    full,
  );
  const chapter = chapters.find((c) => c.id === chapterId);
  return (
    <>
      <PageTitle
        eyebrow="THE MATH PRACTICE ROOM"
        title={chapter?.title.replace(/.*第\d+章 /, "") || "数学练习室"}
        description={chapter?.title || "不必按顺序学。哪里卡住，就从哪里开始。"}
      />
      <div className="tabs">
        {[
          { id: "search", label: "搜索题型", icon: Search },
          { id: "rescue", label: "我卡住了", icon: Compass },
          { id: "map", label: "章节地图", icon: Map },
          { id: "frequency", label: "高频必拿", icon: Flame },
        ].map((t) => (
          <button
            key={t.id}
            className={mode === t.id ? "selected" : ""}
            onClick={() => {
              setMode(t.id);
              setQuery("");
              setFrequency(0);
            }}
          >
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </div>
      {mode === "rescue" ? (
        <section className="rescue panel">
          <p className="eyebrow">一步一步，找回思路</p>
          <h2>
            {group === null
              ? "你的题大概出现了什么？"
              : answer === null
                ? "再看看，它想让你做什么？"
                : "这几个 SOP 可能帮得上忙"}
          </h2>
          <p className="muted">这是关键词导航，推荐结果需要和题目条件核对。</p>
          {group === null ? (
            <div className="choice-grid">
              {rescue.map((r, i) => (
                <button key={r.name} onClick={() => setGroup(i)}>
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
                  setAnswer(null);
                }}
              >
                <ArrowLeft size={16} />
                重新选题目特征
              </button>
              {answer === null ? (
                <div className="choice-grid">
                  {rescue[group].choices.map(([label, q]) => (
                    <button key={label} onClick={() => setAnswer(q)}>
                      {label}
                      <ArrowRight size={18} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="sop-grid">
                  {searchSops(sops, answer || rescue[group].keywords, full)
                    .slice(0, 6)
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
          {mode === "search" && (
            <>
              <label className="searchbox">
                <Search size={21} />
                <input
                  aria-label="搜索题型"
                  placeholder="试试：至少一个、f负x、两个根但是不想算…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <kbd>搜索</kbd>
              </label>
              <p className="muted small">
                支持 SOP 编号、白话、公式关键词和正文。{searchError}
              </p>
            </>
          )}
          {mode === "frequency" && (
            <>
              <div className="chips">
                {[0, 5, 4, 3, 2, 1].map((n) => (
                  <button
                    key={n}
                    className={`chip ${frequency === n ? "selected" : ""}`}
                    onClick={() => setFrequency(n)}
                  >
                    {n ? "★".repeat(n) : "全部频次"}
                  </button>
                ))}
              </div>
              <p className="muted">
                {frequency
                  ? frequencyLabels[frequency]
                  : "频次来自原文，是学习顺序参考，不代表未来必考。"}
              </p>
            </>
          )}
          {mode === "map" && !chapterId ? (
            <div className="chapter-grid">
              {chapters.map((c, i) => (
                <Link
                  href={`/subjects/math/chapters/${c.id}`}
                  key={c.id}
                  className="chapter-card"
                >
                  <span className="chapter-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <small>{c.title.split(" 第")[0]}</small>
                    <h3>{c.title.replace(/.*第\d+章 /, "")}</h3>
                    <p>
                      {sops.filter((s) => s.chapter_id === c.id).length} 个解题
                      SOP
                    </p>
                  </div>
                  <ArrowRight size={19} />
                </Link>
              ))}
            </div>
          ) : (
            <>
              <div className="section-heading">
                <h2>
                  {mode === "search" && query
                    ? "找到这些思路"
                    : "从一个知识点开始"}
                  <span>{filtered.length} 个 SOP</span>
                </h2>
              </div>
              {filtered.length ? (
                <div className="sop-grid">
                  {filtered.map((s) => (
                    <SopCard key={s.id} sop={s} />
                  ))}
                </div>
              ) : (
                <Empty title="暂时没找到">
                  <p>试试更短的关键词，或用“我卡住了”找思路。</p>
                </Empty>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
