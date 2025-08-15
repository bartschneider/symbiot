import { NextRequest, NextResponse } from 'next/server'

interface SitemapDiscoveryRequest {
  url: string
  options?: {
    maxDepth?: number
    includeExternal?: boolean
    followRobots?: boolean
    categories?: string[]
  }
}

interface SitemapDiscoveryResult {
  success: boolean
  data: {
    sourceUrl: string
    sitemaps: Array<{
      url: string
      type: 'xml' | 'html' | 'robots'
      urls: string[]
      lastModified?: string
    }>
    categories: {
      internal: LinkEntry[]
      external: LinkEntry[]
      files: LinkEntry[]
      email: LinkEntry[]
      phone: LinkEntry[]
      anchors: LinkEntry[]
    }
    summary: {
      totalLinks: number
      internalLinks: number
      externalLinks: number
      fileLinks: number
      emailLinks: number
      phoneLinks: number
      anchorLinks: number
    }
    metadata: {
      crawlDepth: number
      crawlTime: number
      userAgent: string
      timestamp: string
    }
  }
}

interface LinkEntry {
  url: string
  title?: string
  lastmod?: string
  changefreq?: string
  priority?: number
}

function categorizeUrl(url: string, baseUrl: string): 'internal' | 'external' | 'files' | 'email' | 'phone' | 'anchors' {
  const urlObj = new URL(url)
  const baseUrlObj = new URL(baseUrl)
  
  // Email links
  if (url.startsWith('mailto:')) {
    return 'email'
  }
  
  // Phone links
  if (url.startsWith('tel:')) {
    return 'phone'
  }
  
  // Anchor links (fragments)
  if (url.startsWith('#') || urlObj.hash) {
    return 'anchors'
  }
  
  // File downloads (common file extensions)
  const fileExtensions = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|tar|gz|mp3|mp4|avi|mov|jpg|jpeg|png|gif|svg)$/i
  if (fileExtensions.test(urlObj.pathname)) {
    return 'files'
  }
  
  // External vs Internal
  if (urlObj.hostname !== baseUrlObj.hostname) {
    return 'external'
  }
  
  return 'internal'
}

function createLinkEntry(url: string): LinkEntry {
  return {
    url,
    title: `Page: ${new URL(url).pathname}`,
    lastmod: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    changefreq: ['daily', 'weekly', 'monthly'][Math.floor(Math.random() * 3)] as string,
    priority: Math.round((Math.random() * 0.9 + 0.1) * 10) / 10
  }
}

function generateMockUrls(baseUrl: string, count: number): string[] {
  const urls: string[] = []
  const urlObj = new URL(baseUrl)
  const baseHost = urlObj.origin
  
  // Generate realistic URLs based on common website patterns
  const patterns = [
    '/blog/post-1', '/blog/post-2', '/blog/post-3',
    '/products/item-1', '/products/item-2', '/products/category-a',
    '/about', '/contact', '/team', '/careers',
    '/services/web-design', '/services/consulting',
    '/news/latest-updates', '/news/company-news',
    '/support/faq', '/support/documentation',
    '/gallery/photos', '/gallery/videos'
  ]
  
  for (let i = 0; i < Math.min(count, patterns.length); i++) {
    urls.push(baseHost + patterns[i])
  }
  
  // Add some additional random URLs if needed
  for (let i = patterns.length; i < count; i++) {
    urls.push(`${baseHost}/page-${i}`)
  }
  
  return urls
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `discover-${Date.now()}`

  try {
    const body: SitemapDiscoveryRequest = await request.json()
    
    if (!body.url) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'URL is required'
          }
        },
        { status: 400 }
      )
    }

    // Validate URL format
    let url: URL
    try {
      url = new URL(body.url)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Invalid URL format'
          }
        },
        { status: 400 }
      )
    }

    // Default options
    const options = {
      maxDepth: 2,
      includeExternal: false,
      followRobots: true,
      categories: ['blog', 'product', 'info', 'documentation', 'media', 'other'],
      ...body.options
    }

    // Simulate sitemap discovery (replace with actual implementation)
    const discoveryTime = Math.random() * 2000 + 1000 // 1-3 seconds
    await new Promise(resolve => setTimeout(resolve, Math.min(discoveryTime, 5000)))

    // Generate mock sitemap data
    const mockUrls = generateMockUrls(body.url, 15 + Math.floor(Math.random() * 10))
    
    // Categorize URLs according to frontend expectations
    const categories = {
      internal: [] as LinkEntry[],
      external: [] as LinkEntry[],
      files: [] as LinkEntry[],
      email: [] as LinkEntry[],
      phone: [] as LinkEntry[],
      anchors: [] as LinkEntry[]
    }
    
    // Add some sample external and file links for testing
    const externalUrls = [
      'https://google.com',
      'https://github.com',
      'https://stackoverflow.com'
    ]
    const fileUrls = [
      `${url.origin}/documents/report.pdf`,
      `${url.origin}/downloads/manual.docx`
    ]
    const emailUrls = ['mailto:contact@example.com']
    const phoneUrls = ['tel:+1234567890']
    
    const allUrls = [...mockUrls, ...externalUrls, ...fileUrls, ...emailUrls, ...phoneUrls]
    
    allUrls.forEach(url => {
      const category = categorizeUrl(url, body.url)
      const linkEntry = createLinkEntry(url)
      categories[category].push(linkEntry)
    })

    // Mock sitemap sources
    const sitemaps = [
      {
        url: `${url.origin}/sitemap.xml`,
        type: 'xml' as const,
        urls: mockUrls.slice(0, Math.floor(mockUrls.length * 0.7)),
        lastModified: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        url: `${url.origin}/robots.txt`,
        type: 'robots' as const,
        urls: mockUrls.slice(Math.floor(mockUrls.length * 0.7)),
        lastModified: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    const processingTime = Date.now() - startTime

    const result: SitemapDiscoveryResult = {
      success: true,
      data: {
        sourceUrl: body.url,
        sitemaps,
        categories,
        summary: {
          totalLinks: Object.values(categories).flat().length,
          internalLinks: categories.internal.length,
          externalLinks: categories.external.length,
          fileLinks: categories.files.length,
          emailLinks: categories.email.length,
          phoneLinks: categories.phone.length,
          anchorLinks: categories.anchors.length
        },
        metadata: {
          crawlDepth: options.maxDepth,
          crawlTime: processingTime,
          userAgent: request.headers.get('user-agent') || 'Unknown',
          timestamp: new Date().toISOString()
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime
      }
    })

  } catch (error) {
    console.error('Sitemap discovery error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DISCOVERY_FAILED',
          message: error instanceof Error ? error.message : 'Sitemap discovery failed'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId
        }
      },
      { status: 500 }
    )
  }
}