import { Heart } from "lucide-react";
import useLikes from "@/hooks/useLikes";

export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string;
  initialLiked?: boolean;
  initialCount?: number;
}) {
  const { liked, count, toggleLike } =
    useLikes(
      postId,
      initialLiked,
      initialCount
    );

  return (
    <button
      onClick={toggleLike}
      className="flex items-center gap-1 text-sm"
    >
      <Heart
        size={18}
        className={
          liked
            ? "fill-white text-white"
            : "text-white/60"
        }
      />
      <span>{count}</span>
    </button>
  );
}