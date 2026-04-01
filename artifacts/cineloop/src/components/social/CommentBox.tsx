import { useState } from "react";

export default function CommentBox({
  onSubmit,
}: {
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");

  return (
    <div className="flex gap-2 mt-3">
      <input
        value={text}
        onChange={(e) =>
          setText(e.target.value)
        }
        placeholder="Write a comment..."
        className="flex-1 bg-black border border-white/10 px-3 py-2 text-sm text-white rounded-md"
      />
      <button
        onClick={() => {
          if (!text) return;
          onSubmit(text);
          setText("");
        }}
        className="px-3 bg-white text-black text-sm rounded-md"
      >
        Post
      </button>
    </div>
  );
}