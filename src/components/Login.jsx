import React, { useState } from 'react';

const CORRECT_USERNAME = "admin";
const CORRECT_PASSWORD = "password123";

export default function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({ username: "", password: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    const { username, password } = credentials;
    if (username === CORRECT_USERNAME && password === CORRECT_PASSWORD) {
      onLogin();
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="flex h-screen">
      {/* Left Panel */}
      <div className="w-1/2 flex flex-col justify-center items-start p-12 bg-white">
        <h1 className="text-4xl font-bold mb-8">Log in to your Account</h1>
        <div className="flex space-x-4 mb-4">
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">Google</button>
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">Facebook</button>
        </div>
        <span className="text-gray-500 mb-4">or continue with email</span>
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <input 
            type="text" 
            placeholder="Email" 
            className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
            onChange={e => setCredentials({ ...credentials, username: e.target.value })} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
            onChange={e => setCredentials({ ...credentials, password: e.target.value })} 
          />
          <div className="flex justify-between items-center text-sm text-gray-500">
            <label>
              <input type="checkbox" className="mr-1" /> Remember me
            </label>
            <a href="#" className="hover:underline">Forgot Password?</a>
          </div>
          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Log in
          </button>
          <div className="text-center text-gray-500 text-sm">
            Don’t have an account? <a href="#" className="text-blue-600 hover:underline">Create an account</a>
          </div>
        </form>
      </div>
      {/* Right Panel */}
      <div className="w-1/2 bg-blue-600 text-white flex flex-col justify-center items-center p-12">
        {/* Placeholder for illustration */}
        <div className="max-w-xs">
          <h2 className="text-2xl font-semibold mb-4">Connect with every application.</h2>
          <p>Everything you need in an easily customizable dashboard.</p>
        </div>
      </div>
    </div>
  );
}