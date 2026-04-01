import type { FeedItem } from "@workspace/api-client-react/src/generated/api.schemas";

interface Props {
  item: FeedItem;
}

export default function FeedInfo({ item }: Props) {
  const { film, episode } = item;

  return (
    <div className="absolute bottom-28 left-5 z-20 max-w-[70%]">
      <h1 className="text-3xl font-bold text-white leading-tight">
        {film.title}
      </h1>

      <p className="text-zinc-300 text-sm mt-1">
        Ep {episode.episodeNumber}: {episode.title}
      </p>

      {episode.description && (
        <p className="text-zinc-400 text-xs mt-2 line-clamp-2">
          {episode.description}
        </p>
      )}
    </div>
  );
}