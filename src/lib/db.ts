import { openDB } from "idb";
import type { Entry, RecordKind, Records } from "./types";
let dbPromise: ReturnType<typeof openDB> | undefined;
const database = () =>
  (dbPromise ??= openDB("gaokao-quest", 1, {
    upgrade(db) {
      db.createObjectStore("records", { keyPath: "key" });
      db.createObjectStore("images", { keyPath: "key" });
    },
  }));
export async function allEntries(scope: string): Promise<Entry[]> {
  return (await (await database()).getAll("records")).filter(
    (x: Entry) => x.scope === scope,
  );
}
export async function putEntry(entry: Entry) {
  await (await database()).put("records", entry);
}
export async function saveRecord<K extends RecordKind>(
  scope: string,
  kind: K,
  id: string,
  data: Records[K],
  deleted = false,
): Promise<Entry<K>> {
  const key = `${scope}:${kind}:${id}`;
  const db = await database();
  const tx = db.transaction("records", "readwrite");
  const previous: Entry | undefined = await tx.store.get(key);
  const entry: Entry<K> = {
    key,
    scope,
    kind,
    id,
    data,
    updatedAt: new Date().toISOString(),
    revision: crypto.randomUUID(),
    syncedRevision: previous?.syncedRevision,
    dirty: true,
    deleted,
  };
  await tx.store.put(entry);
  await tx.done;
  return entry;
}
export type StoredImage = {
  key: string;
  scope: string;
  id: string;
  blob: Blob;
  dirty: boolean;
  name: string;
};
export async function saveImage(
  scope: string,
  id: string,
  blob: Blob,
  name: string,
) {
  await (
    await database()
  ).put("images", {
    key: `${scope}:${id}`,
    scope,
    id,
    blob,
    dirty: true,
    name,
  } satisfies StoredImage);
}
export async function getImage(
  scope: string,
  id: string,
): Promise<StoredImage | undefined> {
  return (await database()).get("images", `${scope}:${id}`);
}
export async function imageEntries(scope: string): Promise<StoredImage[]> {
  return (await (await database()).getAll("images")).filter(
    (x: StoredImage) => x.scope === scope,
  );
}
export async function putImage(image: StoredImage) {
  await (await database()).put("images", image);
}
export async function acknowledge(entry: Entry) {
  const db = await database();
  const tx = db.transaction("records", "readwrite");
  const current: Entry | undefined = await tx.store.get(entry.key);
  if (current)
    await tx.store.put({
      ...current,
      syncedRevision: entry.revision,
      dirty: current.revision !== entry.revision,
    });
  await tx.done;
}
export async function acceptRemote(entry: Entry) {
  const db = await database();
  const tx = db.transaction("records", "readwrite");
  const current: Entry | undefined = await tx.store.get(entry.key);
  if (!current?.dirty) await tx.store.put(entry);
  await tx.done;
}
export async function exportBackup(scope: string) {
  const records = await allEntries(scope);
  const images = await imageEntries(scope);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    records,
    images: await Promise.all(
      images.map(async (i) => ({
        ...i,
        blob: undefined,
        base64: await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = reject;
          r.readAsDataURL(i.blob);
        }),
      })),
    ),
  };
}
