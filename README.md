# Synthora Analytics Platform

A Next.js application for intelligent content extraction and sitemap analysis, integrated with Firecrawl for web scraping and LLM processing capabilities.

## Architecture

**Monolithic Next.js Application** (Phase 2 - Current)
- **Frontend**: Next.js 15 with React 19, Emotion styling, Framer Motion animations
- **Backend**: Next.js API routes replacing previous Go backend
- **Database**: PostgreSQL with Prisma ORM
- **External Service**: Firecrawl service for content extraction
- **LLM Integration**: Vertex AI, OpenAI, and Anthropic for content processing

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Run with container setup
npm run dev:container
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Next.js app will be available at http://localhost:3000
# Firecrawl service at http://localhost:3001
# PostgreSQL at localhost:5432
```

## Key Features

- **Sitemap Discovery**: Automated sitemap detection and parsing
- **Content Extraction**: Integration with Firecrawl for web content processing
- **LLM Processing**: AI-powered content analysis and entity extraction
- **History Tracking**: Session-based extraction history management
- **Real-time Progress**: Live updates during content processing operations

## API Endpoints

- `GET /api/health` - Application health check
- `POST /api/sitemap/discover` - Discover sitemaps for a domain
- `POST /api/sitemap/batch` - Process sitemap URLs in batches
- `POST /api/convert` - Convert URLs to structured content
- `GET /api/progress/[requestId]` - Get processing progress
- `GET /api/extraction-history/sessions` - Get extraction history

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Runtime**: React 19
- **Styling**: Emotion with TypeScript
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Database**: PostgreSQL + Prisma
- **Testing**: Playwright for E2E testing
- **Deployment**: Docker with multi-stage builds

## Environment Variables

```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/synthora_prod
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

## Development Commands

```bash
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # Run ESLint
npm run test:e2e        # Run Playwright tests
npm run test:e2e:ui     # Run Playwright with UI
```
