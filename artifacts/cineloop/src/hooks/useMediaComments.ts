import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface MediaComment {
  id: string;
  userId: number;
  user: string;
  avatar: string | null;
  text: string;
  createdAt: number;
  mine: boolean;
}

function key(mediaType: string, mediaId: string) {
  return ["media-comments", mediaType, mediaId] as const;
}

export default function useMediaComments(
  mediaType: string | undefined,
  mediaId: string | undefined,
  options: { enabled?: boolean } = {},
) {
  const qc = useQueryClient();
  const ready = Boolean(mediaType && mediaId) && options.enabled !== false;

  const query = useQuery({
    queryKey: ready ? key(mediaType!, mediaId!) : ["media-comments", "noop"],
    queryFn: async (): Promise<MediaComment[]> => {
      const r = await fetch(`/api/media/${mediaType}/${mediaId}/comments`, {
        credentials: "include",
      });
      if (!r.ok) return [];
      return (await r.json()) as MediaComment[];
    },
    enabled: ready,
    staleTime: 15_000,
  });

  const add = useMutation({
    mutationFn: async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) throw new Error("empty");
      const r = await fetch(`/api/media/${mediaType}/${mediaId}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: trimmed.slice(0, 500) }),
      });
      if (r.status === 401) throw new Error("auth_required");
      if (!r.ok) throw new Error("post_failed");
      return (await r.json()) as MediaComment;
    },
    onSuccess: (created) => {
      if (!ready) return;
      qc.setQueryData<MediaComment[]>(key(mediaType!, mediaId!), (prev) => [created, ...(prev ?? [])]);
      // Bump the cached commentCount on the reactions query so the FeedCard badge
      // updates immediately without waiting for the 30s stale window.
      qc.setQueryData<{ commentCount: number } & Record<string, unknown>>(
        ["media-reactions", mediaType, mediaId],
        (prev) =>
          prev ? { ...prev, commentCount: (prev.commentCount ?? 0) + 1 } : prev,
      );
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/media/comments/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) throw new Error("delete_failed");
    },
    onMutate: async (id) => {
      if (!ready) return;
      await qc.cancelQueries({ queryKey: key(mediaType!, mediaId!) });
      const prev = qc.getQueryData<MediaComment[]>(key(mediaType!, mediaId!)) ?? [];
      qc.setQueryData<MediaComment[]>(
        key(mediaType!, mediaId!),
        prev.filter((c) => c.id !== id),
      );
      qc.setQueryData<{ commentCount: number } & Record<string, unknown>>(
        ["media-reactions", mediaType, mediaId],
        (p) => (p ? { ...p, commentCount: Math.max(0, (p.commentCount ?? 0) - 1) } : p),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && ready) {
        qc.setQueryData(key(mediaType!, mediaId!), ctx.prev);
        qc.setQueryData<{ commentCount: number } & Record<string, unknown>>(
          ["media-reactions", mediaType, mediaId],
          (p) => (p ? { ...p, commentCount: (p.commentCount ?? 0) + 1 } : p),
        );
      }
    },
  });

  const comments = query.data ?? [];

  return {
    comments,
    count: comments.length,
    isLoading: query.isLoading,
    addComment: (text: string) => add.mutateAsync(text),
    removeComment: (id: string) => remove.mutateAsync(id),
    addStatus: add.status,
    addError: add.error as Error | null,
  };
}
