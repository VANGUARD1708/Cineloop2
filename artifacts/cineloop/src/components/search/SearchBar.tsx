import useSearch from "@/hooks/useSearch";

export default function SearchBar() {
  const {
    query,
    setQuery,
    results,
    loading,
  } = useSearch();

  return (
    <div className="relative w-full">
      <input
        value={query}
        onChange={(e) =>
          setQuery(e.target.value)
        }
        placeholder="Search..."
        className="w-full bg-black border border-white/10 px-4 py-2 text-white rounded-md"
      />

      {query && (
        <div className="absolute top-full left-0 right-0 bg-black border border-white/10 mt-2 rounded-md max-h-80 overflow-auto z-50">
          {loading && (
            <div className="p-3 text-sm text-zinc-400">
              Searching...
            </div>
          )}

          {results.map((r) => (
            <div
              key={r.id}
              className="p-3 hover:bg-white/5 cursor-pointer"
            >
              <div className="text-white text-sm">
                {r.title}
              </div>
              {r.subtitle && (
                <div className="text-xs text-zinc-400">
                  {r.subtitle}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}