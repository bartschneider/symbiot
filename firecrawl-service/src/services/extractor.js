import * as cheerio from 'cheerio';

class ExtractorService {
  constructor() {
    // Common selectors to remove (navigation, ads, etc.)
    this.removeSelectors = [
      'nav', 'header', 'footer', 'aside', 
      '.nav', '.navigation', '.menu', '.sidebar',
      '.header', '.footer', '.ad', '.ads', '.advertisement',
      '.social', '.share', '.comment', '.comments',
      '.related', '.recommendation', '.popup', '.modal',
      'script', 'style', 'noscript', 'iframe',
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '[aria-label*="navigation"]', '[aria-label*="menu"]'
    ];
    
    // Content selectors in order of preference
    this.contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.post-content',
      '.article-content',
      '.entry-content',
      '#content',
      '#main',
      '.container .content',
      'body'
    ];
  }

  /**
   * Extract and clean main content from HTML
   * @param {string} html - Raw HTML content
   * @param {Object} options - Extraction options
   * @returns {Object} - Extracted and cleaned content
   */
  extractContent(html, options = {}) {
    try {
      const $ = cheerio.load(html, {
        decodeEntities: true,
        normalizeWhitespace: true
      });
      
      // Remove unwanted elements first
      this.removeUnwantedElements($);
      
      // Find main content area
      const contentElement = this.findMainContent($);
      
      if (!contentElement || contentElement.length === 0) {
        throw new Error('No main content found');
      }
      
      // Clean and process the content
      this.cleanContent($, contentElement);
      
      // Extract structured data
      const extractedData = this.extractStructuredData($, contentElement);
      
      // Calculate content metrics
      const metrics = this.calculateContentMetrics($, contentElement);
      
      return {
        html: contentElement.html(),
        text: contentElement.text().trim(),
        ...extractedData,
        metrics,
        extractionTimestamp: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`Content extraction failed: ${error.message}`);
    }
  }

  /**
   * Remove unwanted elements from the document
   * @param {CheerioAPI} $ - Cheerio instance
   */
  removeUnwantedElements($) {
    // Remove elements by selector
    this.removeSelectors.forEach(selector => {
      $(selector).remove();
    });
    
    // Remove hidden elements
    $('[style*="display:none"], [style*="display: none"]').remove();
    $('[hidden]').remove();
    $('.hidden, .hide').remove();
    
    // Remove empty elements
    $('p:empty, div:empty, span:empty').remove();
    
    // Remove elements with low text-to-HTML ratio (likely navigation/ads)
    $('*').each((_, element) => {
      const $el = $(element);
      const text = $el.text().trim();
      const html = $el.html();
      
      if (html && text) {
        const textToHtmlRatio = text.length / html.length;
        
        // Remove elements with very low text density and specific characteristics
        if (textToHtmlRatio < 0.1 && 
            text.length < 50 && 
            ($el.find('a').length > 3 || $el.find('img').length > 2)) {
          $el.remove();
        }
      }
    });
  }

  /**
   * Find the main content area using readability-like algorithm
   * @param {CheerioAPI} $ - Cheerio instance
   * @returns {Cheerio} - Main content element
   */
  findMainContent($) {
    let bestElement = null;
    let bestScore = 0;
    
    // Try explicit content selectors first
    for (const selector of this.contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const score = this.scoreContentElement($, element);
        if (score > bestScore) {
          bestScore = score;
          bestElement = element;
        }
      }
    }
    
    // If no good content found, use scoring algorithm
    if (!bestElement || bestScore < 10) {
      $('div, section, article').each((_, element) => {
        const $el = $(element);
        const score = this.scoreContentElement($, $el);
        
        if (score > bestScore) {
          bestScore = score;
          bestElement = $el;
        }
      });
    }
    
    return bestElement || $('body');
  }

  /**
   * Score content element based on readability factors
   * @param {CheerioAPI} $ - Cheerio instance
   * @param {Cheerio} $element - Element to score
   * @returns {number} - Content score
   */
  scoreContentElement($, $element) {
    let score = 0;
    const text = $element.text().trim();
    
    // Text length bonus
    score += Math.min(text.length / 100, 25);
    
    // Paragraph count bonus
    const paragraphs = $element.find('p');
    score += Math.min(paragraphs.length * 2, 20);
    
    // Average paragraph length bonus
    if (paragraphs.length > 0) {
      const avgParLength = text.length / paragraphs.length;
      score += Math.min(avgParLength / 50, 15);
    }
    
    // Class and ID bonuses
    const className = $element.attr('class') || '';
    const id = $element.attr('id') || '';
    const combinedAttr = (className + ' ' + id).toLowerCase();
    
    if (/content|main|article|post|entry/.test(combinedAttr)) {
      score += 25;
    }
    
    if (/sidebar|nav|menu|footer|header|ad/.test(combinedAttr)) {
      score -= 15;
    }
    
    // Link density penalty
    const links = $element.find('a');
    const linkText = links.toArray().map(link => $(link).text()).join('');
    const linkDensity = text.length > 0 ? linkText.length / text.length : 0;
    
    if (linkDensity > 0.3) {
      score -= 20;
    }
    
    // Heading bonus
    score += $element.find('h1, h2, h3, h4, h5, h6').length * 3;
    
    // List bonus
    score += $element.find('ul, ol').length * 2;
    
    // Image bonus (but not too many)
    const images = $element.find('img').length;
    score += Math.min(images * 2, 10);
    
    return score;
  }

  /**
   * Clean and normalize content
   * @param {CheerioAPI} $ - Cheerio instance
   * @param {Cheerio} $element - Content element
   */
  cleanContent($, $element) {
    // Remove or replace problematic elements
    $element.find('script, style, noscript').remove();
    
    // Clean up attributes, keeping only essential ones
    $element.find('*').each((_, el) => {
      const $el = $(el);
      const tagName = el.tagName.toLowerCase();
      
      // Keep essential attributes
      const keepAttrs = ['href', 'src', 'alt', 'title'];
      const attrs = Object.keys(el.attribs || {});
      
      attrs.forEach(attr => {
        if (!keepAttrs.includes(attr) && !attr.startsWith('data-')) {
          $el.removeAttr(attr);
        }
      });
      
      // Convert divs with no semantic meaning to paragraphs if they contain text
      if (tagName === 'div' && $el.children().length === 0 && $el.text().trim().length > 0) {
        $el.replaceWith(`<p>${$el.text()}</p>`);
      }
    });
    
    // Normalize whitespace
    $element.find('*').each((_, el) => {
      const $el = $(el);
      if ($el.children().length === 0) {
        const text = $el.text();
        if (text) {
          $el.text(text.replace(/\s+/g, ' ').trim());
        }
      }
    });
    
    // Remove empty paragraphs and divs
    $element.find('p:empty, div:empty').remove();
    
    // Merge consecutive paragraphs if they're very short
    $element.find('p').each((_, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      
      if (text.length < 50) {
        const $next = $el.next('p');
        if ($next.length && $next.text().trim().length < 50) {
          $el.append(' ' + $next.html());
          $next.remove();
        }
      }
    });
  }

  /**
   * Extract structured data from content
   * @param {CheerioAPI} $ - Cheerio instance
   * @param {Cheerio} $element - Content element
   * @returns {Object} - Structured data
   */
  extractStructuredData($, $element) {
    // Extract headings structure
    const headings = [];
    $element.find('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const $el = $(el);
      headings.push({
        level: parseInt(el.tagName.charAt(1)),
        text: $el.text().trim(),
        id: $el.attr('id') || null
      });
    });
    
    // Extract links
    const links = [];
    $element.find('a[href]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      if (href && !href.startsWith('#')) {
        links.push({
          text: $el.text().trim(),
          url: href,
          title: $el.attr('title') || null
        });
      }
    });
    
    // Extract images
    const images = [];
    $element.find('img[src]').each((_, el) => {
      const $el = $(el);
      images.push({
        src: $el.attr('src'),
        alt: $el.attr('alt') || '',
        title: $el.attr('title') || null
      });
    });
    
    // Extract lists
    const lists = [];
    $element.find('ul, ol').each((_, el) => {
      const $el = $(el);
      const items = [];
      $el.find('li').each((_, li) => {
        items.push($(li).text().trim());
      });
      
      lists.push({
        type: el.tagName.toLowerCase(),
        items
      });
    });
    
    return {
      headings,
      links,
      images,
      lists
    };
  }

  /**
   * Calculate content metrics
   * @param {CheerioAPI} $ - Cheerio instance
   * @param {Cheerio} $element - Content element
   * @returns {Object} - Content metrics
   */
  calculateContentMetrics($, $element) {
    const text = $element.text();
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    
    return {
      characterCount: text.length,
      wordCount: words.length,
      paragraphCount: $element.find('p').length,
      headingCount: $element.find('h1, h2, h3, h4, h5, h6').length,
      linkCount: $element.find('a[href]').length,
      imageCount: $element.find('img[src]').length,
      listCount: $element.find('ul, ol').length,
      estimatedReadingTime: Math.ceil(words.length / 200) // Average reading speed: 200 WPM
    };
  }
}

// Export singleton instance
export const extractorService = new ExtractorService();
export default ExtractorService;