import { MistakeEditor } from "@/components/mistake-editor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <MistakeEditor id={(await params).id} />;
}
