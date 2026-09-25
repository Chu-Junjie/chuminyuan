"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Map,
  BookOpen,
  Bookmark,
  User,
  ArrowUpRight,
  WifiOff,
} from "lucide-react";
import { useStore, useRecords } from "./provider";
const links = [
  { href: "/", label: "首页", icon: Home },
  { href: "/learn", label: "学习", icon: Map },
  { href: "/mistakes", label: "错题", icon: BookOpen },
  { href: "/bookmarks", label: "收藏", icon: Bookmark },
  { href: "/profile", label: "我的", icon: User },
];
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { message, online, settings } = useStore();
  const count = useRecords("progress").filter(
    (p) => p.status !== "seen",
  ).length;
  const active = (href: string) =>
    href === "/"
      ? path === "/"
      : path.startsWith(href) ||
        (href === "/learn" &&
          (path.startsWith("/sop") || path.startsWith("/subjects")));
  return (
    <div className="app">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">↗</span>
          <div>
            上岸地图<small>GAOKAO QUEST</small>
          </div>
        </Link>
        <div className="edition">2027 · 江苏高考</div>
        <nav aria-label="主导航">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={active(href) ? "active" : ""}
              aria-current={active(href) ? "page" : undefined}
            >
              <Icon size={20} />
              {label}
              {href === "/learn" && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>✧</span>
          <p>
            每一次看懂，
            <br />
            都离上岸近一点。
          </p>
          <small>按自己的节奏来。</small>
        </div>
        <Link className="sidebar-user" href="/profile">
          <div className="avatar">{settings.name.slice(0, 1)}</div>
          <div>
            {settings.name}
            <small>已点亮 {count} 个能力</small>
          </div>
          <ArrowUpRight size={16} />
        </Link>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span className="desktop-kicker">
            你的学习练习室 <span className="top-sep">/</span>{" "}
            <strong>每一步，都算数</strong>
          </span>
          <Link className="mobile-brand" href="/" aria-label="上岸地图首页">
            <span>↗</span>
            上岸地图
          </Link>
          <span className="save-status" role="status">
            {!online && <WifiOff size={14} />} {message}
          </span>
        </div>
        <main id="main-content">{children}</main>
        <footer className="footer">
          慢慢来，比较快。 <span>上岸地图 · Gaokao Quest</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="手机主导航">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={active(href) ? "active" : ""}
            aria-current={active(href) ? "page" : undefined}
          >
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
