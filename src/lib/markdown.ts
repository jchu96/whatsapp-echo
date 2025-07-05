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
  simpleLineBreaks: true,
  requireSpaceBeforeHeadingText: false,
  ghMentions: false,
  encodeEmails: true,
  openLinksInNewWindow: true,
  backslashEscapesHTMLTags: true
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
    // Convert markdown to HTML
    let html = converter.makeHtml(markdown);
    
    // Clean up the HTML for email compatibility
    html = html
      // Remove any script tags for security
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Ensure proper line breaks
      .replace(/\n/g, '<br>')
      // Clean up extra whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    return html;
  } catch (error) {
    console.error('❌ [MARKDOWN] Failed to convert markdown to HTML:', error);
    // Return original text if conversion fails
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