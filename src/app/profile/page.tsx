"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useStore, useRecords } from "@/components/provider";
import { PageTitle } from "@/components/ui";
import { PrivateImage } from "@/components/images";
import { supabase } from "@/lib/supabase";
import { exportBackup, saveImage } from "@/lib/db";
import { restoreBackup } from "@/lib/backup";
import { validateImage, browserImage } from "@/lib/images";
import type { Settings } from "@/lib/types";
export default function Page() {
  const { user, scope, settings, save, sync, refresh, message } = useStore();
  const progress = useRecords("progress"),
    mistakes = useRecords("mistakes"),
    reviews = useRecords("reviews");
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [authMessage, setAuthMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [storage, setStorage] = useState(""),
    [migration, setMigration] = useState("");
  useEffect(() => {
    navigator.storage
      ?.estimate()
      .then((e) =>
        setStorage(`${Math.round((e.usage ?? 0) / 1024 / 1024)} MB`),
      );
  }, []);
  async function auth(mode: "login" | "signup" | "reset") {
    if (!supabase) return;
    setBusy(true);
    try {
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email, password })
          : mode === "signup"
            ? await supabase.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: location.origin + "/profile" },
              })
            : await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: location.origin + "/profile?reset=1",
              });
      if (result.error) throw result.error;
      setAuthMessage(
        mode === "signup"
          ? "注册请求已提交，请检查邮箱确认邮件。"
          : mode === "reset"
            ? "密码重置邮件已发送。"
            : "登录成功。",
      );
    } catch (e) {
      setAuthMessage(e instanceof Error ? e.message : "账号操作失败");
    } finally {
      setBusy(false);
    }
  }
  async function backup() {
    const blob = new Blob([JSON.stringify(await exportBackup(scope))], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `上岸地图备份-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function migrate() {
    if (!user) return;
    setBusy(true);
    try {
      await restoreBackup(scope, await exportBackup("local"));
      await refresh();
      await sync();
      setMigration(
        "已复制本机记录；原始本机数据仍保留。相同记录保留为独立副本。请刷新查看。",
      );
    } catch (e) {
      setMigration(e instanceof Error ? e.message : "迁移失败，本机数据仍保留");
    } finally {
      setBusy(false);
    }
  }
  async function restore(file?: File) {
    if (!file) return;
    try {
      await restoreBackup(scope, JSON.parse(await file.text()));
      await refresh();
      setAuthMessage("备份已导入。遇到相同记录时保留副本，没有覆盖现有记录。");
    } catch (e) {
      setAuthMessage(e instanceof Error ? e.message : "备份导入失败");
    }
  }
  async function updateSettings(patch: Partial<Settings>) {
    await save("settings", "profile", { ...settings, ...patch });
  }
  return (
    <>
      <PageTitle
        eyebrow="YOUR OWN PACE"
        title="我的练习室"
        description="每一个看懂，都是属于你的进步。"
      />
      <div className="profile-grid">
        <section className="panel">
          <h2>一点一点积累的底气</h2>
          <div className="stats">
            <div>
              <strong>
                {progress.filter((p) => p.status !== "seen").length}
              </strong>
              已点亮能力
            </div>
            <div>
              <strong>
                {mistakes.filter((m) => m.status === "solved").length}
              </strong>
              已解决错题
            </div>
            <div>
              <strong>{reviews.length}</strong>认真重做
            </div>
          </div>
          <p className="muted small">不比排名，不催打卡，按你的节奏来。</p>
        </section>
        <section className="panel">
          <h2>账号与同步</h2>
          {user ? (
            <>
              <p>已登录：{user.email}</p>
              <p className="muted small">{message}</p>
              <div className="row wrap">
                <button
                  className="button secondary"
                  onClick={() => void sync()}
                >
                  立即同步
                </button>
                <button
                  className="text-button"
                  onClick={() => void supabase?.auth.signOut()}
                >
                  退出登录
                </button>
              </div>
              <button
                disabled={busy}
                className="text-button"
                onClick={() => void migrate()}
              >
                将此设备的本机模式记录复制到账号
              </button>
              <p className="small">{migration}</p>
              <label>
                设置新密码
                <input
                  type="password"
                  value={password}
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <button
                className="button secondary"
                disabled={password.length < 8}
                onClick={async () => {
                  const result = await supabase?.auth.updateUser({ password });
                  setAuthMessage(result?.error?.message || "密码已更新");
                }}
              >
                更新密码
              </button>
            </>
          ) : supabase ? (
            <form
              className="auth-form"
              onSubmit={(e) => {
                e.preventDefault();
                void auth("login");
              }}
            >
              <label>
                邮箱
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                密码
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <div className="row">
                <button
                  disabled={busy}
                  className="button primary"
                  type="submit"
                >
                  登录
                </button>
                <button
                  disabled={busy || !email || password.length < 8}
                  className="button secondary"
                  type="button"
                  onClick={() => void auth("signup")}
                >
                  注册账号
                </button>
                <button
                  className="text-button"
                  type="button"
                  disabled={!email || busy}
                  onClick={() => void auth("reset")}
                >
                  忘记密码
                </button>
              </div>
            </form>
          ) : (
            <>
              <p>正在使用本机模式</p>
              <p className="muted">
                笔记、错题和图片保存在此浏览器。当前没有配置云同步，其他设备暂时看不到这些记录。
              </p>
              <span className="status-pill">✓ 本地学习功能可用</span>
            </>
          )}
          {authMessage && (
            <p role="status" className="small">
              {authMessage}
            </p>
          )}
        </section>
        <section className="panel">
          <h2>让这里更像你</h2>
          <label>
            怎么称呼你
            <input
              aria-label="昵称"
              value={settings.name}
              maxLength={20}
              onChange={(e) => void updateSettings({ name: e.target.value })}
            />
          </label>
          <label>
            阅读主题
            <select
              value={settings.theme}
              onChange={(e) =>
                void updateSettings({
                  theme: e.target.value as Settings["theme"],
                })
              }
            >
              <option value="light">Light · 明亮</option>
              <option value="dark">Dark · 夜读</option>
            </select>
          </label>
          <label>
            主题颜色
            <select
              value={settings.accent}
              onChange={(e) => void updateSettings({ accent: e.target.value })}
            >
              <option value="#53664e">橄榄绿</option>
              <option value="#546b85">雾蓝</option>
              <option value="#786087">紫藤</option>
              <option value="#896549">暖棕</option>
            </select>
          </label>
          <label className="button secondary file-label">
            上传私人背景
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={async (e) => {
                try {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const mime = await validateImage(file);
                  const blob = await browserImage(file, mime);
                  const id = crypto.randomUUID();
                  await saveImage(scope, id, blob, file.name);
                  await updateSettings({ backgroundId: id });
                } catch (e) {
                  setAuthMessage(
                    e instanceof Error ? e.message : "背景上传失败",
                  );
                }
              }}
            />
          </label>
          {settings.backgroundId && (
            <>
              <div className="background-preview">
                <PrivateImage id={settings.backgroundId} alt="我的私人背景" />
              </div>
              <button
                className="text-button"
                onClick={() => void updateSettings({ backgroundId: undefined })}
              >
                移除背景
              </button>
            </>
          )}
        </section>
        <section className="panel">
          <h2>本机存储与备份</h2>
          <p className="muted">
            当前已使用约 {storage || "…"}
            。清除浏览器数据会移除本机记录，定期导出可以多留一份。
          </p>
          <div className="row wrap">
            <button className="button secondary" onClick={() => void backup()}>
              导出全部记录与图片
            </button>
            <label className="button secondary file-label">
              导入备份
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => void restore(e.target.files?.[0])}
              />
            </label>
            <button
              className="text-button"
              onClick={async () =>
                setAuthMessage(
                  (await navigator.storage?.persist())
                    ? "已启用持久存储。"
                    : "浏览器未授予持久存储，请定期导出。",
                )
              }
            >
              申请持久存储
            </button>
          </div>
          <h3>离线使用</h3>
          <p className="small muted">
            用正式构建打开网站一次，再打开需要的
            SOP。成功缓存后，断网仍可阅读。离线新增内容先保存在本机。
          </p>
          <p className="small muted">
            手机浏览器菜单选择“添加到主屏幕”，即可像 App 一样打开。
          </p>
        </section>
      </div>
      <Link href="/admin" className="text-button">
        内容管理（管理员） ↗
      </Link>
    </>
  );
}
