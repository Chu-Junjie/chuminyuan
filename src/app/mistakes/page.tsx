"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Shuffle } from "lucide-react";
import { useRecords } from "@/components/provider";
import { useData, PageTitle, Empty } from "@/components/ui";
import { PrivateImage } from "@/components/images";
import {
  subjects,
  errorTags,
  statusLabels,
  filterMistakes,
  oldMistake,
  type MistakeFilter,
} from "@/lib/catalog";
import type { SopSummary, Chapter } from "@/lib/types";
export default function Page() {
  const router = useRouter();
  const mistakes = useRecords("mistakes");
  const { data: sops } = useData<SopSummary[]>("/data/catalog.json");
  const { data: chapters } = useData<Chapter[]>("/data/chapters.json");
  const [filter, setFilter] = useState<MistakeFilter>({}),
    [message, setMessage] = useState("");
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setFilter({ tag: p.get("tag") || "", sopId: p.get("sop") || "" });
  }, []);
  const items = filterMistakes(mistakes, filter, sops ?? []).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  return (
    <>
      <PageTitle
        eyebrow="MY SECOND CHANCES"
        title="错题，也是来时的路"
        description="把“还不会”慢慢变成“我已经会了”。"
        action={
          <Link href="/mistakes/new" className="button primary">
            <Plus size={18} />
            记一道错题
          </Link>
        }
      />
      <div className="review-banner">
        <div>
          <h3>隔一阵子，再见一面。</h3>
          <p>随机翻一道至少 3 天前的错题，看看现在的自己。</p>
        </div>
        <button
          className="button secondary"
          onClick={() => {
            const m = oldMistake(mistakes);
            if (m) router.push(`/mistakes/review?id=${m.id}`);
            else
              setMessage(
                "还没有 3 天前的错题。先把今天的思路记下来，过几天再来。",
              );
          }}
        >
          <Shuffle size={17} />
          随机翻旧账
        </button>
      </div>
      {message && <p role="status">{message}</p>}
      <details className="panel filters" open>
        <summary>筛选错题 · {items.length} 道</summary>
        <div className="form-grid">
          <label>
            科目
            <select
              value={filter.subject || ""}
              onChange={(e) =>
                setFilter({
                  ...filter,
                  subject: e.target.value,
                  chapter: "",
                  sopId: "",
                })
              }
            >
              <option value="">全部科目</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            章节
            <select
              value={filter.chapter || ""}
              onChange={(e) =>
                setFilter({ ...filter, chapter: e.target.value })
              }
            >
              <option value="">全部章节</option>
              {chapters?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            SOP
            <select
              value={filter.sopId || ""}
              onChange={(e) => setFilter({ ...filter, sopId: e.target.value })}
            >
              <option value="">全部 SOP</option>
              {sops?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} {s.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            错因
            <select
              value={filter.tag || ""}
              onChange={(e) => setFilter({ ...filter, tag: e.target.value })}
            >
              <option value="">所有错因</option>
              {errorTags.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            状态
            <select
              value={filter.status || ""}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            >
              <option value="">全部状态</option>
              {Object.entries(statusLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            频次
            <select
              value={filter.frequency || 0}
              onChange={(e) =>
                setFilter({ ...filter, frequency: Number(e.target.value) })
              }
            >
              <option value="0">全部频次</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)}
                </option>
              ))}
            </select>
          </label>
          <label>
            开始日期
            <input
              type="date"
              value={filter.from || ""}
              onChange={(e) => setFilter({ ...filter, from: e.target.value })}
            />
          </label>
          <label>
            结束日期
            <input
              type="date"
              value={filter.to || ""}
              onChange={(e) => setFilter({ ...filter, to: e.target.value })}
            />
          </label>
        </div>
      </details>
      {items.length ? (
        <div className="mistake-grid">
          {items.map((m) => (
            <Link
              href={`/mistakes/edit?id=${m.id}`}
              className="mistake-card"
              key={m.recordId}
            >
              {m.images.find((i) => i.kind === "question") ? (
                <PrivateImage
                  id={m.images.find((i) => i.kind === "question")!.id}
                  alt="错题题目缩略图"
                />
              ) : (
                <div className="question-preview">
                  {m.question.slice(0, 180) ||
                    "✎ 把这一次卡住，变成下一次的思路。"}
                </div>
              )}
              <div className="mistake-card-body">
                <span className="code">
                  {subjects.find((s) => s.id === m.subject)?.name} · {m.date}
                </span>
                <h3>{m.title || "未命名错题"}</h3>
                <p>{m.stuck || m.reaction || "给自己一点时间，再看懂一步。"}</p>
                {m.sopId && (
                  <small>
                    {m.sopId} ·{" "}
                    {"★".repeat(
                      sops?.find((s) => s.id === m.sopId)?.frequency ?? 0,
                    )}
                  </small>
                )}
                <div className="card-footer">
                  <span className="status-pill">{statusLabels[m.status]}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          title={
            mistakes.length
              ? "没有符合条件的错题"
              : "第一道错题，从一次认真回头开始"
          }
        >
          <p>拍照、相册上传或手动记录，都可以。</p>
          <Link className="button secondary" href="/mistakes/new">
            记一道错题
          </Link>
        </Empty>
      )}
    </>
  );
}
