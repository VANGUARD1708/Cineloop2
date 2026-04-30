import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import useMediaComments from "@/hooks/useMediaComments";

interface Props {
  open: boolean;
  onClose: () => void;
  mediaType: string;
  mediaId: string;
  mediaTitle?: string;
}

function relativeTime(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString();
}

export default function CommentsSheet({ open, onClose, mediaType, mediaId, mediaTitle }: Props) {
  const { comments, count, isLoading, addComment, removeComment, addStatus, addError } =
    useMediaComments(mediaType, mediaId, { enabled: open });
  const [text, setText] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const submit = async () => {
    const value = text.trim();
    if (!value) return;
    try {
      await addComment(value);
      setText("");
      setAuthError(null);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === "auth_required") {
        setAuthError("Sign in to comment.");
      } else if (msg !== "empty") {
        setAuthError("Couldn't post — try again.");
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            className="fixed bottom-0 left-0 right-0 h-[75vh] bg-zinc-950 border-t border-zinc-800 rounded-t-2xl z-50 flex flex-col"
            data-testid="comments-sheet"
          >
            <div className="w-12 h-1.5 bg-zinc-700 rounded-full mx-auto mt-3 mb-3" />

            <div className="px-4 pb-3 border-b border-zinc-800">
              <p className="text-white font-semibold">
                Comments <span className="text-zinc-500 font-normal">({count})</span>
              </p>
              {mediaTitle && <p className="text-xs text-zinc-500 mt-0.5 truncate">{mediaTitle}</p>}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2">
              {isLoading && comments.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-8">Loading…</p>
              )}
              {!isLoading && comments.length === 0 && (
                <div className="text-center py-12 px-6">
                  <p className="text-zinc-400 text-sm">No comments yet.</p>
                  <p className="text-zinc-600 text-xs mt-1">Be the first to weigh in.</p>
                </div>
              )}
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="flex gap-3 py-3 border-b border-zinc-900 group"
                  data-testid="comment-item"
                >
                  {c.avatar ? (
                    <img
                      src={c.avatar}
                      alt=""
                      className="w-8 h-8 rounded-full bg-zinc-800 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-white font-semibold truncate">{c.user}</p>
                      <span className="text-[11px] text-zinc-500">{relativeTime(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-zinc-200 mt-0.5 break-words">{c.text}</p>
                  </div>
                  {c.mine && (
                    <button
                      onClick={() => removeComment(c.id).catch(() => {})}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400 self-start mt-1"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {authError && (
              <p className="text-xs text-red-400 px-4 pt-2">{authError}</p>
            )}

            <div className="flex gap-2 p-3 border-t border-zinc-800 bg-zinc-950">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Add a comment…"
                maxLength={500}
                className="flex-1 bg-zinc-900 text-white px-3 py-2 rounded-lg outline-none border border-zinc-800 focus:border-zinc-600 text-sm"
                data-testid="comment-input"
              />
              <button
                onClick={submit}
                disabled={!text.trim() || addStatus === "pending"}
                className="text-white bg-[#DC143C] disabled:bg-zinc-800 disabled:text-zinc-600 font-semibold px-4 rounded-lg text-sm transition-colors"
                data-testid="comment-send"
              >
                {addStatus === "pending" ? "…" : "Post"}
              </button>
            </div>
            {/* swallow unused-error TS warning if any */}
            {addError ? null : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
