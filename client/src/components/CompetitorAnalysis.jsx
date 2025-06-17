import React from 'react';

const CompetitorAnalysis = ({ competitorAnalysis, brandName, primaryColor = '#3B82F6' }) => {
  if (!competitorAnalysis || (!competitorAnalysis.competitors?.length && !competitorAnalysis.brandPositioning)) {
    return (
      <div className="bg-gray-50 p-8 rounded-lg text-center">
        <div className="text-gray-400 text-6xl mb-4">🏆</div>
        <h3 className="text-lg font-medium text-gray-600 mb-2">No Competitive Analysis</h3>
        <p className="text-gray-500">
          No competitor information found in the uploaded documents. 
          Try uploading documents with market analysis or competitive intelligence.
        </p>
      </div>
    );
  }

  const { competitors = [], brandPositioning, marketLandscape, recommendations = [] } = competitorAnalysis;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          🏆 Competitive Analysis for {brandName}
        </h2>
        <p className="text-gray-600">
          Market positioning and competitive landscape analysis
        </p>
      </div>

      {/* Brand Positioning */}
      {brandPositioning && (
        <div 
          className="p-6 rounded-lg border-l-4 mb-8"
          style={{ 
            backgroundColor: `${primaryColor}15`, 
            borderLeftColor: primaryColor 
          }}
        >
          <h3 className="text-xl font-semibold mb-4" style={{ color: primaryColor }}>
            🎯 {brandName} Market Position
          </h3>
          
          {brandPositioning.marketPosition && (
            <p className="text-gray-700 mb-4">
              <strong>Position:</strong> {brandPositioning.marketPosition}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Competitive Advantages */}
            {brandPositioning.competitiveAdvantages?.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold text-green-700 mb-3">
                  🚀 Competitive Advantages
                </h4>
                <ul className="space-y-2">
                  {brandPositioning.competitiveAdvantages.map((advantage, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span className="text-sm text-gray-700">{advantage}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Key Differentiators */}
            {brandPositioning.differentiators?.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold text-purple-700 mb-3">
                  💎 Key Differentiators
                </h4>
                <ul className="space-y-2">
                  {brandPositioning.differentiators.map((diff, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-purple-500 mr-2">◆</span>
                      <span className="text-sm text-gray-700">{diff}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Competitive Threats */}
            {brandPositioning.competitiveThreats?.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold text-red-700 mb-3 flex items-center">
                  ⚠️ Competitive Threats
                </h4>
                <ul className="space-y-2">
                  {brandPositioning.competitiveThreats.map((threat, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-red-500 mr-2">!</span>
                      <span className="text-sm text-gray-700">{threat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Market Opportunities */}
            {brandPositioning.marketOpportunities?.length > 0 && (
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-semibold text-blue-700 mb-3 flex items-center">
                  🔍 Market Opportunities
                </h4>
                <ul className="space-y-2">
                  {brandPositioning.marketOpportunities.map((opp, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-500 mr-2">⭆</span>
                      <span className="text-sm text-gray-700">{opp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Competitors Grid */}
      {competitors.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">
            🏢 Competitive Landscape
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitors.map((competitor, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-lg font-semibold" style={{ color: primaryColor }}>
                    {competitor.name}
                  </h4>
                  <span 
                    className={`px-2 py-1 rounded text-xs font-medium text-white ${
                      competitor.type === 'direct' ? 'bg-red-500' : 'bg-purple-500'
                    }`}
                  >
                    {competitor.type?.toUpperCase()} COMPETITOR
                  </span>
                </div>
                
                {competitor.marketPosition && (
                  <p className="text-gray-600 text-sm mb-4">{competitor.marketPosition}</p>
                )}

                {/* Strengths */}
                {competitor.strengths?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-green-700 mb-2">💪 Strengths</h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {competitor.strengths.slice(0, 3).map((strength, i) => (
                        <li key={i}>• {strength}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {competitor.weaknesses?.length > 0 && (
                  <div className="mb-3">
                    <h5 className="text-sm font-medium text-red-700 mb-2">⚠️ Weaknesses</h5>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {competitor.weaknesses.slice(0, 3).map((weakness, i) => (
                        <li key={i}>• {weakness}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Comparison Metrics */}
                {competitor.comparisonMetrics && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">📊 Metrics</h5>
                    <div className="text-xs text-gray-600 space-y-1">
                      {competitor.comparisonMetrics.marketShare && (
                        <div><strong>Market Share:</strong> {competitor.comparisonMetrics.marketShare}</div>
                      )}
                      {competitor.comparisonMetrics.revenue && (
                        <div><strong>Revenue:</strong> {competitor.comparisonMetrics.revenue}</div>
                      )}
                      {competitor.comparisonMetrics.customers && (
                        <div><strong>Customers:</strong> {competitor.comparisonMetrics.customers}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Market Landscape & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Landscape */}
        {marketLandscape && (
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              📊 Market Landscape
            </h3>
            
            <div className="space-y-3">
              {marketLandscape.industrySize && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Industry Size:</span>
                  <span className="text-sm text-gray-800">{marketLandscape.industrySize}</span>
                </div>
              )}
              
              {marketLandscape.growthRate && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Growth Rate:</span>
                  <span className="text-sm text-gray-800">{marketLandscape.growthRate}</span>
                </div>
              )}
              
              {marketLandscape.competitiveIntensity && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-600">Competition Level:</span>
                  <span className={`text-sm font-medium capitalize ${
                    marketLandscape.competitiveIntensity === 'high' ? 'text-red-600' :
                    marketLandscape.competitiveIntensity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {marketLandscape.competitiveIntensity}
                  </span>
                </div>
              )}
              
              {marketLandscape.keyTrends?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-600 mb-2">📈 Key Trends:</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {marketLandscape.keyTrends.slice(0, 4).map((trend, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2">→</span>
                        {trend}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Strategic Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-blue-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              💡 Strategic Recommendations
            </h3>
            
            <ul className="space-y-3">
              {recommendations.slice(0, 5).map((rec, index) => (
                <li key={index} className="flex items-start">
                  <span 
                    className="flex-shrink-0 w-6 h-6 rounded-full text-white text-xs flex items-center justify-center mr-3 mt-0.5"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Analysis Summary */}
      <div 
        className="p-4 rounded-lg border-l-4"
        style={{ 
          backgroundColor: `${primaryColor}10`, 
          borderLeftColor: primaryColor 
        }}
      >
        <p className="text-sm text-gray-600">
          💡 <strong>Analysis Note:</strong> This competitive analysis is based on information 
          extracted from your uploaded documents. The analysis uses complete document content 
          rather than summaries to provide comprehensive competitive intelligence.
        </p>
      </div>
    </div>
  );
};

export default CompetitorAnalysis; 