"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MistakeEditor } from "@/components/mistake-editor";
import { Loading } from "@/components/ui";

function Editor() {
  const id = useSearchParams().get("id");
  return id ? <MistakeEditor id={id} /> : <Loading error="没有找到这道错题" />;
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Editor />
    </Suspense>
  );
}
