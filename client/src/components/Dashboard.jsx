import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import CreateDeck from './CreateDeck.jsx';
import FileManager from './FileManager.jsx';
import DeckHistory from './DeckHistory.jsx';

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="create" replace />} />
          <Route path="create" element={<CreateDeck />} />
          <Route path="files" element={<FileManager />} />
          <Route path="history" element={<DeckHistory />} />
          <Route path="*" element={<Navigate to="create" replace />} />
        </Routes>
      </main>
    </div>
  );
}