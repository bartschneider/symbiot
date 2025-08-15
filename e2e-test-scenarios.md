# E2E Test Scenarios - Phase 2 Knowledge Graph Platform

**Version**: Phase 2 - Next.js Migration  
**Test Environment**: Docker Development Container  
**Target**: Comprehensive functionality validation  

## Test Architecture Overview

### Test Stack
- **Framework**: Playwright E2E Testing
- **Browser**: Chromium (headless/headed modes)
- **Database**: PostgreSQL (dev container)
- **Backend**: Next.js API Routes
- **Frontend**: React + Next.js App Router

### Test Categories
1. **Core Functionality Tests** - Primary user workflows
2. **API Integration Tests** - Backend service validation
3. **Database Persistence Tests** - Data integrity validation
4. **Error Handling Tests** - Graceful failure scenarios
5. **Performance Tests** - Load and response time validation
6. **UI/UX Tests** - Component interaction and styling

---

## 1. Core Functionality Tests (Happy Path)

### TC001: Single URL Content Extraction
**Objective**: Validate basic content extraction workflow
**Priority**: Critical

**Test Steps**:
1. Navigate to application home page
2. Enter valid URL (e.g., `https://example.com`)
3. Click "Extract Content" button
4. Wait for processing completion
5. Verify extracted content display

**Expected Results**:
- ✅ URL validation passes
- ✅ Extraction progress indicator appears
- ✅ Content displays with title, description, markdown
- ✅ Processing stats show (time, size, success)
- ✅ Database session record created
- ✅ Success notification appears

**Test Data**:
```javascript
testUrls: [
  'https://example.com',
  'https://httpbin.org/html',
  'https://jsonplaceholder.typicode.com',
  'https://httpstat.us/200'
]
```

### TC002: Batch URL Extraction
**Objective**: Validate bulk content extraction
**Priority**: Critical

**Test Steps**:
1. Navigate to batch extraction page
2. Input multiple valid URLs (3-5 URLs)
3. Configure extraction options
4. Start batch extraction
5. Monitor real-time progress
6. Review batch results

**Expected Results**:
- ✅ All URLs processed individually
- ✅ Progress tracking updates in real-time
- ✅ Success/failure stats calculated correctly
- ✅ Failed URLs identified and marked
- ✅ Successful extractions stored in database
- ✅ Batch summary displayed accurately

**Test Data**:
```javascript
batchUrls: [
  'https://example.com',
  'https://httpbin.org/html',
  'https://google.com',
  'https://github.com',
  'https://stackoverflow.com'
]
```

### TC003: Sitemap Discovery
**Objective**: Validate website structure analysis
**Priority**: High

**Test Steps**:
1. Access sitemap discovery feature
2. Enter website root URL
3. Configure discovery options (depth, categories)
4. Initiate discovery process
5. Review categorized URL results
6. Select URLs for extraction

**Expected Results**:
- ✅ Sitemap.xml and robots.txt detected
- ✅ URLs categorized by type (blog, product, info)
- ✅ Discovery summary shows totals
- ✅ URLs can be selected for batch extraction
- ✅ Invalid/inaccessible URLs filtered out

### TC004: Extraction History Management
**Objective**: Validate session tracking and history
**Priority**: High

**Test Steps**:
1. Perform multiple extractions (single and batch)
2. Navigate to extraction history
3. Filter sessions by status and date
4. View session details
5. Retry failed extractions
6. Export session data

**Expected Results**:
- ✅ All sessions listed with metadata
- ✅ Filtering works correctly
- ✅ Session details show individual URL results
- ✅ Failed URLs can be retried
- ✅ Success rates calculated accurately
- ✅ Pagination works for large histories

---

## 2. API Integration Tests

### TC101: Health Check Endpoint
**Objective**: Validate service availability
**Priority**: Critical

**API Test**:
```bash
GET /api/health
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2025-08-14T17:45:02.041Z",
    "version": "1.0.0"
  }
}
```

### TC102: Service Info Endpoint
**Objective**: Validate capability reporting
**Priority**: Medium

**API Test**:
```bash
GET /api/info
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "capabilities": ["sitemap_discovery", "batch_extraction"],
    "limits": {
      "maxConcurrent": 5,
      "maxUrls": 1000,
      "timeout": 30000
    }
  }
}
```

### TC103: Content Conversion API
**Objective**: Validate single URL API
**Priority**: Critical

**API Test**:
```bash
POST /api/convert
Content-Type: application/json

{
  "url": "https://example.com",
  "options": {
    "includeImages": true,
    "includeTables": true,
    "waitForLoad": 2000
  }
}
```

**Expected Response**:
- ✅ `success: true`
- ✅ `data.markdown` contains extracted content
- ✅ `stats.processingTime` > 0
- ✅ `metadata.httpStatusCode` = 200

### TC104: Batch Extraction API
**Objective**: Validate batch processing API
**Priority**: Critical

**API Test**:
```bash
POST /api/sitemap/batch
Content-Type: application/json

{
  "urls": ["https://example.com", "https://httpbin.org/html"],
  "options": {
    "maxConcurrent": 2,
    "includeImages": false
  }
}
```

**Expected Response**:
- ✅ `success: true`
- ✅ `data.results` array with 2 items
- ✅ `data.summary.totalUrls` = 2
- ✅ Processing time recorded for each URL

---

## 3. Database Persistence Tests

### TC201: Session Creation and Tracking
**Objective**: Validate extraction session persistence
**Priority**: Critical

**Test Process**:
1. Start extraction operation
2. Query database for session record
3. Verify session metadata accuracy
4. Complete extraction
5. Validate final session state

**Database Validation**:
```sql
-- Verify session exists
SELECT * FROM extraction_sessions 
WHERE user_id = 'dev-user' 
ORDER BY created_at DESC LIMIT 1;

-- Verify URL extractions linked
SELECT COUNT(*) FROM url_extractions 
WHERE session_id = ?;
```

**Expected Results**:
- ✅ Session record created immediately
- ✅ Status updates from 'processing' to 'completed'
- ✅ URL extraction records linked correctly
- ✅ Processing times recorded accurately
- ✅ Success/failure counts match results

### TC202: History Retrieval
**Objective**: Validate extraction history API
**Priority**: High

**API Test**:
```bash
GET /api/extraction-history/sessions?page=1&limit=10
```

**Expected Response**:
- ✅ Sessions returned in descending order
- ✅ Pagination metadata accurate
- ✅ Success rates calculated correctly
- ✅ Session details accessible via session ID

### TC203: URL Extraction History
**Objective**: Validate individual URL tracking
**Priority**: Medium

**API Test**:
```bash
GET /api/extraction-history/check?url=https://example.com
```

**Expected Response**:
- ✅ `exists: true` for previously extracted URLs
- ✅ `lastExtracted` timestamp accurate
- ✅ `extractionCount` increments correctly
- ✅ `lastStatus` reflects most recent result

---

## 4. Error Handling Tests (Sad Path)

### TC301: Invalid URL Handling
**Objective**: Validate graceful error handling for bad URLs
**Priority**: Critical

**Test Cases**:
```javascript
invalidUrls: [
  'not-a-url',
  'ftp://invalid-protocol.com',
  'https://non-existent-domain-xyz123.com',
  'https://httpstat.us/404',
  'https://httpstat.us/500',
  'https://httpstat.us/timeout'
]
```

**Expected Behavior**:
- ✅ URL format validation before processing
- ✅ HTTP error codes handled gracefully
- ✅ Timeout scenarios managed properly
- ✅ Error messages displayed to user
- ✅ Failed attempts recorded in database
- ✅ System remains stable after errors

### TC302: Network Failure Scenarios
**Objective**: Validate resilience to network issues
**Priority**: High

**Test Scenarios**:
1. **Timeout Simulation**: Configure 1-second timeout, access slow site
2. **Connection Refused**: Access blocked/firewalled URL
3. **DNS Resolution Failure**: Access non-existent domain
4. **SSL Certificate Issues**: Access site with invalid certificate

**Expected Results**:
- ✅ Appropriate error codes returned
- ✅ User-friendly error messages
- ✅ Retry mechanisms function correctly
- ✅ System performance not degraded
- ✅ Database records error details

### TC303: Rate Limiting and Overload
**Objective**: Validate system behavior under load
**Priority**: Medium

**Test Process**:
1. Submit batch request with 25+ URLs
2. Trigger multiple concurrent batch requests
3. Monitor system resource usage
4. Verify request throttling mechanisms

**Expected Behavior**:
- ✅ Request limits enforced (25 URLs max)
- ✅ Concurrent processing limited appropriately
- ✅ Queue management prevents system overload
- ✅ Error responses for exceeded limits
- ✅ System recovery after load reduction

### TC304: Database Connection Failures
**Objective**: Validate database error handling
**Priority**: High

**Test Scenarios**:
1. **Database Unavailable**: Stop PostgreSQL container
2. **Connection Pool Exhausted**: Generate high database load
3. **Query Timeout**: Execute long-running queries

**Expected Behavior**:
- ✅ Graceful degradation when database unavailable
- ✅ Meaningful error messages to user
- ✅ Connection pool recovery mechanisms
- ✅ Transaction rollback on failures
- ✅ System logs capture database errors

---

## 5. Performance Tests

### TC401: Single URL Performance
**Objective**: Validate response time requirements
**Priority**: Medium

**Performance Criteria**:
- ✅ URL validation: < 100ms
- ✅ Simple page extraction: < 5 seconds
- ✅ Complex page extraction: < 10 seconds
- ✅ Database save operation: < 200ms

**Test Process**:
1. Extract content from standardized test URLs
2. Measure each phase timing
3. Validate against performance criteria
4. Identify performance bottlenecks

### TC402: Batch Processing Performance
**Objective**: Validate concurrent processing efficiency
**Priority**: Medium

**Performance Criteria**:
- ✅ 5 URLs concurrently: < 15 seconds total
- ✅ 10 URLs sequentially: < 30 seconds total
- ✅ Memory usage stable throughout batch
- ✅ Database connections managed efficiently

**Metrics to Track**:
- Processing time per URL
- Concurrent vs sequential performance
- Memory consumption patterns
- Database connection pool usage

### TC403: System Resource Monitoring
**Objective**: Validate resource usage patterns
**Priority**: Low

**Monitoring Points**:
- ✅ CPU usage during extraction
- ✅ Memory consumption over time
- ✅ Network bandwidth utilization
- ✅ Database connection counts
- ✅ Browser instance management

---

## 6. UI/UX Tests

### TC501: Component Responsiveness
**Objective**: Validate React component behavior
**Priority**: Medium

**Test Areas**:
1. **Form Validation**: URL input validation and error display
2. **Progress Indicators**: Real-time progress updates
3. **Result Display**: Content rendering and formatting
4. **Navigation**: Page routing and state management
5. **Error States**: Error message display and recovery

**Expected Behavior**:
- ✅ Instant form validation feedback
- ✅ Smooth progress animations
- ✅ Responsive design on different screen sizes
- ✅ Accessible keyboard navigation
- ✅ Clear error state communications

### TC502: Browser Compatibility
**Objective**: Validate cross-browser functionality
**Priority**: Low

**Target Browsers**:
- ✅ Chrome/Chromium (primary)
- ✅ Firefox
- ✅ Safari (WebKit)
- ✅ Edge

**Test Scope**:
- Core extraction workflows
- JavaScript functionality
- CSS styling consistency
- API communication

---

## 7. Integration Test Scenarios

### TC601: Complete User Journey
**Objective**: Validate end-to-end user workflow
**Priority**: Critical

**User Story**: "As a user, I want to extract content from multiple related URLs and track my extraction history"

**Journey Steps**:
1. **Discovery**: Access homepage, explore sitemap discovery
2. **Batch Setup**: Configure batch extraction with 5 URLs
3. **Processing**: Monitor real-time progress, handle any failures
4. **Review**: Examine results, check content quality
5. **History**: Access extraction history, filter by session
6. **Retry**: Retry any failed URLs from history
7. **Export**: Download or share extraction results

**Success Criteria**:
- ✅ Complete workflow executes without critical failures
- ✅ User experience remains intuitive throughout
- ✅ Data persisted accurately across all steps
- ✅ Performance remains acceptable under typical usage

### TC602: Error Recovery Workflow
**Objective**: Validate system resilience and user guidance
**Priority**: High

**Error Scenario**: "User encounters multiple failures and needs to recover"

**Recovery Steps**:
1. **Initial Failure**: Submit batch with mix of valid/invalid URLs
2. **Partial Results**: Review mixed success/failure results
3. **Error Analysis**: Examine specific error messages
4. **Retry Strategy**: Use retry functionality for failed URLs
5. **Alternative Approach**: Try single URL extraction for problematic URLs
6. **Final Validation**: Confirm successful content extraction

**Recovery Criteria**:
- ✅ Clear error communication guides user actions
- ✅ Retry mechanisms provide alternate paths to success
- ✅ System state remains consistent during recovery
- ✅ User can complete original objective despite initial failures

---

## Test Implementation Plan

### Phase 1: Core Functionality (Week 1)
- TC001-TC004: Basic workflows
- TC101-TC104: API integration
- TC201-TC203: Database persistence

### Phase 2: Error Handling (Week 2)
- TC301-TC304: Error scenarios
- TC501-TC502: UI/UX validation
- Performance baseline establishment

### Phase 3: Performance & Load (Week 3)
- TC401-TC403: Performance testing
- TC601-TC602: Integration scenarios
- Optimization based on results

### Test Automation Framework

**File Structure**:
```
tests/e2e/
├── fixtures/
│   ├── test-urls.json
│   ├── invalid-urls.json
│   └── performance-benchmarks.json
├── helpers/
│   ├── api-client.ts
│   ├── database-utils.ts
│   └── performance-monitor.ts
├── specs/
│   ├── core-functionality.spec.ts
│   ├── api-integration.spec.ts
│   ├── error-handling.spec.ts
│   └── performance.spec.ts
└── playwright.config.ts
```

**Environment Setup**:
```yaml
test_environment:
  database: PostgreSQL (test database)
  browser: Chromium headless
  network: Local development
  authentication: Dev user token
  logging: Verbose for debugging
```

**Continuous Integration**:
- Automated test execution on PRs
- Performance regression detection
- Cross-browser validation matrix
- Database migration testing
- Container deployment validation

This comprehensive E2E testing strategy ensures the Phase 2 Next.js Knowledge Graph Platform delivers reliable, performant, and user-friendly content extraction capabilities while maintaining robustness under various real-world scenarios.