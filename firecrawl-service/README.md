# Firecrawl Service

A web scraping and HTML-to-Markdown conversion service with JWT authentication, built with Node.js, Express, and Playwright.

## Features

- 🌐 **Web Scraping**: Fetch and process web pages using Playwright
- 📝 **HTML to Markdown**: Convert HTML content to semantic Markdown with structure preservation
- 🔐 **JWT Authentication**: Secure API access with JWT tokens and API keys
- 🚀 **Rate Limiting**: Intelligent rate limiting with user-based limits
- 💾 **Caching**: Built-in caching for improved performance
- 🛡️ **Security**: Comprehensive security measures including SSRF protection
- 📊 **Monitoring**: Health checks and metrics collection
- 🎯 **Validation**: Comprehensive input validation and error handling

## Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository and navigate to the service directory:
```bash
cd firecrawl-service
```

2. Install dependencies:
```bash
npm install
```

3. Install Playwright browsers:
```bash
npx playwright install
```

4. Copy environment configuration:
```bash
cp .env.example .env
```

5. Start the development server:
```bash
npm run dev
```

The service will be available at `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/api-keys` - Generate API key

### URL Conversion

- `POST /api/convert` - Convert URL to Markdown
- `POST /api/convert/text` - Convert URL to plain text
- `POST /api/convert/batch` - Batch convert multiple URLs
- `POST /api/convert/validate` - Validate URL without converting

### Service Management

- `GET /api/health` - Service health check
- `GET /api/convert/config` - Get service configuration
- `POST /api/convert/cache/clear` - Clear caches (admin only)

## Usage Examples

### 1. User Authentication

```bash
# Register a new user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "SecureP@ssw0rd!"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "SecureP@ssw0rd!"}'
```

### 2. Convert URL to Markdown

```bash
# Using JWT token
curl -X POST http://localhost:3001/api/convert \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Using demo user (default credentials)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo123"}'
```

### 3. Batch URL Conversion

```bash
curl -X POST http://localhost:3001/api/convert/batch \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://example.com",
      "https://github.com",
      "https://stackoverflow.com"
    ],
    "options": {
      "maxConcurrent": 2
    }
  }'
```

### 4. Using API Keys

```bash
# Generate API key (after login)
curl -X POST http://localhost:3001/api/auth/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "My API Key"}'

# Use API key for conversion
curl -X POST http://localhost:3001/api/convert \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

## Configuration

### Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - JWT expiration time
- `RATE_LIMIT_MAX_REQUESTS` - Rate limit per window
- `CACHE_TTL_SECONDS` - Cache TTL in seconds
- `PLAYWRIGHT_TIMEOUT` - Browser timeout in milliseconds
- `MAX_CONTENT_SIZE_MB` - Maximum content size limit

### Conversion Options

```javascript
{
  "url": "https://example.com",
  "options": {
    "timeout": 30000,
    "waitUntil": "domcontentloaded", // "load", "domcontentloaded", "networkidle"
    "headingStyle": "atx",          // "atx" (#), "setext" (underlines)
    "bulletListMarker": "-",        // "-", "*", "+"
    "linkStyle": "inlined",         // "inlined", "referenced"
    "skipCache": false,
    "cacheTtl": 3600
  }
}
```

## Security Features

- **SSRF Protection**: Prevents access to internal networks
- **Rate Limiting**: Configurable per-user rate limits
- **Input Validation**: Comprehensive request validation
- **Security Headers**: HTTP security headers via Helmet
- **CORS**: Configurable CORS policies
- **Authentication**: JWT and API key support

## Monitoring

### Health Check

```bash
curl http://localhost:3001/health
```

### Service Statistics (Admin Only)

```bash
curl -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  http://localhost:3001/api/stats
```

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors

### Project Structure

```
src/
├── app.js              # Main application
├── config/             # Configuration
├── controllers/        # Route controllers
├── middleware/         # Express middleware
├── routes/             # Route definitions
├── services/           # Business logic
└── utils/              # Utility functions
```

## Default Demo User

For testing purposes, a demo user is created automatically:

- **Username**: `demo`
- **Password**: `demo123`
- **Role**: `user`

## API Documentation

Visit `http://localhost:3001/api/docs` for interactive API documentation.

## Troubleshooting

### Common Issues

1. **Playwright browser not found**:
   ```bash
   npx playwright install
   ```

2. **Permission denied errors**:
   ```bash
   chmod +x node_modules/.bin/*
   ```

3. **Port already in use**:
   Change the `PORT` environment variable in `.env`

4. **Memory issues**:
   Reduce `PLAYWRIGHT_MAX_CONCURRENT` in `.env`

### Logs

The service logs all requests and errors in development mode. Check the console output for detailed information.

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a strong JWT secret
3. Configure proper CORS origins
4. Set up reverse proxy (nginx/Apache)
5. Enable HTTPS
6. Configure log aggregation
7. Set up monitoring

## License

MIT License