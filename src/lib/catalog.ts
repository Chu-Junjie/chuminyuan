import type { Subject, SopSummary, Mistake, Mastery } from "./types";
export const subjects: Subject[] = [
  {
    id: "math",
    name: "数学",
    symbol: "∑",
    description: "把每一道题，拆成下一步",
    status: "open",
  },
  {
    id: "chinese",
    name: "语文",
    symbol: "文",
    description: "文字里的广阔天地",
    status: "building",
  },
  {
    id: "english",
    name: "英语",
    symbol: "Aa",
    description: "按题型找思路，按知识点补基础",
    status: "open",
  },
  {
    id: "physics",
    name: "物理",
    symbol: "φ",
    description: "看懂世界的运行方式",
    status: "building",
  },
  {
    id: "geography",
    name: "地理",
    symbol: "◎",
    description: "从脚下出发，认识世界",
    status: "building",
  },
  {
    id: "biology",
    name: "生物",
    symbol: "✳",
    description: "发现生命的细节",
    status: "building",
  },
];
export function sopSubject(sop: Pick<SopSummary, "id" | "subject_id">) {
  return sop.subject_id ?? (sop.id.startsWith("EN-") ? "english" : "math");
}
export const englishErrorTags = [
  "L-K 关键词漏听",
  "L-C 改口没更新",
  "L-P 同义替换没认出",
  "L-I 推断过远",
  "L-A 态度对象/强度错",
  "R-L 定位",
  "R-P 同义替换",
  "R-I 过度推断",
  "R-S 范围/程度",
  "R-N 反向词漏看",
  "R-M 主旨范围",
  "7-P 指代",
  "7-L 逻辑",
  "7-T 主题链",
  "7-O 位置",
  "7-R 重复",
  "C-P 词性",
  "C-X 搭配",
  "C-R 复现",
  "C-E 情绪",
  "C-S 故事逻辑",
  "G-P 谓语",
  "G-T 时态",
  "G-V 语态",
  "G-N 单复数/一致",
  "G-W 词形",
  "G-C 从句",
  "G-F 搭配",
  "W-M 漏点",
  "W-R 语域",
  "W-T 时态",
  "W-V 动词",
  "W-S 拼写",
  "W-O 组织",
  "CW-L 衔接",
  "CW-C 事实冲突",
  "CW-E 情绪",
  "CW-A 动作",
  "CW-T 时态",
  "CW-M 模板化",
];
export const masteryLabels: Record<Mastery, string> = {
  seen: "👀 见过",
  can: "🟡 会做",
  fluent: "🟢 熟练",
};
export const statusLabels = {
  unsolved: "🔴 还不会",
  hinted: "🟡 看提示会",
  solved: "🟢 已解决",
};
export const errorTags = [
  "🧠 没想到方法",
  "📖 知识不会",
  "🧮 计算失误",
  "👀 看错条件",
  "✏️ 符号写错",
  "⏰ 时间不够",
  "🔀 方法选错",
  "🪤 掉进题目坑",
  "其他",
];
export const frequencyLabels = [
  "",
  "低频但仍属考试范围",
  "次高频补充",
  "常规知识",
  "常见考法",
  "高频核心，优先掌握",
];
export function normalizeSearch(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/负/g, "-")
    .replace(/[\s_{}()[\]，。｜|]/g, "");
}
const aliases: Record<string, string[]> = {
  至少一个: ["SOP062"],
  两个根但是不想算: ["SOP076"],
  f负x: ["SOP016"],
  "f(-x)": ["SOP016"],
  两个挨着的数乘起来: ["SOP083"],
  已知Sn求an: ["SOP082"],
  "忘记n=1": ["SOP082"],
};
export function searchSops(
  items: SopSummary[],
  query: string,
  full: Record<string, string> = {},
) {
  const q = normalizeSearch(query);
  if (!q) return items;
  const ids = Object.entries(aliases)
    .filter(
      ([key]) =>
        normalizeSearch(key).includes(q) || q.includes(normalizeSearch(key)),
    )
    .flatMap(([, value]) => value);
  return items
    .map((s) => ({
      s,
      score: ids.includes(s.id)
        ? 100
        : normalizeSearch(s.title + s.code + s.keywords.join(" ")).includes(q)
          ? 50
          : normalizeSearch(
                s.chapter + s.brain_first + (full[s.id] || ""),
              ).includes(q)
            ? 10
            : 0,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s);
}
export type MistakeFilter = {
  subject?: string;
  chapter?: string;
  sopId?: string;
  tag?: string;
  status?: string;
  frequency?: number;
  from?: string;
  to?: string;
};
export function filterMistakes<T extends Mistake>(
  items: T[],
  f: MistakeFilter,
  sops: SopSummary[],
): T[] {
  return items.filter(
    (m) =>
      (!f.subject || m.subject === f.subject) &&
      (!f.chapter || m.chapter === f.chapter) &&
      (!f.sopId || m.sopId === f.sopId) &&
      (!f.tag || m.tags.includes(f.tag)) &&
      (!f.status || m.status === f.status) &&
      (!f.frequency ||
        sops.find((s) => s.id === m.sopId)?.frequency === f.frequency) &&
      (!f.from || m.date >= f.from) &&
      (!f.to || m.date <= f.to),
  );
}
export function oldMistake(items: Mistake[], now = Date.now()) {
  const eligible = items.filter(
    (m) => now - Date.parse(m.createdAt) >= 3 * 86400000,
  );
  const priority = eligible.filter((m) => m.status !== "solved");
  const pool = priority.length ? priority : eligible;
  return pool.length
    ? pool[Math.floor(Math.random() * pool.length)]
    : undefined;
}
export function canAdvance(from: Mastery, to: Mastery) {
  return (
    ["seen", "can", "fluent"].indexOf(to) >
    ["seen", "can", "fluent"].indexOf(from)
  );
}
