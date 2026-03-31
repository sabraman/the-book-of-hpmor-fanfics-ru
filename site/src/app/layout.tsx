import type { Metadata } from "next";
import {
  DM_Sans,
  Figtree,
  Geist,
  Geist_Mono,
  IBM_Plex_Sans,
  Instrument_Sans,
  Inter,
  JetBrains_Mono,
  Lora,
  Manrope,
  Merriweather,
  Montserrat,
  Noto_Sans,
  Noto_Serif,
  Nunito_Sans,
  Outfit,
  Oxanium,
  Playfair_Display,
  Public_Sans,
  Raleway,
  Roboto,
  Roboto_Slab,
  Source_Sans_3,
  Space_Grotesk,
} from "next/font/google";
import { FontProvider } from "@/components/font-provider";
import { ThemeProvider } from "@/components/theme-provider";
import {
  getReaderSettingsInlineScript,
  READER_THEME_STORAGE_KEY,
} from "@/lib/reader-settings";
import "./globals.css";

const uiSans = IBM_Plex_Sans({
  variable: "--font-ui",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin", "cyrillic"] });
const notoSans = Noto_Sans({ variable: "--font-noto-sans", subsets: ["latin", "cyrillic"] });
const nunitoSans = Nunito_Sans({ variable: "--font-nunito-sans", subsets: ["latin", "cyrillic"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
});
const raleway = Raleway({ variable: "--font-raleway", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const oxanium = Oxanium({ variable: "--font-oxanium", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const spaceGrotesk = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin", "cyrillic"] });
const sourceSans3 = Source_Sans_3({ variable: "--font-source-sans-3", subsets: ["latin"] });
const instrumentSans = Instrument_Sans({ variable: "--font-instrument-sans", subsets: ["latin"] });

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
});
const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
});
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
});
const lora = Lora({ variable: "--font-lora", subsets: ["latin", "cyrillic"] });
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin", "cyrillic"],
});

const jetBrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "HPMOR Fanfics RU",
  description: "Минималистичная онлайн-читалка для переведенных сегментов HPMOR fanfics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={[
        uiSans.variable,
        geist.variable,
        geistMono.variable,
        inter.variable,
        notoSans.variable,
        nunitoSans.variable,
        figtree.variable,
        roboto.variable,
        raleway.variable,
        dmSans.variable,
        publicSans.variable,
        outfit.variable,
        oxanium.variable,
        manrope.variable,
        spaceGrotesk.variable,
        montserrat.variable,
        sourceSans3.variable,
        instrumentSans.variable,
        notoSerif.variable,
        robotoSlab.variable,
        merriweather.variable,
        lora.variable,
        playfairDisplay.variable,
        jetBrainsMono.variable,
        "h-full antialiased",
      ].join(" ")}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: getReaderSettingsInlineScript(),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey={READER_THEME_STORAGE_KEY}
        >
          <FontProvider>{children}</FontProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
