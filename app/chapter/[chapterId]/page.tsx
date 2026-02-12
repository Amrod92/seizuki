"use client";

import { useParams } from "next/navigation";
import { ChapterReader } from "@/components/chapter-reader";
import { SiteShell } from "@/components/site-shell";

export default function ChapterPage() {
  const params = useParams<{ chapterId: string }>();

  return (
    <SiteShell hideFooter>
      <ChapterReader key={params.chapterId} chapterId={params.chapterId} />
    </SiteShell>
  );
}
