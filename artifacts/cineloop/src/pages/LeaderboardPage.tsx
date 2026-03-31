import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { Trophy, Flame } from "lucide-react";

export default function LeaderboardPage() {
  const { data: leaderboard, isLoading } = useGetLeaderboard({ query: { queryKey: getGetLeaderboardQueryKey() } });

  if (isLoading) {
    return <div className="p-8 text-white">Calculating rankings...</div>;
  }

  const top3 = leaderboard?.slice(0, 3) || [];
  const rest = leaderboard?.slice(3) || [];

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-8 pt-8 pb-24">
      <div className="max-w-4xl mx-auto">
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4 flex justify-center items-center gap-4">
            <Trophy className="text-primary hidden md:block" size={48} />
            Hall of Fame
            <Trophy className="text-primary hidden md:block" size={48} />
          </h1>
          <p className="text-muted-foreground text-lg">The most influential architects in the loop.</p>
        </header>

        {/* Top 3 Podium */}
        <div className="flex flex-col md:flex-row justify-center items-end gap-4 md:gap-8 mb-16 h-auto md:h-64 px-4">
          {/* Silver (Rank 2) */}
          {top3[1] && (
            <div className="order-2 md:order-1 flex flex-col items-center w-full md:w-1/3">
              <AvatarWithRank entry={top3[1]} color="border-zinc-300" ring="ring-zinc-300/30" />
              <div className="w-full bg-gradient-to-t from-zinc-800 to-zinc-900 border border-zinc-700 h-24 md:h-32 rounded-t-lg mt-4 p-4 flex flex-col justify-end items-center relative overflow-hidden">
                <div className="text-3xl font-bold text-zinc-300 opacity-20 absolute top-2 right-4">#2</div>
                <div className="font-bold text-white">{top3[1].username}</div>
                <div className="text-sm text-zinc-400 font-mono">{top3[1].xp.toLocaleString()} XP</div>
              </div>
            </div>
          )}

          {/* Gold (Rank 1) */}
          {top3[0] && (
            <div className="order-1 md:order-2 flex flex-col items-center w-full md:w-1/3 mb-4 md:mb-0 z-10">
              <AvatarWithRank entry={top3[0]} color="border-amber-400" ring="ring-amber-400/50" />
              <div className="w-full bg-gradient-to-t from-amber-900/40 to-black border border-amber-600/50 h-32 md:h-48 rounded-t-lg mt-4 p-4 flex flex-col justify-end items-center relative overflow-hidden">
                <div className="absolute top-0 w-full h-1 bg-amber-400" />
                <div className="text-5xl font-bold text-amber-500 opacity-20 absolute top-4 right-4">#1</div>
                <div className="font-bold text-lg text-amber-400 drop-shadow-md">{top3[0].username}</div>
                <div className="text-sm text-amber-200/70 font-mono">{top3[0].xp.toLocaleString()} XP</div>
              </div>
            </div>
          )}

          {/* Bronze (Rank 3) */}
          {top3[2] && (
            <div className="order-3 flex flex-col items-center w-full md:w-1/3">
              <AvatarWithRank entry={top3[2]} color="border-orange-700" ring="ring-orange-700/30" />
              <div className="w-full bg-gradient-to-t from-orange-950 to-zinc-900 border border-orange-900/50 h-20 md:h-24 rounded-t-lg mt-4 p-4 flex flex-col justify-end items-center relative overflow-hidden">
                <div className="text-3xl font-bold text-orange-700 opacity-20 absolute top-2 right-4">#3</div>
                <div className="font-bold text-white">{top3[2].username}</div>
                <div className="text-sm text-zinc-400 font-mono">{top3[2].xp.toLocaleString()} XP</div>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="space-y-3">
          {rest.map((entry) => (
            <div key={entry.userId} className="flex items-center gap-4 bg-card border border-border p-4 rounded-lg hover:border-white/20 transition-all group">
              <div className="w-8 text-center font-serif font-bold text-xl text-zinc-500 group-hover:text-white transition-colors">
                {entry.rank}
              </div>
              
              <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden bg-black shrink-0">
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt={entry.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-serif">
                    {entry.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="font-bold text-white text-lg">{entry.username}</div>
                <div className="flex gap-4 text-xs mt-1">
                  <span className="text-primary font-bold">Lvl {entry.level}</span>
                  {entry.streakDays > 0 && (
                    <span className="text-accent flex items-center gap-1">
                      <Flame size={12} /> {entry.streakDays}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-mono text-white font-bold">{entry.xp.toLocaleString()}</div>
                <div className="text-xs text-zinc-500 uppercase">XP</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

function AvatarWithRank({ entry, color, ring }: { entry: any, color: string, ring: string }) {
  return (
    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full border-4 ${color} ring-4 ${ring} overflow-hidden bg-black z-10 relative`}>
      {entry.avatarUrl ? (
        <img src={entry.avatarUrl} alt={entry.username} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-3xl font-serif text-white">
          {entry.username.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}
