# User Testing Guide - Knowledge Graph Platform

## Quick Start for User Testing

### 1. Prerequisites
- Docker Desktop installed and running
- No other services on ports 5173, 3001, 5433, 6380, 8080

### 2. Start User Testing Environment
```bash
# Start all services for user testing
docker-compose -f docker-compose.user-testing.yml up -d

# Check service health (wait 60 seconds for startup)
docker-compose -f docker-compose.user-testing.yml ps

# Access the application
open http://localhost:5173
```

### 3. Test URLs and Credentials
- **Application**: http://localhost:5173
- **API Health**: http://localhost:3001/health
- **Health Dashboard**: http://localhost:8080 (optional monitoring)

## User Testing Scenarios

### Scenario 1: Basic Web Scraping
**Objective**: Verify core scraping functionality works end-to-end

1. Open http://localhost:5173
2. Enter URL: `https://example.com`
3. Click "Extract Content"
4. **Expected Result**: 
   - Processing indicator appears
   - Content extracted within 5 seconds
   - Markdown content displayed
   - No error messages

**Success Criteria**:
- ✅ URL input accepts valid websites
- ✅ Processing completes within 5 seconds
- ✅ Extracted content is readable and formatted
- ✅ No JavaScript errors in browser console

### Scenario 2: Error Handling
**Objective**: Verify system handles invalid inputs gracefully

1. Test invalid URL: `not-a-url`
2. Test unreachable URL: `https://definitely-not-a-real-website.invalid`
3. Test timeout URL: `https://httpstat.us/200?sleep=10000`

**Expected Results**:
- Clear error messages displayed
- System remains responsive
- User can retry with different URL

### Scenario 3: Performance Validation
**Objective**: Verify system meets performance requirements

**Test Steps**:
1. Extract content from 3 different websites:
   - `https://example.com`
   - `https://httpbin.org/html`
   - `https://news.ycombinator.com`

**Success Criteria**:
- ✅ Each extraction completes within 5 seconds
- ✅ System memory usage stays under 512MB
- ✅ No performance degradation between requests
- ✅ UI remains responsive during processing

### Scenario 4: Browser Compatibility
**Objective**: Verify cross-browser functionality

**Browsers to Test**:
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (if on macOS)

**Test Actions**:
1. Access http://localhost:5173 in each browser
2. Perform basic extraction test
3. Check browser developer tools for errors

### Scenario 5: Extraction History
**Objective**: Test extraction history tracking

1. Extract content from same URL twice
2. Check if system recognizes previous extraction
3. Verify extraction history is maintained

## Validation Checklist

### Frontend Validation
- [ ] Application loads without errors
- [ ] All UI components render correctly
- [ ] Form validation works for URL inputs
- [ ] Loading states display appropriately
- [ ] Error messages are clear and helpful
- [ ] Results display is readable and well-formatted

### Backend Validation
- [ ] API endpoints respond within 200ms
- [ ] Content extraction completes within 5 seconds
- [ ] Error handling returns appropriate HTTP status codes
- [ ] Database connections are stable
- [ ] Memory usage remains under 512MB per service

### System Integration
- [ ] Frontend communicates correctly with API
- [ ] Database operations complete successfully
- [ ] Cache system improves repeat request performance
- [ ] All services restart gracefully after failures

### User Experience
- [ ] Interface is intuitive without training
- [ ] Workflow is logical and efficient
- [ ] Error recovery is straightforward
- [ ] Performance meets user expectations

## Performance Benchmarks

### Response Time Targets
- Page load: < 3 seconds
- API health check: < 50ms
- Content extraction: < 5 seconds
- Error responses: < 200ms

### Resource Usage Limits
- Total memory usage: < 1GB for all services
- Container startup time: < 60 seconds
- CPU usage: < 50% during normal operation

## Troubleshooting

### Service Won't Start
```bash
# Check Docker status
docker-compose -f docker-compose.user-testing.yml ps

# View service logs
docker-compose -f docker-compose.user-testing.yml logs [service-name]

# Restart specific service
docker-compose -f docker-compose.user-testing.yml restart [service-name]
```

### Frontend Not Accessible
```bash
# Check if port is in use
lsof -i :5173

# Check frontend logs
docker-compose -f docker-compose.user-testing.yml logs frontend-testing

# Restart frontend
docker-compose -f docker-compose.user-testing.yml restart frontend-testing
```

### API Errors
```bash
# Test API directly
curl http://localhost:3001/health

# Check API logs
docker-compose -f docker-compose.user-testing.yml logs firecrawl-service

# Test database connection
docker-compose -f docker-compose.user-testing.yml exec postgres-testing pg_isready
```

### Database Issues
```bash
# Check database status
docker-compose -f docker-compose.user-testing.yml exec postgres-testing pg_isready

# View database logs
docker-compose -f docker-compose.user-testing.yml logs postgres-testing

# Reset database (WARNING: Loses data)
docker-compose -f docker-compose.user-testing.yml down -v
docker-compose -f docker-compose.user-testing.yml up -d
```

## Test Results Documentation

### Test Report Template
```markdown
## User Testing Report - [Date]

**Tester**: [Name]
**Browser**: [Browser/Version]
**OS**: [Operating System]

### Test Results
- [ ] Scenario 1: Basic Web Scraping - PASS/FAIL
- [ ] Scenario 2: Error Handling - PASS/FAIL  
- [ ] Scenario 3: Performance Validation - PASS/FAIL
- [ ] Scenario 4: Browser Compatibility - PASS/FAIL
- [ ] Scenario 5: Extraction History - PASS/FAIL

### Issues Found
1. [Issue description and steps to reproduce]
2. [Issue description and steps to reproduce]

### User Experience Feedback
- **Positive**: [What worked well]
- **Negative**: [What needs improvement]
- **Suggestions**: [Improvement recommendations]

### Performance Observations
- Page load time: [X] seconds
- Extraction time: [X] seconds
- Memory usage: [X] MB
- CPU usage: [X]%
```

## Cleanup After Testing

```bash
# Stop all testing services
docker-compose -f docker-compose.user-testing.yml down

# Remove testing data (optional)
docker-compose -f docker-compose.user-testing.yml down -v

# Clean up Docker resources (optional)
docker system prune -f
```

## Next Steps After User Testing

1. **Collect Feedback**: Gather all test reports and user feedback
2. **Prioritize Issues**: Rank issues by severity and user impact
3. **Plan Fixes**: Schedule bug fixes and improvements
4. **Prepare for Phase 2**: Use learnings to inform Next.js migration
5. **Document Lessons**: Update PRD with testing insights