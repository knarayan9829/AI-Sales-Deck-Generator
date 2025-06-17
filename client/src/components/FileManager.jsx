// client/src/components/FileManager.jsx
import React, { useContext, useState } from "react";
import { AppContext } from "../context/AppContext.jsx";

export default function FileManager() {
  const { files, addFiles, deleteFile } = useContext(AppContext);
  const [sensitiveFlags, setSensitiveFlags] = useState([]);

  const handleUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Show sensitivity selection for each file
    if (selectedFiles.length > 0) {
      const flags = new Array(selectedFiles.length).fill(false);
      setSensitiveFlags(flags);
      
      // Create a temporary state to manage sensitivity selection
      showSensitivityDialog(selectedFiles, flags);
    }
  };

  const showSensitivityDialog = (selectedFiles, flags) => {
    // Create modal dialog for sensitivity selection
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
      background: rgba(0,0,0,0.5); z-index: 1000; display: flex; 
      align-items: center; justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white; padding: 2rem; border-radius: 8px; 
      max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;
    `;
    
    content.innerHTML = `
      <h3 style="margin-top: 0; color: #333;">Document Security Settings</h3>
      <p style="color: #666; margin-bottom: 1.5rem;">
        Mark documents as sensitive if they contain confidential information. 
        Sensitive documents will be processed locally for enhanced security.
      </p>
      <div id="file-list"></div>
      <div style="margin-top: 1.5rem; text-align: right;">
        <button id="cancel-btn" style="margin-right: 1rem; padding: 0.5rem 1rem; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
        <button id="upload-btn" style="padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Upload Files</button>
      </div>
    `;
    
    const fileList = content.querySelector('#file-list');
    selectedFiles.forEach((file, index) => {
      const fileDiv = document.createElement('div');
      fileDiv.style.cssText = 'margin-bottom: 1rem; padding: 1rem; border: 1px solid #ddd; border-radius: 4px;';
      fileDiv.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 0.5rem;">${file.name}</div>
        <div style="font-size: 0.9em; color: #666; margin-bottom: 0.5rem;">${file.type} • ${(file.size / 1024).toFixed(1)} KB</div>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="checkbox" id="sensitive-${index}" style="margin-right: 0.5rem;" />
          <span>🔒 Mark as sensitive document</span>
        </label>
      `;
      fileList.appendChild(fileDiv);
    });
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Handle cancel
    content.querySelector('#cancel-btn').onclick = () => {
      document.body.removeChild(modal);
      // Reset file input
      e.target.value = '';
    };
    
    // Handle upload
    content.querySelector('#upload-btn').onclick = () => {
      const finalFlags = selectedFiles.map((_, index) => {
        const checkbox = document.getElementById(`sensitive-${index}`);
        return checkbox.checked;
      });
      
      document.body.removeChild(modal);
      addFiles(selectedFiles, finalFlags);
      // Reset file input
      e.target.value = '';
    };
  };

  return (
    <div className="max-w-10xl mx-auto bg-transparent p-8 shadow rounded-lg">
      <h2 className="text-2xl font-semibold mb-4 text-white">File Manager</h2>

      <input
        type="file"
        multiple
        onChange={handleUpload}
        className="mb-4"
      />

      <div>
        {files.length === 0 ? (
          <p className="text-gray-200">No files uploaded yet.</p>
        ) : (
          <table className="min-w-full text-left text-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-2">Filename</th>
                <th className="px-4 py-2">Size (bytes)</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Security</th>
                <th className="px-4 py-2">Uploaded At</th>
                <th className="px-4 py-2">Link</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file._id} className="border-t border-gray-700">
                  <td className="px-4 py-2">{file.name}</td>
                  <td className="px-4 py-2">{file.size}</td>
                  <td className="px-4 py-2">{file.mimeType}</td>
                  <td className="px-4 py-2">
                    {file.sensitive ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        🔒 Sensitive
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        📄 Standard
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {new Date(file.uploadDate).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <a
                      href={`${import.meta.env.VITE_API_URL.replace("/api", "")}${file.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-white"
                    >
                      Download
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => deleteFile(file._id)}
                      className="px-2 py-1 bg-white rounded hover:bg-gray-200 text-black text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
