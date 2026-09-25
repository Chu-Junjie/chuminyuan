import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Provider } from "@/components/provider";
import { Shell } from "@/components/shell";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const metadata: Metadata = {
  title: { default: "上岸地图 · 每一步，都算数", template: "%s · 上岸地图" },
  description: "2027江苏高考个人学习练习室。卡题时，找到你的下一步。",
  manifest: `${basePath}/manifest.webmanifest`,
  appleWebApp: { capable: true, statusBarStyle: "default", title: "上岸地图" },
  icons: {
    icon: `${basePath}/icon.svg`,
    apple: `${basePath}/icon-192.png`,
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#53664e",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <a href="#main-content" className="skip-link">
          跳到主要内容
        </a>
        <Provider>
          <Shell>{children}</Shell>
        </Provider>
      </body>
    </html>
  );
}
