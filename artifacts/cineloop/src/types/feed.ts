export interface FeedItem {
  episode: {
    id: string;
    title: string;

    thumbnailUrl?: string;

    videoUrl?: string | null;
    videoUrlLow?: string | null;

    trailerId?: number;

    tags?: string[];
    likes?: number;
    duration?: number;
    createdAt?: string;
  };

  film?: {
    title?: string;
  };
}