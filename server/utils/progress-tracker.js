/**
 * Progress Tracking Utility for Multi-Agent Processing
 * Provides real-time progress updates during sales deck generation
 */

class ProgressTracker {
  constructor() {
    this.sessions = new Map();
  }

  // Create a new progress session
  createSession(sessionId) {
    const session = {
      id: sessionId,
      currentStep: 0,
      totalSteps: 0,
      steps: [],
      startTime: Date.now(),
      lastUpdate: Date.now(),
      status: 'initializing',
      details: '',
      errors: []
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  // Initialize progress steps
  initializeSteps(sessionId, steps) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.steps = steps;
    session.totalSteps = steps.length;
    session.status = 'running';
    session.lastUpdate = Date.now();
    
    return session;
  }

  // Update current step
  updateStep(sessionId, stepIndex, details = '') {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.currentStep = stepIndex;
    session.details = details;
    session.lastUpdate = Date.now();
    
    if (stepIndex >= session.totalSteps) {
      session.status = 'completed';
    }

    console.log(`📊 Progress [${sessionId}]: Step ${stepIndex}/${session.totalSteps} - ${details}`);
    return session;
  }

  // Add error to session
  addError(sessionId, error) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.errors.push({
      message: error.message || error,
      timestamp: Date.now(),
      step: session.currentStep
    });
    session.status = 'error';
    session.lastUpdate = Date.now();

    return session;
  }

  // Mark session as completed
  completeSession(sessionId, details = 'Processing completed successfully') {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.currentStep = session.totalSteps;
    session.status = 'completed';
    session.details = details;
    session.lastUpdate = Date.now();
    session.duration = Date.now() - session.startTime;

    console.log(`✅ Progress [${sessionId}]: Completed in ${session.duration}ms`);
    return session;
  }

  // Get session progress
  getProgress(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const progressPercentage = session.totalSteps > 0 ? 
      Math.min(100, Math.round((session.currentStep / session.totalSteps) * 100)) : 0;

    return {
      sessionId: session.id,
      currentStep: session.currentStep,
      totalSteps: session.totalSteps,
      progressPercentage,
      status: session.status,
      details: session.details,
      currentStepName: session.steps[session.currentStep]?.title || 'Processing...',
      currentStepDescription: session.steps[session.currentStep]?.description || '',
      errors: session.errors,
      duration: Date.now() - session.startTime,
      lastUpdate: session.lastUpdate
    };
  }

  // Clean up old sessions (older than 1 hour)
  cleanup() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastUpdate < oneHourAgo) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Get all active sessions
  getActiveSessions() {
    return Array.from(this.sessions.values()).filter(s => s.status === 'running');
  }
}

// Singleton instance
const progressTracker = new ProgressTracker();

// Clean up old sessions every 30 minutes
setInterval(() => {
  progressTracker.cleanup();
}, 30 * 60 * 1000);

module.exports = progressTracker; 