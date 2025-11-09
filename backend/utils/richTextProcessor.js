class RichTextProcessor {
  // Process rich text content and replace variables
  static processTemplate(template, variables = {}) {
    if (!template) return '';
    
    let processed = template;
    
    // Replace variables
    Object.keys(variables).forEach(key => {
      const value = variables[key] || '';
      // Escape special regex characters in the key
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{${escapedKey}\\}`, 'gi'); // Added 'i' flag for case-insensitive matching
      processed = processed.replace(regex, value);
    });
    
    return processed;
  }
  
  // Sanitize HTML content for email
  static sanitizeHtml(html) {
    if (!html) return '';
    
    // Basic sanitization - remove dangerous elements
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/on\w+=\w+/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '');
  }
  
  // Convert rich text to plain text (for email fallback)
  static toPlainText(html) {
    if (!html) return '';
    
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p\b[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n')
      .replace(/<div\b[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }
  
  // Extract text content from HTML (server-side, no DOM)
  static extractTextContent(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Process rich text with attachments
  static processRichTextWithAttachments(html, attachments = []) {
    if (!html) return { html: '', plainText: '', attachments };
    
    let processedHtml = html;
    
    attachments.forEach((attachment, index) => {
      const placeholderRegex = new RegExp(`\\[attachment:${index}\\]`, 'g');
      processedHtml = processedHtml.replace(
        placeholderRegex, 
        `<a href="${attachment.url}" download="${attachment.name}">${attachment.name}</a>`
      );
    });
    
    const sanitizedHtml = this.sanitizeHtml(processedHtml);
    const plainText = this.toPlainText(sanitizedHtml);
    
    return { html: sanitizedHtml, plainText, attachments };
  }
  
  // Validate rich text content
  static validateRichText(html) {
    if (!html) return { valid: true, errors: [] };
    
    const errors = [];
    const tagStack = [];
    const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
    let match;
    
    while ((match = tagRegex.exec(html)) !== null) {
      const isClosing = match[0].charAt(1) === '/';
      const tagName = match[1].toLowerCase();
      
      const validTags = ['p','br','div','span','strong','b','em','i','u','a','ul','ol','li','h1','h2','h3','h4','h5','h6'];
      if (!validTags.includes(tagName)) continue;
      
      if (!isClosing) tagStack.push(tagName);
      else {
        if (tagStack.length === 0) errors.push(`Unexpected closing tag: ${tagName}`);
        else {
          const lastTag = tagStack.pop();
          if (lastTag !== tagName) errors.push(`Mismatched tags: expected ${lastTag}, found ${tagName}`);
        }
      }
    }
    
    if (tagStack.length > 0) errors.push(`Unclosed tags: ${tagStack.join(', ')}`);
    
    return { valid: errors.length === 0, errors };
  }
}

module.exports = RichTextProcessor;
