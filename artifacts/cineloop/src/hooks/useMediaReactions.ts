import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";

export interface ReactionState {
  liked: boolean;
  saved: boolean;
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
}

const empty: ReactionState = {
  liked: false,
  saved: false,
  likeCount: 0,
  bookmarkCount: 0,
  commentCount: 0,
};

function key(mediaType: string, mediaId: string) {
  return ["media-reactions", mediaType, mediaId] as const;
}

async function fetchReactions(mediaType: string, mediaId: string): Promise<ReactionState> {
  const r = await fetch(`/api/media/${mediaType}/${mediaId}/reactions`, { credentials: "include" });
  if (!r.ok) return empty;
  const data = (await r.json()) as Partial<ReactionState>;
  return { ...empty, ...data };
}

export default function useMediaReactions(mediaType: string | undefined, mediaId: string | undefined) {
  const qc = useQueryClient();
  const enabled = Boolean(mediaType && mediaId);

  // Per-instance monotonically increasing token; we only accept onSuccess payloads
  // whose token matches the latest dispatched mutation, so out-of-order responses
  // (rapid like→unlike→like) cannot overwrite the current intent.
  const seqRef = useRef(0);
  const latestRef = useRef(0);

  const query = useQuery({
    queryKey: enabled ? key(mediaType!, mediaId!) : ["media-reactions", "noop"],
    queryFn: () => fetchReactions(mediaType!, mediaId!),
    enabled,
    staleTime: 30_000,
  });

  const mutate = useMutation({
    mutationFn: async (action: { kind: "like" | "bookmark"; on: boolean; token: number }) => {
      const r = await fetch(`/api/media/${mediaType}/${mediaId}/${action.kind}`, {
        method: action.on ? "POST" : "DELETE",
        credentials: "include",
      });
      if (r.status === 401) throw new Error("auth_required");
      if (!r.ok) throw new Error("request_failed");
      return { state: (await r.json()) as ReactionState, token: action.token };
    },
    onMutate: async (action) => {
      if (!enabled) return;
      await qc.cancelQueries({ queryKey: key(mediaType!, mediaId!) });
      const prev = qc.getQueryData<ReactionState>(key(mediaType!, mediaId!)) ?? empty;
      const next: ReactionState = { ...prev };
      if (action.kind === "like") {
        next.liked = action.on;
        next.likeCount = Math.max(0, next.likeCount + (action.on ? 1 : -1));
      } else {
        next.saved = action.on;
        next.bookmarkCount = Math.max(0, next.bookmarkCount + (action.on ? 1 : -1));
      }
      qc.setQueryData(key(mediaType!, mediaId!), next);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev && enabled) qc.setQueryData(key(mediaType!, mediaId!), ctx.prev);
    },
    onSuccess: (result) => {
      // Only the latest dispatched token gets to commit its server payload to cache.
      if (enabled && result.token === latestRef.current) {
        qc.setQueryData(key(mediaType!, mediaId!), result.state);
      }
    },
    onSettled: () => {
      // Force convergence with server truth once the latest mutation finishes.
      if (enabled && latestRef.current === seqRef.current) {
        qc.invalidateQueries({ queryKey: key(mediaType!, mediaId!) });
      }
    },
  });

  const dispatch = (kind: "like" | "bookmark", on: boolean) => {
    seqRef.current += 1;
    latestRef.current = seqRef.current;
    mutate.mutate({ kind, on, token: seqRef.current });
  };

  const state = query.data ?? empty;

  return {
    ...state,
    isLoading: query.isLoading,
    toggleLike: () => dispatch("like", !state.liked),
    like: () => {
      if (!state.liked) dispatch("like", true);
    },
    toggleBookmark: () => dispatch("bookmark", !state.saved),
  };
}
