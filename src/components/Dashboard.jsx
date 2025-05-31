import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import CreateDeck from './CreateDeck.jsx';
import FileManager from './FileManager.jsx';
import DeckHistory from './DeckHistory.jsx';

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('create');

  const renderTab = () => {
    switch (activeTab) {
      case 'create':
        return <CreateDeck />;
      case 'files':
        return <FileManager />;
      case 'history':
        return <DeckHistory />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={onLogout} />
      <main className="flex-1 p-8 overflow-auto">
        {renderTab()}
      </main>
    </div>
  );
}