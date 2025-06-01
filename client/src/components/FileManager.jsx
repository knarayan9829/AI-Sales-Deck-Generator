import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext.jsx';

export default function FileManager() {
  const { files, addFiles } = useContext(AppContext);

  const handleUpload = (e) => {
    addFiles(e.target.files);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 shadow rounded-lg">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">File Manager</h2>
      <input 
        type="file" 
        multiple 
        onChange={handleUpload} 
        className="mb-4 border-gray-300 bg-gray-50 hover:bg-gray-100 p-2 rounded-lg text-gray-700" 
      />
      <div>
        {files.length === 0 
          ? <p className="text-gray-500">No files uploaded yet.</p> 
          : (
            <ul className="list-disc pl-5">
              {files.map((file, idx) => (
                <li key={idx} className="text-gray-700">{file.name}</li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}