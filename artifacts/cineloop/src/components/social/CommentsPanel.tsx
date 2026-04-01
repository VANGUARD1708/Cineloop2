import useComments from "@/hooks/useComments";
import CommentBox from "./CommentBox";

export default function CommentsPanel({
  postId,
}: {
  postId: string;
}) {
  const { items, add } =
    useComments(postId);

  return (
    <div className="mt-3">
      <CommentBox onSubmit={add} />

      <div className="space-y-3 mt-4">
        {items.map((c) => (
          <div
            key={c.id}
            className="text-sm"
          >
            <span className="font-bold text-white">
              {c.username}
            </span>
            <span className="text-zinc-400 ml-2">
              {c.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}