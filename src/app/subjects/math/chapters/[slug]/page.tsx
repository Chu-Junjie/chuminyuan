import { Learn } from "@/components/learn";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return <Learn chapterId={(await params).slug} />;
}
