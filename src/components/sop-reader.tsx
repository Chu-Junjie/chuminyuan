"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  ChevronUp,
  List,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { useData, Loading, PageTitle, SourceBlock } from "./ui";
import { useRecords, useStore } from "./provider";
import { masteryLabels, sopSubject } from "@/lib/catalog";
import type { Sop, SopSummary, Mastery } from "@/lib/types";
export function SopReader({ id }: { id: string }) {
  const { data: sop, error } = useData<Sop>(`/data/sops/${id}.json`);
  const { data: catalog } = useData<SopSummary[]>("/data/catalog.json");
  const { ready, save, scope } = useStore();
  const progress = useRecords("progress").find(
    (p) => p.sopId === id && p.recordId === id,
  );
  const notes = useRecords("notes").filter((n) => n.sopId === id);
  const note = notes.find((n) => n.recordId === id);
  const bookmarks = useRecords("bookmarks");
  const saved = bookmarks.find((b) => b.sopId === id);
  const folders = useRecords("folders");
  const mistakes = useRecords("mistakes").filter((m) => m.sopId === id);
  const [folder, setFolder] = useState("考前必看"),
    [toc, setToc] = useState(false),
    [hint, setHint] = useState(0);
  const position = useRef(0),
    initialized = useRef("");
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const latest = useRef(progress);
  latest.current = progress;
  useEffect(() => () => clearTimeout(restoreTimer.current), []);
  useEffect(() => {
    if (!ready || !sop || initialized.current === scope + id) return;
    initialized.current = scope + id;
    position.current = progress?.position ?? 0;
    const restoredPosition = position.current;
    if (restoredPosition > 0)
      restoreTimer.current = setTimeout(
        () => window.scrollTo({ top: restoredPosition, behavior: "instant" }),
        150,
      );
    void save("progress", id, {
      sopId: id,
      status: progress?.status ?? "seen",
      position: position.current,
      visitedAt: new Date().toISOString(),
    });
  }, [ready, sop, scope, id, progress, save]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const persist = () => {
      if (initialized.current === scope + id)
        void save("progress", id, {
          sopId: id,
          status: latest.current?.status ?? "seen",
          position: position.current,
          visitedAt: new Date().toISOString(),
        });
    };
    const scroll = () => {
      position.current = window.scrollY;
      clearTimeout(timer);
      timer = setTimeout(persist, 500);
    };
    const hide = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearTimeout(timer);
      persist();
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [id, save, scope]);
  if (!sop) return <Loading error={error} />;
  const siblings = (catalog ?? []).filter(
    (s) => sopSubject(s) === sopSubject(sop) && s.kind === sop.kind,
  );
  const siblingIndex = siblings.findIndex((s) => s.id === id);
  const previous = siblings[siblingIndex - 1];
  const next = siblingIndex >= 0 ? siblings[siblingIndex + 1] : undefined;
  const example = sop.blocks.find(
    (b) => b.type === "table" && b.text.startsWith("典型例题"),
  );
  const steps =
    sop.sections
      .find((s) => s.title.includes("固定SOP"))
      ?.blocks.filter((b) => /^\d+\./.test(b.text)) ?? [];
  const exampleRows = example?.rows?.flat() ?? [];
  const hidden = new Set(example ? [example.sourceIndex] : []);
  return (
    <>
      <Link
        className="back-link"
        href={
          sopSubject(sop) === "english"
            ? `/subjects/english?chapter=${sop.chapter_id}`
            : `/subjects/math/chapters/${sop.chapter_id}`
        }
      >
        <ArrowLeft size={16} />
        {sop.chapter}
      </Link>
      <PageTitle
        eyebrow={`${sop.code.replace("SOP", "SOP ")} · ${"★".repeat(sop.frequency)}`}
        title={sop.title}
        action={
          <div className="row">
            <select
              aria-label="选择收藏夹"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            >
              {Array.from(
                new Set([
                  "考前必看",
                  "我总忘",
                  ...(sopSubject(sop) === "english"
                    ? ["阅读", "语法", "写作"]
                    : ["函数", "数列"]),
                  ...folders.map((f) => f.name),
                ]),
              ).map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
            <button
              className={`button ${saved ? "primary" : "secondary"}`}
              onClick={() =>
                saved
                  ? void save(
                      "bookmarks",
                      saved.recordId,
                      { sopId: id, folder: saved.folder },
                      true,
                    )
                  : void save("bookmarks", id, { sopId: id, folder })
              }
            >
              <Bookmark size={17} />
              {saved ? "已收藏" : "收藏"}
            </button>
          </div>
        }
      />
      {sop.source && (
        <p className="muted small">
          来源：用户提供的英语 SOP 宝典 · 第 {sop.source.startPage}–
          {sop.source.endPage} 页 ·{" "}
          <a
            href={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/source/${sop.source.file}#page=${sop.source.startPage}`}
            target="_blank"
            rel="noreferrer"
          >
            核对 PDF 原页 ↗
          </a>
        </p>
      )}
      {sop.id.startsWith("EN-GF") && (
        <p className="muted small">
          原文勘误提示：本组部分草稿与纠错代码复用了七选五内容。记录语法错题时，请使用
          G-P、G-T 等语法代码（原书第 128 页）。
        </p>
      )}
      {note?.text && (
        <a href="#my-note" className="note-preview">
          📝 你上次记下：{note.text.slice(0, 100)}
        </a>
      )}
      <div className="reading-layout">
        <article className="reading">
          <div className="mastery panel">
            <span>这个知识点，我现在</span>
            <div className="chips">
              {(Object.keys(masteryLabels) as Mastery[]).map((status) => (
                <button
                  key={status}
                  title={
                    {
                      seen: "看过内容，但还不会独立做",
                      can: "普通题可以完成",
                      fluent: "隔几天仍能独立完成",
                    }[status]
                  }
                  className={`chip ${progress?.status === status ? "selected" : ""}`}
                  onClick={() =>
                    void save("progress", id, {
                      sopId: id,
                      status,
                      position: window.scrollY,
                      visitedAt: new Date().toISOString(),
                    })
                  }
                >
                  {masteryLabels[status]}
                </button>
              ))}
            </div>
          </div>
          {sop.sections.map((section) => (
            <section
              id={section.id}
              key={section.id}
              className={`reading-section ${section.title.includes("脑内") ? "brain-section" : ""} ${section.title.includes("易错") ? "warning-section" : ""}`}
            >
              <h2>{section.title}</h2>
              {section.blocks
                .filter((b) => !hidden.has(b.sourceIndex))
                .map((block) =>
                  sopSubject(sop) === "english" &&
                  /^(答案速查|Answers:)/.test(block.text) ? (
                    <details key={block.sourceIndex} className="panel">
                      <summary>查看参考答案</summary>
                      <SourceBlock block={block} />
                    </details>
                  ) : (
                    <SourceBlock key={block.sourceIndex} block={block} />
                  ),
                )}
              {section.blocks.some((b) => hidden.has(b.sourceIndex)) && (
                <div className="example">
                  <p className="example-question">{exampleRows[0]}</p>
                  {hint > 0 && (
                    <>
                      <p>{exampleRows[1]}</p>
                      {steps.slice(0, hint).map((b) => (
                        <p className="draft" key={b.sourceIndex}>
                          {b.text}
                        </p>
                      ))}
                    </>
                  )}
                  {hint > steps.length &&
                    exampleRows
                      .slice(2)
                      .map((text, i) => <p key={i}>{text}</p>)}
                  <div className="row wrap">
                    <button
                      className="button secondary"
                      disabled={hint > steps.length}
                      onClick={() => setHint((h) => h + 1)}
                    >
                      <Lightbulb size={18} />
                      {hint === 0 ? "只告诉我下一步" : "再给一点提示"}
                    </button>
                    {hint >= steps.length && hint <= steps.length && (
                      <button
                        className="button primary"
                        onClick={() => setHint(steps.length + 1)}
                      >
                        查看完整解析
                      </button>
                    )}
                    <button
                      className="text-button"
                      onClick={() => setHint(steps.length + 1)}
                    >
                      显示全部答案
                    </button>
                  </div>
                  <small className="muted">
                    提示引用本 SOP 的原文步骤。完整例题与答案保留原文。
                  </small>
                </div>
              )}
            </section>
          ))}
          <section id="my-note" className="reading-section">
            <h2>📝 我的笔记</h2>
            <p className="muted">用自己的话记下来。输入后自动保存在本机。</p>
            <textarea
              aria-label="我的笔记"
              placeholder={
                sopSubject(sop) === "english"
                  ? "比如：先圈已有谓语，再判断这个动词该怎么变。"
                  : "比如：我就记——里面反，外面同。"
              }
              rows={5}
              value={note?.text ?? ""}
              onChange={(e) =>
                void save("notes", id, { sopId: id, text: e.target.value })
              }
            />
            <small className="muted">
              {note
                ? "最后修改：" +
                  new Date(note.modifiedAt).toLocaleString("zh-CN")
                : "还没有笔记，想到什么就写什么。"}
            </small>
            {notes
              .filter((n) => n.recordId !== id)
              .map((n) => (
                <details key={n.recordId}>
                  <summary>同步时保留的另一版笔记</summary>
                  <p>{n.text}</p>
                </details>
              ))}
          </section>
          <section id="related-mistakes" className="reading-section">
            <div className="section-heading">
              <h2>你有 {mistakes.length} 道相关错题</h2>
              <Link href={`/mistakes/new?sop=${id}`}>记一道错题 +</Link>
            </div>
            {mistakes.map((m) => (
              <Link
                className="list-row"
                key={m.recordId}
                href={`/mistakes/edit?id=${m.id}`}
              >
                {m.title || "未命名错题"}
                <ArrowRight size={17} />
              </Link>
            ))}
          </section>
          <div className="row between reader-nav">
            {previous ? (
              <Link href={`/sop/${previous.id}`}>
                <ArrowLeft size={17} />
                上一篇 · {previous.code}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/sop/${next.id}`}>
                下一篇 · {next.code}
                <ArrowRight size={17} />
              </Link>
            )}
          </div>
        </article>
        <aside className={`reader-toc ${toc ? "toc-open" : ""}`}>
          <h3>这页的思路</h3>
          {sop.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} onClick={() => setToc(false)}>
              {s.title}
            </a>
          ))}
          <a href="#my-note">我的笔记</a>
          <a href="#related-mistakes">相关错题</a>
          <button
            className="text-button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ChevronUp size={17} />
            回到顶部
          </button>
        </aside>
      </div>
      <button
        className="floating-toc"
        aria-label="打开页面目录"
        onClick={() => setToc(!toc)}
      >
        <List size={20} />
        目录
      </button>
    </>
  );
}
