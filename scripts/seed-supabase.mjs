import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the local environment.",
  );
const db = createClient(url, key, { auth: { persistSession: false } });
const read = async (path) =>
  JSON.parse(
    await readFile(new URL("../public/data/" + path, import.meta.url), "utf8"),
  );
const chapters = [
  ...(await read("chapters.json")),
  ...(await read("english/chapters.json")),
];
const englishStatus = await db
  .from("subjects")
  .update({ status: "open" })
  .eq("id", "english");
if (englishStatus.error) throw englishStatus.error;
const chapterResult = await db.from("chapters").upsert(chapters);
if (chapterResult.error) throw chapterResult.error;
const catalog = [
  ...(await read("catalog.json")),
  ...(await read("english/catalog.json")),
].filter((item) => item.kind !== "resource");
for (const item of catalog) {
  const sop = await read("sops/" + item.id + ".json");
  const { error } = await db.from("sops").upsert({
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
}
console.log(
  `Imported ${chapters.length} chapters and ${catalog.length} SOPs. English reference resources remain bundled locally.`,
);
