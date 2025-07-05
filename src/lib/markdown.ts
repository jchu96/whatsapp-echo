import * as showdown from 'showdown';

// Configure Showdown converter for email-safe HTML
const converter = new showdown.Converter({
  // Email-safe options
  tables: true,
  strikethrough: true,
  tasklists: true,
  ghCodeBlocks: true,
  emoji: true,
  underline: true,
  completeHTMLDocument: false,
  metadata: false,
  splitAdjacentBlockquotes: true,
  simpleLineBreaks: false,
  requireSpaceBeforeHeadingText: false,
  ghMentions: false,
  encodeEmails: true,
  openLinksInNewWindow: true,
  backslashEscapesHTMLTags: true,
  headerLevelStart: 3,
  noHeaderId: true
});

/**
 * Convert markdown to HTML for email templates
 * @param markdown - Markdown text to convert
 * @returns HTML string
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return markdown || '';
  }

  try {
    console.log('🔄 [MARKDOWN] Converting markdown to HTML:', {
      inputLength: markdown.length
    });

    // Convert markdown to HTML
    let html = converter.makeHtml(markdown);
    
    console.log('✅ [MARKDOWN] Initial conversion result:', {
      outputLength: html.length
    });
    
    // Clean up the HTML for email compatibility
    html = html
      // Remove any script tags for security
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove any style tags for security
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Clean up extra whitespace (but preserve HTML structure)
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('🧹 [MARKDOWN] Final cleaned HTML:', {
      outputLength: html.length
    });
    
    return html;
  } catch (error) {
    console.error('❌ [MARKDOWN] Failed to convert markdown to HTML:', error);
    // Return original text with basic line break conversion if conversion fails
    return markdown.replace(/\n/g, '<br>');
  }
}

/**
 * Check if content contains markdown formatting
 * @param content - Content to check
 * @returns boolean - True if content contains markdown
 */
export function containsMarkdown(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  const markdownPatterns = [
    /^#{1,6}\s/, // Headers
    /\*\*.*?\*\*/, // Bold
    /\*.*?\*/, // Italic
    /`.*?`/, // Inline code
    /^```/, // Code blocks
    /^-\s/, // Unordered lists
    /^\d+\.\s/, // Ordered lists
    /\[.*?\]\(.*?\)/, // Links
    /^>\s/, // Blockquotes
    /^\|.*\|$/, // Tables
  ];

  return markdownPatterns.some(pattern => pattern.test(content));
} 