import { useEffect } from "react";

export default function useActivePlayback(
  videoRef: React.RefObject<HTMLVideoElement>,
  isActive: boolean
) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);
}