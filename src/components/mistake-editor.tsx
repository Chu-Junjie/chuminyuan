"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useRecords, useStore } from "./provider";
import { useData, Loading, PageTitle, Markdown } from "./ui";
import { ImageUploader, PrivateImage, imageKinds } from "./images";
import { subjects, errorTags, statusLabels } from "@/lib/catalog";
import type { Mistake, SopSummary, Chapter, MistakeStatus } from "@/lib/types";
export function MistakeEditor({ id }: { id?: string }) {
  const router = useRouter();
  const { ready, save } = useStore();
  const entries = useRecords("mistakes");
  const { data: sops } = useData<SopSummary[]>("/data/catalog.json");
  const { data: chapters } = useData<Chapter[]>("/data/chapters.json");
  const [draft, setDraft] = useState<Mistake | null>(null),
    [preview, setPreview] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (!ready || draft || !sops) return;
    if (id) {
      const found = entries.find((m) => m.recordId === id);
      if (found) setDraft(found);
      else setError("没有找到这道错题。请确认使用的是保存时的账号或本机模式。");
    } else {
      const params = new URLSearchParams(location.search);
      const sop = sops.find((s) => s.id === params.get("sop"));
      setDraft({
        id: crypto.randomUUID(),
        title: "",
        subject: sop ? "math" : params.get("subject") || "math",
        chapter: sop?.chapter_id || "",
        sopId: sop?.id || "",
        source: "学校作业",
        date: new Date().toLocaleDateString("sv-SE"),
        tags: [],
        question: "",
        stuck: "",
        reason: "",
        reaction: "",
        understanding: "",
        status: "unsolved",
        images: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [ready, entries, draft, id, sops]);
  async function update(patch: Partial<Mistake>) {
    if (!draft) return false;
    const value = { ...draft, ...patch, updatedAt: new Date().toISOString() };
    setDraft(value);
    try {
      await save("mistakes", value.id, value);
      setError("");
      return true;
    } catch {
      setError("保存失败，请立即复制文字或导出备份。");
      return false;
    }
  }
  if (!draft) return <Loading error={error} />;
  return (
    <>
      <PageTitle
        eyebrow="TURN MISTAKES INTO PROGRESS"
        title={id ? "再看懂一点，就有进步" : "给这道题，一个新的开始"}
        description="记录当时卡在哪里，下次就有路可走。所有编辑自动保存。"
        action={
          <Link className="button secondary" href="/mistakes">
            返回错题本
          </Link>
        }
      />
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <div className="editor-layout">
        <div>
          <section className="panel">
            <h2>题目与图片</h2>
            <label>
              给它起个名字
              <input
                aria-label="错题标题"
                value={draft.title}
                placeholder="例如：Sn 求 an，漏掉了第一项"
                onChange={(e) => void update({ title: e.target.value })}
              />
            </label>
            <ImageUploader
              onAdd={async (image) => {
                if (!(await update({ images: [...draft.images, image] })))
                  throw Error("图片记录保存失败，请重试");
              }}
            />
            <div className="attachment-grid">
              {draft.images.map((image) => (
                <figure key={image.id}>
                  <PrivateImage id={image.id} alt={imageKinds[image.kind]} />
                  <figcaption>
                    {imageKinds[image.kind]}
                    <button
                      className="text-button"
                      onClick={() =>
                        void update({
                          images: draft.images.filter((i) => i.id !== image.id),
                        })
                      }
                    >
                      移除
                    </button>
                  </figcaption>
                  {image.originalId && (
                    <details>
                      <summary>查看原图</summary>
                      <PrivateImage
                        id={image.originalId}
                        alt="保存的原始图片"
                      />
                    </details>
                  )}
                </figure>
              ))}
            </div>
            <label>
              手动输入题目
              <textarea
                aria-label="题目内容"
                value={draft.question}
                rows={5}
                placeholder={
                  "支持 Markdown 和 LaTeX，例如：求 $f(x)=x^2$ 的导数。"
                }
                onChange={(e) => void update({ question: e.target.value })}
              />
            </label>
            <button
              className="text-button"
              onClick={() => setPreview(!preview)}
            >
              {preview ? "收起" : "预览"}文字和公式
            </button>
            {preview && <Markdown text={draft.question} />}
          </section>
          <section className="panel">
            <h2>把卡住的地方说清楚</h2>
            {(
              [
                {
                  key: "stuck",
                  label: "我当时卡在哪里？",
                  placeholder: "写下没想通的那一步。",
                },
                {
                  key: "reason",
                  label: "我当时为什么错？",
                  placeholder: "是条件漏看，还是方法没想到？",
                },
                {
                  key: "reaction",
                  label: "下次第一反应",
                  placeholder: "下次看到这种题，我先……",
                },
                {
                  key: "understanding",
                  label: "我的新理解",
                  placeholder: "以后回来，可以继续补充。",
                },
              ] as const
            ).map((field) => (
              <label key={field.key}>
                {field.label}
                <textarea
                  aria-label={field.label}
                  rows={3}
                  value={draft[field.key]}
                  placeholder={field.placeholder}
                  onChange={(e) => void update({ [field.key]: e.target.value })}
                />
              </label>
            ))}
          </section>
        </div>
        <aside>
          <section className="panel">
            <h2>给思路找到位置</h2>
            <label>
              科目
              <select
                aria-label="科目"
                value={draft.subject}
                onChange={(e) =>
                  void update({
                    subject: e.target.value,
                    chapter: "",
                    sopId: "",
                  })
                }
              >
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
                aria-label="章节"
                value={draft.chapter}
                onChange={(e) =>
                  void update({ chapter: e.target.value, sopId: "" })
                }
              >
                <option value="">暂时不确定</option>
                {chapters
                  ?.filter((c) => c.subject_id === draft.subject)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              关联 SOP
              <select
                aria-label="关联 SOP"
                value={draft.sopId}
                onChange={(e) => {
                  const s = sops?.find((s) => s.id === e.target.value);
                  void update({
                    sopId: e.target.value,
                    chapter: s?.chapter_id ?? draft.chapter,
                  });
                }}
              >
                <option value="">先不关联</option>
                {draft.subject === "math" &&
                  sops
                    ?.filter(
                      (s) => !draft.chapter || s.chapter_id === draft.chapter,
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code}｜{s.title}
                      </option>
                    ))}
              </select>
            </label>
            {draft.sopId && (
              <Link className="list-row" href={`/sop/${draft.sopId}`}>
                查看对应 SOP ↗
              </Link>
            )}
            <label>
              来源
              <select
                value={draft.source}
                onChange={(e) => void update({ source: e.target.value })}
              >
                {["学校作业", "试卷", "练习册", "模拟卷", "其他"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              日期
              <input
                type="date"
                value={draft.date}
                onChange={(e) => void update({ date: e.target.value })}
              />
            </label>
          </section>
          <section className="panel">
            <h2>这次的小障碍</h2>
            <div className="tag-options">
              {errorTags.map((tag) => (
                <label key={tag}>
                  <input
                    type="checkbox"
                    checked={draft.tags.includes(tag)}
                    onChange={(e) =>
                      void update({
                        tags: e.target.checked
                          ? [...draft.tags, tag]
                          : draft.tags.filter((t) => t !== tag),
                      })
                    }
                  />
                  {tag}
                </label>
              ))}
            </div>
            <label>
              现在的状态
              <select
                aria-label="错题状态"
                value={draft.status}
                onChange={(e) =>
                  void update({ status: e.target.value as MistakeStatus })
                }
              >
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button primary full"
              onClick={async () => {
                if (await update({}))
                  router.push(`/mistakes/review?id=${draft.id}`);
              }}
            >
              ↻ 再做一次
            </button>
            <button
              className="button secondary full"
              onClick={async () => {
                if (await update({}))
                  router.push(`/mistakes/edit?id=${draft.id}`);
              }}
            >
              完成记录
            </button>
            <small className="muted">
              无需等到完成记录，输入后即自动保存。
            </small>
          </section>
        </aside>
      </div>
    </>
  );
}
