"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react"
import type { CharacterAlignmentResponseModel } from "@elevenlabs/elevenlabs-js/api/types/CharacterAlignmentResponseModel"

export type TranscriptWord = {
  kind: "word"
  text: string
  start: number
  end: number
  segmentIndex: number
}

type TranscriptGap = {
  kind: "gap"
  text: string
  start: number
  end: number
  segmentIndex: number
}

export type TranscriptSegment = TranscriptWord | TranscriptGap

export type SegmentComposer = (
  alignment: CharacterAlignmentResponseModel
) => TranscriptSegment[]

type SegmentState = {
  currentWord: TranscriptWord | null
  spokenSegments: TranscriptSegment[]
  unspokenSegments: TranscriptSegment[]
}

function isGapCharacter(character: string) {
  return /\s/u.test(character)
}

export function buildTranscriptSegments(
  alignment: CharacterAlignmentResponseModel,
  segmentComposer?: SegmentComposer
) {
  if (segmentComposer) {
    return segmentComposer(alignment)
  }

  const segments: TranscriptSegment[] = []
  const { characters, characterStartTimesSeconds, characterEndTimesSeconds } =
    alignment

  let currentText = ""
  let currentKind: TranscriptSegment["kind"] | null = null
  let segmentStart = 0
  let segmentEnd = 0

  const pushSegment = () => {
    if (!currentText || currentKind === null) {
      return
    }

    const segment: TranscriptSegment =
      currentKind === "word"
        ? {
            kind: "word",
            text: currentText,
            start: segmentStart,
            end: segmentEnd,
            segmentIndex: segments.length,
          }
        : {
            kind: "gap",
            text: currentText,
            start: segmentStart,
            end: segmentEnd,
            segmentIndex: segments.length,
          }

    segments.push(segment)
    currentText = ""
    currentKind = null
  }

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index] ?? ""
    const kind = isGapCharacter(character) ? "gap" : "word"
    const start = characterStartTimesSeconds[index] ?? segmentEnd
    const end = characterEndTimesSeconds[index] ?? start

    if (currentKind !== null && kind !== currentKind) {
      pushSegment()
    }

    if (currentKind === null) {
      currentKind = kind
      segmentStart = start
    }

    currentText += character
    segmentEnd = end
  }

  pushSegment()
  return segments
}

export function getTranscriptSegmentState(
  segments: TranscriptSegment[],
  currentTime: number
): SegmentState {
  let currentWord: TranscriptWord | null = null
  const spokenSegments: TranscriptSegment[] = []
  const unspokenSegments: TranscriptSegment[] = []

  for (const segment of segments) {
    if (segment.kind === "word") {
      if (currentTime >= segment.start && currentTime < segment.end) {
        currentWord = segment
        continue
      }
    }

    if (segment.end <= currentTime) {
      spokenSegments.push(segment)
      continue
    }

    if (
      currentWord &&
      segment.segmentIndex < currentWord.segmentIndex &&
      segment.kind === "gap"
    ) {
      spokenSegments.push(segment)
      continue
    }

    unspokenSegments.push(segment)
  }

  return { currentWord, spokenSegments, unspokenSegments }
}

export type UseTranscriptViewerResult = {
  audioRef: RefObject<HTMLAudioElement | null>
  currentTime: number
  duration: number
  isPlaying: boolean
  segments: TranscriptSegment[]
  currentWord: TranscriptWord | null
  spokenSegments: TranscriptSegment[]
  unspokenSegments: TranscriptSegment[]
  play: () => void
  pause: () => void
  seekToTime: (time: number) => void
  startScrubbing: () => void
  endScrubbing: () => void
}

type UseTranscriptViewerOptions = {
  alignment: CharacterAlignmentResponseModel
  hideAudioTags?: boolean
  segmentComposer?: SegmentComposer
  onPlay?: () => void
  onPause?: () => void
  onTimeUpdate?: (time: number) => void
  onEnded?: () => void
  onDurationChange?: (duration: number) => void
}

export function useTranscriptViewer({
  alignment,
  segmentComposer,
  onPlay,
  onPause,
  onTimeUpdate,
  onEnded,
  onDurationChange,
}: UseTranscriptViewerOptions): UseTranscriptViewerResult {
  const audioRef = useRef<HTMLAudioElement>(null)
  const resumePlaybackRef = useRef(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const segments = useMemo(
    () => buildTranscriptSegments(alignment, segmentComposer),
    [alignment, segmentComposer]
  )
  const segmentState = useMemo(
    () => getTranscriptSegmentState(segments, currentTime),
    [segments, currentTime]
  )

  useEffect(() => {
    const audio = audioRef.current

    if (!audio) {
      return
    }

    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
    }

    const handlePause = () => {
      setIsPlaying(false)
      onPause?.()
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      onTimeUpdate?.(audio.currentTime)
    }

    const handleDurationChange = () => {
      const nextDuration = Number.isFinite(audio.duration) ? audio.duration : 0
      setDuration(nextDuration)
      onDurationChange?.(nextDuration)
    }

    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }

    audio.addEventListener("play", handlePlay)
    audio.addEventListener("pause", handlePause)
    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("durationchange", handleDurationChange)
    audio.addEventListener("loadedmetadata", handleDurationChange)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("play", handlePlay)
      audio.removeEventListener("pause", handlePause)
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("durationchange", handleDurationChange)
      audio.removeEventListener("loadedmetadata", handleDurationChange)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [onDurationChange, onEnded, onPause, onPlay, onTimeUpdate])

  const play = useCallback(() => {
    void audioRef.current?.play()
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const seekToTime = useCallback((time: number) => {
    if (!audioRef.current) {
      return
    }

    audioRef.current.currentTime = time
    setCurrentTime(time)
  }, [])

  const startScrubbing = useCallback(() => {
    resumePlaybackRef.current = !audioRef.current?.paused
    audioRef.current?.pause()
  }, [])

  const endScrubbing = useCallback(() => {
    if (resumePlaybackRef.current) {
      void audioRef.current?.play()
    }

    resumePlaybackRef.current = false
  }, [])

  return {
    audioRef,
    currentTime,
    duration,
    isPlaying,
    segments,
    currentWord: segmentState.currentWord,
    spokenSegments: segmentState.spokenSegments,
    unspokenSegments: segmentState.unspokenSegments,
    play,
    pause,
    seekToTime,
    startScrubbing,
    endScrubbing,
  }
}
