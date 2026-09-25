# 上岸地图 / Gaokao Quest

面向 2027 江苏高考学生的个人学习练习室。核心入口是“我卡住了”：根据题目特征找到完整 SOP，再记录自己的笔记与错题。

当前版本完成 Phase 1 本地学习流程，包含真实 Word 导入的 **100 个数学 SOP、24 个章节**。英语已接入用户提供的 136 页 PDF，含 58 个解题 SOP、68 篇工具资料、14 个模块，支持题型地图、急救导航、全文检索、原文阅读、折叠答案与错题代码。语文、物理、地理、生物保留入口和统一错题数据结构，教学内容明确显示“内容建设中”。没有内置明星素材、排行榜、打卡或付费 AI。

按本次交付约定，默认采用本机模式；Supabase 接入代码、数据库迁移、RLS 与管理员界面已经准备好。**没有配置真实 Supabase 时，不提供跨设备同步，也不把本机保存显示成云端成功。**

## 运行环境与快速开始

- Node.js 22.18+ 或 24 LTS，npm；锁文件已提交。
- Python 3.10+ 仅用于重新导入 Word 和解析测试；导入器只用标准库。
- 浏览器需支持 IndexedDB。PWA、相机和持久存储应使用 HTTPS，localhost 可用于开发。

```bash
npm ci
npm run dev
```

打开 `http://localhost:3000`。本地模式不需要 `.env`，没有数据库也能学习、收藏、记笔记、录入错题和导出备份。

生产构建与 PWA 验证：

```bash
npm run build
npm run start
```

Windows 若遇到系统目录的 Next.js telemetry 权限/跨盘错误，可先在 PowerShell 执行 `$env:NEXT_TELEMETRY_DISABLED='1'`。这不影响网站功能。

## 功能

- 六科入口、数学 24 章地图、按原文频次筛选。
- 标题/编号/章节/关键词/全文搜索，以及“至少一个”“f负x”等白话别名。
- 两步题型判断器，匹配真实 SOP；结果提示学生核对题目条件。
- 原文详细 SOP 阅读：识别、第一反应、解释、固定步骤、草稿纸、分支、自救、例题、易错、速记、巩固题；目录、前后篇和阅读位置。
- 收藏及自定义文件夹、可编辑自动保存笔记、见过/会做/熟练、最近活动。
- 错题拍照、上传、手输 Markdown/LaTeX；多图、裁剪与原图保留，图片用途分组。
- 科目、章节、SOP、来源、日期、错因、状态、自己的反思；筛选和双向关联。
- 重做只展示原题，提示逐步展开；重做历史和至少 3 天前的旧题抽取。
- 基于真实错题标签的老毛病统计，无虚构学习进度。
- Light/Dark、主题色、私人背景、备份导出/恢复。
- PWA 安装、已访问页面和 SOP 缓存、本机图片离线访问。

## 技术与目录

Next.js App Router + React + TypeScript strict；模块化 CSS；Lucide；KaTeX + React Markdown；IndexedDB (`idb`)；Supabase Auth/Postgres/Storage；Vitest、Python unittest、Playwright。

这里使用轻量样式与原生可访问表单，未额外引入 Tailwind/shadcn 或 Redux。

```text
src/app/                  页面路由
src/components/           阅读器、学习入口、错题编辑/重做、图片、共享状态
src/lib/                  类型、检索、IndexedDB、同步、备份、图片验证
scripts/import-sop-docx.py Word 导入器
public/data/catalog.json  首屏轻量摘要
public/data/search.json   进入搜索时才加载的全文索引
public/data/sops/          每个 SOP 一个文件
public/data/source-blocks.json 完整原文块存档（含前言与目录）
public/data/import-report.json 导入完整性报告
supabase/migrations/      数据库与 RLS
tests/                    单元、解析、浏览器验收
docs/IMPLEMENTATION.md     源结构、实现顺序、同步策略与阶段边界
```

## Word 导入

数学唯一主来源是 `2027江苏高考数学基础题SOP宝典_超详细版.docx`。原 Word 不上传 Git，已导出的规范 JSON 随项目提交。

Windows：

```powershell
py scripts/import-sop-docx.py 'D:\桌面\2027江苏高考数学基础题SOP宝典_超详细版.docx'
```

macOS/Linux：

```bash
python3 scripts/import-sop-docx.py /path/to/source.docx
```

若 Word 正被编辑器独占，请先保存并关闭，或导入一份副本。原文内容不会被总结改写。正式 SOP 根据标题样式识别，目录项不会重复计入。

本次源检查：3751 个顶层段落、503 个表格、0 个 OMML，100 个 SOP、24 个章节；无转换警告、无关键模块缺失。报告包含原文件 SHA-256。公式是原文 Unicode 文本，原样显示；学生自行输入的 LaTeX 用 `$...$`/`$$...$$` 渲染。

原文的函数零点是 **SOP032**，Sn 与 an 互化是 **SOP082**，不用需求示例中的编号替代。原文未独立提供的教学模块不虚构。

未来导入包含 OMML 或图形的文件时，导入器会保存原 XML 并输出未转换警告；出现警告必须人工检查后再发布。不要把有警告的报告误认为全部转换成功。

## Supabase 接入

1. 创建 Supabase 项目，在 SQL Editor 执行 `supabase/migrations/001_initial.sql`。
2. 将 `.env.example` 复制为 `.env.local`，填写：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

3. Auth → URL Configuration 设置网站 URL，并将 `http://localhost:3000/profile` 和正式域名的 `/profile` 加入 Redirect URLs；使用密码恢复时也允许 `/profile?reset=1`。
4. Email Auth 按需开启邮箱确认。正式使用配置自己的邮件发送服务。
5. 用本地终端运行一次种子导入。服务端密钥只用于此脚本，**不能添加 `NEXT_PUBLIC_` 前缀，也不能提交 Git**：

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'
$env:SUPABASE_SERVICE_ROLE_KEY='your-server-only-key'
node scripts/seed-supabase.mjs
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
```

6. 重启/重新构建网站，在“我的”注册并登录。不同设备使用同一账号。

本机模式记录与账号记录分开保存。登录后在“我的”点击“将此设备的本机模式记录复制到账号”，才会显式导入；原始本机数据保留。不要通过复制浏览器存储的方式切换账号。

### Schema 与权限

公共内容表：`subjects`、`chapters`、`sops`。账号表：`profiles`。

`user_records` 是统一离线同步表，使用 `(user_id, kind, id)` 主键、JSON payload、revision、更新时间和删除标记。提供 `user_sop_progress`、`notes`、`bookmarks`、`bookmark_folders`、`mistakes`、`mistake_images`、`review_history` 类型视图。视图使用 `security_invoker`，继承底层 RLS；它们不是另一套重复数据。

所有私人数据与 Storage 路径都限制为 `auth.uid()`；私有图片桶 `private-images` 非公开，限制 15 MB 和允许的图片 MIME。前端同时验证文件签名并限制类型、体积。客户端没有修改管理员权限的授权。

同步先上传图片，再上传记录。每个事务检查上一版 revision；遇到另一设备修改，保留独立冲突副本，笔记页可展开查看另一版。远端下行不覆盖未同步本机编辑。图片 URL 是本地 Blob URL，不公开永久访问链接。

权限规则参照 [Supabase RLS 文档](https://supabase.com/docs/guides/database/postgres/row-level-security) 与 [Storage 访问控制](https://supabase.com/docs/guides/storage/security/access-control)。

### 管理员

先注册账号，再由项目所有者在 SQL Editor 执行（替换成真实用户 UUID）：

```sql
update public.profiles set is_admin = true where id = 'YOUR_USER_UUID';
```

登录该账号进入 `/admin`。支持科目查看、章节新增/编辑、SOP JSON 编辑、新建内容草稿、频次/关键词修改、正文及 Markdown/LaTeX 预览。非管理员界面不提供编辑器，数据库写入仍由 RLS 独立拦截。

编辑时同时维护 `blocks` 和 `sections`，前者用于原文预览与导出，后者用于分节阅读。默认 100 个 SOP 的这两部分由导入器生成。

管理员保存到云端后，已登录的阅读页和目录优先使用云端内容。本地模式继续使用发布时的 Word 静态包。当前五个建设中科目的前端仍保持建设中；可以在后台提前组织未来内容。

## 离线、安装与备份

Service Worker 只在生产构建注册。第一次在线打开后缓存 App 资源，已打开 SOP 单独缓存。完整 100 篇不会在首页一次性下载。

离线时笔记、错题字段和图片写入 IndexedDB，恢复网络且应用打开时继续同步。关闭网页期间不承诺后台上传。浏览器存储配额不足会显示失败，而不是伪造“已保存”。

手机浏览器使用“添加到主屏幕”，Manifest 提供 192/512 图标、独立窗口和主题色。参考 [Next.js PWA 文档](https://nextjs.org/docs/app/guides/progressive-web-apps)。

在“我的”导出 JSON 备份，包含所有记录与已缓存图片。导入不会覆盖已有记录，同 ID 保留副本；关联图片和错题 ID 会重新映射。清除浏览器网站数据前先备份。云端尚未下载的图片需要先联网打开再导出。

## 测试

```bash
npm run typecheck
npm test
py -m unittest discover -s tests -p "test_*.py"
npx playwright install chromium
npm run build
npm run test:e2e
```

Linux/macOS 用 `python3` 替代 `py`。

覆盖：真实源导入与频次、原文表格完整性、搜索归一化、学习状态、错题组合筛选、旧题抽取、账号数据隔离、快速输入、上传确认竞态、dirty 数据保护、图片存储、损坏备份拒绝、恢复不覆盖。

Playwright 使用生产服务：数学→函数→收藏→笔记；上传→裁剪→SOP→刷新；相关错题→重做→已解决；题型判断；375/430/768/1440 布局；断网重载和离线笔记；后台权限入口。

真实 Auth/云同步测试默认跳过。接入**测试项目**后设置 `TEST_EMAIL` / `TEST_PASSWORD` 并运行 `tests/e2e/cloud.spec.ts`。上线前另用两个账号核验跨用户 SELECT/UPDATE、Storage 下载、管理员写入和两设备离线冲突，不能用本地测试替代真实云验收。

## 部署到 Vercel

1. 在 Vercel 导入 GitHub 仓库 `Chu-Junjie/chuminyuan`，Framework Preset 选择 Next.js。
2. 默认 Install `npm ci`、Build `npm run build`，不更改输出目录。
3. 需要云同步时添加两个 `NEXT_PUBLIC_SUPABASE_*` 环境变量；不要把 service role 放入 Vercel 前端配置。
4. 部署后将 HTTPS 域名加入 Supabase Site URL / Redirect URLs，重新验证注册邮件、登录和私有图片。
5. 每次更新离线包变更 `public/sw.js` 的缓存版本；旧缓存按版本清理，IndexedDB 用户数据不删除。

本次交付是可运行源码和 Git 提交；没有创建或绑定用户的 Vercel/Supabase 云项目。

## 已知边界与后续

- HEIC 使用 `heic2any` 转换并保留原图，需在实际 iPhone 图片与目标浏览器补做兼容测试。
- 题型判断是本地规则检索，不声称 AI 识题。AI 仅预留类型接口，没有模型调用。
- 本地模式无需登录，但数据仅限此浏览器；云登录需用户提供的 Supabase 配置。
- Phase 2 再做知识卡、XP、舞台与更完整后台同步；Phase 3 再考虑 AI 和其他学科教学内容。

## 英语资料导入

英语来源为 `Jiangsu_Gaokao_English_SOP_Final.pdf`。入口 `/subjects/english/`，数据为 `public/data/english/`，内容文件为 `public/data/sops/EN-*.json`。数学导入器和数学原始目录保持独立，界面会合并两科目录，避免重新导入数学覆盖英语。

重新导入需要 Python 和 pdfplumber：

```powershell
python scripts/import-english-pdf.py 'D:\桌面\Jiangsu_Gaokao_English_SOP_Final.pdf'
```

导入器按页面坐标拆分双栏、保留表格，输出完整逐页文本、原始内容块、全文索引和带 SHA-256 的导入报告。原 PDF 随平台保存在 `public/source/`，每篇可以按页回查。

- 听力练习为文字逻辑/识别训练，没有听力音频；词汇模块是用法与范围索引，不是完整 3100 词逐词题库。
- 资料中的考试结构说明保留来源日期，不作为平台对未来考试结构的独立确认。
- 原书 GF 部分误用了七选五草稿与纠错标签，页面显示勘误提示；平台错因使用第 128 页语法代码。
- 原书两项使用同一编号 8.17，均完整保留，以 `EN-8-17` / `EN-8-17-2` 区分。
- `npm test` 包含英语源完整性测试；`npx playwright test tests/e2e/english.spec.ts` 验证英语学习闭环和移动端。
- Supabase 种子脚本支持两科章节和 158 个正式 SOP；无星级的工具资料保留为本地随包资源。没有执行远端数据库更新或部署。
