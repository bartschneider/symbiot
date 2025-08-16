// Base API types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    requestId?: string
  }
  meta?: {
    requestId: string
    timestamp: string
    sessionId?: string
  }
}

export interface ApiError {
  code: string
  message: string
  requestId?: string
  status?: number
}

// Sitemap entry types
export interface SitemapEntry {
  url: string
  lastmod?: string
  changefreq?: string
  priority?: number
}

export interface SitemapResponse {
  sitemap: string
  urls: SitemapEntry[]
  totalUrls: number
  processedAt: string
}

// Link categorization types
export type LinkCategory = 
  | 'internal'  // Same domain links
  | 'external'  // Different domain links  
  | 'files'     // Document/media files
  | 'email'     // mailto: links
  | 'phone'     // tel: links
  | 'anchors';  // Fragment identifiers

export interface LinkData {
  id: string;
  url: string;
  category: LinkCategory;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

export interface LinkEntry {
  url: string
  title?: string
  lastmod?: string
  changefreq?: string
  priority?: number
  category?: LinkCategory
}

// Selection state types
export interface CategoryState {
  selected: boolean;
  indeterminate: boolean;
}

export interface GlobalState {
  selected: boolean;
  indeterminate: boolean;
}

export interface SelectionState {
  selectedLinks: Set<string>;
  categoryStates: Map<LinkCategory, CategoryState>;
  globalState: GlobalState;
}

export interface CategoryMaps {
  linkToCategory: Map<string, LinkCategory>;
  categoryToLinks: Map<LinkCategory, string[]>;
  allLinks: LinkData[];
}

export interface SelectionStats {
  totalLinks: number;
  selectedLinks: number;
  categoryStats: Record<LinkCategory, {
    total: number;
    selected: number;
    percentage: number;
  }>;
}

// Sitemap discovery types
export interface SitemapDiscoveryRequest {
  url: string
  maxDepth?: number
  includeExternal?: boolean
  followRedirects?: boolean
  timeout?: number
}

export interface SitemapDiscoveryResult {
  success: boolean
  data: {
    url: string
    title: string
    links: LinkEntry[]
    summary: {
      totalLinks: number
      internalLinks: number
      externalLinks: number
      fileLinks: number
      emailLinks: number
      phoneLinks: number
      anchorLinks: number
    }
    categories: {
      internal: LinkEntry[]
      external: LinkEntry[]
      files: LinkEntry[]
      email: LinkEntry[]
      phone: LinkEntry[]
      anchors: LinkEntry[]
    }
  }
  processing: {
    processingTime: number
    requestId: string
    timestamp: string
  }
}

// Content extraction types
export interface ConversionRequest {
  url: string
  options?: {
    includeImages?: boolean
    includeTables?: boolean
    removeCodeBlocks?: boolean
    waitForLoad?: number
    enableLLMProcessing?: boolean
    llmOptions?: {
      includeRelationships?: boolean
      includeAnalysis?: boolean
      confidenceThreshold?: number
    }
  }
}

export interface ConversionResponse {
  url: string
  markdown: string
  title?: string
  description?: string
  images?: string[]
  processedAt: string
  stats: {
    originalSize: number
    markdownSize: number
    processingTime: number
  }
}

export interface BatchScrapingRequest {
  urls: string[]
  options?: {
    includeImages?: boolean
    includeTables?: boolean
    removeCodeBlocks?: boolean
    waitForLoad?: number
    maxConcurrent?: number
    enableLLMProcessing?: boolean
    llmOptions?: {
      includeRelationships?: boolean
      includeAnalysis?: boolean
      confidenceThreshold?: number
    }
  }
  progressCallback?: string
}

export interface ScrapingResult {
  url: string
  success: boolean
  data?: {
    markdown: string
    title?: string
    description?: string
    images?: string[]
  }
  error?: {
    code: string
    message: string
  }
  stats: {
    processingTime: number
    contentSize: number
    imageCount: number
  }
  metadata: {
    timestamp: string
    httpStatusCode?: number
  }
  llmProcessing?: {
    enabled: boolean
    jobId?: string
    entities?: Array<{
      name: string
      type: string
      confidence: number
    }>
    relationships?: Array<{
      sourceEntity: string
      targetEntity: string
      type: string
      confidence: number
    }>
    summary?: string
    keyInsights?: string[]
    processingTime?: number
    totalCost?: number
    error?: string
  }
}

export interface ScrapingError {
  url: string
  code: string
  message: string
  timestamp: string
}

export interface BatchScrapingResult {
  success: boolean
  data: {
    results: ScrapingResult[]
    errors: ScrapingError[]
    summary: {
      totalUrls: number
      successful: number
      failed: number
      successRate: number
      totalProcessingTime: number
    }
  }
  processing: {
    requestId: string
    startTime: string
    endTime: string
  }
  meta?: {
    requestId: string
    timestamp: string
    sessionId?: string
  }
}

// Progress tracking types
export interface ProgressUpdate {
  requestId: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: {
    completed: number
    total: number
    percentage: number
    currentUrl?: string
    eta?: number
    rate?: number
  }
  results?: {
    successful: number
    failed: number
    errors: ScrapingError[]
  }
  timestamp: string
}

// File export types
export type ExportFormat = 
  | 'markdown'
  | 'json'
  | 'csv'
  | 'xml'
  | 'zip';

export interface ExportOptions {
  format: ExportFormat
  includeMetadata?: boolean
  customTemplate?: string
  filename?: string
}

export interface ExportResult {
  success: boolean
  filename: string
  format: ExportFormat
  size: number
  downloadUrl?: string
  error?: string
}

// Event handler types
export interface SelectionHandlers {
  toggleLink: (linkId: string) => void;
  toggleCategory: (category: LinkCategory) => void;
  toggleGlobal: () => void;
  selectAll: () => void;
  selectNone: () => void;
  getSelectedUrls: () => string[];
}

// Configuration types
export interface SelectionConfig {
  performanceThreshold: number; // ms
  memoryThreshold: number; // MB
  enableValidation: boolean;
  enablePerformanceMonitoring: boolean;
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
  retryOn: string[]
}

export interface ApiErrorContext {
  url?: string
  requestId?: string
  operation?: string
  retryAttempt?: number
  timestamp: string
}

// Performance monitoring
export interface PerformanceMetrics {
  operationDuration: number;
  memoryUsage: number;
  operationType: string;
  timestamp: number;
}

// Extraction History types
export interface ExtractionHistory {
  exists: boolean;
  lastExtracted?: string;
  extractionCount: number;
  lastStatus?: 'success' | 'failed' | 'processing';
  sessionId?: string;
}

export interface ExtractionSession {
  id: string;
  sessionName: string;
  sourceUrl: string;
  status: 'processing' | 'completed' | 'failed' | 'cancelled';
  totalUrls: number;
  successfulUrls: number;
  failedUrls: number;
  successRatePercent: number;
  createdAt: string;
  completedAt?: string;
  processingTimeMs?: number;
  errorMessage?: string;
}

export interface ExtractionSessionDetails {
  session: ExtractionSession;
  extractions: UrlExtraction[];
}

export interface UrlExtraction {
  id: string;
  url: string;
  chunkNumber: number;
  sequenceNumber: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  httpStatusCode?: number;
  contentSizeBytes?: number;
  processingTimeMs?: number;
  errorCode?: string;
  errorMessage?: string;
  title?: string;
  description?: string;
  imagesCount: number;
  retryCount: number;
  createdAt: string;
  processedAt?: string;
}

export interface RetryableUrl {
  extractionId: string;
  url: string;
  errorCode: string;
  errorMessage: string;
  retryCount: number;
  sessionId: string;
  sourceUrl: string;
  sessionName: string;
  createdAt: string;
  lastRetryAt?: string;
}

export interface UserDecision {
  action: 'extract' | 'update' | 'retry' | 'skip';
  sourceUrl: string;
  history?: ExtractionHistory;
}

export interface HistoryWorkflowState {
  checking: boolean;
  history: ExtractionHistory | null;
  decision: UserDecision | null;
  error: string | null;
}