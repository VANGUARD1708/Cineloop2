import { useEffect, useRef } from "react";

export interface WatchAnalytics {
  watchTime: number;
  duration: number;
  replayed: boolean;
  skipped: boolean;
}

export default function useWatchAnalytics(
  videoRef: React.RefObject<HTMLVideoElement>,
  id: string,
  onUpdate?: (id: string, data: WatchAnalytics) => void
) {
  const startTime = useRef(0);
  const watched = useRef(0);
  const replayed = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => {
      startTime.current = Date.now();
    };

    const onPause = () => {
      watched.current +=
        (Date.now() -
          startTime.current) /
        1000;
    };

    const onEnded = () => {
      replayed.current = true;
    };

    video.addEventListener(
      "play",
      onPlay
    );
    video.addEventListener(
      "pause",
      onPause
    );
    video.addEventListener(
      "ended",
      onEnded
    );

    return () => {
      video.removeEventListener(
        "play",
        onPlay
      );
      video.removeEventListener(
        "pause",
        onPause
      );
      video.removeEventListener(
        "ended",
        onEnded
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      const video =
        videoRef.current;

      if (!video) return;

      const duration =
        video.duration || 0;

      const skipped =
        watched.current <
        duration * 0.3;

      onUpdate?.(id, {
        watchTime:
          watched.current,
        duration,
        replayed:
          replayed.current,
        skipped,
      });
    };
  }, [id]);
}