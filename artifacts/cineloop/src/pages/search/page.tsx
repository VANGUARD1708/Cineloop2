"use client";

import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search movies, shows..."
        className="w-full p-3 rounded-lg bg-zinc-900 border border-white/10"
      />

      <div className="mt-6 text-white/60">
        Start typing to search...
      </div>
    </div>
  );
}