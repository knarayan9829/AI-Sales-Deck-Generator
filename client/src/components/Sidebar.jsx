import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/logo 2.png';

export default function Sidebar() {
  const navigate = useNavigate();
  const tabs = [
    { to: 'create', label: 'Create Sales Deck' },
    { to: 'files',  label: 'File Manager' },
    { to: 'history', label: 'Sales Deck History' }
  ];

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="w-80 flex flex-col h-full">
      {/* Gradient Header with Logo */}
      <div className="h-20 flex items-center justify-center bg-gray-100 p-6">
        <img src={logo} alt="DECGEN.AI" className="h-10" navigate={'dashboard'}></img>
      </div>

      {/* Tab List */}
      <nav className="flex-1 bg-white p-4 space-y-2">
        {tabs.map(tab => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `block px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-brand-gradient text-white'
                  : 'text-black hover:bg-brand-gradient hover:text-white'
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout Button */}
      <div className="p-4 bg-gray-100">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-brand-gradient hover:bg-red-700 text-white rounded-lg"
        >
          Logout
        </button>
      </div>
    </div>
  );
}