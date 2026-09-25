import { notFound } from "next/navigation";
import { SopReader } from "@/components/sop-reader";
import catalog from "../../../../public/data/catalog.json";

import english from "../../../../public/data/english/catalog.json";

export function generateStaticParams() {
  return [...catalog, ...english].map((sop) => ({ id: sop.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (![...catalog, ...english].some((s) => s.id === id)) notFound();
  return <SopReader key={id} id={id} />;
}
