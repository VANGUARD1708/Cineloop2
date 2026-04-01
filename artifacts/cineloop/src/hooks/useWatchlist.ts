import { useEffect, useState } from "react";

const STORAGE_KEY = "watchlist";

export default function useWatchlist() {
  const [saved, setSaved] =
    useState<Set<string>>(new Set());

  // load from storage
  useEffect(() => {
    const raw =
      localStorage.getItem(STORAGE_KEY);
    if (raw) {
      setSaved(new Set(JSON.parse(raw)));
    }
  }, []);

  // persist
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...saved])
    );
  }, [saved]);

  const toggle = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
        sync(id, false);
      } else {
        next.add(id);
        sync(id, true);
      }

      return next;
    });
  };

  const isSaved = (id: string) =>
    saved.has(id);

  const clear = () => {
    setSaved(new Set());
  };

  const sync = async (
    id: string,
    add: boolean
  ) => {
    try {
      await fetch(
        `/api/posts/${id}/watchlist`,
        {
          method: add
            ? "POST"
            : "DELETE",
        }
      );
    } catch (e) {
      console.error(e);
    }
  };

  return {
    toggle,
    isSaved,
    clear,
    count: saved.size,
    items: [...saved],
  };
}