import { DEFAULT_READING_FONT } from "@/lib/reading-fonts"

export const READER_THEME_STORAGE_KEY = "reader-theme"
export const READER_FONT_STORAGE_KEY = "reader-font"
export const READER_FONT_SCALE_STORAGE_KEY = "reader-font-scale"
export const READER_LINE_HEIGHT_STORAGE_KEY = "reader-line-height"
export const READER_TEXT_ALIGN_STORAGE_KEY = "reader-text-align"

export const FONT_SCALE_STEPS = [0.72, 0.88, 1, 1.18, 1.42] as const
export const DEFAULT_FONT_SCALE_INDEX = 2

export const LINE_HEIGHT_STEPS = [1.3, 1.62, 1.92, 2.28, 2.72] as const
export const DEFAULT_LINE_HEIGHT_INDEX = 2

export const TEXT_ALIGN_OPTIONS = ["left", "justify"] as const
export const DEFAULT_TEXT_ALIGN = "left"

export function getReaderSettingsInlineScript() {
  return `(() => {
    try {
      const doc = document.documentElement;
      const storage = window.localStorage;

      const font = storage.getItem(${JSON.stringify(READER_FONT_STORAGE_KEY)}) || ${JSON.stringify(DEFAULT_READING_FONT)};
      doc.dataset.readingFont = font;

      const fontScaleSteps = ${JSON.stringify(FONT_SCALE_STEPS)};
      const fontScaleIndex = Number.parseInt(storage.getItem(${JSON.stringify(READER_FONT_SCALE_STORAGE_KEY)}) || "", 10);
      const safeFontScaleIndex =
        Number.isInteger(fontScaleIndex) && fontScaleIndex >= 0 && fontScaleIndex < fontScaleSteps.length
          ? fontScaleIndex
          : ${DEFAULT_FONT_SCALE_INDEX};
      doc.style.setProperty("--reader-font-scale", String(fontScaleSteps[safeFontScaleIndex]));

      const lineHeightSteps = ${JSON.stringify(LINE_HEIGHT_STEPS)};
      const lineHeightIndex = Number.parseInt(storage.getItem(${JSON.stringify(READER_LINE_HEIGHT_STORAGE_KEY)}) || "", 10);
      const safeLineHeightIndex =
        Number.isInteger(lineHeightIndex) && lineHeightIndex >= 0 && lineHeightIndex < lineHeightSteps.length
          ? lineHeightIndex
          : ${DEFAULT_LINE_HEIGHT_INDEX};
      const lineHeight = lineHeightSteps[safeLineHeightIndex];
      doc.style.setProperty("--reader-line-height", String(lineHeight));
      doc.style.setProperty("--reader-flow-space", "calc(" + lineHeight.toFixed(2) + "rem * 0.9 * var(--reader-font-scale))");

      const textAlign = storage.getItem(${JSON.stringify(READER_TEXT_ALIGN_STORAGE_KEY)});
      doc.dataset.readerTextAlign = ${JSON.stringify(DEFAULT_TEXT_ALIGN)};
      if (${JSON.stringify(TEXT_ALIGN_OPTIONS)}.includes(textAlign)) {
        doc.dataset.readerTextAlign = textAlign;
      }
    } catch (_error) {}
  })();`
}
