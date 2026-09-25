"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MistakeReview } from "@/components/mistake-review";
import { Loading } from "@/components/ui";

function Review() {
  const id = useSearchParams().get("id");
  return id ? <MistakeReview id={id} /> : <Loading error="没有找到这道错题" />;
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Review />
    </Suspense>
  );
}
