import { useEffect } from "react";

const STORAGE_KEY = "playback";

export default function useResumePlayback(
  videoRef: React.RefObject<HTMLVideoElement>,
  id: string
) {
  // restore position
  useEffect(() => {
    const raw =
      localStorage.getItem(STORAGE_KEY);

    if (!raw) return;

    const map = JSON.parse(raw);
    const time = map[id];

    if (
      time &&
      videoRef.current
    ) {
      videoRef.current.currentTime =
        time;
    }
  }, [id]);

  // save position
  useEffect(() => {
    const video =
      videoRef.current;

    if (!video) return;

    const handler = () => {
      const raw =
        localStorage.getItem(
          STORAGE_KEY
        );

      const map = raw
        ? JSON.parse(raw)
        : {};

      map[id] = video.currentTime;

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(map)
      );
    };

    video.addEventListener(
      "timeupdate",
      handler
    );

    return () =>
      video.removeEventListener(
        "timeupdate",
        handler
      );
  }, [id, videoRef]);
}