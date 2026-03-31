export type ChapterMeta = {
  slug: string;
  href: string;
  order: number;
  storyId: string;
  reviewStatus: string;
  title: string;
  originalTitle: string;
};

export const stats = {
  totalSegmentCount: 1070,
  translatedSegmentCount: 17,
  readableChapterCount: 15,
} as const;

export const chapters: ChapterMeta[] = [
  {
    "slug": "seg-0003",
    "href": "/chapters/seg-0003",
    "order": 3,
    "storyId": "frontmatter",
    "reviewStatus": "unreviewed",
    "title": "00. Предисловие",
    "originalTitle": "00. Preface"
  },
  {
    "slug": "seg-0006",
    "href": "/chapters/seg-0006",
    "order": 6,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 1: Гарри Поттер против детства",
    "originalTitle": "Chapter 1: HP vs Childhood"
  },
  {
    "slug": "seg-0007",
    "href": "/chapters/seg-0007",
    "order": 7,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 2: Гарри Поттер против Квиринуса Квиррелла",
    "originalTitle": "Chapter 2: HP vs Quirinus Quirrel"
  },
  {
    "slug": "seg-0008",
    "href": "/chapters/seg-0008",
    "order": 8,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 3: Гарри Поттер против Гилдероя Локхарта",
    "originalTitle": "Chapter 3: HP vs Gilderoy Lockhart"
  },
  {
    "slug": "seg-0009",
    "href": "/chapters/seg-0009",
    "order": 9,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 4: Гарри Поттер против Римуса Люпина (часть 1)",
    "originalTitle": "Chapter 4: HP vs Remus Lupin (Pt 1)"
  },
  {
    "slug": "seg-0010",
    "href": "/chapters/seg-0010",
    "order": 10,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 5: Гарри Поттер против Римуса Люпина (часть 2)",
    "originalTitle": "Chapter 5: HP vs Remus Lupin (Pt 2)"
  },
  {
    "slug": "seg-0011",
    "href": "/chapters/seg-0011",
    "order": 11,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 6: Гарри Поттер против Аластора Грюма (часть 1)",
    "originalTitle": "Chapter 6: HP vs Alastor Moody (Pt 1)"
  },
  {
    "slug": "seg-0012",
    "href": "/chapters/seg-0012",
    "order": 12,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 7: Гарри Поттер против Аластора Грюма (часть 2)",
    "originalTitle": "Chapter 7: HP vs Alastor Moody (Pt 2)"
  },
  {
    "slug": "seg-0013",
    "href": "/chapters/seg-0013",
    "order": 13,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 8: Гарри Поттер против Аластора Грюма (часть 3)",
    "originalTitle": "Chapter 8: HP vs Alastor Moody (Pt 3)"
  },
  {
    "slug": "seg-0014",
    "href": "/chapters/seg-0014",
    "order": 14,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 9: Гарри Поттер против Аластора Грюма (часть 4)",
    "originalTitle": "Chapter 9: HP vs Alastor Moody (Pt 4)"
  },
  {
    "slug": "seg-0015",
    "href": "/chapters/seg-0015",
    "order": 15,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 10: Гарри Поттер против Отдела Тайн",
    "originalTitle": "Chapter 10: HP vs DoM"
  },
  {
    "slug": "seg-0016",
    "href": "/chapters/seg-0016",
    "order": 16,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 11: Гарри Поттер против Долорес Амбридж (ч. 1)",
    "originalTitle": "Chapter 11: HP vs Dolores Umbridge (Pt 1)"
  },
  {
    "slug": "seg-0017",
    "href": "/chapters/seg-0017",
    "order": 17,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 12: Гарри Поттер против Долорес Амбридж (ч. 2)",
    "originalTitle": "Chapter 12: HP vs Dolores Umbridge (Pt 2)"
  },
  {
    "slug": "seg-0018",
    "href": "/chapters/seg-0018",
    "order": 18,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 13: Гарри Поттер против Долорес Амбридж (ч. 3)",
    "originalTitle": "Chapter 13: HP vs Dolores Umbridge (Pt 3)"
  },
  {
    "slug": "seg-0019",
    "href": "/chapters/seg-0019",
    "order": 19,
    "storyId": "story-01",
    "reviewStatus": "unreviewed",
    "title": "Глава 14: Гарри Поттер против любви (ч. 1)",
    "originalTitle": "Chapter 14: HP vs Love (Pt 1)"
  }
] as ChapterMeta[];

export const chapterModules = {
  "seg-0003": () => import("@/content/chapters/seg-0003.mdx"),
  "seg-0006": () => import("@/content/chapters/seg-0006.mdx"),
  "seg-0007": () => import("@/content/chapters/seg-0007.mdx"),
  "seg-0008": () => import("@/content/chapters/seg-0008.mdx"),
  "seg-0009": () => import("@/content/chapters/seg-0009.mdx"),
  "seg-0010": () => import("@/content/chapters/seg-0010.mdx"),
  "seg-0011": () => import("@/content/chapters/seg-0011.mdx"),
  "seg-0012": () => import("@/content/chapters/seg-0012.mdx"),
  "seg-0013": () => import("@/content/chapters/seg-0013.mdx"),
  "seg-0014": () => import("@/content/chapters/seg-0014.mdx"),
  "seg-0015": () => import("@/content/chapters/seg-0015.mdx"),
  "seg-0016": () => import("@/content/chapters/seg-0016.mdx"),
  "seg-0017": () => import("@/content/chapters/seg-0017.mdx"),
  "seg-0018": () => import("@/content/chapters/seg-0018.mdx"),
  "seg-0019": () => import("@/content/chapters/seg-0019.mdx"),
} as const;
