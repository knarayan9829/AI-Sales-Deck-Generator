import React, { createContext, useState, useEffect } from "react";

export const AppContext = createContext();

export function AppProvider({ children }) {
  const [files, setFiles] = useState([]);       // existing
  const [decks, setDecks] = useState([]);       // we’ll fetch from /api/decks
  const [error, setError] = useState("");

  // ─── Fetch files from /api/upload ───────────────────────────────────────────
  const fetchFiles = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/upload`);
      const data = await res.json();
      if (res.ok) {
        setFiles(data.files);
      } else {
        console.error("Failed to fetch files:", data.error);
      }
    } catch (err) {
      console.error("Error fetching files:", err);
    }
  };

  // ─── Fetch decks from /api/decks ────────────────────────────────────────────
  const fetchDecks = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/decks`);
      const data = await res.json();
      if (res.ok) {
        setDecks(data.decks);
      } else {
        console.error("Failed to fetch decks:", data.error);
      }
    } catch (err) {
      console.error("Error fetching decks:", err);
    }
  };

  // On mount, load both files and decks
  useEffect(() => {
    fetchFiles();
    fetchDecks();
  }, []);

  // ─── Upload new files to /api/upload with sensitive flags ─────────────────────────────
  const addFiles = async (fileList, sensitiveFlags = []) => {
    if (!fileList || fileList.length === 0) return;
    const formData = new FormData();
    Array.from(fileList).forEach((file) => formData.append("files", file));
    
    // Add sensitive flags as JSON string
    if (sensitiveFlags && sensitiveFlags.length > 0) {
      formData.append("sensitive", JSON.stringify(sensitiveFlags));
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        await fetchFiles();
      } else {
        console.error("Upload failed:", data.error);
      }
    } catch (err) {
      console.error("Error uploading files:", err);
    }
  };

  // ─── Delete a file from /api/upload/:id (unchanged) ─────────────────────────
  const deleteFile = async (fileId) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/upload/${fileId}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (res.ok) {
        await fetchFiles();
      } else {
        console.error("Delete failed:", data.error);
      }
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  };

  // ─── Create a new deck via POST /api/decks ──────────────────────────────────
  // payload should match the API schema: { brandName, shortDescription, primaryColor, secondaryColor, logoFileId, relevantFileIds, videoFileIds, documentFileIds }
  const createDeck = async (payload) => {
    setError("");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/decks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create sales deck.");
      }
      // On success, re-fetch the deck list
      await fetchDecks();
      return data.deck; // return the saved Deck object (in case caller wants the URL)
    } catch (err) {
      console.error("Error creating deck:", err);
      setError(err.message || "Server error.");
      throw err;
    }
  };

  return (
    <AppContext.Provider
      value={{
        files,
        addFiles,
        deleteFile,
        decks,
        createDeck,
        error,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
