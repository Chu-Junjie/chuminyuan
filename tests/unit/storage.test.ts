import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  saveRecord,
  allEntries,
  acknowledge,
  acceptRemote,
  saveImage,
  getImage,
} from "../../src/lib/db";
import { validateBackup, restoreBackup } from "../../src/lib/backup";
describe("offline persistence", () => {
  it("isolates account data and persists note, bookmark and mastery", async () => {
    await saveRecord("user-a", "notes", "SOP001", {
      sopId: "SOP001",
      text: "A 的笔记",
    });
    await saveRecord("user-b", "notes", "SOP001", {
      sopId: "SOP001",
      text: "B 的笔记",
    });
    await saveRecord("user-a", "bookmarks", "SOP001", {
      sopId: "SOP001",
      folder: "考前必看",
    });
    await saveRecord("user-a", "progress", "SOP001", {
      sopId: "SOP001",
      status: "fluent",
      position: 500,
      visitedAt: new Date().toISOString(),
    });
    expect((await allEntries("user-a")).map((e) => e.kind)).toHaveLength(3);
    expect((await allEntries("user-b"))[0].data).toEqual({
      sopId: "SOP001",
      text: "B 的笔记",
    });
  });
  it("does not acknowledge an edit made during upload or overwrite dirty content on pull", async () => {
    const first = await saveRecord("races", "notes", "SOP001", {
      sopId: "SOP001",
      text: "first",
    });
    const second = await saveRecord("races", "notes", "SOP001", {
      sopId: "SOP001",
      text: "newer offline edit",
    });
    await acknowledge(first);
    let current = (await allEntries("races"))[0];
    expect(current.dirty).toBe(true);
    expect(current.syncedRevision).toBe(first.revision);
    await acceptRemote({ ...first, dirty: false });
    current = (await allEntries("races"))[0];
    expect(current.data).toEqual(second.data);
    await acknowledge(current);
    expect((await allEntries("races"))[0].dirty).toBe(false);
  });
  it("keeps the final keystroke under rapid writes", async () => {
    await Promise.all(
      Array.from({ length: 40 }, (_, i) =>
        saveRecord("typing", "notes", "SOP001", {
          sopId: "SOP001",
          text: String(i),
        }),
      ),
    );
    expect((await allEntries("typing"))[0].data).toEqual({
      sopId: "SOP001",
      text: "39",
    });
  });
  it("preserves original binary image in the correct scope", async () => {
    const blob = new Blob(["image-test"], { type: "image/png" });
    await saveImage("images-a", "original", blob, "原图.png");
    expect(await getImage("images-b", "original")).toBeUndefined();
    expect((await getImage("images-a", "original"))?.blob.size).toBe(blob.size);
  });
  it("rejects malformed backups before writing", () => {
    expect(() =>
      validateBackup({
        version: 1,
        records: [
          { id: "x", kind: "mistakes", data: { title: "bad" }, deleted: false },
        ],
        images: [],
      }),
    ).toThrow();
  });
  it("restores conflicting notes without overwriting the current version", async () => {
    const original = await saveRecord("restore", "notes", "SOP001", {
      sopId: "SOP001",
      text: "current",
    });
    await restoreBackup("restore", {
      version: 1,
      records: [{ ...original, data: { sopId: "SOP001", text: "backup" } }],
      images: [],
    });
    const rows = await allEntries("restore");
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === "SOP001")?.data).toEqual({
      sopId: "SOP001",
      text: "current",
    });
  });
});
