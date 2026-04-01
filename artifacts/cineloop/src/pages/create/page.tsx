"use client";

import { useState } from "react";

export default function CreateWarzonePage() {
  const [question, setQuestion] = useState("");
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const submit = async () => {
    await fetch("/api/warzones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        optionA: a,
        optionB: b,
      }),
    });

    setQuestion("");
    setA("");
    setB("");
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 space-y-4">
      <h1 className="text-2xl font-bold">Create Warzone</h1>

      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Question"
        className="w-full p-3 rounded-lg bg-zinc-900"
      />

      <input
        value={a}
        onChange={(e) => setA(e.target.value)}
        placeholder="Option A"
        className="w-full p-3 rounded-lg bg-zinc-900"
      />

      <input
        value={b}
        onChange={(e) => setB(e.target.value)}
        placeholder="Option B"
        className="w-full p-3 rounded-lg bg-zinc-900"
      />

      <button
        onClick={submit}
        className="w-full bg-red-600 p-3 rounded-lg"
      >
        Create
      </button>
    </div>
  );
}