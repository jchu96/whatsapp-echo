import * as Sentry from "@sentry/nextjs";
import { sendErrorEmail } from '@/lib/mailgun';
import { 
  TimeoutErrorType, 
  ProcessingMetrics, 
  ProcessingContext 
} from '@/types';
import { 
  AudioProcessingError, 
  ProcessingTimeoutError, 
  categorizeError,
  logProcessingMetrics 
} from '@/lib/errors';

interface ErrorContext {
  userId?: string;
  userEmail?: string;
  filename?: string;
  fileSize?: number;
  processingMetrics?: ProcessingMetrics;
  requestId?: string;
  phase?: string;
  additionalData?: Record<string, any>;
}

interface ErrorHandlingResult {
  userNotified: boolean;
  sentryReported: boolean;
  errorType: TimeoutErrorType;
  errorMessage: string;
}

/**
 * Enhanced error handler that guarantees both user notification AND Sentry reporting
 * This is the single point of failure handling for all processing errors
 */
export async function handleProcessingError(
  error: unknown,
  context: ErrorContext,
  abortSignal?: AbortSignal
): Promise<ErrorHandlingResult> {
  const startTime = Date.now();
  const errorType = categorizeError(error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  
  console.log('🚨 [ERROR_HANDLER] Processing error:', {
    errorType,
    errorMessage,
    context: {
      userId: context.userId,
      userEmail: context.userEmail,
      filename: context.filename,
      phase: context.phase
    }
  });

  let userNotified = false;
  let sentryReported = false;

  // 1. ALWAYS report to Sentry first (most critical for monitoring)
  try {
    sentryReported = await reportToSentry(error, context, errorType);
  } catch (sentryError) {
    console.error('❌ [ERROR_HANDLER] Failed to report to Sentry:', sentryError);
    // Don't let Sentry failures block user notification
  }

  // 2. ALWAYS attempt to notify user (unless we don't have their email)
  if (context.userEmail) {
    try {
      userNotified = await notifyUser(
        context.userEmail, 
        errorType, 
        context.filename,
        abortSignal
      );
    } catch (emailError) {
      console.error('❌ [ERROR_HANDLER] Failed to notify user:', emailError);
      
      // Report email failure to Sentry too
      try {
        Sentry.captureException(emailError, {
          tags: {
            error_type: 'email_notification_failed',
            original_error_type: errorType
          },
          extra: {
            userEmail: context.userEmail,
            filename: context.filename,
            originalError: errorMessage
          }
        });
      } catch (nestedSentryError) {
        console.error('❌ [ERROR_HANDLER] Nested Sentry error:', nestedSentryError);
      }
    }
  }

  // 3. Log comprehensive metrics for monitoring
  if (context.processingMetrics) {
    try {
      logProcessingMetrics(context.processingMetrics, false);
    } catch (metricsError) {
      console.error('❌ [ERROR_HANDLER] Failed to log metrics:', metricsError);
    }
  }

  const handlingTime = Date.now() - startTime;
  console.log('📊 [ERROR_HANDLER] Error handling completed:', {
    userNotified,
    sentryReported,
    errorType,
    handlingTime
  });

  return {
    userNotified,
    sentryReported,
    errorType,
    errorMessage
  };
}

/**
 * Report error to Sentry with rich context
 */
async function reportToSentry(
  error: unknown, 
  context: ErrorContext, 
  errorType: TimeoutErrorType
): Promise<boolean> {
  try {
    // Only report to Sentry in production to avoid noise in development
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 [SENTRY] Skipping Sentry in development mode');
      return false;
    }

    Sentry.withScope((scope) => {
      // Set user context
      if (context.userId || context.userEmail) {
        scope.setUser({
          id: context.userId,
          email: context.userEmail
        });
      }

      // Set tags for filtering and alerting
      scope.setTags({
        error_type: errorType,
        has_user_email: !!context.userEmail,
        processing_phase: context.phase || 'unknown',
        file_extension: context.filename ? 
          context.filename.split('.').pop()?.toLowerCase() : 'unknown'
      });

      // Set context for debugging
      scope.setContext('processing', {
        filename: context.filename,
        fileSize: context.fileSize,
        userId: context.userId,
        requestId: context.requestId,
        ...context.additionalData
      });

      // Add processing metrics if available
      if (context.processingMetrics) {
        scope.setContext('metrics', {
          totalTime: context.processingMetrics.totalTime,
          downloadTime: context.processingMetrics.downloadTime,
          transcriptionTime: context.processingMetrics.transcriptionTime,
          emailTime: context.processingMetrics.emailTime,
          fileSize: context.processingMetrics.fileSize
        });
      }

      // Set level based on error type
      const level = getSentryLevel(errorType);
      scope.setLevel(level);

      // Capture the exception
      Sentry.captureException(error);
    });

    console.log('✅ [SENTRY] Error reported successfully');
    return true;
  } catch (sentryError) {
    console.error('❌ [SENTRY] Failed to report error:', sentryError);
    return false;
  }
}

/**
 * Determine appropriate Sentry level based on error type
 */
function getSentryLevel(errorType: TimeoutErrorType): 'error' | 'warning' | 'info' {
  // User errors (not our fault) - lower severity
  const userErrors: TimeoutErrorType[] = [
    'file_too_large',
    'invalid_format',
    'user_not_found',
    'user_not_approved'
  ];

  if (userErrors.includes(errorType)) {
    return 'warning';
  }

  // System/infrastructure errors - high severity
  const systemErrors: TimeoutErrorType[] = [
    'processing_timeout',
    'download_timeout',
    'whisper_timeout',
    'general_error'
  ];

  return systemErrors.includes(errorType) ? 'error' : 'warning';
}

/**
 * Notify user with fallback mechanisms
 */
async function notifyUser(
  userEmail: string,
  errorType: TimeoutErrorType,
  filename?: string,
  abortSignal?: AbortSignal
): Promise<boolean> {
  try {
    console.log('📧 [USER_NOTIFICATION] Sending error email:', {
      userEmail,
      errorType,
      filename
    });

    const emailSent = await sendErrorEmail(
      userEmail,
      errorType,
      filename,
      abortSignal
    );

    if (emailSent) {
      console.log('✅ [USER_NOTIFICATION] Email sent successfully');
      return true;
    } else {
      console.error('❌ [USER_NOTIFICATION] Email failed to send');
      return false;
    }
  } catch (error) {
    console.error('❌ [USER_NOTIFICATION] Error sending email:', error);
    return false;
  }
}

/**
 * Enhanced timeout wrapper that includes error handling
 */
export async function withTimeoutAndErrorHandling<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  context: ErrorContext,
  operationName: string
): Promise<T> {
  const timeoutError = new ProcessingTimeoutError(
    `${operationName} timeout after ${timeoutMs}ms`,
    'processing_timeout'
  );

  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(timeoutError), timeoutMs);
      })
    ]);
  } catch (error) {
    // Auto-handle any errors from the operation
    await handleProcessingError(error, {
      ...context,
      phase: operationName,
      additionalData: { timeoutMs, operationName }
    });
    throw error;
  }
}

/**
 * Create error context from processing context
 */
export function createErrorContext(
  processingContext: ProcessingContext,
  additionalData?: Record<string, any>
): ErrorContext {
  return {
    userId: processingContext.userId,
    userEmail: processingContext.userEmail,
    requestId: `${processingContext.userId}-${processingContext.startTime}`,
    additionalData
  };
} 