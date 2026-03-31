import { useGetTrending, getGetTrendingQueryKey } from "@workspace/api-client-react";
import { Flame, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";

export default function TrendingPage() {
  const { data, isLoading } = useGetTrending({ query: { queryKey: getGetTrendingQueryKey() } });

  if (isLoading) {
    return <div className="p-8 text-white">Loading the zeitgeist...</div>;
  }

  if (!data) return null;

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-8 pt-8 md:pt-12 pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">Trending</h1>
          <p className="text-muted-foreground text-lg">What the loop is obsessed with right now.</p>
        </header>

        {/* Hot Polls Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
            <Flame className="text-primary" size={24} />
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Active Warzones</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.hotPolls.map(poll => (
              <div key={poll.id} className="bg-card border border-border p-5 rounded-lg hover:border-primary/50 transition-colors group cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all" />
                <div className="text-xs font-bold text-primary mb-2">{poll.filmTitle}</div>
                <h3 className="text-lg font-medium text-white mb-4 line-clamp-2">{poll.question}</h3>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">{poll.totalVotes.toLocaleString()} votes</span>
                  <span className="text-accent font-mono bg-accent/10 px-2 py-1 rounded">Live</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Films Section */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
            <TrendingUp className="text-white" size={24} />
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Most Watched</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {data.topFilms.map((film, i) => (
              <Link key={film.id} href={`/`} className="group block">
                <div className="relative aspect-[3/4] rounded-md overflow-hidden bg-zinc-900 border border-border group-hover:border-white/30 transition-all">
                  {film.thumbnailUrl && (
                    <img src={film.thumbnailUrl} alt={film.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                  )}
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute top-2 left-2 text-6xl font-serif font-bold text-white/20 italic tracking-tighter">
                    #{i + 1}
                  </div>
                  <div className="absolute bottom-0 left-0 w-full p-4">
                    <div className="text-xs font-bold text-primary mb-1 uppercase tracking-wider">{film.genre}</div>
                    <h3 className="text-lg font-bold text-white leading-tight">{film.title}</h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Rising Creators */}
        <section>
          <div className="flex items-center gap-3 mb-6 border-b border-border pb-4">
            <Users className="text-white" size={24} />
            <h2 className="text-2xl font-bold text-white uppercase tracking-wide">Architects</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.risingCreators.map((creator, i) => (
              <div key={i} className="flex items-center gap-4 bg-card border border-border p-4 rounded-lg">
                <img src={creator.avatarUrl} alt={creator.name} className="w-12 h-12 rounded-full border border-white/20 object-cover" />
                <div>
                  <div className="font-bold text-white">{creator.name}</div>
                  <div className="text-xs text-accent">+{creator.followerGrowth}% followers</div>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
