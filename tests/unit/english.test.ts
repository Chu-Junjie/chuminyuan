import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sopSubject, filterMistakes, searchSops } from "../../src/lib/catalog";
import { englishRescue, englishQueryAliases } from "../../src/lib/english";
import type { Sop, SopSummary, Mistake } from "../../src/lib/types";
const read = (path: string) =>
  JSON.parse(readFileSync(`public/data/${path}`, "utf8"));
const catalog = read("english/catalog.json") as SopSummary[];
describe("English source and learning links", () => {
  it("keeps all 136 pages, 58 complete SOPs and unique resource identities", () => {
    expect(read("english/source-pages.json")).toHaveLength(136);
    expect(catalog.filter((s) => s.kind === "sop")).toHaveLength(58);
    expect(new Set(catalog.map((s) => s.id)).size).toBe(catalog.length);
    const required = [
      "如何识别",
      "术语白话",
      "脑内第一反应",
      "固定SOP步骤",
      "分支判断",
      "何时停下",
      "卡住时自救",
      "典型例题",
      "易错提醒",
      "最后检查",
      "纠错动作",
      "30秒速记",
    ];
    for (const summary of catalog) {
      const sop = read(`sops/${summary.id}.json`) as Sop;
      expect(sopSubject(sop)).toBe("english");
      expect(sop.sections.flatMap((s) => s.blocks).length).toBeGreaterThan(0);
      expect(sop.source!.startPage).toBeGreaterThan(0);
      expect(sop.source!.endPage).toBeLessThanOrEqual(136);
      if (sop.kind !== "sop") continue;
      for (const title of required)
        expect(
          sop.sections.map((s) => s.title),
          sop.id,
        ).toContain(title);
      const practice = sop.sections.find((s) =>
        s.title.startsWith("可选巩固"),
      )!;
      expect(
        practice.blocks.filter((b) => /^[1-5]\./.test(b.text)),
        sop.id,
      ).toHaveLength(5);
      expect(
        practice.blocks.some((b) => b.text.startsWith("答案速查")),
        sop.id,
      ).toBe(true);
      expect(
        sop.sections
          .find((s) => s.title === "固定SOP步骤")!
          .blocks.some((b) => /^1\./.test(b.text)),
        sop.id,
      ).toBe(true);
    }
  });
  it("preserves 28 textbook units and all writing task cards as table cells", () => {
    const yilin = read("sops/EN-11-0.json") as Sop;
    const rows = yilin.blocks.flatMap((b) => b.rows ?? []);
    expect(rows.filter((r) => /^(必修|选必)/.test(r[0]))).toHaveLength(28);
    const writing = read("sops/EN-PW-TASKS.json") as Sop;
    expect(
      writing.blocks
        .flatMap((b) => b.rows ?? [])
        .filter((r) => /Invitation|Thank-you|Reply email/.test(r[0])),
    ).toHaveLength(3);
  });
  it("resolves every rescue and keyword link without entering math", () => {
    for (const code of [
      ...englishRescue.flatMap((r) => r.choices.map((c) => c[1])),
      ...Object.values(englishQueryAliases).flat(),
    ])
      expect(
        catalog.some((s) => s.code === code),
        code,
      ).toBe(true);
    expect(sopSubject({ id: "SOP082" })).toBe("math");
    expect(sopSubject({ id: "EN-GF2" })).toBe("english");
    const full = Object.fromEntries(
      read("english/search.json").map((r: { id: string; text: string }) => [
        r.id,
        r.text,
      ]),
    );
    expect(
      searchSops(catalog, "school open day", full).some(
        (s) => s.id === "EN-PW-TASKS",
      ),
    ).toBe(true);
    expect(
      filterMistakes(
        [
          { subject: "english", sopId: "EN-GF2" } as Mistake,
          { subject: "math", sopId: "SOP082" } as Mistake,
        ],
        { subject: "english" },
        catalog,
      ),
    ).toHaveLength(1);
  });
});
