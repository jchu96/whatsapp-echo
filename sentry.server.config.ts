// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

// Only initialize in production  
if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: "https://bc82f22027a4e13260930c6606778614@o4509584437608448.ingest.us.sentry.io/4509611008262144",

    // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
    tracesSampleRate: 1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  });
} else {
  console.log('🔍 [DEV] Sentry server config skipped in development');
}
