// client/src/components/FileManager.jsx
import React, { useContext } from "react";
import { AppContext } from "../context/AppContext.jsx";

export default function FileManager() {
  const { files, addFiles, deleteFile } = useContext(AppContext);

  const handleUpload = (e) => {
    const selectedFiles = e.target.files;
    addFiles(selectedFiles);
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
