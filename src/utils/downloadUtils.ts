import { ScrapingResult } from '@/types/sitemap';

/**
 * Generates a formatted markdown document from extraction results
 */
export function generateMarkdownContent(results: ScrapingResult[], siteUrl?: string): string {
  const timestamp = new Date().toLocaleString();
  const successfulResults = results.filter(r => r.success && r.content);
  const failedCount = results.length - successfulResults.length;
  
  let markdown = `# Sitemap Content Extract\n\n`;
  
  if (siteUrl) {
    markdown += `**Source:** ${siteUrl}\n`;
  }
  
  markdown += `**Generated:** ${timestamp}\n`;
  markdown += `**Total Pages:** ${successfulResults.length} successful`;
  
  if (failedCount > 0) {
    markdown += `, ${failedCount} failed`;
  }
  
  markdown += `\n\n---\n\n`;
  
  // Add each page's content
  successfulResults.forEach((result, index) => {
    const content = result.content!;
    const title = content.title || `Page ${index + 1}`;
    
    markdown += `## ${title}\n\n`;
    markdown += `**URL:** ${result.url}\n`;
    markdown += `**Processed:** ${new Date(result.processedAt).toLocaleString()}\n`;
    
    if (content.description) {
      markdown += `**Description:** ${content.description}\n`;
    }
    
    markdown += `\n${content.markdown}\n\n`;
    
    // Add separator between pages (except for last page)
    if (index < successfulResults.length - 1) {
      markdown += `---\n\n`;
    }
  });
  
  // Add failed URLs section if any
  if (failedCount > 0) {
    markdown += `\n---\n\n## Failed Extractions\n\n`;
    const failedResults = results.filter(r => !r.success);
    
    failedResults.forEach(result => {
      markdown += `- **${result.url}**`;
      if (result.error) {
        markdown += ` - ${result.error.message}`;
      }
      markdown += `\n`;
    });
  }
  
  return markdown;
}

/**
 * Generates a filename for the markdown download
 */
export function generateFilename(siteUrl?: string): string {
  const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const domain = siteUrl ? new URL(siteUrl).hostname.replace(/^www\./, '') : 'sitemap';
  return `${domain}-extract-${timestamp}.md`;
}

/**
 * Triggers a browser download of markdown content
 */
export function downloadMarkdown(content: string, filename: string): void {
  try {
    // Create blob with UTF-8 encoding
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    
    // Create download URL
    const url = URL.createObjectURL(blob);
    
    // Create temporary download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download markdown:', error);
    throw new Error('Failed to download file. Please try again.');
  }
}

/**
 * Downloads extraction results as a formatted markdown file
 */
export function downloadExtractionResults(results: ScrapingResult[], siteUrl?: string): void {
  const content = generateMarkdownContent(results, siteUrl);
  const filename = generateFilename(siteUrl);
  downloadMarkdown(content, filename);
}

/**
 * Generates JSON export of extraction results
 */
export function generateJsonContent(results: ScrapingResult[]): string {
  const exportData = {
    timestamp: new Date().toISOString(),
    totalPages: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results: results.map(result => ({
      url: result.url,
      success: result.success,
      title: result.content?.title,
      description: result.content?.description,
      markdown: result.content?.markdown,
      error: result.error,
      stats: result.stats,
      processedAt: result.processedAt
    }))
  };
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Downloads extraction results as JSON
 */
export function downloadExtractionResultsAsJson(results: ScrapingResult[], siteUrl?: string): void {
  const content = generateJsonContent(results);
  const timestamp = new Date().toISOString().split('T')[0];
  const domain = siteUrl ? new URL(siteUrl).hostname.replace(/^www\./, '') : 'sitemap';
  const filename = `${domain}-extract-${timestamp}.json`;
  
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}