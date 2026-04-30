import { useState } from "react";
import { useGetFilms, getGetFilmsQueryKey } from "@workspace/api-client-react";
import { Search, Filter } from "lucide-react";
import { Link } from "wouter";
import ContinueWatchingStrip from "@/components/feed/ContinueWatchingStrip";
import DailyMoodBanner from "@/components/discover/DailyMoodBanner";
import ForYouRail from "@/components/discover/ForYouRail";

const GENRES = ["All", "Sci-Fi", "Thriller", "Horror", "Drama", "Mystery", "Cyberpunk"];

export default function DiscoverPage() {
  const [activeGenre, setActiveGenre] = useState("All");
  
  const queryParams = activeGenre === "All" ? {} : { genre: activeGenre };
  const { data: films, isLoading } = useGetFilms(queryParams, { 
    query: { queryKey: getGetFilmsQueryKey(queryParams) } 
  });

  return (
    <div className="w-full min-h-screen bg-background pt-2 md:pt-4 pb-24">
      <DailyMoodBanner />
      <ForYouRail />
      <ContinueWatchingStrip />
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">Archive</h1>
          
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input 
                type="text" 
                placeholder="Search the archive..." 
                className="w-full bg-card border border-border rounded-md py-2.5 pl-10 pr-4 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto no-scrollbar w-full md:w-auto pb-2 md:pb-0">
              {GENRES.map(genre => (
                <button
                  key={genre}
                  onClick={() => setActiveGenre(genre)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
                    activeGenre === genre 
                      ? "bg-white text-black border-white" 
                      : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </header>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-card border border-border rounded-md animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {films?.map((film) => (
              <Link key={film.id} href={`/`} className="group block">
                <div className="relative aspect-[3/4] rounded-md overflow-hidden bg-zinc-900 border border-border group-hover:border-white/30 transition-all">
                  {film.thumbnailUrl ? (
                    <img 
                      src={film.thumbnailUrl} 
                      alt={film.title} 
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-black" />
                  )}
                  
                  {film.isSerialised && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white uppercase border border-white/10">
                      Series
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                    <div className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">{film.genre}</div>
                    <h3 className="text-lg font-bold text-white leading-tight mb-1">{film.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                      <span>{film.totalEpisodes} Episodes</span>
                      <span>•</span>
                      <span>{film.totalLikes.toLocaleString()} Likes</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
