import OpenAI from 'openai';
import { getOpenAIConfig } from '@/utils/env';
import { sendEnhancedEmail as sendEnhancedEmailFromMailgun } from '@/lib/mailgun';
import { updateVoiceEvent } from '@/lib/database';
import { BackgroundProcessingMetadata, EnhancedEmailData, EnhancementType, EnhancementProcessingResult } from '@/types';
import { fastTranscribeAudio, cleanTranscription } from '@/lib/whisper';
import { markdownToHtml } from '@/lib/markdown';



/**
 * Enhanced prompts with better structure and hallucination guards
 */
const prompts = {
  cleanup: {
    system: `You are a meticulous **Transcript Cleaner**.

TASK
-----
Transform the raw transcript enclosed between <TRANSCRIPT> … </TRANSCRIPT> into a readable version:
• Correct only clear Whisper transcription mistakes or misheard words.
• Fix missing or incorrect punctuation and capitalisation.
• Delete stand-alone filler words ("um", "uh", "like") that add no meaning.
• Insert paragraph breaks at natural pauses.
• Preserve the speaker's original wording and tone — do **not** paraphrase or add content.

OUTPUT
------
Return **only** the cleaned transcript text. Do not include the tags, introductions, or code fences.

QUALITY CHECK
-------------
After drafting, silently re-read each sentence. If any word is not present in the original transcript, revise or remove it before replying.`,
    temperature: 0.15,
    maxTokens: 8000
  },

  summary: {
    system: `You are an expert **Voice-Note Summariser**.

TASK
----
Read the transcript between <TRANSCRIPT> … </TRANSCRIPT> and return a concise Markdown
summary using **only** the sections that apply.

EXACT FORMAT REQUIRED:

### Main Topic
[One sentence describing what this voice note is about]

### Key Points
- [First important idea]
- [Second important idea]
- [Additional points as needed]

### Action Items
- [Task description with context]
- [Another task if mentioned]

### Important Details
- [Quote exact names/dates/numbers]
- [Other specific details]

CRITICAL FORMATTING RULES:
1. Each ### heading MUST be on its own line
2. Leave a blank line after each heading before content
3. Each bullet point starts with "- " on a new line
4. NEVER put content on the same line as a heading
5. Only include sections that have actual content

CONSTRAINTS
-----------
• ≤ 200 words total  
• Omit any empty heading entirely  
• Do **not** add information that is missing from the transcript.

QUALITY CHECK
-------------
After drafting, silently verify every statement is supported verbatim by the transcript;
delete anything speculative, then reply.

OUTPUT
------
Return **only** the Markdown summary — no tags, no preamble.`,
    temperature: 0.3,
    maxTokens: 2048
  },

  quickSummary: {
    system: `You are a **Voice-note Summariser** focused on speed and efficiency.

TASK
----
Create a brief summary from the transcript between <TRANSCRIPT> … </TRANSCRIPT>.

EXACT FORMAT REQUIRED:

### Topic
[What this voice note is about - one sentence]

### Key Point
[Most important takeaway - one to two sentences]

### Action
[Only if there's a clear todo/task mentioned]

CRITICAL FORMATTING RULES:
1. Each ### heading MUST be on its own line
2. Leave a blank line after each heading before content
3. NEVER put content on the same line as a heading
4. Only include "Action" section if there's a clear todo/task
5. Skip empty sections entirely

CONSTRAINTS
-----------
• ≤ 125 words total
• Skip "Action" section if no clear action items
• Quote important specifics (names/dates/numbers) exactly

QUALITY CHECK
-------------
Does every statement come directly from the transcript? Remove anything speculative before replying.

OUTPUT
------
Return **only** the formatted summary — no tags, no preamble.`,
    temperature: 0.25,
    maxTokens: 500
  }
} as const;

/**
 * Enhance transcript using LLM based on processing type with retry logic
 * @param transcript - Original transcript
 * @param processingType - Type of enhancement
 * @param maxRetries - Maximum number of retry attempts
 * @returns Enhanced transcript
 */
async function enhanceTranscript(transcript: string, processingType: EnhancementType, maxRetries: number = 3): Promise<string> {
  const config = getOpenAIConfig();
  const prompt = prompts[processingType];
  
  // Validate required configuration
  if (!config.apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 [BACKGROUND] Calling OpenAI for ${processingType} enhancement (attempt ${attempt}/${maxRetries})...`);
      console.log(`🤖 [BACKGROUND] OpenAI config:`, {
        hasApiKey: true,
        apiKeyPrefix: config.apiKey.substring(0, 10) + '...',
        apiUrl: config.apiUrl,
        transcriptLength: transcript.length
      });
      
      const openai = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.apiUrl,
      });

      console.log(`🤖 [BACKGROUND] Making OpenAI API request for ${processingType}...`);
      const response = await openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: `<TRANSCRIPT>\n${transcript}\n</TRANSCRIPT>` }
        ],
        temperature: prompt.temperature,
        top_p: 1,
        max_tokens: prompt.maxTokens
      });

      console.log(`🤖 [BACKGROUND] OpenAI API response received for ${processingType}:`, {
        hasResponse: !!response,
        hasChoices: !!response.choices,
        choicesLength: response.choices?.length || 0,
        hasContent: !!response.choices?.[0]?.message?.content,
        attempt: attempt
      });

      let enhancedText = response.choices[0].message.content;
      
      if (!enhancedText) {
        throw new Error('Empty response from LLM');
      }

      // Fail-safe truncation for summaries (optional paranoia check)
      if (processingType === 'summary') {
        const words = enhancedText.split(/\s+/);
        if (words.length > 160) {
          enhancedText = words.slice(0, 160).join(' ') + '...';
          console.log('🛡️ Applied fail-safe truncation to summary');
        }
      } else if (processingType === 'quickSummary') {
        const words = enhancedText.split(/\s+/);
        if (words.length > 130) {
          enhancedText = words.slice(0, 130).join(' ') + '...';
          console.log('🛡️ Applied fail-safe truncation to quick summary');
        }
      }

      // Convert markdown to HTML for summary types
      if (processingType === 'summary' || processingType === 'quickSummary') {
        console.log(`🔄 [BACKGROUND] Converting markdown to HTML for ${processingType}...`);
        console.log(`🔤 [BACKGROUND] Raw LLM output before markdown conversion:`, {
          hasLineBreaks: enhancedText.includes('\n'),
          hasDoubleLineBreaks: enhancedText.includes('\n\n'),
          sections: enhancedText.split('###').length - 1,
          length: enhancedText.length
        });
        
        // Fix missing line breaks between markdown sections
        let fixedMarkdown = enhancedText;
        
        // Add line breaks before ### headings (except the first one)
        fixedMarkdown = fixedMarkdown.replace(/([^#])(###)/g, '$1\n\n$2');
        
        // Add line breaks after headings before bullet points
        fixedMarkdown = fixedMarkdown.replace(/(###[^#\n]+)(\s*-\s)/g, '$1\n\n$2');
        
        console.log(`🔧 [BACKGROUND] Fixed markdown formatting:`, {
          originalLength: enhancedText.length,
          fixedLength: fixedMarkdown.length,
          hasLineBreaks: fixedMarkdown.includes('\n'),
          hasDoubleLineBreaks: fixedMarkdown.includes('\n\n'),
          sections: fixedMarkdown.split('###').length - 1
        });
        
        enhancedText = markdownToHtml(fixedMarkdown);
        console.log(`✅ [BACKGROUND] Markdown conversion completed for ${processingType}:`, {
          originalLength: transcript.length,
          enhancedLength: enhancedText.length,
          processingType
        });
      }

      console.log(`🤖 [BACKGROUND] LLM enhancement completed successfully:`, {
        originalLength: transcript.length,
        enhancedLength: enhancedText.length,
        processingType,
        attempt: attempt
      });

      return enhancedText;
      
    } catch (llmError) {
      lastError = llmError instanceof Error ? llmError : new Error(String(llmError));
      
      console.error(`❌ [BACKGROUND] LLM enhancement failed for ${processingType} (attempt ${attempt}/${maxRetries}):`, llmError);
      
      // Check if error is retryable
      const isRetryable = isRetryableError(llmError);
      
      if (attempt === maxRetries || !isRetryable) {
        console.error(`❌ [BACKGROUND] Final attempt failed or non-retryable error:`, {
          errorMessage: lastError.message,
          errorStack: lastError.stack,
          errorType: lastError.constructor.name,
          transcriptLength: transcript.length,
          processingType,
          configApiUrl: config.apiUrl,
          hasApiKey: !!config.apiKey,
          finalAttempt: attempt === maxRetries,
          isRetryable
        });
        break;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
      console.log(`⏳ [BACKGROUND] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we reach here, all attempts failed
  const error = new Error(`LLM processing failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  (error as any).transcriptLength = transcript.length; // Only store length for debugging, not content
  (error as any).processingType = processingType; // Store processing type for debugging
  (error as any).lastError = lastError?.message; // Store last error for debugging
  throw error;
}

/**
 * Check if an error is retryable
 * @param error - Error to check
 * @returns boolean - True if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  
  // Retryable errors
  const retryablePatterns = [
    'rate_limit_exceeded',
    'model_overloaded',
    'timeout',
    'network',
    'connection',
    'temporary',
    'service_unavailable',
    'internal_server_error',
    'bad_gateway',
    'gateway_timeout'
  ];
  
  // Non-retryable errors
  const nonRetryablePatterns = [
    'insufficient_quota',
    'invalid_request',
    'authentication',
    'authorization',
    'invalid_api_key',
    'content_policy_violation'
  ];
  
  // Check for non-retryable patterns first
  if (nonRetryablePatterns.some(pattern => errorMessage.includes(pattern))) {
    return false;
  }
  
  // Check for retryable patterns
  if (retryablePatterns.some(pattern => errorMessage.includes(pattern))) {
    return true;
  }
  
  // Default to retryable for unknown errors (conservative approach)
  return true;
}

/**
 * Send enhanced email with processed content (with timeout protection)
 * @param userEmail - User's email
 * @param data - Enhanced email data
 */
async function sendEnhancedEmail(userEmail: string, data: EnhancedEmailData): Promise<void> {
  console.log('📧 [BACKGROUND] Preparing enhanced email:', {
    recipient: userEmail,
    processingType: data.processingType,
    filename: data.filename,
    originalLength: data.originalTranscript.length,
    enhancedLength: data.enhancedContent.length
  });

  console.log('📧 [BACKGROUND] Sending enhanced email with new template system');
  
  // Add timeout protection to email sending
  const emailTimeout = 30000; // 30 seconds
  const emailPromise = sendEnhancedEmailFromMailgun(
    userEmail,
    {
      originalTranscript: data.originalTranscript,
      enhancedContent: data.enhancedContent,
      processingType: data.processingType,
      filename: data.filename
    }
  );

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Email sending timeout after ${emailTimeout}ms`));
    }, emailTimeout);
  });

  try {
    const emailSent = await Promise.race([emailPromise, timeoutPromise]);
    
    if (!emailSent) {
      throw new Error('Failed to send enhanced email');
    }

    console.log('📧 [BACKGROUND] Enhanced email sent successfully');
  } catch (error) {
    console.error('📧 [BACKGROUND] Enhanced email sending failed:', {
      error: error instanceof Error ? error.message : String(error),
      recipient: userEmail,
      processingType: data.processingType,
      filename: data.filename
    });
    throw error;
  }
}



/**
 * Process enhancements using an existing transcript (no re-transcription needed)
 * @param transcript - The transcript text to enhance
 * @param metadata - Processing metadata
 */
export async function processEnhancementsWithTranscript(
  transcript: string,
  metadata: BackgroundProcessingMetadata
): Promise<void> {
  console.log(`🔄 [BACKGROUND] Starting enhancements processing for event ${metadata.eventId}:`, metadata.enhancementTypes);
  
  try {
    console.log('🎤 [BACKGROUND] Using provided transcript:', {
      textLength: transcript.length,
      enhancementTypes: metadata.enhancementTypes
    });

    // 🔥 NEW: Update database to track enhancement start
    console.log('💾 [BACKGROUND] Updating database: enhancement processing started');
    await updateVoiceEvent(metadata.eventId, {
      status: 'processing',
      error_message: 'Enhancement processing started'
    });
    console.log('✅ [BACKGROUND] Database updated: enhancement processing started');

    // Step 1: Process each enhancement type
    const enhancementResults: EnhancementProcessingResult[] = [];
    
    for (const enhancementType of metadata.enhancementTypes) {
      try {
        // 🔥 NEW: Update database for each enhancement start
        console.log(`💾 [BACKGROUND] Updating database: starting ${enhancementType}`);
        await updateVoiceEvent(metadata.eventId, {
          status: 'processing',
          error_message: `Processing ${enhancementType} enhancement`
        });
        console.log(`✅ [BACKGROUND] Database updated: processing ${enhancementType}`);
        
        console.log(`🤖 [BACKGROUND] Processing ${enhancementType} enhancement...`);
        const enhancedContent = await enhanceTranscript(transcript, enhancementType);
        
        // 🔥 NEW: Update database for each enhancement success
        console.log(`💾 [BACKGROUND] Updating database: ${enhancementType} completed`);
        await updateVoiceEvent(metadata.eventId, {
          status: 'processing',
          error_message: `${enhancementType} completed, continuing with remaining enhancements`
        });
        console.log(`✅ [BACKGROUND] Database updated: ${enhancementType} completed`);
        
        console.log(`📧 [BACKGROUND] Sending ${enhancementType} email...`);
        await sendEnhancedEmail(metadata.userEmail, {
          originalTranscript: transcript,
          enhancedContent,
          processingType: enhancementType,
          filename: metadata.filename
        });
        
        enhancementResults.push({
          type: enhancementType,
          success: true,
          content: enhancedContent
        });
        
        console.log(`✅ [BACKGROUND] ${enhancementType} enhancement completed successfully`);
        
      } catch (enhancementError) {
        console.error(`❌ [BACKGROUND] ${enhancementType} enhancement failed:`, enhancementError);
        console.error(`❌ [BACKGROUND] ${enhancementType} enhancement error details:`, {
          errorMessage: enhancementError instanceof Error ? enhancementError.message : String(enhancementError),
          errorStack: enhancementError instanceof Error ? enhancementError.stack : 'No stack trace',
          errorType: enhancementError instanceof Error ? enhancementError.constructor.name : typeof enhancementError,
          enhancementType,
          transcriptLength: transcript.length,
          userEmail: metadata.userEmail,
          filename: metadata.filename
        });
        
        // 🔥 NEW: Update database for each enhancement failure
        const errorMessage = `${enhancementType} failed: ${enhancementError instanceof Error ? enhancementError.message : String(enhancementError)}`;
        console.log(`💾 [BACKGROUND] Updating database: ${enhancementType} failed - ${errorMessage}`);
        await updateVoiceEvent(metadata.eventId, {
          status: 'processing',
          error_message: errorMessage
        });
        console.log(`✅ [BACKGROUND] Database updated: ${enhancementType} failed`);
        
        enhancementResults.push({
          type: enhancementType,
          success: false,
          error: enhancementError instanceof Error ? enhancementError.message : 'Unknown enhancement error'
        });
      }
    }

    // Step 2: Update database with overall status
    const successfulEnhancements = enhancementResults.filter(r => r.success);
    const failedEnhancements = enhancementResults.filter(r => !r.success);
    
    console.log(`📊 [BACKGROUND] Enhancement processing summary for event ${metadata.eventId}:`, {
      totalEnhancements: enhancementResults.length,
      successful: successfulEnhancements.length,
      failed: failedEnhancements.length,
      results: enhancementResults.map(r => ({ type: r.type, success: r.success, hasContent: !!r.content, error: r.error }))
    });
    
    if (successfulEnhancements.length > 0) {
      const statusMessage = failedEnhancements.length > 0 
        ? `Partial success: ${successfulEnhancements.length}/${enhancementResults.length} enhancements completed`
        : 'All enhancements completed successfully';
      
      const finalStatus = failedEnhancements.length > 0 ? 'failed' : 'completed';
      const finalErrorMessage = failedEnhancements.length > 0 ? 
        `Some enhancements failed: ${failedEnhancements.map(f => f.type).join(', ')}` : undefined;
        
      console.log(`💾 [BACKGROUND] Updating database with final status: ${finalStatus}`);
      await updateVoiceEvent(metadata.eventId, {
        status: finalStatus,
        completed_at: new Date(),
        error_message: finalErrorMessage
      });
      
      console.log(`✅ [BACKGROUND] Enhancement processing completed for event ${metadata.eventId}: ${statusMessage}`);
    } else {
      // All enhancements failed
      console.log(`💾 [BACKGROUND] Updating database with failure status for event ${metadata.eventId}...`);
      await updateVoiceEvent(metadata.eventId, {
        status: 'failed',
        error_message: `All enhancements failed: ${failedEnhancements.map(f => f.error).join('; ')}`
      });
      
      console.log(`❌ [BACKGROUND] All enhancements failed for event ${metadata.eventId}`);
    }

  } catch (error) {
    console.error(`❌ [BACKGROUND] Critical enhancement processing failure for event ${metadata.eventId}:`, error);
    console.error(`❌ [BACKGROUND] Critical error details:`, {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'No stack trace',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      eventId: metadata.eventId,
      userEmail: metadata.userEmail,
      enhancementTypes: metadata.enhancementTypes,
      transcriptLength: transcript.length
    });
    
    // 🔥 NEW: Update database with critical failure
    console.log(`💾 [BACKGROUND] Updating database with critical failure for event ${metadata.eventId}...`);
    try {
      await updateVoiceEvent(metadata.eventId, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Critical enhancement processing error'
      });
      console.log(`✅ [BACKGROUND] Database updated with critical failure status for event ${metadata.eventId}`);
    } catch (dbError) {
      console.error(`❌ [BACKGROUND] Failed to update database with error status for event ${metadata.eventId}:`, dbError);
    }
    
    throw error;
  }
}

/**
 * Check if any enhancement types require background processing
 * @param enhancementTypes - Array of enhancement types
 * @returns boolean - True if background processing is needed
 */
export function requiresBackgroundProcessing(enhancementTypes: EnhancementType[]): boolean {
  return enhancementTypes.length > 0;
}

/**
 * Check if a single processing type requires background processing (legacy)
 * @param processingType - Type of processing
 * @returns boolean - True if background processing is needed
 */
export function requiresBackgroundProcessingSingle(processingType: string): boolean {
  return processingType === 'cleanup' || processingType === 'summary' || processingType === 'quickSummary';
}

/**
 * Get estimated processing time for background jobs with multiple enhancements
 * @param enhancementTypes - Array of enhancement types
 * @param audioFile - Audio file
 * @returns Estimated time in seconds
 */
export function estimateBackgroundProcessingTime(
  enhancementTypes: EnhancementType[],
  audioFile: File
): number {
  if (enhancementTypes.length === 0) {
    return 0;
  }
  
  // Base transcription time (from whisper estimation) - only done once
  const sizeMB = audioFile.size / (1024 * 1024);
  const transcriptionTime = Math.ceil(sizeMB * 3 + 5); // Rough estimate
  
  // LLM processing time per enhancement (can be done in parallel but estimate sequential)
  let totalLLMTime = 0;
  enhancementTypes.forEach(type => {
    if (type === 'quickSummary') {
      totalLLMTime += 3; // Quick summary is fastest
    } else if (type === 'summary') {
      totalLLMTime += 5; // Summary is fast
    } else {
      totalLLMTime += 10; // Cleanup takes longer
    }
  });
  
  // Email sending time per enhancement
  const emailTime = enhancementTypes.length * 2;
  
  return transcriptionTime + totalLLMTime + emailTime;
}

/**
 * Estimate processing time for a single enhancement type (legacy)
 * @param processingType - Type of processing
 * @param audioFile - Audio file
 * @returns Estimated time in seconds
 */
export function estimateSingleEnhancementTime(
  processingType: EnhancementType,
  audioFile: File
): number {
  return estimateBackgroundProcessingTime([processingType], audioFile);
} 