import { supabase } from "./supabase";
import {
  allEntries,
  acknowledge,
  acceptRemote,
  imageEntries,
  putImage,
  getImage,
  putEntry,
} from "./db";
import type { Entry } from "./types";
export async function syncScope(scope: string) {
  if (!supabase || scope === "local" || !navigator.onLine) return;
  const client = supabase;
  // Upload binary dependencies first. Metadata never claims an image exists before upload succeeds.
  for (const image of await imageEntries(scope))
    if (image.dirty) {
      const { error } = await client.storage
        .from("private-images")
        .upload(`${scope}/${image.id}`, image.blob, {
          contentType: image.blob.type,
          upsert: true,
        });
      if (error) throw error;
      await putImage({ ...image, dirty: false });
    }
  for (const entry of await allEntries(scope))
    if (entry.dirty) {
      const { data, error } = await client.rpc("sync_record", {
        p_user_id: scope,
        p_kind: entry.kind,
        p_id: entry.id,
        p_payload: entry.data,
        p_revision: entry.revision,
        p_base_revision: entry.syncedRevision ?? null,
        p_updated_at: entry.updatedAt,
        p_deleted: entry.deleted,
      });
      if (error) throw error;
      if (data === "conflict") {
        // Keep both versions. A timestamp race must never silently destroy an offline edit.
        const conflictId = `${entry.id}-conflict-${entry.revision}`;
        const payload =
          entry.kind === "mistakes"
            ? { ...entry.data, id: conflictId }
            : entry.data;
        await putEntry({
          ...entry,
          key: `${scope}:${entry.kind}:${conflictId}`,
          id: conflictId,
          data: payload,
          syncedRevision: undefined,
          dirty: true,
        });
      }
      await acknowledge(entry);
    }
  const { data, error } = await client
    .from("user_records")
    .select("*")
    .eq("user_id", scope);
  if (error) throw error;
  for (const row of data || [])
    await acceptRemote({
      key: `${scope}:${row.kind}:${row.id}`,
      scope,
      kind: row.kind,
      id: row.id,
      data: row.payload,
      updatedAt: row.updated_at,
      revision: row.revision,
      syncedRevision: row.revision,
      dirty: false,
      deleted: row.deleted,
    } as Entry);
}
export async function imageUrl(scope: string, id: string) {
  const cached = await getImage(scope, id);
  if (cached) return URL.createObjectURL(cached.blob);
  if (!supabase || scope === "local") return "";
  const { data, error } = await supabase.storage
    .from("private-images")
    .download(`${scope}/${id}`);
  if (error) throw error;
  await putImage({
    key: `${scope}:${id}`,
    scope,
    id,
    blob: data,
    dirty: false,
    name: id,
  });
  return URL.createObjectURL(data);
}
