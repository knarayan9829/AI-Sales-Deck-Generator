import React, { useState } from 'react';
import DataChart from './DataChart.jsx';

const DeckCharts = ({ chartConfigs, extractedData, brandName }) => {
  const [showAllCharts, setShowAllCharts] = useState(false);

  // Handle both old format (array) and new format (structured object)
  const isStructured = chartConfigs && typeof chartConfigs === 'object' && chartConfigs.topCharts;
  const topCharts = isStructured ? chartConfigs.topCharts : (chartConfigs || []);
  const additionalCharts = isStructured ? chartConfigs.additionalCharts : [];
  const hasMore = isStructured ? chartConfigs.hasMore : false;
  const totalCharts = isStructured ? chartConfigs.totalCharts : (chartConfigs?.length || 0);

  if (!chartConfigs || totalCharts === 0) {
    return (
      <div className="bg-gray-50 p-8 rounded-lg text-center">
        <div className="text-gray-400 text-6xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-600 mb-2">No Data Visualizations</h3>
        <p className="text-gray-500">
          No extractable data found in the uploaded documents. 
          Try uploading documents with tables, metrics, or numerical data.
        </p>
      </div>
    );
  }

  const displayCharts = showAllCharts ? [...topCharts, ...additionalCharts] : topCharts;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Data Analytics Dashboard for {brandName}
        </h2>
        <p className="text-gray-600">
          {totalCharts} interactive visualization{totalCharts !== 1 ? 's' : ''} 
          extracted from your documents using advanced AI analysis
        </p>
        {hasMore && (
          <p className="text-sm text-blue-600 mt-2">
            Displaying top {topCharts.length} priority visualizations
          </p>
        )}
      </div>

      {/* Priority Charts Grid */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {displayCharts.map((chartConfig, index) => (
            <div key={chartConfig.id || index} className="relative">
              <DataChart chartConfig={chartConfig} />
              {/* Professional badge for chart category */}
              {chartConfig.metadata?.chartCategory && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {chartConfig.metadata.chartCategory}
                </div>
              )}
              {/* Importance indicator for top charts */}
              {index < 3 && !showAllCharts && (
                <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                  High Priority
                </div>
              )}
            </div>
          ))}
        </div>

        {/* View More/Less Button */}
        {hasMore && (
          <div className="text-center">
            <button
              onClick={() => setShowAllCharts(!showAllCharts)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
            >
              {showAllCharts ? 
                `Show Priority Charts Only (Hide ${additionalCharts.length} charts)` : 
                `View Additional Analytics (${additionalCharts.length} more charts)`
              }
            </button>
          </div>
        )}
      </div>

      {/* Chart Categories Overview */}
      {isStructured && chartConfigs.chartsByCategory && (
        <div className="mt-12 bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Analytics Categories
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(chartConfigs.chartsByCategory).map(([category, charts]) => (
              <div key={category} className="bg-white p-4 rounded-lg shadow-sm border">
                <h4 className="font-medium text-gray-700 text-sm">{category}</h4>
                <p className="text-2xl font-bold text-blue-600">{charts.length}</p>
                <p className="text-xs text-gray-500">
                  {charts.length === 1 ? 'visualization' : 'visualizations'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Metrics Summary */}
      {extractedData && extractedData.keyMetrics && extractedData.keyMetrics.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">
            Key Performance Indicators
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extractedData.keyMetrics.map((metric, index) => (
              <div 
                key={index}
                className="bg-white p-4 rounded-lg shadow border border-gray-200"
              >
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {metric.value}{metric.unit}
                </div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {metric.name}
                </div>
                {metric.trend && (
                  <div className={`text-xs flex items-center ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      metric.trend === 'up' ? 'bg-green-500' : 
                      metric.trend === 'down' ? 'bg-red-500' : 'bg-gray-500'
                    }`}></span>
                    <span className="capitalize">{metric.trend}</span>
                  </div>
                )}
                {metric.context && (
                  <div className="text-xs text-gray-500 mt-2">
                    {metric.context}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Data Tables Section */}
      {extractedData && extractedData.tables && extractedData.tables.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">
            Source Data Tables
          </h3>
          <div className="space-y-6">
            {extractedData.tables.map((table, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-800">{table.title}</h4>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {table.rows.length} rows × {table.headers.length} columns
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {table.headers.map((header, headerIndex) => (
                          <th 
                            key={headerIndex}
                            className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {table.rows.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                          {row.map((cell, cellIndex) => (
                            <td 
                              key={cellIndex}
                              className="px-4 py-2 text-sm text-gray-900"
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {table.rows.length > 10 && (
                        <tr>
                          <td 
                            colSpan={table.headers.length} 
                            className="px-4 py-2 text-center text-gray-500 text-sm italic"
                          >
                            ... and {table.rows.length - 10} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {table.metadata && (
                  <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                    {table.metadata.period && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Period: {table.metadata.period}
                      </span>
                    )}
                    {table.metadata.unit && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                        Unit: {table.metadata.unit}
                      </span>
                    )}
                    {table.metadata.source && (
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                        Source: {table.metadata.source}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Summary */}
      <div className="mt-8 p-4 rounded-lg border-l-4 border-blue-500 bg-blue-50">
        <p className="text-sm text-gray-700">
          <strong>Advanced Analytics:</strong> This dashboard uses multi-agent AI processing 
          to extract insights from complete document content. Charts are ranked by importance 
          and business value to prioritize the most actionable insights.
        </p>
      </div>
    </div>
  );
};

export default DeckCharts; 