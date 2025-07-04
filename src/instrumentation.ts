export async function register() {
  // Only initialize Sentry in production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await import('../sentry.server.config');
    }

    if (process.env.NEXT_RUNTIME === 'edge') {
      await import('../sentry.edge.config');
    }
    
    console.log('✅ [PROD] Sentry initialized for runtime:', process.env.NEXT_RUNTIME);
  } else {
    console.log('🔍 [DEV] Sentry disabled in development mode');
  }
}

// Conditional export to avoid importing Sentry in development
export const onRequestError = process.env.NODE_ENV === 'production' 
  ? undefined // Will be set by Sentry's automatic instrumentation
  : undefined;
