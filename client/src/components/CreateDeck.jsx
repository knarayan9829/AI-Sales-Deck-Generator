// client/src/pages/CreateDeck.jsx

import React, { useContext, useState } from "react";
import { AppContext } from "../context/AppContext.jsx";

export default function CreateDeck() {
  const { files, createDeck, error } = useContext(AppContext);

  // ─── Form state ─────────────────────────────────────────────────────────────
  const [brandName, setBrandName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0d47a1");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [logoFileId, setLogoFileId] = useState("");

  const [selectedPlotFileIds, setSelectedPlotFileIds] = useState([]);
  const [selectedVideoFileIds, setSelectedVideoFileIds] = useState([]);
  const [selectedDocFileIds, setSelectedDocFileIds] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // ─── Helpers: filter files by type ────────────────────────────────────────────
  const imageFiles = files.filter((f) => f.mimeType.startsWith("image/"));
  const csvFiles = files.filter((f) => f.name.toLowerCase().endsWith(".csv"));
  const videoFiles = files.filter((f) => f.mimeType.startsWith("video/"));
  const otherFiles = files.filter(
    (f) =>
      !f.mimeType.startsWith("image/") &&
      !f.mimeType.startsWith("video/") &&
      !f.name.toLowerCase().endsWith(".csv")
  );

  // Toggle an ID in a multi-select array
  const toggleSelection = (id, setter, currentArray) => {
    if (currentArray.includes(id)) {
      setter(currentArray.filter((x) => x !== id));
    } else {
      setter([...currentArray, id]);
    }
  };

  // ─── Handle form submission ─────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setIsSubmitting(true);

    // Basic validation
    if (!brandName.trim() || !logoFileId) {
      alert("Brand Name and Logo are required.");
      setIsSubmitting(false);
      return;
    }

    const payload = {
      brandName: brandName.trim(),
      shortDescription: shortDescription.trim(),
      primaryColor,
      secondaryColor,
      logoFileId,
      relevantFileIds: selectedPlotFileIds,
      videoFileIds: selectedVideoFileIds,
      documentFileIds: selectedDocFileIds,
    };

    try {
      const deck = await createDeck(payload);
      setSuccessMsg("Sales deck created successfully!");
      // Optionally, redirect to deck.deckUrl:
      // window.location.href = deck.deckUrl;
    } catch (err) {
      // `error` from context will already be set
    }

    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto bg-gradient-to-br from-gray-800 to-gray-900 p-8 shadow-lg rounded-lg">
      <h2 className="text-3xl font-semibold mb-6 text-white">
        Create Sales Deck
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-white">
        {/* ─── Brand Name ────────────────────────────────────────────────────── */}
        <div>
          <label className="block font-medium mb-1">Brand Name *</label>
          <input
            type="text"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
            required
          />
        </div>

        {/* ─── Short Description ──────────────────────────────────────────────── */}
        <div>
          <label className="block font-medium mb-1">Short Description</label>
          <textarea
            rows="3"
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
        </div>

        {/* ─── Primary / Secondary Colours ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Primary Colour</label>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-16 h-16 border-0"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Secondary Colour</label>
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-16 h-16 border-0"
            />
          </div>
        </div>

        {/* ─── Logo (Image dropdown) ─────────────────────────────────────────── */}
        <div>
          <label className="block font-medium mb-1">Logo *</label>
          <select
            value={logoFileId}
            onChange={(e) => setLogoFileId(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-800"
            required
          >
            <option value="">— Choose a logo image —</option>
            {imageFiles.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* ─── Relevant Files for Plots (CSV only) ───────────────────────────── */}
        <div>
          <label className="block font-medium mb-1">
            Relevant Files (CSV for plots)
          </label>
          <ul className="max-h-40 overflow-y-auto border border-gray-200 bg-gray-700 rounded-lg p-2">
            {csvFiles.length === 0 && (
              <li className="text-gray-400 italic">
                No CSV files available.
              </li>
            )}
            {csvFiles.map((f) => (
              <li
                key={f._id}
                className="flex items-center mb-1 text-gray-100"
              >
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={selectedPlotFileIds.includes(f._id)}
                  onChange={() =>
                    toggleSelection(
                      f._id,
                      setSelectedPlotFileIds,
                      selectedPlotFileIds
                    )
                  }
                />
                <label>{f.name}</label>
              </li>
            ))}
          </ul>
        </div>

        {/* ─── Brand Videos (video/* only) ────────────────────────────────────── */}
        <div>
          <label className="block font-medium mb-1">Brand Videos</label>
          <ul className="max-h-40 overflow-y-auto border border-gray-200 bg-gray-700 rounded-lg p-2">
            {videoFiles.length === 0 && (
              <li className="text-gray-400 italic">
                No video files available.
              </li>
            )}
            {videoFiles.map((f) => (
              <li
                key={f._id}
                className="flex items-center mb-1 text-gray-100"
              >
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={selectedVideoFileIds.includes(f._id)}
                  onChange={() =>
                    toggleSelection(
                      f._id,
                      setSelectedVideoFileIds,
                      selectedVideoFileIds
                    )
                  }
                />
                <label>{f.name}</label>
              </li>
            ))}
          </ul>
        </div>

        {/* ─── Brand Documents (all other files) ─────────────────────────────── */}
        <div>
          <label className="block font-medium mb-1">Brand Documents</label>
          <ul className="max-h-40 overflow-y-auto border border-gray-200 bg-gray-700 rounded-lg p-2">
            {otherFiles.length === 0 && (
              <li className="text-gray-400 italic">
                No other files available.
              </li>
            )}
            {otherFiles.map((f) => (
              <li
                key={f._id}
                className="flex items-center mb-1 text-gray-100"
              >
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={selectedDocFileIds.includes(f._id)}
                  onChange={() =>
                    toggleSelection(
                      f._id,
                      setSelectedDocFileIds,
                      selectedDocFileIds
                    )
                  }
                />
                <label>{f.name}</label>
              </li>
            ))}
          </ul>
        </div>

        {/* ─── Submit Button ───────────────────────────────────────────────────── */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${
              isSubmitting
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white px-6 py-2 rounded-lg transition`}
          >
            {isSubmitting ? "Creating…" : "Create Sales Deck"}
          </button>
        </div>
      </form>
    </div>
  );
}
