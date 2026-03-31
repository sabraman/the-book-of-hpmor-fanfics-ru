"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  DEFAULT_READING_FONT,
  isReadingFont,
  type ReadingFont,
} from "@/lib/reading-fonts"

const STORAGE_KEY = "reader-font"
const FONT_SCALE_STORAGE_KEY = "reader-font-scale"
const LINE_HEIGHT_STORAGE_KEY = "reader-line-height"
const TEXT_ALIGN_STORAGE_KEY = "reader-text-align"
const FONT_SCALE_STEPS = [0.84, 1, 1.16, 1.34] as const
const DEFAULT_FONT_SCALE_INDEX = 1
const LINE_HEIGHT_STEPS = [1.55, 1.92, 2.35] as const
const DEFAULT_LINE_HEIGHT_INDEX = 1
const TEXT_ALIGN_OPTIONS = ["left", "justify"] as const
const DEFAULT_TEXT_ALIGN = "left"

type ReaderTextAlign = (typeof TEXT_ALIGN_OPTIONS)[number]

type FontContextValue = {
  font: ReadingFont
  setFont: (font: ReadingFont) => void
  canDecreaseFontScale: boolean
  canIncreaseFontScale: boolean
  decreaseFontScale: () => void
  increaseFontScale: () => void
  canDecreaseLineHeight: boolean
  canIncreaseLineHeight: boolean
  decreaseLineHeight: () => void
  increaseLineHeight: () => void
  textAlign: ReaderTextAlign
  setTextAlign: (textAlign: ReaderTextAlign) => void
}

const FontContext = createContext<FontContextValue | null>(null)

function applyFont(font: ReadingFont) {
  document.documentElement.dataset.readingFont = font
}

function applyFontScale(scale: number) {
  document.documentElement.style.setProperty("--reader-font-scale", String(scale))
}

function applyLineHeight(lineHeight: number) {
  document.documentElement.style.setProperty("--reader-line-height", String(lineHeight))
  document.documentElement.style.setProperty(
    "--reader-flow-space",
    `calc(${(lineHeight * 0.9).toFixed(2)}rem * var(--reader-font-scale))`,
  )
}

function applyTextAlign(textAlign: ReaderTextAlign) {
  document.documentElement.dataset.readerTextAlign = textAlign
}

function getStoredFont(): ReadingFont {
  if (typeof window === "undefined") {
    return DEFAULT_READING_FONT
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (stored && isReadingFont(stored)) {
    return stored
  }

  return DEFAULT_READING_FONT
}

function getStoredFontScaleIndex(): number {
  if (typeof window === "undefined") {
    return DEFAULT_FONT_SCALE_INDEX
  }

  const stored = window.localStorage.getItem(FONT_SCALE_STORAGE_KEY)
  const parsed = stored ? Number.parseInt(stored, 10) : Number.NaN

  if (Number.isInteger(parsed) && parsed >= 0 && parsed < FONT_SCALE_STEPS.length) {
    return parsed
  }

  return DEFAULT_FONT_SCALE_INDEX
}

function getStoredLineHeightIndex(): number {
  if (typeof window === "undefined") {
    return DEFAULT_LINE_HEIGHT_INDEX
  }

  const stored = window.localStorage.getItem(LINE_HEIGHT_STORAGE_KEY)
  const parsed = stored ? Number.parseInt(stored, 10) : Number.NaN

  if (Number.isInteger(parsed) && parsed >= 0 && parsed < LINE_HEIGHT_STEPS.length) {
    return parsed
  }

  return DEFAULT_LINE_HEIGHT_INDEX
}

function isReaderTextAlign(value: string): value is ReaderTextAlign {
  return TEXT_ALIGN_OPTIONS.includes(value as ReaderTextAlign)
}

function getStoredTextAlign(): ReaderTextAlign {
  if (typeof window === "undefined") {
    return DEFAULT_TEXT_ALIGN
  }

  const stored = window.localStorage.getItem(TEXT_ALIGN_STORAGE_KEY)

  if (stored && isReaderTextAlign(stored)) {
    return stored
  }

  return DEFAULT_TEXT_ALIGN
}

export function FontProvider({ children }: { children: ReactNode }) {
  const [font, setFontState] = useState<ReadingFont>(getStoredFont)
  const [fontScaleIndex, setFontScaleIndex] = useState<number>(getStoredFontScaleIndex)
  const [lineHeightIndex, setLineHeightIndex] = useState<number>(getStoredLineHeightIndex)
  const [textAlign, setTextAlignState] = useState<ReaderTextAlign>(getStoredTextAlign)

  useEffect(() => {
    applyFont(font)
  }, [font])

  useEffect(() => {
    applyFontScale(FONT_SCALE_STEPS[fontScaleIndex])
  }, [fontScaleIndex])

  useEffect(() => {
    applyLineHeight(LINE_HEIGHT_STEPS[lineHeightIndex])
  }, [lineHeightIndex])

  useEffect(() => {
    applyTextAlign(textAlign)
  }, [textAlign])

  const value = useMemo<FontContextValue>(
    () => ({
      font,
      setFont: (nextFont) => {
        setFontState(nextFont)
        window.localStorage.setItem(STORAGE_KEY, nextFont)
        applyFont(nextFont)
      },
      canDecreaseFontScale: fontScaleIndex > 0,
      canIncreaseFontScale: fontScaleIndex < FONT_SCALE_STEPS.length - 1,
      decreaseFontScale: () => {
        setFontScaleIndex((currentIndex) => {
          const nextIndex = Math.max(0, currentIndex - 1)
          window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(nextIndex))
          applyFontScale(FONT_SCALE_STEPS[nextIndex])
          return nextIndex
        })
      },
      increaseFontScale: () => {
        setFontScaleIndex((currentIndex) => {
          const nextIndex = Math.min(FONT_SCALE_STEPS.length - 1, currentIndex + 1)
          window.localStorage.setItem(FONT_SCALE_STORAGE_KEY, String(nextIndex))
          applyFontScale(FONT_SCALE_STEPS[nextIndex])
          return nextIndex
        })
      },
      canDecreaseLineHeight: lineHeightIndex > 0,
      canIncreaseLineHeight: lineHeightIndex < LINE_HEIGHT_STEPS.length - 1,
      decreaseLineHeight: () => {
        setLineHeightIndex((currentIndex) => {
          const nextIndex = Math.max(0, currentIndex - 1)
          window.localStorage.setItem(LINE_HEIGHT_STORAGE_KEY, String(nextIndex))
          applyLineHeight(LINE_HEIGHT_STEPS[nextIndex])
          return nextIndex
        })
      },
      increaseLineHeight: () => {
        setLineHeightIndex((currentIndex) => {
          const nextIndex = Math.min(LINE_HEIGHT_STEPS.length - 1, currentIndex + 1)
          window.localStorage.setItem(LINE_HEIGHT_STORAGE_KEY, String(nextIndex))
          applyLineHeight(LINE_HEIGHT_STEPS[nextIndex])
          return nextIndex
        })
      },
      textAlign,
      setTextAlign: (nextTextAlign) => {
        setTextAlignState(nextTextAlign)
        window.localStorage.setItem(TEXT_ALIGN_STORAGE_KEY, nextTextAlign)
        applyTextAlign(nextTextAlign)
      },
    }),
    [font, fontScaleIndex, lineHeightIndex, textAlign],
  )

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>
}

export function useReadingFont() {
  const context = useContext(FontContext)

  if (!context) {
    throw new Error("useReadingFont must be used within FontProvider")
  }

  return context
}
