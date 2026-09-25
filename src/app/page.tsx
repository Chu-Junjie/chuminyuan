"use client";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Plus,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { useRecords, useStore } from "@/components/provider";
import { useData, SopCard } from "@/components/ui";
import { subjects, sopSubject } from "@/lib/catalog";
import type { SopSummary } from "@/lib/types";
export default function Home() {
  const { settings } = useStore();
  const progress = useRecords("progress");
  const mistakes = useRecords("mistakes");
  const bookmarks = useRecords("bookmarks");
  const { data: sops } = useData<SopSummary[]>("/data/catalog.json");
  const recent = [...progress]
    .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
    .slice(0, 3);
  const lit = progress.filter((p) => p.status !== "seen").length;
  const counts = mistakes
    .flatMap((m) => m.tags)
    .reduce<Record<string, number>>(
      (acc, t) => ({ ...acc, [t]: (acc[t] || 0) + 1 }),
      {},
    );
  return (
    <>
      <div className="home-heading">
        <div>
          <p className="eyebrow">HELLO, FUTURE YOU</p>
          <h1>{settings.name}，今天也向前一点。</h1>
          <p className="muted">不用一下子会很多，先搞懂眼前这一题。</p>
        </div>
        <span className="date-pill">✦ 2027 高考，一起上岸</span>
      </div>
      <section className="hero">
        <div className="hero-content">
          <span className="hero-label">
            <span /> 你的思路急救站
          </span>
          <h2>
            今天遇到
            <br />
            不会的题了吗<span>？</span>
          </h2>
          <p>
            不需要知道题型叫什么。
            <br />
            告诉我题里有什么，一起找到下一步。
          </p>
          <Link className="button primary" href="/learn?mode=rescue">
            <Compass size={20} />
            我卡住了
            <ArrowRight size={19} />
          </Link>
          <small>从“没有思路”，到“原来这样做”。</small>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <span className="art-star star-one">✦</span>
          <span className="art-star star-two">✧</span>
          <span className="art-formula">f(x) → 下一步</span>
          <div className="art-card card-back">
            <span>STEP 02</span>
            <b>把问题拆小一点</b>
            <p>先看条件，再找思路。</p>
            <div className="art-lines" />
          </div>
          <div className="art-card card-front">
            <span>YOUR NEXT STEP</span>
            <div className="art-compass">
              <Compass size={60} strokeWidth={1} />
            </div>
            <b>思路，正在靠岸。</b>
            <div className="art-card-bottom">
              <span>从这里出发</span>
              <ArrowUpRight size={21} />
            </div>
          </div>
          <span className="art-tag">✓ 每一个看懂，都值得</span>
        </div>
      </section>
      <div className="section-heading">
        <h2>
          我的学科<span>找到你今天的练习室</span>
        </h2>
        <Link href="/learn">
          进入学习
          <ArrowRight size={16} />
        </Link>
      </div>
      <div className="subjects">
        {subjects.map((s) => (
          <Link
            className={`subject-card ${s.status === "open" ? "subject-open" : ""}`}
            key={s.id}
            href={`/subjects/${s.id}`}
          >
            <span className={`subject-symbol ${s.id}`}>{s.symbol}</span>
            <div>
              <h3>{s.name}</h3>
              <small>
                {s.status === "open"
                  ? `${sops?.filter((item) => sopSubject(item) === s.id && item.kind !== "resource").length ?? "…"} 个 SOP · 已开放`
                  : "🚧 内容建设中"}
              </small>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        ))}
      </div>
      <div className="home-bottom">
        <section>
          <div className="section-heading">
            <h2>接着上次的思路</h2>
            <BookOpen size={19} />
          </div>
          {recent.length && sops ? (
            <div className="recent-list">
              {recent.map((p) => {
                const s = sops.find((s) => s.id === p.sopId);
                return s ? (
                  <Link href={`/sop/${s.id}`} key={p.sopId}>
                    <span className="recent-icon">↗</span>
                    <div>
                      <small>
                        {s.code} · {s.chapter.replace(/.*第\d+章 /, "")}
                      </small>
                      <h3>{s.title}</h3>
                    </div>
                    <ArrowRight size={18} />
                  </Link>
                ) : null;
              })}
            </div>
          ) : (
            <div className="gentle-empty">
              <span>⌁</span>
              <h3>你的学习轨迹，从这里开始</h3>
              <p>打开一个 SOP，下次回来就能接着看。</p>
              <Link href="/learn">
                去找一个想弄懂的知识点 <ArrowRight size={16} />
              </Link>
            </div>
          )}
          {mistakes.length > 0 && (
            <div className="small-links">
              最近错题：
              <Link
                href={`/mistakes/edit?id=${[...mistakes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0].id}`}
              >
                {[...mistakes].sort((a, b) =>
                  b.updatedAt.localeCompare(a.updatedAt),
                )[0].title || "未命名错题"}
              </Link>
            </div>
          )}
          {bookmarks.length > 0 && (
            <div className="small-links">
              最近收藏：
              <Link href={`/sop/${bookmarks.at(-1)?.sopId}`}>
                {sops?.find((s) => s.id === bookmarks.at(-1)?.sopId)?.title}
              </Link>
            </div>
          )}
        </section>
        <section className="ability-card">
          <span className="eyebrow">A LITTLE BETTER, EVERY TIME</span>
          <div className="row between">
            <h2>一点点，变厉害</h2>
            <Sparkles size={22} />
          </div>
          <p>
            你已经点亮了 <strong>{lit}</strong> 个能力
          </p>
          <div className="ability-dots">
            {Array.from({ length: 15 }, (_, i) => (
              <span key={i} className={i < lit ? "lit" : ""}>
                ✦
              </span>
            ))}
          </div>
          <small>
            {lit
              ? "每一个亮点，都是你认真想过的证明。"
              : "第一个亮点，留给下一个“我会了”。"}
          </small>
          <Link href="/profile">
            看看我的成长
            <ArrowUpRight size={17} />
          </Link>
        </section>
      </div>
      {Object.keys(counts).length > 0 && (
        <section>
          <div className="section-heading">
            <h2>最近常遇到的小障碍</h2>
          </div>
          <div className="chips">
            {Object.entries(counts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([tag, n]) => (
                <Link
                  className="chip"
                  key={tag}
                  href={`/mistakes?tag=${encodeURIComponent(tag)}`}
                >
                  {tag} × {n} · 去处理
                </Link>
              ))}
          </div>
        </section>
      )}
      <div className="quiet-banner">
        <span>✎</span>
        <p>错过的题，也可以成为下一次的底气。</p>
        <Link href="/mistakes/new">
          <Plus size={17} />
          记一道错题
        </Link>
      </div>
    </>
  );
}
