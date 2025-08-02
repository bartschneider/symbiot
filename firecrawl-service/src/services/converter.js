import TurndownService from 'turndown';

class ConverterService {
  constructor() {
    this.turndownService = this.initializeTurndown();
  }

  /**
   * Initialize and configure Turndown service with custom rules
   * @returns {TurndownService} - Configured Turndown instance
   */
  initializeTurndown() {
    const turndown = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full',
      preformattedCode: false
    });

    // Add custom rules for better semantic preservation
    this.addCustomRules(turndown);
    
    return turndown;
  }

  /**
   * Add custom conversion rules for better semantic preservation
   * @param {TurndownService} turndown - Turndown instance
   */
  addCustomRules(turndown) {
    // Enhanced blockquote handling
    turndown.addRule('blockquote', {
      filter: 'blockquote',
      replacement: function (content) {
        content = content.replace(/^\n+|\n+$/g, '');
        content = content.replace(/^/gm, '> ');
        return '\n\n' + content + '\n\n';
      }
    });

    // Better table handling
    turndown.addRule('table', {
      filter: 'table',
      replacement: function (content, node) {
        return '\n\n' + content + '\n\n';
      }
    });

    turndown.addRule('tableRow', {
      filter: 'tr',
      replacement: function (content, node) {
        const cells = Array.from(node.querySelectorAll('td, th'));
        const isHeader = node.querySelectorAll('th').length > 0;
        
        let row = '| ' + content.trim().split('\n').join(' | ') + ' |';
        
        if (isHeader) {
          const separator = '| ' + cells.map(() => '---').join(' | ') + ' |';
          return row + '\n' + separator;
        }
        
        return row;
      }
    });

    turndown.addRule('tableCell', {
      filter: ['td', 'th'],
      replacement: function (content) {
        return content.trim().replace(/\|/g, '\\|');
      }
    });

    // Enhanced code block handling
    turndown.addRule('codeBlock', {
      filter: 'pre',
      replacement: function (content, node) {
        const language = node.getAttribute('data-language') || 
                        node.className.match(/language-(\w+)/)?.[1] || '';
        
        return '\n\n```' + language + '\n' + content + '\n```\n\n';
      }
    });

    // Better inline code handling
    turndown.addRule('inlineCode', {
      filter: function (node) {
        return node.nodeName === 'CODE' && node.parentNode.nodeName !== 'PRE';
      },
      replacement: function (content) {
        return '`' + content + '`';
      }
    });

    // Enhanced list handling with proper nesting
    turndown.addRule('listItem', {
      filter: 'li',
      replacement: function (content, node) {
        content = content
          .replace(/^\n+/, '') // remove leading newlines
          .replace(/\n+$/, '\n') // replace trailing newlines with just a single one
          .replace(/\n/gm, '\n    '); // indent
        
        let prefix = '- ';
        const parent = node.parentNode;
        
        if (parent.nodeName === 'OL') {
          const start = parent.getAttribute('start');
          const index = Array.prototype.indexOf.call(parent.children, node);
          prefix = (start ? parseInt(start) + index : index + 1) + '. ';
        }
        
        return prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '');
      }
    });

    // Handle definition lists
    turndown.addRule('definitionList', {
      filter: 'dl',
      replacement: function (content) {
        return '\n\n' + content + '\n\n';
      }
    });

    turndown.addRule('definitionTerm', {
      filter: 'dt',
      replacement: function (content) {
        return '**' + content + '**\n';
      }
    });

    turndown.addRule('definitionDescription', {
      filter: 'dd',
      replacement: function (content) {
        return ': ' + content + '\n\n';
      }
    });

    // Enhanced link handling with title preservation
    turndown.addRule('link', {
      filter: function (node, options) {
        return (
          node.nodeName === 'A' &&
          node.getAttribute('href')
        );
      },
      replacement: function (content, node) {
        const href = node.getAttribute('href');
        const title = node.getAttribute('title');
        
        if (!href || href === content) {
          return content;
        }
        
        if (title) {
          return '[' + content + '](' + href + ' "' + title + '")';
        }
        
        return '[' + content + '](' + href + ')';
      }
    });

    // Enhanced image handling
    turndown.addRule('image', {
      filter: 'img',
      replacement: function (content, node) {
        const alt = node.getAttribute('alt') || '';
        const src = node.getAttribute('src') || '';
        const title = node.getAttribute('title');
        
        if (!src) {
          return '';
        }
        
        if (title) {
          return '![' + alt + '](' + src + ' "' + title + '")';
        }
        
        return '![' + alt + '](' + src + ')';
      }
    });

    // Handle horizontal rules
    turndown.addRule('horizontalRule', {
      filter: 'hr',
      replacement: function () {
        return '\n\n---\n\n';
      }
    });

    // Handle strikethrough
    turndown.addRule('strikethrough', {
      filter: ['del', 's', 'strike'],
      replacement: function (content) {
        return '~~' + content + '~~';
      }
    });

    // Handle subscript and superscript
    turndown.addRule('subscript', {
      filter: 'sub',
      replacement: function (content) {
        return '<sub>' + content + '</sub>';
      }
    });

    turndown.addRule('superscript', {
      filter: 'sup',
      replacement: function (content) {
        return '<sup>' + content + '</sup>';
      }
    });

    // Handle line breaks
    turndown.addRule('lineBreak', {
      filter: 'br',
      replacement: function () {
        return '  \n';
      }
    });

    // Handle divs as paragraphs when appropriate
    turndown.addRule('div', {
      filter: function (node) {
        return node.nodeName === 'DIV' && 
               !node.querySelector('div, p, h1, h2, h3, h4, h5, h6, ul, ol, blockquote');
      },
      replacement: function (content) {
        return '\n\n' + content + '\n\n';
      }
    });
  }

  /**
   * Convert HTML to Markdown with semantic preservation
   * @param {string} html - HTML content to convert
   * @param {Object} options - Conversion options
   * @returns {Object} - Conversion result with markdown and metadata
   */
  convertToMarkdown(html, options = {}) {
    try {
      const startTime = Date.now();
      
      // Pre-process HTML for better conversion
      const processedHtml = this.preprocessHtml(html, options);
      
      // Convert to markdown
      let markdown = this.turndownService.turndown(processedHtml);
      
      // Post-process markdown for cleanup
      markdown = this.postprocessMarkdown(markdown, options);
      
      // Calculate metrics
      const metrics = this.calculateMarkdownMetrics(markdown);
      
      const processingTime = Date.now() - startTime;
      
      return {
        markdown,
        metrics,
        processingTime,
        conversionTimestamp: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`Markdown conversion failed: ${error.message}`);
    }
  }

  /**
   * Pre-process HTML before conversion
   * @param {string} html - Raw HTML
   * @param {Object} options - Processing options
   * @returns {string} - Processed HTML
   */
  preprocessHtml(html, options) {
    // Normalize whitespace in HTML
    html = html.replace(/\s+/g, ' ');
    
    // Fix common HTML issues
    html = html.replace(/<p>\s*<\/p>/g, ''); // Remove empty paragraphs
    html = html.replace(/<br\s*\/?>\s*<br\s*\/?>/g, '</p><p>'); // Convert double breaks to paragraphs
    
    // Handle nested formatting
    html = html.replace(/<(strong|b)><(em|i)>(.*?)<\/(em|i)><\/(strong|b)>/g, '***$3***');
    html = html.replace(/<(em|i)><(strong|b)>(.*?)<\/(strong|b)><\/(em|i)>/g, '***$3***');
    
    // Preserve code formatting
    html = html.replace(/<code([^>]*)>(.*?)<\/code>/g, (match, attrs, content) => {
      return '<code' + attrs + '>' + content.replace(/\n/g, '&#10;') + '</code>';
    });
    
    return html;
  }

  /**
   * Post-process markdown for cleanup and formatting
   * @param {string} markdown - Raw markdown
   * @param {Object} options - Processing options
   * @returns {string} - Cleaned markdown
   */
  postprocessMarkdown(markdown, options) {
    // Clean up excessive whitespace
    markdown = markdown.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
    markdown = markdown.replace(/[ \t]+$/gm, ''); // Remove trailing spaces
    markdown = markdown.replace(/^[ \t]+/gm, ''); // Remove leading spaces from lines
    
    // Fix list formatting
    markdown = markdown.replace(/^(\s*)([*+-]|\d+\.)\s+$/gm, ''); // Remove empty list items
    markdown = markdown.replace(/^(\s*)([*+-]|\d+\.)\s+(.+)$/gm, '$1$2 $3'); // Ensure single space after list markers
    
    // Fix heading spacing
    markdown = markdown.replace(/^(#{1,6})\s*(.+?)$/gm, '$1 $2'); // Ensure space after heading markers
    markdown = markdown.replace(/^(#{1,6})\s+$/gm, ''); // Remove empty headings
    
    // Fix blockquote formatting
    markdown = markdown.replace(/^>\s*$/gm, '>'); // Clean empty blockquote lines
    markdown = markdown.replace(/^>\s+(.+)$/gm, '> $1'); // Ensure single space after >
    
    // Fix table formatting
    markdown = markdown.replace(/\|\s*\|/g, '| |'); // Fix empty table cells
    markdown = markdown.replace(/\|([^|\n]+)\|/g, '| $1 |'); // Add spacing in table cells
    
    // Fix code block formatting
    markdown = markdown.replace(/```\n\n+/g, '```\n'); // Remove extra lines after code block start
    markdown = markdown.replace(/\n+```/g, '\n```'); // Remove extra lines before code block end
    
    // Fix inline code formatting
    markdown = markdown.replace(/`\s+/g, '` '); // Fix spacing after inline code
    markdown = markdown.replace(/\s+`/g, ' `'); // Fix spacing before inline code
    
    // Restore preserved newlines in code
    markdown = markdown.replace(/&#10;/g, '\n');
    
    // Final cleanup
    markdown = markdown.trim();
    
    // Ensure document ends with single newline
    if (markdown && !markdown.endsWith('\n')) {
      markdown += '\n';
    }
    
    return markdown;
  }

  /**
   * Calculate markdown metrics
   * @param {string} markdown - Markdown content
   * @returns {Object} - Metrics object
   */
  calculateMarkdownMetrics(markdown) {
    const lines = markdown.split('\n');
    const words = markdown.match(/\b\w+\b/g) || [];
    
    // Count different markdown elements
    const headings = (markdown.match(/^#{1,6}\s+.+$/gm) || []).length;
    const links = (markdown.match(/\[.*?\]\(.*?\)/g) || []).length;
    const images = (markdown.match(/!\[.*?\]\(.*?\)/g) || []).length;
    const codeBlocks = (markdown.match(/```[\s\S]*?```/g) || []).length;
    const inlineCode = (markdown.match(/`[^`]+`/g) || []).length;
    const tables = (markdown.match(/\|.*\|/g) || []).length;
    const blockquotes = (markdown.match(/^>\s*.+$/gm) || []).length;
    const lists = (markdown.match(/^[\s]*[-*+]\s+.+$/gm) || []).length;
    const orderedLists = (markdown.match(/^[\s]*\d+\.\s+.+$/gm) || []).length;
    
    return {
      totalLines: lines.length,
      nonEmptyLines: lines.filter(line => line.trim().length > 0).length,
      wordCount: words.length,
      characterCount: markdown.length,
      headingCount: headings,
      linkCount: links,
      imageCount: images,
      codeBlockCount: codeBlocks,
      inlineCodeCount: inlineCode,
      tableCount: Math.ceil(tables / 2), // Rough estimate
      blockquoteCount: blockquotes,
      listItemCount: lists,
      orderedListItemCount: orderedLists,
      estimatedReadingTime: Math.ceil(words.length / 200) // 200 WPM average
    };
  }

  /**
   * Convert HTML to plain text (fallback method)
   * @param {string} html - HTML content
   * @returns {string} - Plain text
   */
  convertToText(html) {
    try {
      // Simple HTML tag removal for fallback
      return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    } catch (error) {
      throw new Error(`Text conversion failed: ${error.message}`);
    }
  }

  /**
   * Validate markdown output quality
   * @param {string} markdown - Generated markdown
   * @param {string} originalHtml - Original HTML
   * @returns {Object} - Quality metrics
   */
  validateQuality(markdown, originalHtml) {
    const markdownWords = (markdown.match(/\b\w+\b/g) || []).length;
    const htmlText = this.convertToText(originalHtml);
    const htmlWords = (htmlText.match(/\b\w+\b/g) || []).length;
    
    const contentPreservation = htmlWords > 0 ? markdownWords / htmlWords : 0;
    const structureScore = this.calculateStructureScore(markdown);
    
    return {
      contentPreservationRatio: contentPreservation,
      structureScore,
      qualityScore: (contentPreservation + structureScore) / 2,
      recommendations: this.generateRecommendations(contentPreservation, structureScore)
    };
  }

  /**
   * Calculate structure preservation score
   * @param {string} markdown - Markdown content
   * @returns {number} - Structure score (0-1)
   */
  calculateStructureScore(markdown) {
    let score = 0;
    
    // Check for headings
    if (/^#{1,6}\s+.+$/m.test(markdown)) score += 0.2;
    
    // Check for lists
    if (/^[\s]*[-*+]\s+.+$/m.test(markdown) || /^[\s]*\d+\.\s+.+$/m.test(markdown)) score += 0.2;
    
    // Check for links
    if (/\[.*?\]\(.*?\)/.test(markdown)) score += 0.2;
    
    // Check for emphasis
    if (/\*\*.*?\*\*/.test(markdown) || /\*.*?\*/.test(markdown)) score += 0.2;
    
    // Check for code
    if (/`.*?`/.test(markdown) || /```[\s\S]*?```/.test(markdown)) score += 0.2;
    
    return score;
  }

  /**
   * Generate quality improvement recommendations
   * @param {number} contentPreservation - Content preservation ratio
   * @param {number} structureScore - Structure score
   * @returns {Array} - Recommendations
   */
  generateRecommendations(contentPreservation, structureScore) {
    const recommendations = [];
    
    if (contentPreservation < 0.8) {
      recommendations.push('Content preservation is low - check for removed elements');
    }
    
    if (structureScore < 0.5) {
      recommendations.push('Document structure may be poorly preserved - review heading and list conversion');
    }
    
    if (contentPreservation > 0.95 && structureScore > 0.8) {
      recommendations.push('Excellent conversion quality');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const converterService = new ConverterService();
export default ConverterService;