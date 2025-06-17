import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Pie, Scatter } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DataChart = ({ chartConfig }) => {
  if (!chartConfig || !chartConfig.data) {
    return (
      <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-600">
        <p>No chart data available</p>
      </div>
    );
  }

  const { type, title, data, options, metadata } = chartConfig;

  // Render different chart types
  const renderChart = () => {
    switch (type) {
      case 'line':
        return <Line data={data} options={options} />;
      case 'area':
        return <Line data={{...data, datasets: data.datasets.map(d => ({...d, fill: true}))}} options={options} />;
      case 'bar':
        return <Bar data={data} options={options} />;
      case 'pie':
        return <Pie data={data} options={options} />;
      case 'scatter':
        return <Scatter data={data} options={options} />;
      case 'heatmap':
        return <HeatmapChart data={data} options={options} />;
      case 'metrics':
        return <MetricsDisplay data={data} options={options} />;
      case 'table':
        return <DataTable data={data} title={title} />;
      default:
        return <Bar data={data} options={options} />;
    }
  };

  // Get chart type badge color
  const getChartTypeBadge = (chartType) => {
    const badges = {
      'line': { color: 'bg-blue-500', text: 'Trend Analysis' },
      'area': { color: 'bg-green-500', text: 'Area Analysis' },
      'bar': { color: 'bg-indigo-500', text: 'Comparison' },
      'pie': { color: 'bg-purple-500', text: 'Distribution' },
      'scatter': { color: 'bg-orange-500', text: 'Correlation' },
      'heatmap': { color: 'bg-red-500', text: 'Heat Map' },
      'metrics': { color: 'bg-yellow-500', text: 'KPI Dashboard' },
      'table': { color: 'bg-gray-500', text: 'Data Table' }
    };
    return badges[chartType] || { color: 'bg-gray-500', text: 'Analysis' };
  };

  const chartBadge = getChartTypeBadge(type);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 relative">
      {/* Chart type badge */}
      <div className={`absolute top-3 right-3 ${chartBadge.color} text-white text-xs px-2 py-1 rounded-full`}>
        {chartBadge.text}
      </div>
      
      <h3 className="text-lg font-semibold text-gray-800 mb-4 pr-20">{title}</h3>
      <div className="h-64 relative">
        {renderChart()}
      </div>
      
      {/* Metadata and chart information */}
      {metadata && (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-2 text-xs">
            {metadata.period && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                Period: {metadata.period}
              </span>
            )}
            {metadata.unit && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                Unit: {metadata.unit}
              </span>
            )}
            {metadata.source && (
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
                Source: {metadata.source}
              </span>
            )}
            {metadata.dataQuality && (
              <span className={`px-2 py-1 rounded ${
                metadata.dataQuality === 'high' ? 'bg-green-100 text-green-800' :
                metadata.dataQuality === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                Data Quality: {metadata.dataQuality}
              </span>
            )}
          </div>
          
          {chartConfig.importance && (
            <div className="text-xs text-gray-500">
              Priority Score: {Math.round(chartConfig.importance)}/100
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Enhanced Metrics display component for KPIs
const MetricsDisplay = ({ data, options }) => {
  const { primaryColor = '#3B82F6' } = options;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
      {data.slice(0, 6).map((metric, index) => (
        <div 
          key={index}
          className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200 flex flex-col justify-center items-center hover:shadow-md transition-shadow"
        >
          <div 
            className="text-2xl font-bold mb-1"
            style={{ color: primaryColor }}
          >
            {metric.value}{metric.unit}
          </div>
          <div className="text-sm font-medium text-gray-700 text-center mb-1">
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
            <div className="text-xs text-gray-500 text-center mt-1">
              {metric.context}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// Simple heatmap implementation
const HeatmapChart = ({ data, options }) => {
  if (!data || !data.datasets || !data.datasets[0] || !data.datasets[0].data) {
    return <div className="text-gray-600 text-center">Heatmap data not available</div>;
  }

  const heatmapData = data.datasets[0].data;
  const uniqueX = [...new Set(heatmapData.map(d => d.x))];
  const uniqueY = [...new Set(heatmapData.map(d => d.y))];
  const maxValue = Math.max(...heatmapData.map(d => d.v));

  return (
    <div className="h-full overflow-auto">
      <div className="grid gap-1 h-full" style={{ 
        gridTemplateColumns: `repeat(${uniqueX.length}, 1fr)`,
        gridTemplateRows: `repeat(${uniqueY.length}, 1fr)`
      }}>
        {uniqueY.map(y => 
          uniqueX.map(x => {
            const dataPoint = heatmapData.find(d => d.x === x && d.y === y);
            const value = dataPoint ? dataPoint.v : 0;
            const opacity = maxValue > 0 ? value / maxValue : 0;
            
            return (
              <div
                key={`${x}-${y}`}
                className="flex items-center justify-center text-xs font-medium rounded border border-gray-200"
                style={{
                  backgroundColor: `rgba(59, 130, 246, ${opacity})`,
                  color: opacity > 0.5 ? 'white' : 'black'
                }}
                title={`${x} - ${y}: ${value}`}
              >
                {value}
              </div>
            );
          })
        )}
      </div>
      <div className="mt-2 text-xs text-gray-500 text-center">
        Hover over cells for details
      </div>
    </div>
  );
};

// Enhanced Data table component
const DataTable = ({ data, title }) => {
  if (!data || !data.headers || !data.rows) {
    return <div className="text-gray-600 text-center">No table data available</div>;
  }

  return (
    <div className="h-full overflow-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            {data.headers.map((header, index) => (
              <th 
                key={index}
                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.rows.slice(0, 10).map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {row.map((cell, cellIndex) => (
                <td 
                  key={cellIndex}
                  className="px-4 py-2 text-sm text-gray-900 border-b"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {data.rows.length > 10 && (
            <tr>
              <td 
                colSpan={data.headers.length} 
                className="px-4 py-2 text-center text-gray-500 text-sm italic"
              >
                ... and {data.rows.length - 10} more rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataChart; 