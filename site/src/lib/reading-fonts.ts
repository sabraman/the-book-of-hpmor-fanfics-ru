type FontOption = {
  readonly value: string
  readonly label: string
}

type FontGroup = {
  readonly label: string
  readonly options: readonly FontOption[]
}

export const FONT_GROUPS = [
  {
    label: "Sans",
    options: [
      { value: "geist", label: "Geist" },
      { value: "inter", label: "Inter" },
      { value: "noto-sans", label: "Noto Sans" },
      { value: "nunito-sans", label: "Nunito Sans" },
      { value: "figtree", label: "Figtree" },
      { value: "roboto", label: "Roboto" },
      { value: "raleway", label: "Raleway" },
      { value: "dm-sans", label: "DM Sans" },
      { value: "public-sans", label: "Public Sans" },
      { value: "outfit", label: "Outfit" },
      { value: "oxanium", label: "Oxanium" },
      { value: "manrope", label: "Manrope" },
      { value: "space-grotesk", label: "Space Grotesk" },
      { value: "montserrat", label: "Montserrat" },
      { value: "ibm-plex-sans", label: "IBM Plex Sans" },
      { value: "source-sans-3", label: "Source Sans 3" },
      { value: "instrument-sans", label: "Instrument Sans" },
    ],
  },
  {
    label: "Serif",
    options: [
      { value: "noto-serif", label: "Noto Serif" },
      { value: "roboto-slab", label: "Roboto Slab" },
      { value: "merriweather", label: "Merriweather" },
      { value: "lora", label: "Lora" },
      { value: "playfair-display", label: "Playfair Display" },
    ],
  },
  {
    label: "Mono",
    options: [
      { value: "geist-mono", label: "Geist Mono" },
      { value: "jetbrains-mono", label: "JetBrains Mono" },
    ],
  },
] as const satisfies readonly FontGroup[]

export type ReadingFont = (typeof FONT_GROUPS)[number]["options"][number]["value"]
export type ReadingFontOption = {
  readonly value: ReadingFont
  readonly label: string
}

export const DEFAULT_READING_FONT: ReadingFont = "noto-serif"

export const ALL_READING_FONTS: readonly ReadingFontOption[] = FONT_GROUPS.reduce<ReadingFontOption[]>(
  (allFonts, group) => {
    allFonts.push(...group.options)
    return allFonts
  },
  [],
)

export function isReadingFont(value: string): value is ReadingFont {
  return ALL_READING_FONTS.some((font) => font.value === value)
}
