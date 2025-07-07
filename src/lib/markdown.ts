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

// Configure Showdown converter for web display
const webConverter = new showdown.Converter({
  // Web-optimized options
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
  backslashEscapesHTMLTags: true,
  headerLevelStart: 1, // Start at h1 for proper web hierarchy
  noHeaderId: false, // Enable header IDs for navigation
  tablesHeaderId: true,
  parseImgDimensions: true,
  smoothLivePreview: true
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
 * Convert markdown to HTML optimized for web display
 * @param markdown - Markdown text to convert
 * @returns HTML string with enhanced web formatting
 */
export function markdownToHtmlWeb(markdown: string): string {
  if (!markdown || typeof markdown !== 'string') {
    return markdown || '';
  }

  try {
    console.log('🔄 [MARKDOWN-WEB] Converting markdown to web HTML:', {
      inputLength: markdown.length
    });

    // Convert markdown to HTML using web converter
    let html = webConverter.makeHtml(markdown);
    
    console.log('✅ [MARKDOWN-WEB] Initial conversion result:', {
      outputLength: html.length
    });
    
    // Enhanced web-specific formatting
    html = html
      // Remove any script tags for security
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove any style tags for security  
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      
      // Enhanced table formatting with better spacing
      .replace(/<table>/g, '<table class="w-full border-collapse border border-gray-300 my-6">')
      .replace(/<thead>/g, '<thead class="bg-gray-50">')
      .replace(/<th>/g, '<th class="border border-gray-300 px-4 py-3 text-left font-semibold">')
      .replace(/<td>/g, '<td class="border border-gray-300 px-4 py-3">')
      .replace(/<tr>/g, '<tr class="hover:bg-gray-50">')
      
      // Enhanced header formatting with better spacing
      .replace(/<h1>/g, '<h1 class="text-3xl font-bold mb-6 mt-8 pb-3 border-b border-gray-200">')
      .replace(/<h2>/g, '<h2 class="text-2xl font-bold mb-4 mt-8 pb-2 border-b border-gray-200">')
      .replace(/<h3>/g, '<h3 class="text-xl font-bold mb-4 mt-6">')
      .replace(/<h4>/g, '<h4 class="text-lg font-semibold mb-3 mt-5">')
      .replace(/<h5>/g, '<h5 class="text-base font-semibold mb-3 mt-4">')
      .replace(/<h6>/g, '<h6 class="text-sm font-semibold mb-2 mt-3">')
      
      // Enhanced paragraph spacing
      .replace(/<p>/g, '<p class="mb-4 leading-relaxed">')
      
      // Enhanced list formatting
      .replace(/<ul>/g, '<ul class="mb-4 space-y-2 list-disc pl-6">')
      .replace(/<ol>/g, '<ol class="mb-4 space-y-2 list-decimal pl-6">')
      .replace(/<li>/g, '<li class="leading-relaxed">')
      
      // Enhanced blockquote formatting
      .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-blue-500 bg-blue-50 pl-4 py-3 my-4 italic">')
      
      // Enhanced code formatting
      .replace(/<code>/g, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">')
      .replace(/<pre>/g, '<pre class="bg-gray-100 p-4 rounded my-4 overflow-x-auto">')
      
      // Enhanced div formatting (for centered content)
      .replace(/<div align="center">/g, '<div class="text-center my-6">')
      
      // Better spacing between sections
      .replace(/(<\/div>\s*<h[1-6])/g, '$1')
      .replace(/(<\/table>\s*<h[1-6])/g, '</table><div class="mt-8"></div><h')
      
      // Clean up whitespace while preserving structure
      .replace(/\s{2,}/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
    
    console.log('🧹 [MARKDOWN-WEB] Final web-formatted HTML:', {
      outputLength: html.length
    });
    
    return html;
  } catch (error) {
    console.error('❌ [MARKDOWN-WEB] Failed to convert markdown to web HTML:', error);
    // Fallback to basic conversion
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