import { notFound } from "next/navigation";
import { SopReader } from "@/components/sop-reader";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[A-Za-z0-9-]{3,80}$/.test(id)) notFound();
  return <SopReader key={id} id={id} />;
}
