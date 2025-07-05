import { NextResponse } from 'next/server';
import { getPrivacyEmail, getCompanyInfo, getRecaptchaSiteKey } from '@/utils/env';

/**
 * GET /api/config/privacy-email
 * Returns the configured privacy email address, company information, and reCAPTCHA site key
 */
export async function GET() {
  try {
    const email = getPrivacyEmail();
    const company = getCompanyInfo();
    const recaptchaSiteKey = getRecaptchaSiteKey();
    
    return NextResponse.json({ 
      email,
      company,
      recaptchaSiteKey,
      success: true 
    });
  } catch (error) {
    console.error('Error getting configuration:', error);
    return NextResponse.json(
      { 
        email: 'privacy@yourdomain.com', // fallback
        company: {
          name: 'Your Company Name',
          address: '123 Main Street',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90069',
          fullAddress: '123 Main Street, Los Angeles, CA 90069'
        },
        recaptchaSiteKey: undefined,
        success: false,
        error: 'Failed to get configuration'
      },
      { status: 500 }
    );
  }
} 