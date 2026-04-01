"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import useComments from "@/hooks/useComments";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CommentSheet({
  open,
  onClose,
}: Props) {
  const { comments, addComment, count } =
    useComments();

  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const startY = useRef(0);

  /* autofocus */
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (!text.trim()) return;
    addComment(text);
    setText("");
  };

  /* swipe down to close */
  const handleTouchStart = (e: any) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: any) => {
    const current = e.touches[0].clientY;
    if (current - startY.current > 120) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-end"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="w-full bg-black rounded-t-2xl border border-white/10 max-h-[80vh] flex flex-col animate-slide-up"
      >
        {/* header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-white font-semibold">
            Comments ({count})
          </h3>

          <button onClick={onClose}>
            <X className="text-white w-5 h-5" />
          </button>
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.map((c) => (
            <div key={c.id}>
              <p className="text-sm text-white font-medium">
                {c.user}
              </p>
              <p className="text-sm text-zinc-300">
                {c.text}
              </p>
            </div>
          ))}
        </div>

        {/* input */}
        <div className="p-3 border-t border-white/10 flex gap-2 pb-safe">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            placeholder="Add comment..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"
          />

          <button
            onClick={submit}
            className="px-3 bg-white text-black rounded-lg"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}