// @ts-ignore
import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { getServerSession } from 'next-auth';
import { authOptions, isSessionAdmin } from '@/lib/auth';
import { getUsersWithStats, toggleUserApproval } from '@/lib/database';

// Vercel configuration
export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * GET handler for retrieving users with stats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isSessionAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    const result = await getUsersWithStats(page, limit);
    
    // Add debug logging for the raw data
    console.log('🔍 [ADMIN] Raw user data from database:', JSON.stringify(result.data, null, 2));
    
    // Log specific user data types
    result.data.forEach((user, index) => {
      console.log(`🔍 [ADMIN] User ${index + 1}:`, {
        email: user.google_email,
        approved: user.approved,
        approvedType: typeof user.approved,
        booleanValue: Boolean(user.approved)
      });
    });
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Admin users fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST handler for user management actions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isSessionAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, userId } = body;
    
    if (!action || !userId) {
      return NextResponse.json({ error: 'Missing action or userId' }, { status: 400 });
    }
    
    switch (action) {
      case 'toggle_approval': {
        const result = await toggleUserApproval(userId);
        
        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
        
        return NextResponse.json({ 
          success: true, 
          user: result.data,
          message: `User ${Boolean(result.data?.approved) ? 'approved' : 'revoked'} successfully`
        });
      }
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Admin users action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 