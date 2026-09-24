"use client";
import { useEffect, useState } from "react";
import { useStore } from "@/components/provider";
import {
  useData,
  PageTitle,
  Loading,
  Markdown,
  SourceBlock,
} from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { Sop, SopSummary, Chapter } from "@/lib/types";
import { subjects } from "@/lib/catalog";
export default function Page() {
  const { user } = useStore();
  const [admin, setAdmin] = useState(false),
    [checked, setChecked] = useState(false),
    [selected, setSelected] = useState(""),
    [content, setContent] = useState(""),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState<Sop | null>(null),
    [subject, setSubject] = useState("math"),
    [chapterTitle, setChapterTitle] = useState(""),
    [chapterId, setChapterId] = useState(""),
    [markdown, setMarkdown] = useState(""),
    [allChapters, setAllChapters] = useState<Chapter[]>([]),
    [allSops, setAllSops] = useState<SopSummary[]>([]);
  const { data: catalog } = useData<SopSummary[]>("/data/catalog.json");
  const { data: chapters } = useData<Chapter[]>("/data/chapters.json");
  useEffect(() => {
    if (!supabase || !user) {
      setAdmin(false);
      setChecked(true);
      return;
    }
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setAdmin(!!data?.is_admin);
        setChecked(true);
      });
  }, [user]);
  useEffect(() => {
    if (catalog) setAllSops(catalog);
    if (chapters) setAllChapters(chapters);
    if (admin && supabase) {
      supabase
        .from("chapters")
        .select("*")
        .order("sort_order")
        .then(({ data }) => {
          if (data?.length) setAllChapters(data as Chapter[]);
        });
      supabase
        .from("sops")
        .select("*")
        .order("sort_order")
        .then(({ data }) => {
          if (data?.length) setAllSops(data as SopSummary[]);
        });
    }
  }, [admin, catalog, chapters]);
  async function load(id: string) {
    setSelected(id);
    const { data } = await supabase!
      .from("sops")
      .select("content_json")
      .eq("id", id)
      .maybeSingle();
    const sop =
      data?.content_json ??
      (await fetch(`/data/sops/${id}.json`).then((r) => r.json()));
    setContent(JSON.stringify(sop, null, 2));
    setPreview(sop);
  }
  function parse() {
    const sop = JSON.parse(content) as Sop;
    if (
      !sop.id ||
      !sop.title ||
      !sop.chapter_id ||
      !Array.isArray(sop.blocks) ||
      !Array.isArray(sop.sections) ||
      !Array.isArray(sop.keywords) ||
      !Number.isInteger(sop.frequency) ||
      sop.frequency < 1 ||
      sop.frequency > 5
    )
      throw Error("请检查 id、标题、章节、正文、关键词及 1～5 的频次");
    return sop;
  }
  async function save() {
    try {
      const sop = parse();
      const { error } = await supabase!.from("sops").upsert({
        id: sop.id,
        chapter_id: sop.chapter_id,
        code: sop.code,
        title: sop.title,
        frequency: sop.frequency,
        keywords: sop.keywords,
        content_json: sop,
        sort_order: sop.sort_order,
      });
      if (error) throw error;
      setPreview(sop);
      setMessage(
        "内容已保存到云端。登录用户再次打开时读取云端版本。静态离线包需重新导出发布。",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "保存失败");
    }
  }
  if (!checked) return <Loading />;
  if (!admin)
    return (
      <>
        <PageTitle eyebrow="CONTENT STUDIO" title="内容管理" />
        <div className="panel">
          <h2>仅管理员可访问</h2>
          <p>
            {supabase
              ? "请登录被授予管理员权限的账号。"
              : "尚未连接 Supabase。请按 README 配置项目并为账号授予管理员权限。"}
          </p>
          <p className="muted">
            公开学习内容可直接阅读；个人记录和后台写入由数据库权限保护。
          </p>
        </div>
      </>
    );
  return (
    <>
      <PageTitle
        eyebrow="CONTENT STUDIO"
        title="内容管理"
        description="以导入的完整 JSON 编辑原文，支持表格、段落、频次和关键词。"
      />
      <section className="panel">
        <h2>科目与章节</h2>
        <div className="form-grid">
          <label>
            科目
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.status === "open" ? "已开放" : "建设中"}
                </option>
              ))}
            </select>
          </label>
          <label>
            已有章节
            <select
              value={chapterId}
              onChange={(e) => {
                setChapterId(e.target.value);
                setChapterTitle(
                  allChapters.find((c) => c.id === e.target.value)?.title || "",
                );
              }}
            >
              <option value="">新增章节</option>
              {allChapters
                .filter((c) => c.subject_id === subject)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
            </select>
          </label>
          <label>
            章节名称
            <input
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
            />
          </label>
        </div>
        <button
          className="button secondary"
          onClick={async () => {
            if (!chapterTitle.trim()) return;
            const chapter = {
              id: chapterId || crypto.randomUUID(),
              subject_id: subject,
              title: chapterTitle,
              sort_order: allChapters.length,
            };
            const { error } = await supabase!.from("chapters").upsert(chapter);
            setMessage(error?.message || "章节已保存");
            if (!error)
              setAllChapters((old) => [
                ...old.filter((c) => c.id !== chapter.id),
                chapter,
              ]);
          }}
        >
          保存章节
        </button>
        <button
          className="text-button"
          onClick={() => {
            const sop: Sop = {
              id: `${subject.toUpperCase()}-${crypto.randomUUID().slice(0, 8)}`,
              code: `${subject.toUpperCase()}-${Date.now()}`,
              title: "新 SOP",
              chapter_id: chapterId,
              chapter: chapterTitle,
              frequency: 3,
              keywords: [],
              brain_first: "",
              sort_order: allSops.length,
              blocks: [],
              sections: [],
            };
            setSelected(sop.id);
            setContent(JSON.stringify(sop, null, 2));
            setPreview(sop);
          }}
        >
          新增 SOP 草稿
        </button>
      </section>
      <div className="admin-grid">
        <aside className="panel admin-list">
          {allSops.map((s) => (
            <button key={s.id} onClick={() => void load(s.id)}>
              {s.code} {s.title}
            </button>
          ))}
        </aside>
        <section className="panel">
          {selected ? (
            <>
              <h2>{selected}</h2>
              {preview && (
                <div className="form-grid">
                  <label>
                    标题
                    <input
                      value={preview.title}
                      onChange={(e) => {
                        const next = { ...preview, title: e.target.value };
                        setPreview(next);
                        setContent(JSON.stringify(next, null, 2));
                      }}
                    />
                  </label>
                  <label>
                    频次
                    <select
                      value={preview.frequency}
                      onChange={(e) => {
                        const next = {
                          ...preview,
                          frequency: Number(e.target.value),
                        };
                        setPreview(next);
                        setContent(JSON.stringify(next, null, 2));
                      }}
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {"★".repeat(n)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    关键词（逗号分隔）
                    <input
                      value={preview.keywords.join(",")}
                      onChange={(e) => {
                        const next = {
                          ...preview,
                          keywords: e.target.value.split(/[,，]/),
                        };
                        setPreview(next);
                        setContent(JSON.stringify(next, null, 2));
                      }}
                    />
                  </label>
                  <label>
                    SOP 编号
                    <input
                      value={preview.code}
                      onChange={(e) => {
                        const next = { ...preview, code: e.target.value };
                        setPreview(next);
                        setContent(JSON.stringify(next, null, 2));
                      }}
                    />
                  </label>
                </div>
              )}
              <textarea
                className="admin-editor"
                aria-label="SOP JSON 编辑器"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="row wrap">
                <button className="button primary" onClick={() => void save()}>
                  保存云端内容
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    try {
                      setPreview(parse());
                      setMessage("预览已更新");
                    } catch (e) {
                      setMessage(String(e));
                    }
                  }}
                >
                  预览 JSON
                </button>
              </div>
            </>
          ) : (
            <p>选择左侧 SOP，或新增草稿。</p>
          )}
          <p role="status">{message}</p>
          <label>
            Markdown / LaTeX 预览
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="输入 $x^2$ 预览公式"
            />
          </label>
          <Markdown text={markdown} />
          {preview && (
            <button
              className="button secondary"
              disabled={!markdown.trim()}
              onClick={() => {
                try {
                  const current = parse();
                  const block = {
                    type: "markdown" as const,
                    text: markdown,
                    sourceIndex:
                      Math.max(0, ...current.blocks.map((b) => b.sourceIndex)) +
                      1,
                  };
                  const next = {
                    ...current,
                    blocks: [...current.blocks, block],
                    sections: [
                      ...current.sections,
                      {
                        id: `section-${crypto.randomUUID()}`,
                        title: "补充说明",
                        blocks: [block],
                      },
                    ],
                  };
                  setContent(JSON.stringify(next, null, 2));
                  setPreview(next);
                  setMarkdown("");
                  setMessage("已添加到草稿，点击保存云端内容发布。");
                } catch (e) {
                  setMessage(String(e));
                }
              }}
            >
              将 Markdown 添加为正文小节
            </button>
          )}
          {preview && (
            <div>
              <h2>{preview.title}</h2>
              {preview.blocks.map((b) => (
                <SourceBlock key={b.sourceIndex} block={b} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
