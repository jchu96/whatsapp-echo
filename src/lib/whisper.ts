// @ts-ignore
import FormData from 'form-data';
import { getOpenAIConfig } from '@/utils/env';
import { WhisperTranscription, WhisperError, TimeoutErrorType } from '@/types';

/**
 * Transcribe audio using OpenAI Whisper API with timeout handling
 * @param audioFile - Audio file to transcribe
 * @param abortSignal - Abort signal for timeout control
 * @returns Promise<WhisperTranscription> - Transcription result
 */
export async function transcribeAudio(
  audioFile: File,
  abortSignal: AbortSignal
): Promise<WhisperTranscription> {
  const config = getOpenAIConfig();
  
  try {
    // Create form data for multipart upload
    const formData = new FormData();
    formData.append('file', audioFile.stream(), {
      filename: audioFile.name,
      contentType: audioFile.type,
      knownLength: audioFile.size
    });
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
    formData.append('language', 'en'); // Can be made configurable
    
    // Make API request with timeout handling
    const response = await fetch(`${config.apiUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        ...formData.getHeaders()
      },
      // @ts-ignore - FormData from form-data package has correct type for Node.js
      body: formData,
      signal: abortSignal
    });
    
    if (!response.ok) {
      const errorData = await response.json() as WhisperError;
      throw new Error(
        `OpenAI API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`
      );
    }
    
    const result = await response.json() as WhisperTranscription;
    
    // Validate response
    if (!result.text || typeof result.text !== 'string') {
      throw new Error('Invalid transcription response from OpenAI');
    }
    
    return result;
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Transcription timeout exceeded');
      }
      
      // Handle specific OpenAI errors
      if (error.message.includes('rate_limit_exceeded')) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }
      
      if (error.message.includes('insufficient_quota')) {
        throw new Error('OpenAI quota exceeded. Please contact support.');
      }
      
      if (error.message.includes('model_overloaded')) {
        throw new Error('OpenAI service temporarily overloaded. Please try again.');
      }
      
      throw error;
    }
    
    throw new Error('Unknown transcription error');
  }
}

/**
 * Fast transcription with aggressive timeout handling
 * @param audioFile - Audio file to transcribe
 * @param timeoutMs - Timeout in milliseconds (default: 40 seconds)
 * @returns Promise<WhisperTranscription> - Transcription result
 */
export async function fastTranscribeAudio(
  audioFile: File,
  timeoutMs: number = 40000
): Promise<WhisperTranscription> {
  const controller = new AbortController();
  
  // Set timeout for the transcription process
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  try {
    const result = await transcribeAudio(audioFile, controller.signal);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Validate audio file for Whisper API compatibility
 * @param audioFile - Audio file to validate
 * @returns Validation result
 */
export function validateAudioForWhisper(audioFile: File): {
  isValid: boolean;
  errorType?: TimeoutErrorType;
  errorMessage?: string;
} {
  // Check file size (Whisper has a 25MB limit, but we use 15MB for safety)
  const maxSizeBytes = 15 * 1024 * 1024; // 15MB
  if (audioFile.size > maxSizeBytes) {
    return {
      isValid: false,
      errorType: 'file_too_large',
      errorMessage: `File size ${(audioFile.size / 1024 / 1024).toFixed(1)}MB exceeds Whisper limit of 15MB`
    };
  }
  
  // Check file format compatibility with Whisper
  const supportedFormats = [
    'audio/mpeg',     // mp3
    'audio/mp4',      // m4a
    'audio/wav',      // wav
    'audio/ogg',      // ogg
    'audio/aac',      // aac
    'audio/flac',     // flac
    'audio/x-m4a'     // m4a variant
  ];
  
  const isValidFormat = supportedFormats.some(format => 
    audioFile.type.toLowerCase().includes(format)
  );
  
  if (!isValidFormat) {
    return {
      isValid: false,
      errorType: 'invalid_format',
      errorMessage: `Unsupported format: ${audioFile.type}. Whisper supports mp3, m4a, wav, ogg, aac, flac`
    };
  }
  
  return { isValid: true };
}

/**
 * Estimate transcription time based on file characteristics
 * @param audioFile - Audio file to analyze
 * @returns Estimated processing time in seconds
 */
export function estimateTranscriptionTime(audioFile: File): number {
  // Base estimation: 1MB typically takes 2-5 seconds
  // Larger files take longer, but not linearly
  const sizeMB = audioFile.size / (1024 * 1024);
  
  let estimatedSeconds: number;
  
  if (sizeMB <= 1) {
    estimatedSeconds = sizeMB * 3; // 3 seconds per MB for small files
  } else if (sizeMB <= 5) {
    estimatedSeconds = 3 + (sizeMB - 1) * 4; // 4 seconds per additional MB
  } else {
    estimatedSeconds = 19 + (sizeMB - 5) * 5; // 5 seconds per additional MB for large files
  }
  
  // Add overhead for API latency and processing
  const overhead = 3;
  
  return Math.ceil(estimatedSeconds + overhead);
}

/**
 * Check if file is likely to cause timeout
 * @param audioFile - Audio file to check
 * @param maxAllowedTime - Maximum allowed time in seconds
 * @returns boolean - True if likely to timeout
 */
export function isLikelyToTimeout(audioFile: File, maxAllowedTime: number = 40): boolean {
  const estimated = estimateTranscriptionTime(audioFile);
  
  // Add 25% safety margin
  return estimated * 1.25 > maxAllowedTime;
}

/**
 * Get processing recommendations for optimal transcription
 * @param audioFile - Audio file to analyze
 * @returns Object with recommendations
 */
export function getTranscriptionRecommendations(audioFile: File) {
  const sizeMB = audioFile.size / (1024 * 1024);
  const estimated = estimateTranscriptionTime(audioFile);
  
  const recommendations: string[] = [];
  
  if (sizeMB > 10) {
    recommendations.push('File is large; consider splitting into smaller segments');
  }
  
  if (audioFile.type.includes('wav')) {
    recommendations.push('WAV files are uncompressed; consider using M4A or MP3 for faster processing');
  }
  
  if (estimated > 35) {
    recommendations.push('Processing time may exceed timeout; consider a shorter recording');
  }
  
  if (sizeMB < 0.1) {
    recommendations.push('File is very small; ensure audio quality is sufficient');
  }
  
  return {
    estimatedTime: estimated,
    isOptimal: estimated < 30 && sizeMB < 8,
    riskLevel: estimated > 35 ? 'high' : estimated > 25 ? 'medium' : 'low',
    recommendations
  };
}

/**
 * Clean and format transcription text
 * @param text - Raw transcription text
 * @returns Cleaned transcription
 */
export function cleanTranscription(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/([.!?])\s*([a-z])/g, '$1 $2') // Ensure space after punctuation
    .replace(/^./, char => char.toUpperCase()); // Capitalize first letter
}

/**
 * Split large audio processing into chunks (for future enhancement)
 * @param audioFile - Large audio file
 * @param chunkSizeMB - Maximum chunk size in MB
 * @returns Array of chunk information
 */
export function planAudioChunking(audioFile: File, chunkSizeMB: number = 10) {
  const totalSizeMB = audioFile.size / (1024 * 1024);
  
  if (totalSizeMB <= chunkSizeMB) {
    return [{
      start: 0,
      end: audioFile.size,
      index: 0,
      estimatedTime: estimateTranscriptionTime(audioFile)
    }];
  }
  
  const numChunks = Math.ceil(totalSizeMB / chunkSizeMB);
  const chunks = [];
  
  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSizeMB * 1024 * 1024;
    const end = Math.min((i + 1) * chunkSizeMB * 1024 * 1024, audioFile.size);
    const chunkSize = end - start;
    
    chunks.push({
      start,
      end,
      index: i,
      estimatedTime: estimateTranscriptionTime(new File([audioFile.slice(start, end)], `chunk-${i}.${audioFile.name.split('.').pop()}`, { type: audioFile.type }))
    });
  }
  
  return chunks;
}

/**
 * Get error type from Whisper API error
 * @param error - Error from Whisper API
 * @returns TimeoutErrorType - Categorized error type
 */
export function categorizeWhisperError(error: Error): TimeoutErrorType {
  const message = error.message.toLowerCase();
  
  if (message.includes('timeout') || message.includes('abort')) {
    return 'whisper_timeout';
  }
  
  if (message.includes('rate_limit') || message.includes('quota')) {
    return 'processing_timeout';
  }
  
  if (message.includes('format') || message.includes('unsupported')) {
    return 'invalid_format';
  }
  
  if (message.includes('too large') || message.includes('size')) {
    return 'file_too_large';
  }
  
  return 'general_error';
} 