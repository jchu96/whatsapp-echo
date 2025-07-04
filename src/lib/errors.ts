import { TimeoutErrorType, ProcessingMetrics } from '@/types';

/**
 * Custom error class for processing timeouts
 */
export class ProcessingTimeoutError extends Error {
  public readonly errorType: TimeoutErrorType;
  public readonly metrics?: ProcessingMetrics;
  
  constructor(
    message: string, 
    errorType: TimeoutErrorType = 'processing_timeout',
    metrics?: ProcessingMetrics
  ) {
    super(message);
    this.name = 'ProcessingTimeoutError';
    this.errorType = errorType;
    this.metrics = metrics;
  }
}

/**
 * Custom error class for audio processing failures
 */
export class AudioProcessingError extends Error {
  public readonly errorType: TimeoutErrorType;
  public readonly filename?: string;
  public readonly fileSize?: number;
  
  constructor(
    message: string,
    errorType: TimeoutErrorType = 'general_error',
    filename?: string,
    fileSize?: number
  ) {
    super(message);
    this.name = 'AudioProcessingError';
    this.errorType = errorType;
    this.filename = filename;
    this.fileSize = fileSize;
  }
}

/**
 * Create timeout-aware error handler
 * @param startTime - Processing start time
 * @param maxDurationMs - Maximum duration in milliseconds
 * @returns Function to check for timeout
 */
export function createTimeoutChecker(startTime: number, maxDurationMs: number) {
  return () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > maxDurationMs) {
      throw new ProcessingTimeoutError(
        `Processing timeout: ${elapsed}ms exceeds limit of ${maxDurationMs}ms`,
        'processing_timeout'
      );
    }
    return elapsed;
  };
}

/**
 * Categorize errors for appropriate user messaging
 * @param error - Error to categorize
 * @returns TimeoutErrorType - Error category
 */
export function categorizeError(error: unknown): TimeoutErrorType {
  if (error instanceof ProcessingTimeoutError || error instanceof AudioProcessingError) {
    return error.errorType;
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Timeout-related errors
    if (message.includes('timeout') || message.includes('abort')) {
      if (message.includes('download')) {
        return 'download_timeout';
      }
      if (message.includes('transcrib') || message.includes('whisper')) {
        return 'whisper_timeout';
      }
      return 'processing_timeout';
    }
    
    // Size-related errors
    if (message.includes('too large') || message.includes('exceeds limit')) {
      return 'file_too_large';
    }
    
    // Format-related errors
    if (message.includes('format') || message.includes('unsupported')) {
      return 'invalid_format';
    }
    
    // User-related errors
    if (message.includes('not found')) {
      return 'user_not_found';
    }
    
    if (message.includes('not approved')) {
      return 'user_not_approved';
    }
  }
  
  return 'general_error';
}

/**
 * Get user-friendly error message
 * @param errorType - Error type
 * @param filename - Optional filename
 * @returns User-friendly message
 */
export function getUserFriendlyMessage(errorType: TimeoutErrorType, filename?: string): string {
  const messages = {
    file_too_large: `The voice note "${filename}" is too large. Please try a file smaller than 15MB.`,
    download_timeout: `We couldn't download "${filename}" in time. Please try a shorter recording or check your connection.`,
    processing_timeout: `Processing "${filename}" took too long. Please try a shorter recording (under 5 minutes works best).`,
    whisper_timeout: `Transcribing "${filename}" took too long. Please try a shorter recording (under 3 minutes works best).`,
    invalid_format: `The format of "${filename}" is not supported. Please use .m4a, .mp3, .wav, or .ogg files.`,
    user_not_found: 'We could not find your account. Please check the email address.',
    user_not_approved: 'Your account is not yet approved for voice note transcription.',
    general_error: `Sorry, we encountered an error processing "${filename}". Please try again later.`
  };
  
  return messages[errorType] || messages.general_error;
}

/**
 * Log processing metrics for monitoring
 * @param metrics - Processing metrics
 * @param success - Whether processing succeeded
 */
export function logProcessingMetrics(metrics: ProcessingMetrics, success: boolean): void {
  const logData = {
    timestamp: new Date().toISOString(),
    success,
    totalTime: metrics.totalTime,
    downloadTime: metrics.downloadTime,
    transcriptionTime: metrics.transcriptionTime,
    emailTime: metrics.emailTime,
    fileSize: metrics.fileSize,
    errorType: metrics.errorType,
    // Performance indicators
    isOptimal: metrics.totalTime < 30000, // Under 30 seconds
    timeoutRisk: metrics.totalTime > 45000 ? 'high' : metrics.totalTime > 35000 ? 'medium' : 'low'
  };
  
  // In production, this could be sent to monitoring service
  console.log('Processing Metrics:', JSON.stringify(logData, null, 2));
}

/**
 * Create processing metrics tracker
 * @param startTime - Processing start time
 * @returns Metrics tracker object
 */
export function createMetricsTracker(startTime: number) {
  const phases: Record<string, number> = {};
  let currentPhase: string | null = null;
  let phaseStart: number = startTime;
  
  return {
    startPhase(phase: string) {
      if (currentPhase) {
        phases[currentPhase] = Date.now() - phaseStart;
      }
      currentPhase = phase;
      phaseStart = Date.now();
    },
    
    endPhase() {
      if (currentPhase) {
        phases[currentPhase] = Date.now() - phaseStart;
        currentPhase = null;
      }
    },
    
    getMetrics(fileSize: number, success: boolean, errorType?: string): ProcessingMetrics {
      if (currentPhase) {
        phases[currentPhase] = Date.now() - phaseStart;
      }
      
      return {
        totalTime: Date.now() - startTime,
        downloadTime: phases.download || 0,
        transcriptionTime: phases.transcription || 0,
        emailTime: phases.email || 0,
        fileSize,
        success,
        errorType
      };
    }
  };
}

/**
 * Timeout-aware promise wrapper
 * @param promise - Promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Error message for timeout
 * @returns Promise with timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ProcessingTimeoutError(errorMessage, 'processing_timeout'));
      }, timeoutMs);
    })
  ]);
}

/**
 * Retry with exponential backoff for transient failures
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelayMs - Base delay in milliseconds
 * @returns Promise with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error = new Error('No attempts made');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      // Don't retry certain types of errors
      if (error instanceof ProcessingTimeoutError || error instanceof AudioProcessingError) {
        const nonRetryableTypes: TimeoutErrorType[] = [
          'file_too_large',
          'invalid_format',
          'user_not_found',
          'user_not_approved'
        ];
        
        if (nonRetryableTypes.indexOf(error.errorType) !== -1) {
          throw error;
        }
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Exponential backoff
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Safe error handling for async operations
 * @param operation - Async operation
 * @param defaultValue - Default value on error
 * @returns Result or default value
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error('Safe async operation failed:', error);
    return defaultValue;
  }
}

/**
 * Validate processing context for safety
 * @param context - Processing context
 * @returns Validation result
 */
export function validateProcessingContext(context: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!context.userId) {
    errors.push('Missing user ID');
  }
  
  if (!context.userEmail) {
    errors.push('Missing user email');
  }
  
  if (!context.slug) {
    errors.push('Missing user slug');
  }
  
  if (!context.startTime || typeof context.startTime !== 'number') {
    errors.push('Invalid start time');
  }
  
  if (!context.abortController) {
    errors.push('Missing abort controller');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
} 