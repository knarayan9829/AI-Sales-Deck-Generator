import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext.jsx';

export default function CreateDeck() {
  const { files, createDeck } = useContext(AppContext);
  const [brandName, setBrandName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    createDeck({ brandName, description, selectedFiles, figures: [] });
    setBrandName('');
    setDescription('');
    setSelectedFiles([]);
    alert('Sales deck created!');
  };

  const toggleFile = (file) => {
    setSelectedFiles(prev =>
      prev.includes(file) ? prev.filter(f => f !== file) : [...prev, file]
    );
  };

  return (
    <div className="max-w-10xl mx-auto bg-gradient p-8 shadow rounded-lg">
      <h2 className="text-2xl font-semibold mb-4 text-white">Create Sales Deck</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-white mb-1">Brand Name</label>
          <input
            type="text"
            value={brandName}
            onChange={e => setBrandName(e.target.value)}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600"
            required
          />
        </div>
        <div>
          <label className="block text-white mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-600"
            rows="4"
            required
          />
        </div>
        <div>
          <label className="block text-white mb-1">Relevant Files (Select)</label>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
            {files.length === 0 && <p className="text-white">No files uploaded.</p>}
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center mb-1">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={selectedFiles.includes(file)}
                  onChange={() => toggleFile(file)}
                />
                <span className="text-white">{file.name}</span>
              </div>
            ))}
          </div>
        </div>
        <button
          type="submit"
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          Create Sales Deck
        </button>
      </form>
    </div>
  );
}