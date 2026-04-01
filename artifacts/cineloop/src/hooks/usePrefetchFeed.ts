import { useEffect } from "react";

export default function usePrefetchFeed(
  items: any[],
  currentIndex: number,
  prefetchCount = 2
) {
  useEffect(() => {
    if (!items?.length) return;

    for (
      let i = 1;
      i <= prefetchCount;
      i++
    ) {
      const next =
        items[currentIndex + i];

      if (!next) continue;

      const video =
        next?.episode?.videoUrl;

      if (!video) continue;

      const link =
        document.createElement("link");

      link.rel = "prefetch";
      link.as = "video";
      link.href = video;

      document.head.appendChild(link);
    }
  }, [items, currentIndex]);
}