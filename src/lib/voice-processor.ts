import OpenAI from 'openai';
import { getOpenAIConfig } from '@/utils/env';
import { sendSuccessEmail } from '@/lib/mailgun';
import { updateVoiceEvent } from '@/lib/database';
import { BackgroundProcessingMetadata, EnhancedEmailData, EnhancementType, EnhancementProcessingResult } from '@/types';
import { fastTranscribeAudio, cleanTranscription } from '@/lib/whisper';

/**
 * Process voice note in the background with multiple enhancement types
 * @param audioFile - Audio file to process
 * @param metadata - Processing metadata with array of enhancement types
 */
export async function processVoiceNoteBackground(
  audioFile: File,
  metadata: BackgroundProcessingMetadata
): Promise<void> {
  console.log(`🔄 [BACKGROUND] Starting enhancements processing for event ${metadata.eventId}:`, metadata.enhancementTypes);
  
  try {
    // Step 1: Transcribe audio with Whisper (only once)
    console.log('🎤 [BACKGROUND] Transcribing audio...');
    const transcription = await fastTranscribeAudio(audioFile, 45000); // 45 second timeout

    if (!transcription.text?.trim()) {
      throw new Error('Empty transcription result');
    }

    console.log('🎤 [BACKGROUND] Transcription completed:', {
      textLength: transcription.text.length,
      duration: transcription.duration,
      enhancementTypes: metadata.enhancementTypes
    });

    // Step 2: Process each enhancement type
    const enhancementResults: EnhancementProcessingResult[] = [];
    
    for (const enhancementType of metadata.enhancementTypes) {
      try {
        console.log(`🤖 [BACKGROUND] Processing ${enhancementType} enhancement...`);
        const enhancedContent = await enhanceTranscript(transcription.text, enhancementType);
        
        console.log(`📧 [BACKGROUND] Sending ${enhancementType} email...`);
        await sendEnhancedEmail(metadata.userEmail, {
          originalTranscript: transcription.text,
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
        
        enhancementResults.push({
          type: enhancementType,
          success: false,
          error: enhancementError instanceof Error ? enhancementError.message : 'Unknown enhancement error'
        });
      }
    }

    // Step 3: Update database with overall status
    const successfulEnhancements = enhancementResults.filter(r => r.success);
    const failedEnhancements = enhancementResults.filter(r => !r.success);
    
    if (successfulEnhancements.length > 0) {
      const statusMessage = failedEnhancements.length > 0 
        ? `Partial success: ${successfulEnhancements.length}/${enhancementResults.length} enhancements completed`
        : 'All enhancements completed successfully';
        
      await updateVoiceEvent(metadata.eventId, {
        status: 'completed',
        completed_at: new Date(),
        error_message: failedEnhancements.length > 0 ? 
          `Some enhancements failed: ${failedEnhancements.map(f => f.type).join(', ')}` : undefined
      });
      
      console.log(`✅ [BACKGROUND] Enhancement processing completed for event ${metadata.eventId}: ${statusMessage}`);
    } else {
      // All enhancements failed
      await updateVoiceEvent(metadata.eventId, {
        status: 'failed',
        error_message: `All enhancements failed: ${failedEnhancements.map(f => f.error).join('; ')}`
      });
      
      console.log(`❌ [BACKGROUND] All enhancements failed for event ${metadata.eventId}`);
    }

  } catch (error) {
    console.error(`❌ [BACKGROUND] Critical processing failure for event ${metadata.eventId}:`, error);
    
    // Total failure - update database with error
    await updateVoiceEvent(metadata.eventId, {
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Critical processing error'
    });
    
    throw error;
  }
}

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

### Main Topic  *(always include — one sentence)*

### Key Points  *(include if ≥ 2 important ideas)*
- Bullet points in the order mentioned

### Action Items  *(include if specific tasks/todos are stated)*
- **Task + context (+ timeline if given)**

### Important Details  *(include if names / dates / numbers / decisions appear)*
- Quote each item exactly as spoken

CONSTRAINTS
-----------
• ≤ 150 words total  
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
    maxTokens: 512
  },

  quickSummary: {
    system: `You are a **Voice-note Summariser** focused on speed and efficiency.

TASK
----
Create a brief summary in 2-3 sentences maximum from the transcript between <TRANSCRIPT> … </TRANSCRIPT>.

FORMAT:
**Topic:** [What this voice note is about]
**Key Point:** [Most important takeaway]
**Action:** [Only if there's a clear todo/task mentioned]

CONSTRAINTS
-----------
• ≤ 75 words total
• Skip "Action" section if no clear action items
• Quote important specifics (names/dates/numbers) exactly

QUALITY CHECK
-------------
Does every statement come directly from the transcript? Remove anything speculative before replying.

OUTPUT
------
Return **only** the formatted summary — no tags, no preamble.`,
    temperature: 0.25,
    maxTokens: 128
  }
} as const;

/**
 * Enhance transcript using LLM based on processing type
 * @param transcript - Original transcript
 * @param processingType - Type of enhancement
 * @returns Enhanced transcript
 */
async function enhanceTranscript(transcript: string, processingType: EnhancementType): Promise<string> {
  const config = getOpenAIConfig();
  const prompt = prompts[processingType];
  
  try {
    console.log(`🤖 [BACKGROUND] Calling OpenAI for ${processingType} enhancement...`);
    
    const openai = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.apiUrl,
    });

    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4.1-nano-2025-04-14',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: `<TRANSCRIPT>\n${transcript}\n</TRANSCRIPT>` }
      ],
      temperature: prompt.temperature,
      top_p: 1,
      max_tokens: prompt.maxTokens
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
      if (words.length > 80) {
        enhancedText = words.slice(0, 80).join(' ') + '...';
        console.log('🛡️ Applied fail-safe truncation to quick summary');
      }
    }

    console.log(`🤖 [BACKGROUND] LLM enhancement completed:`, {
      originalLength: transcript.length,
      enhancedLength: enhancedText.length,
      processingType
    });

    return enhancedText;
    
  } catch (llmError) {
    console.error('❌ [BACKGROUND] LLM enhancement failed:', llmError);
    const error = new Error(`LLM processing failed: ${llmError instanceof Error ? llmError.message : 'Unknown error'}`);
    (error as any).transcript = transcript; // Attach original transcript for fallback
    throw error;
  }
}

/**
 * Send enhanced email with processed content
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

  // Create enhanced filename with processing type indicator
  const getProcessingLabel = (type: EnhancementType): string => {
    switch (type) {
      case 'cleanup': return 'Cleaned';
      case 'summary': return 'Summary';
      case 'quickSummary': return 'Quick Summary';
      default: return 'Enhanced';
    }
  };

  const getProcessingDescription = (type: EnhancementType): string => {
    switch (type) {
      case 'cleanup': return 'Grammar & formatting cleanup';
      case 'summary': return 'Key points summary';
      case 'quickSummary': return 'Quick summary';
      default: return 'Enhanced transcript';
    }
  };

  const enhancedFilename = `[${getProcessingLabel(data.processingType)}] ${data.filename}`;
  
  // Create enhanced email content with clear labeling
  const enhancedEmailContent = `Voice Note: ${data.filename}
Processing: ${getProcessingLabel(data.processingType)}

${getProcessingLabel(data.processingType)}:
${data.enhancedContent}

---

📋 Enhancement Details:
• Processing Type: ${getProcessingDescription(data.processingType)}
• Original Length: ${data.originalTranscript.length} characters
• Enhanced Length: ${data.enhancedContent.length} characters
• Processed: ${new Date().toLocaleString()}

🎤 Original Transcript:
${data.originalTranscript}
  `.trim();

  console.log('📧 [BACKGROUND] Sending enhanced email with existing sendSuccessEmail function');
  
  const emailSent = await sendSuccessEmail(
    userEmail,
    enhancedEmailContent,
    enhancedFilename
  );

  if (!emailSent) {
    throw new Error('Failed to send enhanced email');
  }

  console.log('📧 [BACKGROUND] Enhanced email sent successfully');
}

/**
 * Queue background processing job
 * This is a placeholder for future queue implementation
 * For now, it processes immediately
 */
export async function queueVoiceProcessing(
  audioFile: File,
  metadata: BackgroundProcessingMetadata
): Promise<void> {
  console.log('🔄 [BACKGROUND] Queuing voice processing job:', {
    eventId: metadata.eventId,
    enhancementTypes: metadata.enhancementTypes,
    filename: metadata.filename
  });
  
  // For now, process immediately
  // In production, you might want to use a proper queue like Bull/BullMQ
  await processVoiceNoteBackground(audioFile, metadata);
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