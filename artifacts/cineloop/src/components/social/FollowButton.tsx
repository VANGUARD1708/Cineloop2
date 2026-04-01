import useFollow from "@/hooks/useFollow";

export default function FollowButton({
  userId,
}: {
  userId: string;
}) {
  const {
    isFollowing,
    follow,
    unfollow,
  } = useFollow(userId);

  return (
    <button
      onClick={
        isFollowing ? unfollow : follow
      }
      className={`px-4 py-1 text-sm rounded-md transition ${
        isFollowing
          ? "bg-white/10 text-white"
          : "bg-white text-black"
      }`}
    >
      {isFollowing
        ? "Following"
        : "Follow"}
    </button>
  );
}