import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Segment = {
  id: string;
  order: number;
  story_id: string;
  original_path: string;
  output_file: string;
  review_status?: string;
  title?: string;
};

type Manifest = {
  segment_count: number;
  segments: Segment[];
};

type ChapterMeta = {
  slug: string;
  href: string;
  order: number;
  storyId: string;
  reviewStatus: string;
  title: string;
  originalTitle: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(siteRoot, "..");
const bookRoot = path.join(repoRoot, "books", "various-muggles");
const manifestPath = path.join(bookRoot, "manifest.json");
const outputRoot = path.join(bookRoot, "output");
const assetsRoot = path.join(bookRoot, "assets");
const generatedContentRoot = path.join(siteRoot, "src", "content", "chapters");
const generatedLibRoot = path.join(siteRoot, "src", "lib", "generated");
const publicAssetsRoot = path.join(siteRoot, "public", "book-assets");

const IGNORED_FILES = new Set(["cover.xhtml", "toc.xhtml", "titlepage.xhtml"]);

function escapeImportPath(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("`", "\\`");
}

function normalizeLineEndings(value: string) {
  return value.replaceAll("\r\n", "\n");
}

function toChapterHref(target: string, readableIds: Set<string>) {
  const match = /^#(seg-\d{4})(.*)$/.exec(target);

  if (!match) {
    return null;
  }

  const [, segmentId, suffix] = match;

  if (!readableIds.has(segmentId)) {
    return null;
  }

  return `/chapters/${segmentId}${suffix}`;
}

function rewriteLinks(markdown: string, readableIds: Set<string>) {
  let result = markdown;

  result = result.replace(
    /\[([^\]]+)\]\((#seg-\d{4}[^)]*)\)/g,
    (_match, label: string, target: string) => {
      const href = toChapterHref(target, readableIds);
      return href ? `[${label}](${href})` : label;
    },
  );

  result = result.replace(
    /<a\b([^>]*?)href="(#seg-\d{4}[^"]*)"([^>]*)>(.*?)<\/a>/g,
    (_match, before: string, target: string, after: string, label: string) => {
      const href = toChapterHref(target, readableIds);
      return href ? `<a${before}href="${href}"${after}>${label}</a>` : label;
    },
  );

  result = result.replace(/\]\(assets\/([^)]+)\)/g, "](/book-assets/$1)");
  result = result.replace(/src="assets\/([^"]+)"/g, 'src="/book-assets/$1"');

  return result;
}

function sanitizeMarkdown(markdown: string, readableIds: Set<string>) {
  let result = normalizeLineEndings(markdown).trim();

  result = result.replace(/^<span id="[^"]+"><\/span>\n+/m, "");
  result = result
    .split("\n")
    .filter((line) => !/^<\/?div\b[^>]*>$/.test(line.trim()))
    .join("\n");
  result = result.replace(/\sclass="[^"]*calibre[^"]*"/g, "");
  result = rewriteLinks(result, readableIds);
  result = result.replace(/\n{3,}/g, "\n\n");

  return `${result.trim()}\n`;
}

function extractTitle(markdown: string, fallback: string) {
  const match = markdown.match(/^#{1,2}\s+(.+)$/m);
  return match?.[1]?.trim() ?? fallback;
}

async function fileExists(targetPath: string) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await fileExists(manifestPath))) {
    console.log(`Skipped content sync because ${manifestPath} is not available.`);
    return;
  }

  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;

  await rm(generatedContentRoot, { recursive: true, force: true });
  await rm(generatedLibRoot, { recursive: true, force: true });
  await rm(publicAssetsRoot, { recursive: true, force: true });

  await mkdir(generatedContentRoot, { recursive: true });
  await mkdir(generatedLibRoot, { recursive: true });
  await mkdir(path.dirname(publicAssetsRoot), { recursive: true });

  const translatedSegments: Segment[] = [];

  for (const segment of manifest.segments) {
    const basename = path.posix.basename(segment.original_path);
    const outputPath = path.join(bookRoot, segment.output_file);

    if (IGNORED_FILES.has(basename)) {
      continue;
    }

    if (!(await fileExists(outputPath))) {
      continue;
    }

    const raw = await readFile(outputPath, "utf8");

    if (!raw.trim()) {
      continue;
    }

    translatedSegments.push(segment);
  }

  const readableIds = new Set(translatedSegments.map((segment) => segment.id));
  const readableChapters: ChapterMeta[] = [];

  for (const segment of translatedSegments) {
    const outputPath = path.join(bookRoot, segment.output_file);
    const raw = await readFile(outputPath, "utf8");
    const sanitized = sanitizeMarkdown(raw, readableIds);
    const title = extractTitle(sanitized, segment.title ?? segment.id);
    const targetFile = path.join(generatedContentRoot, `${segment.id}.mdx`);

    await writeFile(targetFile, sanitized, "utf8");

    readableChapters.push({
      slug: segment.id,
      href: `/chapters/${segment.id}`,
      order: segment.order,
      storyId: segment.story_id,
      reviewStatus: segment.review_status ?? "unreviewed",
      title,
      originalTitle: segment.title ?? title,
    });
  }

  readableChapters.sort((left, right) => left.order - right.order);

  await cp(assetsRoot, publicAssetsRoot, { recursive: true });

  const translatedFiles = await readdir(outputRoot);
  const translatedSegmentCount = translatedFiles.filter((name) => name.endsWith(".md")).length;

  const generated = `export type ChapterMeta = {
  slug: string;
  href: string;
  order: number;
  storyId: string;
  reviewStatus: string;
  title: string;
  originalTitle: string;
};

export const stats = {
  totalSegmentCount: ${manifest.segment_count},
  translatedSegmentCount: ${translatedSegmentCount},
  readableChapterCount: ${readableChapters.length},
} as const;

export const chapters: ChapterMeta[] = ${JSON.stringify(readableChapters, null, 2)} as ChapterMeta[];

export const chapterModules = {
${readableChapters
  .map(
    (chapter) =>
      `  "${chapter.slug}": () => import("@/content/chapters/${escapeImportPath(chapter.slug)}.mdx"),`,
  )
  .join("\n")}
} as const;
`;

  await writeFile(path.join(generatedLibRoot, "chapters.ts"), generated, "utf8");

  console.log(`Generated ${readableChapters.length} readable MDX file(s).`);
  console.log(`Copied assets to ${publicAssetsRoot}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
