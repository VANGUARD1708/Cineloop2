import { useState, useCallback } from "react";

interface UseLikeProps {
  postId: string;
  initialLiked?: boolean;
  initialCount?: number;
}

export default function useLike({
  postId,
  initialLiked = false,
  initialCount = 0,
}: UseLikeProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const sync = async (next: boolean) => {
    try {
      setLoading(true);

      await fetch(`/api/posts/${postId}/like`, {
        method: next ? "POST" : "DELETE",
      });

    } catch (e) {
      // rollback
      setLiked(!next);
      setCount((c) => (next ? c - 1 : c + 1));
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = useCallback(() => {
    if (loading) return;

    setLiked((prev) => {
      const next = !prev;

      // optimistic update
      setCount((c) => (next ? c + 1 : c - 1));

      sync(next);

      return next;
    });
  }, [loading]);

  const like = useCallback(() => {
    if (liked || loading) return;

    setLiked(true);
    setCount((c) => c + 1);

    sync(true);
  }, [liked, loading]);

  const unlike = useCallback(() => {
    if (!liked || loading) return;

    setLiked(false);
    setCount((c) => Math.max(0, c - 1));

    sync(false);
  }, [liked, loading]);

  return {
    liked,
    count,
    loading,
    toggleLike,
    like,
    unlike,
  };
}