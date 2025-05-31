import React, { useState } from 'react';
import { AppProvider } from './context/AppContext.jsx';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);

  return (
    <AppProvider>
      {authenticated 
        ? <Dashboard onLogout={() => setAuthenticated(false)} /> 
        : <Login onLogin={() => setAuthenticated(true)} />
      }
    </AppProvider>
  );
}