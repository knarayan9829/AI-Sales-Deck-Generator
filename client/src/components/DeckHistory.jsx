// client/src/pages/DeckHistory.jsx

import React, { useContext } from "react";
import { AppContext } from "../context/AppContext.jsx";

export default function DeckHistory() {
  const { decks } = useContext(AppContext);

  // Derive the backend root (e.g. "http://localhost:5000")
  const backendRoot = import.meta.env.VITE_API_URL.replace("/api", "");

  return (
    <div className="max-w-10xl mx-auto bg-transparent p-8 shadow rounded-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-100">
        Sales Deck History
      </h2>

      {decks.length === 0 ? (
        <p className="text-gray-300">No sales decks created yet.</p>
      ) : (
        <ul className="space-y-3">
          {decks.map((deck) => (
            <li
              key={deck._id}
              className="flex justify-between items-center bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-700"
            >
              <div>
                <span className="text-gray-200 font-medium">
                  {deck.brandName}
                </span>
                <br />
                <span className="text-gray-400 text-sm">
                  {new Date(deck.createdAt).toLocaleString()}
                </span>
              </div>
              <a
                href={`${backendRoot}${deck.deckUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:underline"
              >
                View Deck
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
