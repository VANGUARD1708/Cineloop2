import { Comment } from "@/hooks/useComments";

interface Props {
  comment: Comment;
}

export default function CommentItem({ comment }: Props) {
  return (
    <div className="flex gap-3 py-3 border-b border-zinc-800">
      <div className="w-8 h-8 rounded-full bg-zinc-700" />

      <div className="flex-1">
        <p className="text-sm text-white font-semibold">
          {comment.user}
        </p>

        <p className="text-sm text-zinc-300">
          {comment.text}
        </p>
      </div>
    </div>
  );
}