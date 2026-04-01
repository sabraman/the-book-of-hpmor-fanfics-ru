import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
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

type BookConfig = {
  translated_story_titles?: Record<string, string>;
};

type BookMeta = {
  id: string;
  slug: string;
  href: string;
  title: string;
  originalTitle: string;
  order: number;
  readableChapterCount: number;
  totalChapterCount: number;
  translatedSegmentCount: number;
};

type ChapterMeta = {
  bookId: string;
  bookSlug: string;
  slug: string;
  href: string;
  order: number;
  orderWithinBook: number;
  reviewStatus: string;
  title: string;
  originalTitle: string;
};

type ReadableTarget = {
  bookSlug: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(siteRoot, "..");
const bookRoot = path.join(repoRoot, "books", "various-muggles");
const manifestPath = path.join(bookRoot, "manifest.json");
const assetsRoot = path.join(bookRoot, "assets");
const sourceRoot = path.join(repoRoot, "src", "en");
const generatedContentRoot = path.join(siteRoot, "src", "content", "chapters");
const generatedLibRoot = path.join(siteRoot, "src", "lib", "generated");
const publicAssetsRoot = path.join(siteRoot, "public", "book-assets");
const configPath = path.join(bookRoot, "config.json");

const IGNORED_FILES = new Set(["cover.xhtml", "toc.xhtml", "titlepage.xhtml"]);

function escapeImportPath(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("`", "\\`");
}

function normalizeLineEndings(value: string) {
  return value.replaceAll("\r\n", "\n");
}

function stripBookNumberPrefix(value: string) {
  return value.replace(/^\d+\.\s*/, "").trim();
}

function slugify(value: string) {
  return stripBookNumberPrefix(value)
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractStorySourceIndex(segments: Segment[]) {
  for (const segment of segments) {
    const match = /^(\d+)\//.exec(segment.original_path);

    if (match) {
      return Number.parseInt(match[1], 10);
    }
  }

  return null;
}

async function readOpfBookTitle(storySourceIndex: number | null) {
  if (storySourceIndex === null) {
    return null;
  }

  const opfPath = path.join(sourceRoot, String(storySourceIndex), "content.opf");

  if (!(await fileExists(opfPath))) {
    return null;
  }

  const raw = await readFile(opfPath, "utf8");
  const match = raw.match(/<dc:title>([\s\S]*?)<\/dc:title>/);

  return match?.[1]?.trim() ?? null;
}

function toChapterHref(target: string, readableTargets: Map<string, ReadableTarget>) {
  const match = /^#(seg-\d{4})(.*)$/.exec(target);

  if (!match) {
    return null;
  }

  const [, segmentId, suffix] = match;
  const readableTarget = readableTargets.get(segmentId);

  if (!readableTarget) {
    return null;
  }

  return `/books/${readableTarget.bookSlug}/chapters/${segmentId}${suffix}`;
}

function rewriteLinks(markdown: string, readableTargets: Map<string, ReadableTarget>) {
  let result = markdown;

  result = result.replace(
    /\[([^\]]+)\]\((#seg-\d{4}[^)]*)\)/g,
    (_match, label: string, target: string) => {
      const href = toChapterHref(target, readableTargets);
      return href ? `[${label}](${href})` : label;
    },
  );

  result = result.replace(
    /<a\b([^>]*?)href="(#seg-\d{4}[^"]*)"([^>]*)>(.*?)<\/a>/g,
    (_match, before: string, target: string, after: string, label: string) => {
      const href = toChapterHref(target, readableTargets);
      return href ? `<a${before}href="${href}"${after}>${label}</a>` : label;
    },
  );

  result = result.replace(/\]\(assets\/([^)]+)\)/g, "](/book-assets/$1)");
  result = result.replace(/src="assets\/([^"]+)"/g, 'src="/book-assets/$1"');

  return result;
}

function normalizeDecorativeSeparators(markdown: string) {
  return markdown.replace(/^\/\\\*(?:\/\\\*){4,}$/gm, "---");
}

function sanitizeMarkdown(markdown: string, readableTargets: Map<string, ReadableTarget>) {
  let result = normalizeLineEndings(markdown).trim();

  result = result.replace(/^<span id="[^"]+"><\/span>\n+/m, "");
  result = result
    .split("\n")
    .filter((line) => !/^<\/?div\b[^>]*>$/.test(line.trim()))
    .join("\n");
  result = result.replace(/\sclass="[^"]*calibre[^"]*"/g, "");
  result = normalizeDecorativeSeparators(result);
  result = rewriteLinks(result, readableTargets);
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

  const config = (await fileExists(configPath))
    ? (JSON.parse(await readFile(configPath, "utf8")) as BookConfig)
    : {};
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const translatedStoryTitles = config.translated_story_titles ?? {};

  await rm(generatedContentRoot, { recursive: true, force: true });
  await rm(generatedLibRoot, { recursive: true, force: true });
  await rm(publicAssetsRoot, { recursive: true, force: true });

  await mkdir(generatedContentRoot, { recursive: true });
  await mkdir(generatedLibRoot, { recursive: true });
  await mkdir(path.dirname(publicAssetsRoot), { recursive: true });

  const storySegments = new Map<string, Segment[]>();

  for (const segment of manifest.segments) {
    const segments = storySegments.get(segment.story_id) ?? [];
    segments.push(segment);
    storySegments.set(segment.story_id, segments);
  }

  const totalChapterCountByStory = new Map<string, number>();
  const translatedSegments: Segment[] = [];
  const translatedSegmentCountByStory = new Map<string, number>();

  for (const segment of manifest.segments) {
    const basename = path.posix.basename(segment.original_path);

    if (IGNORED_FILES.has(basename)) {
      continue;
    }

    totalChapterCountByStory.set(
      segment.story_id,
      (totalChapterCountByStory.get(segment.story_id) ?? 0) + 1,
    );

    const outputPath = path.join(bookRoot, segment.output_file);

    if (!(await fileExists(outputPath))) {
      continue;
    }

    const raw = await readFile(outputPath, "utf8");

    if (!raw.trim()) {
      continue;
    }

    translatedSegments.push(segment);
    translatedSegmentCountByStory.set(
      segment.story_id,
      (translatedSegmentCountByStory.get(segment.story_id) ?? 0) + 1,
    );
  }

  const readableChapterCountByStory = new Map<string, number>();

  for (const segment of translatedSegments) {
    readableChapterCountByStory.set(
      segment.story_id,
      (readableChapterCountByStory.get(segment.story_id) ?? 0) + 1,
    );
  }

  const books: BookMeta[] = [];
  const bookSlugById = new Map<string, string>();

  for (const [storyId, segments] of storySegments) {
    const order = Math.min(...segments.map((segment) => segment.order));
    const originalTitle =
      storyId === "frontmatter"
        ? "Preface"
        : stripBookNumberPrefix(
            (await readOpfBookTitle(extractStorySourceIndex(segments))) ?? storyId,
          );
    const translatedTitle = translatedStoryTitles[storyId]?.trim();
    const title = translatedTitle || originalTitle;
    const slug = storyId === "frontmatter" ? "preface" : slugify(originalTitle) || storyId;
    const readableChapterCount = readableChapterCountByStory.get(storyId) ?? 0;
    const translatedSegmentCount = translatedSegmentCountByStory.get(storyId) ?? 0;
    const totalChapterCount = totalChapterCountByStory.get(storyId) ?? 0;

    if ((readableChapterCount > 0 || translatedSegmentCount > 0) && !translatedTitle) {
      throw new Error(
        `Missing translated story title for ${storyId}. Add it to books/various-muggles/config.json under translated_story_titles before syncing reader content.`,
      );
    }

    const book: BookMeta = {
      id: storyId,
      slug,
      href: `/books/${slug}`,
      title,
      originalTitle,
      order,
      readableChapterCount,
      totalChapterCount,
      translatedSegmentCount,
    };

    books.push(book);
    bookSlugById.set(storyId, slug);
  }

  books.sort((left, right) => left.order - right.order);

  const readableTargets = new Map<string, ReadableTarget>();

  for (const segment of translatedSegments) {
    const bookSlug = bookSlugById.get(segment.story_id);

    if (bookSlug) {
      readableTargets.set(segment.id, { bookSlug });
    }
  }

  const readableChapters: ChapterMeta[] = [];
  const chapterOrderWithinBook = new Map<string, number>();

  for (const segment of translatedSegments) {
    const outputPath = path.join(bookRoot, segment.output_file);
    const raw = await readFile(outputPath, "utf8");
    const sanitized = sanitizeMarkdown(raw, readableTargets);
    const title = extractTitle(sanitized, segment.title ?? segment.id);
    const targetFile = path.join(generatedContentRoot, `${segment.id}.mdx`);
    const bookSlug = bookSlugById.get(segment.story_id);

    if (!bookSlug) {
      continue;
    }

    await writeFile(targetFile, sanitized, "utf8");

    const orderWithinBook = (chapterOrderWithinBook.get(segment.story_id) ?? 0) + 1;
    chapterOrderWithinBook.set(segment.story_id, orderWithinBook);

    readableChapters.push({
      bookId: segment.story_id,
      bookSlug,
      slug: segment.id,
      href: `/books/${bookSlug}/chapters/${segment.id}`,
      order: segment.order,
      orderWithinBook,
      reviewStatus: segment.review_status ?? "unreviewed",
      title,
      originalTitle: segment.title ?? title,
    });
  }

  readableChapters.sort((left, right) => left.order - right.order);

  await cp(assetsRoot, publicAssetsRoot, { recursive: true });

  const generated = `export type BookMeta = {
  id: string;
  slug: string;
  href: string;
  title: string;
  originalTitle: string;
  order: number;
  readableChapterCount: number;
  totalChapterCount: number;
  translatedSegmentCount: number;
};

export type ChapterMeta = {
  bookId: string;
  bookSlug: string;
  slug: string;
  href: string;
  order: number;
  orderWithinBook: number;
  reviewStatus: string;
  title: string;
  originalTitle: string;
};

export const stats = {
  totalSegmentCount: ${manifest.segment_count},
  translatedSegmentCount: ${translatedSegments.length},
  readableChapterCount: ${readableChapters.length},
  readableBookCount: ${books.filter((book) => book.id !== "frontmatter" && book.readableChapterCount > 0).length},
} as const;

export const books: BookMeta[] = ${JSON.stringify(books, null, 2)} as BookMeta[];

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

  await writeFile(path.join(generatedLibRoot, "catalog.ts"), generated, "utf8");

  console.log(`Generated ${books.length} book record(s).`);
  console.log(`Generated ${readableChapters.length} readable MDX file(s).`);
  console.log(`Copied assets to ${publicAssetsRoot}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
