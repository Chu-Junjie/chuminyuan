"use client";
import Link from "next/link";
import { useState } from "react";
import { useRecords, useStore } from "./provider";
import { PageTitle, Markdown, Loading, useData } from "./ui";
import { PrivateImage } from "./images";
import { statusLabels } from "@/lib/catalog";
import type { Sop, MistakeStatus } from "@/lib/types";
function Hints({
  sopId,
  count,
  onNext,
}: {
  sopId: string;
  count: number;
  onNext: () => void;
}) {
  const { data: sop } = useData<Sop>(`/data/sops/${sopId}.json`);
  const steps =
    sop?.sections
      .find((s) => s.title.includes("固定SOP"))
      ?.blocks.filter((b) => /^\d+\./.test(b.text)) ?? [];
  return (
    <>
      <div>
        {steps.slice(0, count).map((b) => (
          <p className="draft" key={b.sourceIndex}>
            {b.text}
          </p>
        ))}
      </div>
      <div className="row wrap">
        <button
          className="button secondary"
          onClick={onNext}
          disabled={count >= steps.length}
        >
          {count ? "再给一点提示" : "给我第一步"}
        </button>
        <Link href={`/sop/${sopId}`}>查看完整 SOP ↗</Link>
      </div>
    </>
  );
}
export function MistakeReview({ id }: { id: string }) {
  const { ready, save } = useStore();
  const mistake = useRecords("mistakes").find((m) => m.recordId === id);
  const [hints, setHints] = useState(0),
    [result, setResult] = useState(""),
    [scratch, setScratch] = useState("");
  if (!ready) return <Loading />;
  if (!mistake) return <Loading error="没有找到这道错题，请检查当前账号。" />;
  async function finish(status: MistakeStatus) {
    if (!mistake) return;
    await save("mistakes", mistake.id, {
      ...mistake,
      status,
      updatedAt: new Date().toISOString(),
    });
    const reviewId = crypto.randomUUID();
    await save("reviews", reviewId, {
      id: reviewId,
      mistakeId: id,
      result: status,
      hintCount: hints,
      reviewedAt: new Date().toISOString(),
    });
    setResult(
      status === "solved"
        ? "这道题你曾经做错过。现在你已经会了。"
        : "这次看懂的部分，也算进步。下次再来一步。",
    );
  }
  return (
    <>
      <PageTitle
        eyebrow="A FRESH TRY"
        title="再做一次，给自己一个新机会"
        description="先只看原题。暂时收起过去的答案和错误过程。"
      />
      <section className="panel review-question">
        <h2>{mistake.title || "这一次，从这里开始"}</h2>
        <Markdown text={mistake.question} />
        {mistake.images
          .filter((i) => i.kind === "question")
          .map((i) => (
            <PrivateImage key={i.id} id={i.id} alt="原题" />
          ))}
        <label>
          这次的草稿（临时练习区）
          <textarea
            rows={5}
            value={scratch}
            onChange={(e) => setScratch(e.target.value)}
            placeholder="先自己试一试。离开此页后临时草稿不保留。"
          />
        </label>
        {mistake.sopId ? (
          <Hints
            sopId={mistake.sopId}
            count={hints}
            onNext={() => setHints((h) => h + 1)}
          />
        ) : (
          <p>这道题还没关联 SOP，可以先自己试做，再回到记录补充。</p>
        )}
      </section>
      <section className="panel">
        <h2>这次做到哪一步了？</h2>
        <div className="chips">
          {(Object.keys(statusLabels) as MistakeStatus[]).map((s) => (
            <button
              className="button secondary"
              key={s}
              onClick={() => void finish(s)}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>
        {result && (
          <p className="success-message" role="status">
            {result}
          </p>
        )}
        <Link className="list-row" href={`/mistakes/${id}`}>
          完成重做，回到完整记录 ↗
        </Link>
      </section>
    </>
  );
}
