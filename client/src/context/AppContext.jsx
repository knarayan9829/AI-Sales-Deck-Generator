import React, { createContext, useState } from 'react';

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [files, setFiles] = useState([]); 
  const [decks, setDecks] = useState([]); 

  const addFiles = (newFiles) => {
    const fileArray = Array.from(newFiles).map(file => ({
      name: file.name,
      url: URL.createObjectURL(file)
    }));
    setFiles(prev => [...prev, ...fileArray]);
  };

  const createDeck = (deck) => {
    setDecks(prev => [...prev, { id: Date.now(), ...deck }]);
  };

  return (
    <AppContext.Provider value={{ files, addFiles, decks, createDeck }}>
      {children}
    </AppContext.Provider>
  );
}