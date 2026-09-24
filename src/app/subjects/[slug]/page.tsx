import { notFound } from "next/navigation";
import Link from "next/link";
import { subjects } from "@/lib/catalog";
import { Learn } from "@/components/learn";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const subject = subjects.find((s) => s.id === slug);
  if (!subject) notFound();
  if (slug === "math") return <Learn />;
  return (
    <div className="empty construction">
      <span className="subject-symbol">{subject.symbol}</span>
      <h1>{subject.name}练习室</h1>
      <h2>🚧 内容建设中</h2>
      <p>这里会慢慢长出新的知识。现在可以先把这科的错题记录下来。</p>
      <Link className="button primary" href={`/mistakes/new?subject=${slug}`}>
        记录一道{subject.name}错题
      </Link>
      <Link href="/">回到首页</Link>
    </div>
  );
}
