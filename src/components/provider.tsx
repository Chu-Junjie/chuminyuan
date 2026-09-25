"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { allEntries, saveRecord } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { syncScope, imageUrl } from "@/lib/sync";
import type { Entry, RecordKind, Records, Settings } from "@/lib/types";
type Store = {
  ready: boolean;
  scope: string;
  user: User | null;
  entries: Entry[];
  message: string;
  online: boolean;
  settings: Settings;
  save: <K extends RecordKind>(
    kind: K,
    id: string,
    data: Records[K],
    deleted?: boolean,
  ) => Promise<void>;
  sync: () => Promise<void>;
  refresh: () => Promise<void>;
};
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: React.ReactNode }) {
  const [scope, setScope] = useState("local"),
    [user, setUser] = useState<User | null>(null),
    [entries, setEntries] = useState<Entry[]>([]),
    [ready, setReady] = useState(false),
    [message, setMessage] = useState("正在打开本机记录…"),
    [online, setOnline] = useState(true);
  const busy = useRef(false),
    scopeRef = useRef(scope);
  scopeRef.current = scope;
  const reload = useCallback(async () => {
    const value = await allEntries(scope);
    if (scopeRef.current === scope) setEntries(value);
  }, [scope]);
  const sync = useCallback(async () => {
    if (busy.current || !supabase || scope === "local" || !navigator.onLine)
      return;
    busy.current = true;
    try {
      await syncScope(scope);
      await reload();
      const pending = (await allEntries(scope)).some((entry) => entry.dirty);
      setMessage(
        pending ? "✓ 已保存在本机，仍有记录等待同步" : "✓ 已同步到云端",
      );
    } catch (e) {
      setMessage(
        "已保存在本机；同步未完成：" +
          (e instanceof Error ? e.message : "请检查网络"),
      );
    } finally {
      busy.current = false;
    }
  }, [scope, reload]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setScope(data.session?.user.id ?? "local");
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setScope(session?.user.id ?? "local");
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    setReady(false);
    setEntries([]);
    reload()
      .then(() => {
        setReady(true);
        setMessage(scope === "local" ? "✓ 已保存在本机" : "✓ 本机记录已就绪");
      })
      .catch(() => setMessage("无法打开本机存储，请允许浏览器保存数据"));
  }, [scope, reload]);
  useEffect(() => {
    const change = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void sync();
    };
    change();
    window.addEventListener("online", change);
    window.addEventListener("offline", change);
    const timer = setInterval(() => void sync(), 30000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", change);
      window.removeEventListener("offline", change);
    };
  }, [sync]);
  useEffect(() => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production")
      navigator.serviceWorker
        .register(`${basePath}/sw.js`, {
          scope: `${basePath || ""}/`,
        })
        .then(async () => {
          await navigator.serviceWorker.ready;
          const cache = await caches.open("gaokao-quest-v1");
          const urls = performance
            .getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((url) =>
              url.startsWith(location.origin + basePath + "/_next/static/"),
            );
          if (!location.pathname.startsWith("/admin")) urls.push(location.href);
          await Promise.allSettled(urls.map((url) => cache.add(url)));
        })
        .catch(() => setMessage("离线缓存注册失败，学习记录仍保存在本机"));
  }, []);
  const save = useCallback(
    async <K extends RecordKind>(
      kind: K,
      id: string,
      data: Records[K],
      deleted = false,
    ) => {
      try {
        const entry = await saveRecord(scope, kind, id, data, deleted);
        setEntries((old) => [...old.filter((x) => x.key !== entry.key), entry]);
        setMessage(
          navigator.onLine
            ? "✓ 已保存在本机"
            : "✓ 已保存在本机，联网后会自动同步",
        );
      } catch (e) {
        setMessage("保存失败：本机空间不足或存储被禁用，请立即备份");
        throw e;
      }
    },
    [scope],
  );
  useEffect(() => {
    if (entries.some((e) => e.dirty)) {
      const timer = setTimeout(() => void sync(), 1500);
      return () => clearTimeout(timer);
    }
  }, [entries, sync]);
  const settings = (entries.find((e) => e.kind === "settings" && !e.deleted)
    ?.data as Settings | undefined) ?? {
    name: "同学",
    theme: "light",
    accent: "#53664e",
  };
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty("--accent", settings.accent);
  }, [settings.theme, settings.accent]);
  useEffect(() => {
    let objectUrl = "",
      active = true;
    document.documentElement.style.removeProperty("--personal-background");
    if (settings.backgroundId)
      void imageUrl(scope, settings.backgroundId)
        .then((url) => {
          objectUrl = url;
          if (active)
            document.documentElement.style.setProperty(
              "--personal-background",
              `url("${url}")`,
            );
        })
        .catch(() => {});
    return () => {
      active = false;
      URL.revokeObjectURL(objectUrl);
    };
  }, [scope, settings.backgroundId]);
  return (
    <Context.Provider
      value={{
        ready,
        scope,
        user,
        entries,
        message,
        online,
        settings,
        save,
        sync,
        refresh: reload,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw Error("Store provider missing");
  return value;
}
export function useRecords<K extends RecordKind>(
  kind: K,
): Array<Records[K] & { recordId: string; modifiedAt: string }> {
  const { entries } = useStore();
  return entries
    .filter((e): e is Entry<K> => e.kind === kind && !e.deleted)
    .map((e) => ({ ...e.data, recordId: e.id, modifiedAt: e.updatedAt }));
}
