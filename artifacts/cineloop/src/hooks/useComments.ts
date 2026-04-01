import { useEffect, useState } from "react";

export interface Comment {
  id: string;
  user: string;
  text: string;
  createdAt: number;
}

export default function useComments(
  postId: string,
  initial: Comment[] = []
) {
  const [comments, setComments] =
    useState<Comment[]>(initial);
  const [loading, setLoading] =
    useState(false);

  // load from API
  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/posts/${postId}/comments`
      );
      const data = await res.json();
      setComments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (postId) load();
  }, [postId]);

  const addComment = async (text: string) => {
    const temp: Comment = {
      id: crypto.randomUUID(),
      user: "You",
      text,
      createdAt: Date.now(),
    };

    // optimistic update
    setComments((c) => [temp, ...c]);

    try {
      await fetch(
        `/api/posts/${postId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({ text }),
        }
      );
      load();
    } catch (e) {
      console.error(e);
    }
  };

  const removeComment = async (
    id: string
  ) => {
    // optimistic remove
    setComments((c) =>
      c.filter((x) => x.id !== id)
    );

    try {
      await fetch(
        `/api/comments/${id}`,
        { method: "DELETE" }
      );
    } catch (e) {
      console.error(e);
    }
  };

  return {
    comments,
    addComment,
    removeComment,
    count: comments.length,
    loading,
    refresh: load,
  };
}