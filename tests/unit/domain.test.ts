import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  normalizeSearch,
  searchSops,
  filterMistakes,
  canAdvance,
  oldMistake,
} from "../../src/lib/catalog";
import type { Mistake, SopSummary, Sop } from "../../src/lib/types";
const catalog = JSON.parse(
  readFileSync("public/data/catalog.json", "utf8"),
) as SopSummary[];
describe("source fidelity", () => {
  it("imports 100 unique numbered SOPs and all 24 chapters", () => {
    expect(catalog).toHaveLength(100);
    expect(new Set(catalog.map((s) => s.id)).size).toBe(100);
    expect(new Set(catalog.map((s) => s.chapter_id)).size).toBe(24);
    for (let i = 1; i <= 100; i++) {
      const s = JSON.parse(
        readFileSync(
          `public/data/sops/SOP${String(i).padStart(3, "0")}.json`,
          "utf8",
        ),
      ) as Sop;
      expect(s.frequency).toBeGreaterThanOrEqual(1);
      expect(s.blocks.some((b) => b.style === "Heading1")).toBe(false);
      expect(s.frequency).toBeLessThanOrEqual(5);
      expect(s.blocks.some((b) => b.text.includes("草稿纸上具体写"))).toBe(
        true,
      );
      expect(s.sections.flatMap((x) => x.blocks).length).toBe(
        s.blocks.length - 1,
      );
    }
  });
  it("preserves actual IDs, source order and every table including introductory tables", () => {
    expect(catalog.find((s) => s.id === "SOP032")?.title).toContain("零点");
    expect(catalog.find((s) => s.id === "SOP082")?.title).toContain("S_n");
    const blocks = JSON.parse(
      readFileSync("public/data/source-blocks.json", "utf8"),
    );
    expect(
      blocks.filter((b: { type: string }) => b.type === "table"),
    ).toHaveLength(503);
    const report = JSON.parse(
      readFileSync("public/data/import-report.json", "utf8"),
    );
    expect(report.warnings).toEqual([]);
    expect(report.missingSections).toEqual([]);
  });
});
describe("search", () => {
  it("normalizes full width, formula spaces and student words", () => {
    expect(normalizeSearch("Ｆ （负 x）")).toBe("f-x");
    expect(searchSops(catalog, "f负x")[0].id).toBe("SOP016");
    expect(searchSops(catalog, "至少一个")[0].id).toBe("SOP062");
    expect(searchSops(catalog, "两个根但是不想算")[0].id).toBe("SOP076");
    expect(searchSops(catalog, "两个挨着的数乘起来")[0].id).toBe("SOP083");
  });
  it("searches the complete original body", () => {
    expect(
      searchSops(catalog, "独有草稿提示", { SOP001: "独有草稿提示" }).map(
        (s) => s.id,
      ),
    ).toEqual(["SOP001"]);
  });
});
const mistake: Mistake = {
  id: "a",
  title: "test",
  subject: "math",
  chapter: "chapter-19",
  sopId: "SOP082",
  source: "试卷",
  date: "2026-09-01",
  tags: ["🧮 计算失误"],
  question: "q",
  stuck: "",
  reason: "",
  reaction: "",
  understanding: "",
  status: "unsolved",
  images: [],
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};
describe("progress and mistakes", () => {
  it("distinguishes seen, can and fluent", () => {
    expect(canAdvance("seen", "can")).toBe(true);
    expect(canAdvance("fluent", "seen")).toBe(false);
    expect(canAdvance("can", "can")).toBe(false);
  });
  it("combines filters and date boundaries", () => {
    expect(
      filterMistakes(
        [mistake],
        {
          tag: "🧮 计算失误",
          frequency: 5,
          from: "2026-09-01",
          to: "2026-09-01",
        },
        catalog,
      ),
    ).toHaveLength(1);
    expect(
      filterMistakes([mistake], { subject: "english" }, catalog),
    ).toHaveLength(0);
    expect(
      filterMistakes([mistake], { status: "solved" }, catalog),
    ).toHaveLength(0);
  });
  it("excludes fresh mistakes and prefers unresolved older mistakes", () => {
    const now = Date.parse("2026-09-24T00:00:00Z");
    const fresh = {
      ...mistake,
      id: "fresh",
      createdAt: new Date(now).toISOString(),
    };
    expect(oldMistake([fresh], now)).toBeUndefined();
    expect(
      oldMistake(
        [fresh, mistake, { ...mistake, id: "solved", status: "solved" }],
        now,
      )?.id,
    ).toBe("a");
  });
});
