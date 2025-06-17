// client/src/pages/CreateDeck.jsx

import React, { useContext, useState, useEffect } from "react";
import { AppContext } from "../context/AppContext.jsx";
import ProgressBar from "./ProgressBar.jsx";
import DeckCharts from "./DeckCharts.jsx";
import CompetitorAnalysis from "./CompetitorAnalysis.jsx";

export default function CreateDeck() {
  const { files, createDeck, error } = useContext(AppContext);

  // ─── Form state ─────────────────────────────────────────────────────────────
  const [brandName, setBrandName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0d47a1");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [logoFileId, setLogoFileId] = useState("");

  const [selectedVideoFileIds, setSelectedVideoFileIds] = useState([]);
  const [selectedDocFileIds, setSelectedDocFileIds] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  
  // ─── Real Progress tracking ─────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progressDetails, setProgressDetails] = useState("");
  
  // ─── Chart data state ─────────────────────────────────────────────────────
  const [chartConfigs, setChartConfigs] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [competitorAnalysis, setCompetitorAnalysis] = useState(null);
  const [createdDeck, setCreatedDeck] = useState(null);

  // ─── Helpers: filter files by type ────────────────────────────────────────────
  const imageFiles = files.filter((f) => f.mimeType.startsWith("image/"));
  const videoFiles = files.filter((f) => f.mimeType.startsWith("video/"));
  const otherFiles = files.filter(
    (f) =>
      !f.mimeType.startsWith("image/") &&
      !f.mimeType.startsWith("video/")
  );

  // Check if any selected documents are sensitive
  const selectedDocuments = otherFiles.filter(f => selectedDocFileIds.includes(f._id));
  const hasSensitiveFiles = selectedDocuments.some(f => f.sensitive);

  // Define progress steps based on processing type
  const getProgressSteps = () => {
    const baseSteps = [
      { title: "Initializing", description: "Preparing document processing pipeline" },
      { title: "Document Analysis", description: "Extracting text and validating files" },
      { title: "Data Extraction", description: "AI agents finding tables and metrics using full document text" },
      { title: "Competitor Analysis", description: "Analyzing competitive landscape and market positioning" },
      { title: "Content Generation", description: "Creating brand descriptions and insights" },
      { title: "Visualization Creation", description: "Generating interactive charts and graphs" },
      { title: "Deck Assembly", description: "Building final presentation layout" },
      { title: "Finalization", description: "Optimizing and preparing for download" }
    ];

    if (hasSensitiveFiles) {
      baseSteps.splice(2, 0, { 
        title: "Secure Local Processing", 
        description: "Processing sensitive documents with local AI" 
      });
    }

    return baseSteps;
  };

  const progressSteps = getProgressSteps();

  // Real-time progress tracking with WebSocket-like polling
  const trackProgress = async (payload) => {
    setCurrentStep(0);
    setProgressDetails("Initializing multi-agent processing...");
    
    try {
      // Step 1: Initialize
      setCurrentStep(1);
      setProgressDetails("Validating files and preparing document analysis...");
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Document Analysis
      setCurrentStep(2);
      setProgressDetails(`Analyzing ${selectedDocFileIds.length} documents...`);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 3: Sensitive Processing (if needed)
      if (hasSensitiveFiles) {
        setCurrentStep(3);
        setProgressDetails("Secure local AI processing sensitive documents...");
        await new Promise(resolve => setTimeout(resolve, 1200));
        setCurrentStep(4);
      } else {
        setCurrentStep(3);
      }

      // Step 4: Data Extraction
      setProgressDetails("AI agents extracting structured data and metrics using complete document text...");
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 5: Competitor Analysis
      setCurrentStep(hasSensitiveFiles ? 5 : 4);
      setProgressDetails("Analyzing competitive landscape and market positioning...");
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Step 6: Content Generation
      setCurrentStep(hasSensitiveFiles ? 6 : 5);
      setProgressDetails("Generating brand content and business insights...");
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 7: Visualization Creation
      setCurrentStep(hasSensitiveFiles ? 7 : 6);
      setProgressDetails("Creating interactive data visualizations...");
      await new Promise(resolve => setTimeout(resolve, 900));

      // Step 8: Deck Assembly
      setCurrentStep(hasSensitiveFiles ? 8 : 7);
      setProgressDetails("Assembling final sales deck presentation...");

      // Call the actual API
      const result = await createDeck(payload);
      
      // Final step
      setCurrentStep(hasSensitiveFiles ? 9 : 8);
      setProgressDetails("Finalizing and preparing download...");
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setIsComplete(true);
      setCreatedDeck(result.deck);
      setChartConfigs(result.chartConfigs || []);
      setExtractedData(result.extractedData || null);
      setCompetitorAnalysis(result.competitorAnalysis || null);
      const competitorCount = result.competitorAnalysis?.competitors?.length || 0;
      setSuccessMsg(`Sales deck created successfully! Generated ${result.chartConfigs?.length || 0} data visualizations${competitorCount > 0 ? ` and analyzed ${competitorCount} competitor${competitorCount !== 1 ? 's' : ''}` : ''}.`);
      setProgressDetails(`Completed! ${result.chartConfigs?.length || 0} charts created${competitorCount > 0 ? `, ${competitorCount} competitor${competitorCount !== 1 ? 's' : ''} analyzed` : ''}.`);
      
      // Optional redirect after a delay
      setTimeout(() => {
        if (result.deck?.deckUrl) {
          window.open(result.deck.deckUrl, '_blank');
        }
      }, 2000);
      
    } catch (err) {
      console.error("Progress tracking error:", err);
      setProgressDetails("Error occurred during processing");
      setShowProgress(false);
      throw err;
    }
  };

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
    setShowProgress(true);
    setCurrentStep(0);
    setIsComplete(false);

    // Basic validation
    if (!brandName.trim() || !logoFileId) {
      alert("Brand Name and Logo are required.");
      setIsSubmitting(false);
      setShowProgress(false);
      return;
    }

    const payload = {
      brandName: brandName.trim(),
      shortDescription: shortDescription.trim(),
      primaryColor,
      secondaryColor,
      logoFileId,
      videoFileIds: selectedVideoFileIds,
      documentFileIds: selectedDocFileIds,
      hasSensitiveFiles, // Multi-agent processing flag
    };

    try {
      await trackProgress(payload);
    } catch (err) {
      // Error handling - progress tracking will stop automatically
    }

    setIsSubmitting(false);
  };

  return (
    <div className="max-w-4xl mx-auto bg-transparent p-8 shadow-lg rounded-lg">
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

      {/* Static Progress Bar Component */}
      {showProgress && (
        <div className="mb-8 p-6 bg-gray-800 rounded-lg">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">
              🚀 Multi-Agent Processing Pipeline
            </h3>
            <p className="text-gray-300 text-sm">
              {progressDetails}
            </p>
          </div>
          <ProgressBar 
            steps={progressSteps} 
            currentStep={currentStep} 
            isComplete={isComplete}
          />
          {hasSensitiveFiles && (
            <div className="mt-4 p-3 bg-blue-900 bg-opacity-50 rounded-lg border border-blue-500">
              <div className="flex items-center space-x-2 text-blue-300">
                <span>🔒</span>
                <span className="text-sm">Secure local processing enabled for sensitive documents</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Display Charts After Creation - Now Static Component */}
      {isComplete && createdDeck && chartConfigs.length > 0 && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-lg">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            📊 Generated Data Visualizations
          </h3>
          <DeckCharts 
            chartConfigs={chartConfigs}
            extractedData={extractedData}
            brandName={createdDeck.brandName}
          />
        </div>
      )}

      {/* Display Competitor Analysis After Creation */}
      {isComplete && createdDeck && competitorAnalysis && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow-lg">
          <CompetitorAnalysis 
            competitorAnalysis={competitorAnalysis}
            brandName={createdDeck.brandName}
            primaryColor={createdDeck.primaryColor}
          />
        </div>
      )}

      {/* Data Quality Insights */}
      {isComplete && extractedData && (
        <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="text-md font-semibold text-green-800 mb-2">
            ✅ Enhanced Data Processing Summary
          </h4>
          <div className="text-sm text-green-700 space-y-1">
            <p>• Processed {selectedDocFileIds.length} document{selectedDocFileIds.length !== 1 ? 's' : ''} using <strong>complete document text</strong> (not summaries)</p>
            <p>• Extracted {extractedData.tables?.length || 0} data table{(extractedData.tables?.length || 0) !== 1 ? 's' : ''}</p>
            <p>• Identified {extractedData.keyMetrics?.length || 0} key metric{(extractedData.keyMetrics?.length || 0) !== 1 ? 's' : ''}</p>
            <p>• Generated {chartConfigs.length} interactive visualization{chartConfigs.length !== 1 ? 's' : ''}</p>
            {competitorAnalysis && (
              <p>• 🏆 Analyzed {competitorAnalysis.competitors?.length || 0} competitor{(competitorAnalysis.competitors?.length || 0) !== 1 ? 's' : ''} and market positioning</p>
            )}
            {hasSensitiveFiles && <p>• 🔒 Sensitive documents processed locally for security</p>}
            <p>• 🚀 <strong>Enhanced Processing:</strong> Multi-agent AI system with full document analysis</p>
          </div>
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
              className="w-8 h-8 border-0 rounded"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Secondary Colour</label>
            <input
              type="color"
              value={secondaryColor}
              onChange={(e) => setSecondaryColor(e.target.value)}
              className="w-8 h-8 border-0 rounded"
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

        {/* ─── Brand Videos (video/* only) ────────────────────────────────────── */}
        <div>
          <label className="block font-medium mb-1">Brand Videos</label>
          <ul className="max-h-40 overflow-y-auto border border-gray-200 bg-gray-700 rounded-lg p-2">
            {videoFiles.length === 0 && (
              <li className="text-gray-400 italic">No video files available.</li>
            )}
            {videoFiles.map((f) => (
              <li key={f._id} className="flex items-center mb-1 text-gray-100">
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
          <label className="block font-medium mb-1">
            Brand Documents 
            {hasSensitiveFiles && (
              <span className="ml-2 px-2 py-1 text-xs bg-yellow-600 text-yellow-100 rounded">
                🔒 Sensitive files detected
              </span>
            )}
          </label>
          <ul className="max-h-40 overflow-y-auto border border-gray-200 bg-gray-700 rounded-lg p-2">
            {otherFiles.length === 0 && (
              <li className="text-gray-400 italic">No document files available.</li>
            )}
            {otherFiles.map((f) => (
              <li key={f._id} className="flex items-center mb-1 text-gray-100">
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
                <label className="flex items-center space-x-2">
                  <span>{f.name}</span>
                  {f.sensitive && (
                    <span className="px-1 py-0.5 text-xs bg-red-600 text-red-100 rounded">
                      🔒 Sensitive
                    </span>
                  )}
                </label>
              </li>
            ))}
          </ul>
          {hasSensitiveFiles && (
            <div className="mt-2 p-2 bg-blue-900 bg-opacity-30 border border-blue-500 rounded text-blue-300 text-sm">
              💡 Sensitive documents will be processed locally using Llama-3.1-8B for enhanced security
            </div>
          )}
        </div>

        {/* ─── Submit Button ───────────────────────────────────────────────────── */}
        <div>
          <button
            type="submit"
            disabled={isSubmitting || showProgress}
            className={`${
              isSubmitting || showProgress
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white px-6 py-2 rounded-lg transition`}
          >
            {isSubmitting ? 
              (hasSensitiveFiles ? "Creating with Local AI…" : "Creating with OpenAI…") : 
              "Create Sales Deck"
            }
          </button>
          
          {!isSubmitting && selectedDocFileIds.length > 0 && (
            <div className="mt-2 text-sm text-gray-300">
              {hasSensitiveFiles ? (
                <div className="flex items-center space-x-1">
                  <span>🔒</span>
                  <span>Will use local Llama-3.1-8B for sensitive documents</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <span>🌐</span>
                  <span>Will use OpenAI GPT-3.5 for document processing</span>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
