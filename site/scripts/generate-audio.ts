import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

import { chapters } from "../src/lib/generated/catalog";
import {
  CHAPTER_AUDIO_DEFAULT_LANGUAGE_CODE,
  CHAPTER_AUDIO_DEFAULT_MODEL_ID,
  CHAPTER_AUDIO_DIRECTORY,
  CHAPTER_AUDIO_OUTPUT_FORMAT,
  CHAPTER_AUDIO_METADATA_SUFFIX,
  createChapterAudioCatalogModule,
  extractPlainTextFromMarkdown,
  getChapterAudioPaths,
  type ChapterAudioMeta,
} from "../src/lib/chapter-audio";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(scriptDir, "..");
const publicAudioRoot = path.join(siteRoot, "public", CHAPTER_AUDIO_DIRECTORY);
const catalogFilePath = path.join(siteRoot, "src", "lib", "chapter-audio-catalog.ts");
const contentRoot = path.join(siteRoot, "src", "content", "chapters");

function fileExists(filePath: string) {
  return stat(filePath)
    .then(() => true)
    .catch(() => false);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let slug: string | null = null;
  let force = false;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--slug") {
      slug = args[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (value === "--force") {
      force = true;
    }
  }

  return { slug, force };
}

function buildContentHash(input: {
  text: string;
  voiceId: string;
  modelId: string;
  languageCode: string;
  outputFormat: string;
}) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

async function readStoredMetadata() {
  const entries: Record<string, ChapterAudioMeta> = {};

  if (!(await fileExists(publicAudioRoot))) {
    return entries;
  }

  const files = await readdir(publicAudioRoot);

  for (const fileName of files) {
    if (!fileName.endsWith(CHAPTER_AUDIO_METADATA_SUFFIX)) {
      continue;
    }

    const slug = fileName.slice(0, -CHAPTER_AUDIO_METADATA_SUFFIX.length);
    const raw = await readFile(path.join(publicAudioRoot, fileName), "utf8");
    entries[slug] = JSON.parse(raw) as ChapterAudioMeta;
  }

  return entries;
}

async function writeCatalogModule() {
  const currentMetadata = await readStoredMetadata();
  const readableSlugs = new Set(chapters.map((chapter) => chapter.slug));
  const filteredEntries = Object.fromEntries(
    Object.entries(currentMetadata).filter(([slug]) => readableSlugs.has(slug)),
  );

  await writeFile(
    catalogFilePath,
    createChapterAudioCatalogModule(filteredEntries),
    "utf8",
  );

  return filteredEntries;
}

async function main() {
  const { slug, force } = parseArgs();
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  const modelId =
    process.env.ELEVENLABS_MODEL_ID ?? CHAPTER_AUDIO_DEFAULT_MODEL_ID;
  const languageCode =
    process.env.ELEVENLABS_LANGUAGE_CODE ?? CHAPTER_AUDIO_DEFAULT_LANGUAGE_CODE;

  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is required to generate chapter audio.");
  }

  if (!voiceId) {
    throw new Error("ELEVENLABS_VOICE_ID is required to generate chapter audio.");
  }

  const targetChapters = slug
    ? chapters.filter((chapter) => chapter.slug === slug)
    : chapters;

  if (slug && targetChapters.length === 0) {
    throw new Error(`Unknown chapter slug: ${slug}`);
  }

  await mkdir(publicAudioRoot, { recursive: true });
  const existingMetadata = await readStoredMetadata();
  const client = new ElevenLabsClient({ apiKey });

  let generatedCount = 0;
  let skippedCount = 0;

  for (const chapter of targetChapters) {
    const chapterPath = path.join(contentRoot, `${chapter.slug}.mdx`);
    const markdown = await readFile(chapterPath, "utf8");
    const text = extractPlainTextFromMarkdown(markdown);

    if (!text) {
      console.warn(`Skipped ${chapter.slug} because no plain text could be extracted.`);
      continue;
    }

    const contentHash = buildContentHash({
      text,
      voiceId,
      modelId,
      languageCode,
      outputFormat: CHAPTER_AUDIO_OUTPUT_FORMAT,
    });
    const paths = getChapterAudioPaths(chapter.slug);
    const audioFilePath = path.join(siteRoot, "public", paths.src.slice(1));
    const alignmentFilePath = path.join(
      siteRoot,
      "public",
      paths.alignmentSrc.slice(1),
    );
    const metadataFilePath = path.join(
      siteRoot,
      "public",
      paths.metadataSrc.slice(1),
    );
    const currentMetadata = existingMetadata[chapter.slug];
    const hasAllArtifacts =
      (await fileExists(audioFilePath)) &&
      (await fileExists(alignmentFilePath)) &&
      (await fileExists(metadataFilePath));

    if (
      !force &&
      hasAllArtifacts &&
      currentMetadata?.contentHash === contentHash &&
      currentMetadata.voiceId === voiceId &&
      currentMetadata.modelId === modelId
    ) {
      skippedCount += 1;
      continue;
    }

    console.log(`Generating audio for ${chapter.slug} (${chapter.title})...`);
    const response = await client.textToSpeech.convertWithTimestamps(voiceId, {
      text,
      modelId,
      languageCode,
      outputFormat: CHAPTER_AUDIO_OUTPUT_FORMAT,
    });

    const alignment = response.normalizedAlignment ?? response.alignment;

    if (!alignment) {
      throw new Error(`ElevenLabs returned no alignment for ${chapter.slug}`);
    }

    const metadata: ChapterAudioMeta = {
      src: paths.src,
      alignmentSrc: paths.alignmentSrc,
      voiceId,
      modelId,
      contentHash,
    };

    await writeFile(audioFilePath, Buffer.from(response.audioBase64, "base64"));
    await writeFile(`${alignmentFilePath}`, `${JSON.stringify(alignment, null, 2)}\n`, "utf8");
    await writeFile(metadataFilePath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    existingMetadata[chapter.slug] = metadata;
    generatedCount += 1;
  }

  const catalogEntries = await writeCatalogModule();

  console.log(`Generated audio for ${generatedCount} chapter(s).`);
  console.log(`Skipped ${skippedCount} unchanged chapter(s).`);
  console.log(
    `Updated audio catalog with ${Object.keys(catalogEntries).length} chapter(s).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
