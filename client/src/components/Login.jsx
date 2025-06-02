import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo 2.png';

const CORRECT_USERNAME = "admin";
const CORRECT_PASSWORD = "password123";

export default function Login() {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const { username, password } = credentials;
    if (username === CORRECT_USERNAME && password === CORRECT_PASSWORD) {
      navigate('/dashboard/create');
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel */}
      <div className="w-1/2 flex flex-col justify-center items-center bg-gray-900 text-white p-12">
        
        <h1 className="text-4xl font-bold mb-8">Log in to your Account</h1>
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <input 
            type="text" 
            placeholder="Username"
            className="w-full border border-gray-700 bg-gray-800 px-4 py-2 rounded-lg placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-gray-600" 
            onChange={e => setCredentials({ ...credentials, username: e.target.value })} 
          />
          <input 
            type="password" 
            placeholder="Password"
            className="w-full border border-gray-700 bg-gray-800 px-4 py-2 rounded-lg placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-gray-600" 
            onChange={e => setCredentials({ ...credentials, password: e.target.value })} 
          />
          <button 
            type="submit" 
            className="w-full bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Log in
          </button>
        </form>
      </div>
      {/* Right Panel */}
      <div className="w-1/2 flex flex-col justify-center items-center p-12 bg-white text-black">
        <div className="max-w-xs text-center">
          <img src={logo} alt="DECGEN.AI" className="mb-10 h-15" />
          <h2 className="text-3xl font-semibold mb-4">Securely generate AI-powered sales decks for your brand.</h2>
        </div>
      </div>
    </div>
  );
}