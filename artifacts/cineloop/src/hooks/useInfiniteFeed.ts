import { useEffect, useRef } from "react";

export default function useInfiniteFeed(
  loadMore: () => void,
  hasMore: boolean
) {
  const ref = useRef<HTMLDivElement | null>(
    null
  );

  useEffect(() => {
    if (!ref.current) return;

    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry =
            entries[0];

          if (
            entry.isIntersecting &&
            hasMore
          ) {
            loadMore();
          }
        },
        {
          rootMargin:
            "1000px",
        }
      );

    observer.observe(
      ref.current
    );

    return () =>
      observer.disconnect();
  }, [hasMore, loadMore]);

  return ref;
}