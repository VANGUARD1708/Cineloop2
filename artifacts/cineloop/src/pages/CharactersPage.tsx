import { useGetCharacters, useFollowCharacter, getGetCharactersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Users, UserPlus, UserCheck } from "lucide-react";

export default function CharactersPage() {
  const { data: characters, isLoading } = useGetCharacters({ query: { queryKey: getGetCharactersQueryKey() } });
  const followMutation = useFollowCharacter();
  const queryClient = useQueryClient();

  const handleFollow = (id: number) => {
    followMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCharactersQueryKey() });
      }
    });
  };

  if (isLoading) {
    return <div className="p-8 text-white">Loading characters...</div>;
  }

  return (
    <div className="w-full min-h-screen bg-background p-4 md:p-8 pt-8 pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">Entities</h1>
          <p className="text-muted-foreground text-lg">Follow characters to receive their direct messages and updates.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters?.map((char) => (
            <div key={char.id} className="bg-card border border-border rounded-lg overflow-hidden flex flex-col hover:border-white/20 transition-colors">
              <div className="relative h-32 bg-zinc-900 border-b border-border">
                {char.avatarUrl && (
                  <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover opacity-50 blur-sm" />
                )}
                <div className="absolute -bottom-10 left-6">
                  <div className="w-20 h-20 rounded-sm bg-black border-2 border-border overflow-hidden">
                    {char.avatarUrl ? (
                      <img src={char.avatarUrl} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                        <Users size={32} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 border border-white/10 rounded text-xs text-white font-mono">
                  {char.followerCount.toLocaleString()} followers
                </div>
              </div>
              
              <div className="pt-12 px-6 pb-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="text-xl font-bold text-white">{char.name}</h2>
                    <p className="text-sm text-primary uppercase tracking-wider font-bold">{char.filmTitle}</p>
                  </div>
                  <button 
                    onClick={() => handleFollow(char.id)}
                    className={`p-2 rounded-md border transition-all ${
                      char.isFollowed 
                        ? "bg-white/10 border-white/20 text-white hover:bg-destructive hover:border-destructive hover:text-white" 
                        : "bg-primary border-primary text-white hover:bg-primary/80"
                    }`}
                  >
                    {char.isFollowed ? <UserCheck size={18} /> : <UserPlus size={18} />}
                  </button>
                </div>
                
                <p className="text-muted-foreground text-sm mt-3 flex-1">
                  {char.bio}
                </p>

                <div className="mt-6 p-3 bg-black/50 border border-white/5 rounded-md">
                  <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Latest Transmission</div>
                  <p className="text-sm text-zinc-300 font-mono italic">"{char.latestUpdate}"</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
