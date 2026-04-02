"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CharacterAlignmentResponseModel } from "@elevenlabs/elevenlabs-js/api/types/CharacterAlignmentResponseModel";
import { FileAudioIcon, TextIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AudioPlayerButton,
  AudioPlayerDuration,
  AudioPlayerProgress,
  AudioPlayerProvider,
  AudioPlayerSpeed,
  AudioPlayerTime,
  useAudioPlayer,
  useAudioPlayerTime,
} from "@/components/ui/audio-player";
import {
  Sheet,
  SheetDescription,
  SheetPanel,
  SheetPopup,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  TranscriptViewerPlayPauseButton,
  TranscriptViewerProvider,
  TranscriptViewerScrubBar,
  TranscriptViewerWords,
  type CharacterAlignmentResponseModel as TranscriptAlignment,
} from "@/components/ui/transcript-viewer";
import type { ChapterAudioMeta } from "@/lib/chapter-audio";
import {
  READER_AUDIO_SPEED_STORAGE_KEY,
  READER_TRANSCRIPT_OPEN_STORAGE_KEY,
} from "@/lib/reader-settings";
import {
  buildTranscriptSegments,
  getTranscriptSegmentState,
} from "@/hooks/use-transcript-viewer";

function getStoredPlaybackRate() {
  if (typeof window === "undefined") {
    return 1;
  }

  const stored = Number.parseFloat(
    window.localStorage.getItem(READER_AUDIO_SPEED_STORAGE_KEY) ?? "",
  );

  return Number.isFinite(stored) && stored > 0 ? stored : 1;
}

function getStoredTranscriptOpen() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(READER_TRANSCRIPT_OPEN_STORAGE_KEY) === "true";
}

function ChapterAudioPanelInner({
  chapterSlug,
  chapterTitle,
  audio,
}: {
  chapterSlug: string;
  chapterTitle: string;
  audio: ChapterAudioMeta;
}) {
  const player = useAudioPlayer();
  const currentTime = useAudioPlayerTime();
  const {
    duration,
    isPlaying,
    pause,
    play,
    playbackRate,
    ref,
    seek,
    setActiveItem,
    setPlaybackRate,
  } = player;
  const [transcriptOpen, setTranscriptOpen] = useState(getStoredTranscriptOpen);
  const [alignment, setAlignment] = useState<CharacterAlignmentResponseModel | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const resumePlaybackRef = useRef(false);

  useEffect(() => {
    void setActiveItem({
      id: chapterSlug,
      src: audio.src,
    });
  }, [audio.src, chapterSlug, setActiveItem]);

  useEffect(() => {
    setPlaybackRate(getStoredPlaybackRate());
  }, [setPlaybackRate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      READER_AUDIO_SPEED_STORAGE_KEY,
      String(playbackRate),
    );
  }, [playbackRate]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      READER_TRANSCRIPT_OPEN_STORAGE_KEY,
      transcriptOpen ? "true" : "false",
    );
  }, [transcriptOpen]);

  useEffect(() => {
    if (!transcriptOpen || alignment || loadingTranscript) {
      return;
    }

    let cancelled = false;

    async function loadAlignment() {
      setLoadingTranscript(true);
      setTranscriptError(null);

      try {
        const response = await fetch(audio.alignmentSrc);

        if (!response.ok) {
          throw new Error(`Transcript request failed with ${response.status}`);
        }

        const payload = (await response.json()) as TranscriptAlignment;

        if (!cancelled) {
          setAlignment(payload);
          setTranscriptError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setTranscriptError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить синхронизированный текст.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingTranscript(false);
        }
      }
    }

    void loadAlignment();

    return () => {
      cancelled = true;
    };
  }, [
    alignment,
    audio.alignmentSrc,
    loadingTranscript,
    transcriptOpen,
  ]);

  const transcriptSegments = useMemo(
    () => (alignment ? buildTranscriptSegments(alignment) : []),
    [alignment],
  );
  const transcriptState = useMemo(
    () => getTranscriptSegmentState(transcriptSegments, currentTime),
    [currentTime, transcriptSegments],
  );

  const transcriptContextValue = useMemo(() => {
    if (!alignment) {
      return null;
    }

    return {
      audioRef: ref,
      audioProps: {
        controls: false,
        preload: "metadata" as const,
      },
      audioSrc: audio.src,
      audioType: "audio/mpeg" as const,
      currentTime,
      duration: duration && Number.isFinite(duration) ? duration : 0,
      isPlaying,
      segments: transcriptSegments,
      currentWord: transcriptState.currentWord,
      spokenSegments: transcriptState.spokenSegments,
      unspokenSegments: transcriptState.unspokenSegments,
      play: () => {
        void play();
      },
      pause: () => {
        pause();
      },
      seekToTime: (time: number) => {
        seek(time);
      },
      startScrubbing: () => {
        resumePlaybackRef.current = isPlaying;
        pause();
      },
      endScrubbing: () => {
        if (resumePlaybackRef.current) {
          void play();
        }

        resumePlaybackRef.current = false;
      },
    };
  }, [
    alignment,
    audio.src,
    currentTime,
    duration,
    isPlaying,
    pause,
    play,
    ref,
    seek,
    transcriptSegments,
    transcriptState.currentWord,
    transcriptState.spokenSegments,
    transcriptState.unspokenSegments,
  ]);

  return (
    <section className="mx-auto w-full max-w-[70ch]">
      <div className="rounded-[1.5rem] border border-border/80 bg-paper/70 p-4 shadow-[0_8px_30px_rgb(0_0_0_/_0.04)] backdrop-blur-sm sm:p-5 dark:shadow-[0_8px_30px_rgb(0_0_0_/_0.16)]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="text-[0.68rem] font-medium tracking-[0.24em] text-muted-foreground uppercase">
                Аудиоверсия главы
              </p>
              <p className="text-sm text-muted-foreground">
                Каноническая озвучка для главы {chapterTitle}.
              </p>
            </div>

            <Sheet open={transcriptOpen} onOpenChange={setTranscriptOpen}>
              <SheetTrigger
                render={
                  <Button variant="outline" className="cursor-pointer">
                    <TextIcon data-icon="inline-start" />
                    Синхронный текст
                  </Button>
                }
              />

              <SheetPopup
                side="right"
                variant="inset"
                className="bg-paper/98"
                closeProps={{ className: "cursor-pointer" }}
              >
                <div className="flex flex-col gap-2 p-6 pb-3">
                  <SheetTitle>Синхронный текст</SheetTitle>
                  <SheetDescription>
                    Подсветка двигается вместе с озвучкой главы.
                  </SheetDescription>
                </div>

                <SheetPanel className="pt-0">
                  {loadingTranscript ? (
                    <p className="text-sm text-muted-foreground">
                      Загружаем разметку синхронизации...
                    </p>
                  ) : transcriptError ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Синхронизированный текст сейчас недоступен.
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        {transcriptError}
                      </p>
                    </div>
                  ) : transcriptContextValue ? (
                    <TranscriptViewerProvider value={transcriptContextValue}>
                      <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-3">
                          <TranscriptViewerPlayPauseButton className="cursor-pointer" />
                          <TranscriptViewerScrubBar className="flex-1" />
                        </div>

                        <TranscriptViewerWords className="text-base leading-8 sm:text-lg" />
                      </div>
                    </TranscriptViewerProvider>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Откройте панель еще раз, если синхронизация не появилась.
                    </p>
                  )}
                </SheetPanel>
              </SheetPopup>
            </Sheet>
          </div>

          <div className="flex items-center gap-3">
            <AudioPlayerButton
              size="icon-lg"
              className="cursor-pointer rounded-full"
            />

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <AudioPlayerProgress />
              <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                <div className="inline-flex items-center gap-2 truncate">
                  <FileAudioIcon className="size-4 shrink-0" />
                  <span className="truncate">MP3</span>
                </div>
                <div className="inline-flex items-center gap-1 tabular-nums">
                  <AudioPlayerTime />
                  <span>/</span>
                  <AudioPlayerDuration />
                </div>
              </div>
            </div>

            <AudioPlayerSpeed className="cursor-pointer" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function ChapterAudioPanel({
  chapterSlug,
  chapterTitle,
  audio,
}: {
  chapterSlug: string;
  chapterTitle: string;
  audio: ChapterAudioMeta;
}) {
  return (
    <AudioPlayerProvider>
      <ChapterAudioPanelInner
        chapterSlug={chapterSlug}
        chapterTitle={chapterTitle}
        audio={audio}
      />
    </AudioPlayerProvider>
  );
}
