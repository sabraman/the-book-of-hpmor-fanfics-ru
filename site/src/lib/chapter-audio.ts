export const CHAPTER_AUDIO_DIRECTORY = "chapter-audio";
export const CHAPTER_AUDIO_ALIGNMENT_SUFFIX = ".alignment.json";
export const CHAPTER_AUDIO_METADATA_SUFFIX = ".meta.json";
export const CHAPTER_AUDIO_OUTPUT_FORMAT = "mp3_44100_128";
export const CHAPTER_AUDIO_DEFAULT_MODEL_ID = "eleven_multilingual_v2";
export const CHAPTER_AUDIO_DEFAULT_LANGUAGE_CODE = "ru";

export type ChapterAudioMeta = {
  src: string;
  alignmentSrc: string;
  voiceId: string;
  modelId: string;
  contentHash: string;
};

export function getChapterAudioPaths(slug: string) {
  return {
    src: `/${CHAPTER_AUDIO_DIRECTORY}/${slug}.mp3`,
    alignmentSrc: `/${CHAPTER_AUDIO_DIRECTORY}/${slug}${CHAPTER_AUDIO_ALIGNMENT_SUFFIX}`,
    metadataSrc: `/${CHAPTER_AUDIO_DIRECTORY}/${slug}${CHAPTER_AUDIO_METADATA_SUFFIX}`,
  };
}

function stripInlineFormatting(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<a\b[^>]*>(.*?)<\/a>/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1");
}

export function extractPlainTextFromMarkdown(markdown: string) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const output: string[] = [];
  let inCodeFence = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence;
      continue;
    }

    if (inCodeFence) {
      continue;
    }

    if (!trimmed) {
      if (output.at(-1) !== "") {
        output.push("");
      }
      continue;
    }

    let line = rawLine
      .replace(/^#{1,6}\s+/u, "")
      .replace(/^>\s?/u, "")
      .replace(/^\s*[-*+]\s+/u, "")
      .replace(/^\s*\d+\.\s+/u, "")
      .replace(/<br\s*\/?>/giu, "\n")
      .replace(/<\/?[^>]+>/g, "");

    line = stripInlineFormatting(line).replace(/\s+/g, " ").trim();

    if (!line) {
      continue;
    }

    output.push(line);
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function createChapterAudioCatalogModule(
  entries: Record<string, ChapterAudioMeta>,
) {
  return `import type { ChapterAudioMeta } from "@/lib/chapter-audio";

export const chapterAudioBySlug: Record<string, ChapterAudioMeta> = ${JSON.stringify(entries, null, 2)} as const;
`;
}
