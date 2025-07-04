import { getAudioProcessingConfig } from '@/utils/env';
import { AudioFile, ProcessingResult, TimeoutErrorType } from '@/types';

/**
 * Validate audio file before processing
 * @param audioFile - Audio file metadata
 * @returns Validation result
 */
export function validateAudioFile(audioFile: AudioFile): {
  isValid: boolean;
  errorType?: TimeoutErrorType;
  errorMessage?: string;
} {
  const config = getAudioProcessingConfig();
  
  // Check file size (convert MB to bytes)
  const maxSizeBytes = config.maxFileSizeMB * 1024 * 1024;
  if (audioFile.size > maxSizeBytes) {
    return {
      isValid: false,
      errorType: 'file_too_large',
      errorMessage: `File size ${(audioFile.size / 1024 / 1024).toFixed(1)}MB exceeds limit of ${config.maxFileSizeMB}MB`
    };
  }
  
  // Check file format
  const isValidFormat = isAudioFormat(audioFile.filename, audioFile.contentType, config.supportedFormats);
  if (!isValidFormat) {
    return {
      isValid: false,
      errorType: 'invalid_format',
      errorMessage: `Unsupported format: ${audioFile.contentType}. Supported: ${config.supportedFormats.join(', ')}`
    };
  }
  
  return { isValid: true };
}

/**
 * Check if file is a supported audio format
 * @param filename - File name
 * @param contentType - MIME type
 * @param supportedFormats - Array of supported extensions
 * @returns boolean - True if supported
 */
function isAudioFormat(filename: string, contentType: string, supportedFormats: string[]): boolean {
  const audioMimeTypes = [
    'audio/m4a',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/wave',
    'audio/ogg',
    'audio/aac',
    'audio/flac',
    'audio/x-m4a'
  ];
  
  // Check file extension
  const hasValidExtension = supportedFormats.some(ext => 
    filename.toLowerCase().endsWith(ext.toLowerCase())
  );
  
  // Check MIME type
  const hasValidMimeType = audioMimeTypes.some(type => 
    contentType.toLowerCase().includes(type)
  );
  
  return hasValidExtension || hasValidMimeType;
}

/**
 * Download audio file with timeout and streaming
 * @param url - File URL
 * @param abortSignal - Abort signal for timeout control
 * @returns Promise<ArrayBuffer> - Audio data
 */
export async function downloadAudioFile(
  url: string,
  abortSignal: AbortSignal
): Promise<ArrayBuffer> {
  const config = getAudioProcessingConfig();
  
  try {
    // Create a timeout specifically for download
    const downloadController = new AbortController();
    const downloadTimeout = setTimeout(() => {
      downloadController.abort();
    }, config.downloadTimeoutSec * 1000);
    
    // Combine both abort signals
    const combinedSignal = AbortSignal.any ? 
      AbortSignal.any([abortSignal, downloadController.signal]) :
      downloadController.signal;
    
    const response = await fetch(url, {
      method: 'GET',
      signal: combinedSignal,
      headers: {
        'User-Agent': 'Voice-Transcription-Service/1.0',
      }
    });
    
    clearTimeout(downloadTimeout);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Check content length if available
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength);
      const maxSizeBytes = config.maxFileSizeMB * 1024 * 1024;
      if (size > maxSizeBytes) {
        throw new Error(`File too large: ${(size / 1024 / 1024).toFixed(1)}MB`);
      }
    }
    
    // Stream the response body
    const arrayBuffer = await response.arrayBuffer();
    
    // Final size check
    const maxSizeBytes = config.maxFileSizeMB * 1024 * 1024;
    if (arrayBuffer.byteLength > maxSizeBytes) {
      throw new Error(`Downloaded file too large: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB`);
    }
    
    return arrayBuffer;
    
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Download timeout exceeded');
      }
      throw error;
    }
    throw new Error('Unknown download error');
  }
}

/**
 * Create a File object from ArrayBuffer for OpenAI API
 * @param arrayBuffer - Audio data
 * @param filename - Original filename
 * @param contentType - MIME type
 * @returns File - File object for API
 */
export function createAudioFile(
  arrayBuffer: ArrayBuffer,
  filename: string,
  contentType: string
): File {
  // Ensure we have a valid content type
  const validContentType = contentType || getContentTypeFromFilename(filename);
  
  // Create a Blob first, then a File
  const blob = new Blob([arrayBuffer], { type: validContentType });
  return new File([blob], filename, { type: validContentType });
}

/**
 * Get content type from filename
 * @param filename - File name
 * @returns string - MIME type
 */
function getContentTypeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  
  const mimeMap: Record<string, string> = {
    'm4a': 'audio/m4a',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'aac': 'audio/aac',
    'flac': 'audio/flac'
  };
  
  return mimeMap[ext || ''] || 'audio/mpeg';
}

/**
 * Get file size in a human-readable format
 * @param bytes - Size in bytes
 * @returns string - Formatted size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extract audio metadata from filename
 * @param filename - File name
 * @returns Object with metadata
 */
export function extractAudioMetadata(filename: string) {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
  
  return {
    extension: ext,
    baseName,
    contentType: getContentTypeFromFilename(filename),
    isAudioFile: ['.m4a', '.mp3', '.wav', '.ogg', '.aac', '.flac'].indexOf(`.${ext}`) !== -1
  };
}

/**
 * Memory-efficient audio processing pipeline
 * @param audioFile - Audio file metadata
 * @param abortSignal - Abort signal for timeout control
 * @returns Promise<ProcessingResult> - Processing result
 */
export async function processAudioFile(
  audioFile: AudioFile,
  abortSignal: AbortSignal
): Promise<ProcessingResult> {
  const startTime = Date.now();
  
  try {
    // Step 1: Validate file
    const validation = validateAudioFile(audioFile);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errorMessage,
        fileSize: audioFile.size,
        processingTime: Date.now() - startTime
      };
    }
    
    // Step 2: Download file with timeout
    const downloadStart = Date.now();
    const arrayBuffer = await downloadAudioFile(audioFile.url, abortSignal);
    const downloadTime = Date.now() - downloadStart;
    
    // Step 3: Create File object for API
    const file = createAudioFile(arrayBuffer, audioFile.filename, audioFile.contentType);
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: true,
      fileSize: arrayBuffer.byteLength,
      processingTime,
      duration: downloadTime // Duration of download phase
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown processing error',
      fileSize: audioFile.size,
      processingTime
    };
  }
}

/**
 * Check if the processing is likely to exceed timeout
 * @param fileSize - File size in bytes
 * @param maxDuration - Maximum allowed duration in seconds
 * @returns boolean - True if likely to timeout
 */
export function isLikelyToTimeout(fileSize: number, maxDuration: number = 55): boolean {
  // Rough estimation: 1MB takes about 2-3 seconds to process
  // This is very conservative to account for network variability
  const estimatedSeconds = (fileSize / (1024 * 1024)) * 3;
  
  // Add 20% safety margin
  return estimatedSeconds * 1.2 > maxDuration;
}

/**
 * Get processing recommendations based on file characteristics
 * @param audioFile - Audio file metadata
 * @returns Object with recommendations
 */
export function getProcessingRecommendations(audioFile: AudioFile) {
  const config = getAudioProcessingConfig();
  const sizeRatio = audioFile.size / (config.maxFileSizeMB * 1024 * 1024);
  
  return {
    isOptimalSize: sizeRatio < 0.5, // Under 50% of max size
    estimatedProcessingTime: Math.ceil((audioFile.size / (1024 * 1024)) * 3), // seconds
    shouldCompress: sizeRatio > 0.8, // Over 80% of max size
    recommendations: [
      sizeRatio > 0.8 ? 'Consider compressing the audio file' : null,
      audioFile.filename.toLowerCase().endsWith('.wav') ? 'WAV files are large; consider .m4a or .mp3' : null,
      audioFile.size > 10 * 1024 * 1024 ? 'Large files may take longer to process' : null
    ].filter(Boolean)
  };
} 