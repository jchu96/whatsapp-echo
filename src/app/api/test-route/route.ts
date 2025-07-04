import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🧪 [TEST] Test route called');
  console.log('🧪 [TEST] URL:', request.url);
  console.log('🧪 [TEST] Method:', request.method);
  
  return NextResponse.json({ 
    message: 'Test route working!',
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method
  });
}

export async function POST(request: NextRequest) {
  console.log('🧪 [TEST] Test POST route called');
  console.log('🧪 [TEST] URL:', request.url);
  console.log('🧪 [TEST] Method:', request.method);
  
  try {
    const body = await request.json();
    console.log('🧪 [TEST] Request body:', body);
    
    return NextResponse.json({ 
      message: 'Test POST route working!',
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method,
      receivedBody: body
    });
  } catch (error) {
    console.error('🧪 [TEST] Error parsing body:', error);
    return NextResponse.json({ 
      message: 'Test POST route working (no JSON body)!',
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method
    });
  }
} 