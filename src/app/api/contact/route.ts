import { NextRequest, NextResponse } from 'next/server';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { getRecaptchaConfig, getSiteContactEmail } from '@/utils/env';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY || '',
});

/**
 * Verify reCAPTCHA response with Google's API
 * @param recaptchaResponse - The reCAPTCHA response token
 * @returns Promise<boolean> - Whether the reCAPTCHA is valid
 */
async function verifyRecaptcha(recaptchaResponse: string): Promise<boolean> {
  try {
    const recaptchaConfig = getRecaptchaConfig();
    
    if (!recaptchaConfig.enabled || !recaptchaConfig.secretKey) {
      console.log('reCAPTCHA not configured, skipping verification');
      return true; // Skip verification if not configured
    }

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: recaptchaConfig.secretKey,
        response: recaptchaResponse,
      }),
    });

    const data = await response.json();
    
    console.log('reCAPTCHA verification result:', {
      success: data.success,
      score: data.score, // For v3 (not used in v2)
      action: data.action, // For v3 (not used in v2)
      errors: data['error-codes']
    });

    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false; // Fail closed - reject if verification fails
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message, recaptchaResponse } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Input sanitization
    const sanitizedName = name.trim().substring(0, 100);
    const sanitizedEmail = email.trim().toLowerCase().substring(0, 254);
    const sanitizedSubject = subject.trim().substring(0, 200);
    const sanitizedMessage = message.trim().substring(0, 5000);

    // Validate input lengths
    if (sanitizedName.length < 1 || sanitizedEmail.length < 3 || 
        sanitizedSubject.length < 1 || sanitizedMessage.length < 1) {
      return NextResponse.json(
        { error: 'Input validation failed' },
        { status: 400 }
      );
    }

    // Check for reCAPTCHA verification
    const recaptchaConfig = getRecaptchaConfig();
    if (recaptchaConfig.enabled && recaptchaConfig.siteKey) {
      if (!recaptchaResponse) {
        return NextResponse.json(
          { error: 'reCAPTCHA verification required' },
          { status: 400 }
        );
      }

      const isRecaptchaValid = await verifyRecaptcha(recaptchaResponse);
      if (!isRecaptchaValid) {
        return NextResponse.json(
          { error: 'reCAPTCHA verification failed' },
          { status: 400 }
        );
      }
    }

    // Create email content
    const emailContent = `
New Contact Form Submission from Echo Scribe

Name: ${sanitizedName}
Email: ${sanitizedEmail}
Subject: ${sanitizedSubject}

Message:
${sanitizedMessage}

---
This message was sent from the Echo Scribe contact form.
Reply directly to this email to respond to the sender.
Verified with reCAPTCHA: ${recaptchaConfig.enabled ? 'Yes' : 'No'}
    `.trim();

    // Send email using Mailgun
    const result = await mg.messages.create(process.env.MAILGUN_DOMAIN!, {
      from: `Echo Scribe Contact Form <noreply@${process.env.MAILGUN_DOMAIN}>`,
      to: [getSiteContactEmail()],
      'h:Reply-To': sanitizedEmail,
      subject: `[Echo Scribe Contact] ${sanitizedSubject}`,
      text: emailContent,
    });

    console.log('Contact form email sent successfully:', result.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Your message has been sent successfully!' 
    });

  } catch (error) {
    console.error('Error sending contact form email:', error);
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Contact API is working' });
} 