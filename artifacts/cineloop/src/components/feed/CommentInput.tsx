import { useState } from "react";

interface Props {
  onSend: (text: string) => void;
}

export default function CommentInput({ onSend }: Props) {
  const [text, setText] = useState("");

  const submit = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="flex gap-2 p-3 border-t border-zinc-800">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a comment..."
        className="flex-1 bg-zinc-800 text-white px-3 py-2 rounded-lg outline-none"
      />

      <button
        onClick={submit}
        className="text-white font-semibold px-3"
      >
        Post
      </button>
    </div>
  );
}