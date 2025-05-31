import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, onLogout }) {
  const tabs = [
    { id: 'create', label: 'Create Sales Deck' },
    { id: 'files', label: 'File Manager' },
    { id: 'history', label: 'Sales Deck History' }
  ];

  return (
    <div className="w-60 bg-white shadow-lg flex flex-col">
      <div className="p-6 text-2xl font-bold border-b">SalesDeck</div>
      <nav className="flex-1 p-4 space-y-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`w-full text-left px-4 py-2 rounded-lg ${
              activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <button
        onClick={onLogout}
        className="m-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
      >
        Logout
      </button>
    </div>
  );
}