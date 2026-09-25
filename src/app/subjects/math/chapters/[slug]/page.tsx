import { Learn } from "@/components/learn";
import chapters from "../../../../../../public/data/chapters.json";

export function generateStaticParams() {
  return chapters.map((chapter) => ({ slug: chapter.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <Learn chapterId={(await params).slug} />;
}
