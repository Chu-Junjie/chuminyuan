import { MistakeReview } from "@/components/mistake-review";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <MistakeReview id={(await params).id} />;
}
