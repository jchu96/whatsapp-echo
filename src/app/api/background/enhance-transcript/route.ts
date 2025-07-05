import { NextRequest, NextResponse } from 'next/server';
import { BackgroundProcessingMetadata } from '@/types';
import { processEnhancementsWithTranscript } from '@/lib/voice-processor';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [BACKGROUND-API] Enhancement processing endpoint called');
    
    // Verify the request is authenticated using NEXTAUTH_SECRET
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ [BACKGROUND-API] Missing or invalid authorization header');
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const expectedToken = crypto
      .createHash('sha256')
      .update(process.env.NEXTAUTH_SECRET || '')
      .digest('hex');

    if (token !== expectedToken) {
      console.error('❌ [BACKGROUND-API] Invalid authentication token');
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    console.log('✅ [BACKGROUND-API] Authentication successful');
    
    const metadata: BackgroundProcessingMetadata = await request.json();
    
    console.log('🔄 [BACKGROUND-API] Processing metadata:', {
      eventId: metadata.eventId,
      enhancementTypes: metadata.enhancementTypes,
      filename: metadata.filename,
      hasTranscript: !!metadata.transcript
    });

    if (!metadata.transcript) {
      console.error('❌ [BACKGROUND-API] No transcript provided');
      return NextResponse.json({ 
        success: false, 
        error: 'Transcript is required' 
      }, { status: 400 });
    }

    // Process enhancements in this separate serverless function
    await processEnhancementsWithTranscript(metadata.transcript, metadata);

    console.log('✅ [BACKGROUND-API] Enhancement processing completed successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ [BACKGROUND-API] Enhancement processing failed:', error);
    console.error('❌ [BACKGROUND-API] Error details:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : 'No stack trace'
    });
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 