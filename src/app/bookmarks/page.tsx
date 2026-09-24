"use client";
import { useState } from "react";
import { useRecords, useStore } from "@/components/provider";
import { useData, PageTitle, SopCard, Empty } from "@/components/ui";
import type { SopSummary } from "@/lib/types";
export default function Page() {
  const { save } = useStore();
  const bookmarks = useRecords("bookmarks");
  const folders = useRecords("folders");
  const [folder, setFolder] = useState("全部"),
    [name, setName] = useState("");
  const { data: sops } = useData<SopSummary[]>("/data/catalog.json");
  const items = bookmarks.filter(
    (b) => folder === "全部" || b.folder === folder,
  );
  return (
    <>
      <PageTitle
        eyebrow="KEEP THE GOOD IDEAS"
        title="我的收藏夹"
        description="留住那些“原来如此”，下次一翻就能找到。"
      />
      <form
        className="row wrap panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            void save("folders", crypto.randomUUID(), { name: name.trim() });
            setName("");
          }
        }}
      >
        <input
          aria-label="新收藏夹名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
          placeholder="给新收藏夹起个名字"
        />
        <button className="button secondary" type="submit">
          创建收藏夹
        </button>
      </form>
      <div className="chips">
        {Array.from(
          new Set([
            "全部",
            "考前必看",
            "我总忘",
            "函数",
            "数列",
            ...folders.map((f) => f.name),
            ...bookmarks.map((b) => b.folder),
          ]),
        ).map((f) => (
          <button
            key={f}
            className={`chip ${f === folder ? "selected" : ""}`}
            onClick={() => setFolder(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {items.length ? (
        <div className="sop-grid">
          {items.map((b) => {
            const s = sops?.find((s) => s.id === b.sopId);
            return s ? (
              <div key={b.recordId}>
                <SopCard sop={s} />
                <label className="small">
                  移动到{" "}
                  <select
                    value={b.folder}
                    aria-label={`移动${s.title}收藏夹`}
                    onChange={(e) =>
                      void save("bookmarks", b.recordId, {
                        sopId: b.sopId,
                        folder: e.target.value,
                      })
                    }
                  >
                    {Array.from(
                      new Set([
                        "考前必看",
                        "我总忘",
                        "函数",
                        "数列",
                        b.folder,
                        ...folders.map((f) => f.name),
                      ]),
                    ).map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null;
          })}
        </div>
      ) : (
        <Empty title="给重要的思路留个位置">
          <p>在 SOP 页面点一下“收藏”，它就会出现在这里。</p>
        </Empty>
      )}
    </>
  );
}
