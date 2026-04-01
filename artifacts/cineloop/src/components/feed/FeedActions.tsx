import { useState } from "react";
import { Heart, MessageCircle, Bookmark, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  initialLikes?: number;
}

export default function FeedActions({ initialLikes = 0 }: Props) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);

  const handleLike = () => {
    if (!liked) {
      setLiked(true);
      setLikes((l) => l + 1);
    }
  };

  return (
    <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center z-20">
      <button onClick={handleLike} className="flex flex-col items-center">
        <Heart className={cn("w-7 h-7 text-white", liked && "fill-white")} />
        <span className="text-white text-xs">{likes}</span>
      </button>

      <button className="flex flex-col items-center">
        <MessageCircle className="w-7 h-7 text-white" />
        <span className="text-white text-xs">Comment</span>
      </button>

      <button className="flex flex-col items-center">
        <Bookmark className="w-7 h-7 text-white" />
        <span className="text-white text-xs">Save</span>
      </button>

      <button className="flex flex-col items-center">
        <Share2 className="w-7 h-7 text-white" />
        <span className="text-white text-xs">Share</span>
      </button>
    </div>
  );
}