import { notFound, redirect } from "next/navigation";

import { chapters, getChapterBySlug } from "@/lib/chapters";

export const dynamicParams = false;

export function generateStaticParams() {
  return chapters.map((chapter) => ({ slug: chapter.slug }));
}

export default async function LegacyChapterRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const chapter = getChapterBySlug(slug);

  if (!chapter) {
    notFound();
  }

  redirect(chapter.href);
}
