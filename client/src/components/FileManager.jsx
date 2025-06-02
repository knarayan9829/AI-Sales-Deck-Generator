import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext.jsx';

export default function FileManager() {
  const { files, addFiles } = useContext(AppContext);

  const handleUpload = (e) => {
    addFiles(e.target.files);
  };

  return (
    <div className="max-w-10xl mx-auto bg-transparent p-8 shadow rounded-lg">
      <h2 className="text-2xl font-semibold mb-4 text-white">File Manager</h2>
      <input 
        type="file" 
        multiple 
        onChange={handleUpload} 
        className="mb-4 border-gray-300 bg-transparent text-white p-2 rounded-lg "
      />
      <div>
        {files.length === 0 
          ? <p className="text-gray-200">No files uploaded yet.</p> 
          : (
            <ul className="list-disc pl-5">
              {files.map((file, idx) => (
                <li key={idx} className="text-gray-100">{file.name}</li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}