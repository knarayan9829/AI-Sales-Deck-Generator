import React from 'react';

const ProgressBar = ({ steps, currentStep, isComplete = false }) => {
  const progressPercentage = isComplete ? 100 : Math.max(0, ((currentStep) / steps.length) * 100);

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gray-800 rounded-lg shadow-lg">
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Progress</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="h-full bg-white opacity-20 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isCompleted = index < currentStep || isComplete;
          const isCurrent = index === currentStep && !isComplete;

          return (
            <div 
              key={index}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-300 ${
                isActive ? 'bg-blue-900 bg-opacity-50 border border-blue-500' :
                isCompleted ? 'bg-green-900 bg-opacity-30' : 'bg-gray-700'
              }`}
            >
              {/* Step Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                isCompleted ? 'bg-green-500' :
                isCurrent ? 'bg-blue-500 animate-pulse' : 'bg-gray-600'
              }`}>
                {isCompleted ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isCurrent ? (
                  <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                ) : (
                  <span className="text-gray-400 text-sm font-medium">{index + 1}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1">
                <div className={`font-medium ${
                  isCompleted ? 'text-green-400' :
                  isCurrent ? 'text-blue-400' : 'text-gray-400'
                }`}>
                  {step.title}
                </div>
                {step.description && (
                  <div className={`text-sm mt-1 ${
                    isCompleted ? 'text-green-300' :
                    isCurrent ? 'text-blue-300' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </div>
                )}
              </div>

              {/* Status Indicator */}
              {isCurrent && (
                <div className="flex-shrink-0">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isComplete && (
        <div className="mt-6 p-4 bg-green-900 bg-opacity-30 border border-green-500 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-green-400 font-medium">Sales Deck Created Successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressBar; 