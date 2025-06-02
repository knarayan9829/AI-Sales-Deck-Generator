import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext.jsx';

export default function DeckHistory() {
  const { decks } = useContext(AppContext);

  return (
    <div className="max-w-10xl mx-auto bg-transparent p-8 shadow rounded-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-100">Sales Deck History</h2>
      {decks.length === 0 
        ? <p className="text-white">No sales decks created yet.</p> 
        : (
          <ul className="space-y-2">
            {decks.map(deck => (
              <li key={deck.id} className="flex justify-between items-center">
                <span className="text-gray-200">{deck.brandName}</span>
                <a 
                  href="#" 
                  className="text-gray-100 hover:text-gray-200 hover:underline"
                  onClick={(e) => e.preventDefault()}
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