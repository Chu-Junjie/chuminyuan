import type {
  Entry,
  RecordKind,
  Records,
  Mistake,
  Review,
  Settings,
} from "./types";
import { allEntries, saveRecord, saveImage } from "./db";
type BackupImage = { id: string; name: string; base64: string };
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const strings = (data: Record<string, unknown>, keys: string[]) =>
  keys.every((key) => typeof data[key] === "string");
export function validateBackup(input: unknown): {
  records: Entry[];
  images: BackupImage[];
} {
  if (
    !object(input) ||
    input.version !== 1 ||
    !Array.isArray(input.records) ||
    !Array.isArray(input.images)
  )
    throw Error("不是有效的上岸地图备份");
  for (const row of input.records) {
    if (
      !object(row) ||
      typeof row.id !== "string" ||
      !object(row.data) ||
      typeof row.deleted !== "boolean"
    )
      throw Error("备份记录格式错误");
    const d = row.data;
    let valid = false;
    switch (row.kind) {
      case "notes":
        valid = strings(d, ["sopId", "text"]);
        break;
      case "bookmarks":
        valid = strings(d, ["sopId", "folder"]);
        break;
      case "folders":
        valid = strings(d, ["name"]);
        break;
      case "progress":
        valid =
          strings(d, ["sopId", "visitedAt"]) &&
          ["seen", "can", "fluent"].includes(String(d.status)) &&
          typeof d.position === "number";
        break;
      case "settings":
        valid =
          strings(d, ["name", "accent"]) &&
          ["light", "dark"].includes(String(d.theme));
        break;
      case "reviews":
        valid =
          strings(d, ["id", "mistakeId", "reviewedAt"]) &&
          ["unsolved", "hinted", "solved"].includes(String(d.result)) &&
          typeof d.hintCount === "number";
        break;
      case "mistakes":
        valid =
          strings(d, [
            "id",
            "title",
            "subject",
            "chapter",
            "sopId",
            "source",
            "date",
            "question",
            "stuck",
            "reason",
            "reaction",
            "understanding",
            "createdAt",
            "updatedAt",
          ]) &&
          ["unsolved", "hinted", "solved"].includes(String(d.status)) &&
          Array.isArray(d.tags) &&
          d.tags.every((t) => typeof t === "string") &&
          Array.isArray(d.images) &&
          d.images.every(
            (i) =>
              object(i) &&
              strings(i, ["id", "name", "mime"]) &&
              ["question", "wrong_work", "teacher_solution", "other"].includes(
                String(i.kind),
              ),
          );
        break;
    }
    if (!valid) throw Error("备份包含不完整或未知类型的记录，尚未导入");
  }
  for (const image of input.images)
    if (
      !object(image) ||
      !strings(image, ["id", "name", "base64"]) ||
      !/^data:image\/(png|jpeg|webp|heic);base64,[A-Za-z0-9+/=]*$/.test(
        String(image.base64),
      )
    )
      throw Error("备份图片格式错误，尚未导入");
  return {
    records: input.records as Entry[],
    images: input.images as BackupImage[],
  };
}
export async function restoreBackup(scope: string, input: unknown) {
  const backup = validateBackup(input);
  const existing = await allEntries(scope);
  const imageIds = new Map(
    backup.images.map((i) => [i.id, crypto.randomUUID()]),
  );
  const mistakeIds = new Map<string, string>();
  for (const row of backup.records)
    if (row.kind === "mistakes")
      mistakeIds.set(
        row.id,
        existing.some((e) => e.kind === row.kind && e.id === row.id)
          ? crypto.randomUUID()
          : row.id,
      );
  for (const image of backup.images) {
    const blob = await (await fetch(image.base64)).blob();
    await saveImage(scope, imageIds.get(image.id)!, blob, image.name);
  }
  for (const row of backup.records) {
    let id = existing.some((e) => e.kind === row.kind && e.id === row.id)
      ? `${row.id}-restore-${crypto.randomUUID()}`
      : row.id;
    let data: Records[RecordKind] = row.data;
    if (row.kind === "mistakes") {
      id = mistakeIds.get(row.id)!;
      const m = row.data as Mistake;
      data = {
        ...m,
        id,
        images: m.images.map((i) => ({
          ...i,
          id: imageIds.get(i.id) ?? i.id,
          originalId: i.originalId
            ? (imageIds.get(i.originalId) ?? i.originalId)
            : undefined,
        })),
      };
    }
    if (row.kind === "reviews") {
      const r = row.data as Review;
      data = {
        ...r,
        id,
        mistakeId: mistakeIds.get(r.mistakeId) ?? r.mistakeId,
      };
    }
    if (row.kind === "settings") {
      const s = row.data as Settings;
      data = {
        ...s,
        backgroundId: s.backgroundId
          ? (imageIds.get(s.backgroundId) ?? s.backgroundId)
          : undefined,
      };
    }
    await saveRecord(scope, row.kind, id, data, row.deleted);
  }
}
