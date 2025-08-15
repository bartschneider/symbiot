# Dev Container E2E Test Protocol

## Overview

This document outlines the comprehensive End-to-End testing protocol for the Knowledge Graph Platform dev container deployment, leveraging Playwright automation and the existing Phase 3.5 implementation.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dev Container │    │  Test Services  │    │ Playwright MCP  │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │  VS Code    │ │    │ │ Next.js App │ │    │ │ Browser     │ │
│ │  Extension  │ │◄───┤ │ :5173       │ │◄───┤ │ Automation  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Test Runner │ │────┤ │ API Service │ │    │ │ Test Report │ │
│ │ Scripts     │ │    │ │ :3001       │ │    │ │ Generator   │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │  Infrastructure │
                       │                 │
                       │ ┌─────────────┐ │
                       │ │ PostgreSQL  │ │
                       │ │ :5433       │ │
                       │ └─────────────┘ │
                       │                 │
                       │ ┌─────────────┐ │
                       │ │ Redis Cache │ │
                       │ │ :6380       │ │
                       │ └─────────────┘ │
                       └─────────────────┘
```

## Test Execution Phases

### Phase 1: Environment Validation
- **Objective**: Verify all services are healthy and accessible
- **Duration**: 2-3 minutes
- **Tests**:
  - Service health checks (frontend, API, database, cache)
  - Network connectivity validation
  - Environment variable verification

### Phase 2: Core Functionality Testing
- **Objective**: Validate basic application functionality
- **Duration**: 5-8 minutes
- **Tests**:
  - User interface loading and navigation
  - Basic content extraction workflows
  - API endpoint functionality

### Phase 3: Phase 3.5 LLM Integration Testing
- **Objective**: Verify Vertex AI Gemini integration and LLM processing
- **Duration**: 10-15 minutes
- **Tests**:
  - Entity extraction from sample content
  - Relationship detection between entities
  - Dynamic model switching (Pro vs Flash)
  - Cost tracking and quality metrics
  - Confidence scoring validation

### Phase 4: Performance & Load Testing
- **Objective**: Ensure system performance under load
- **Duration**: 8-12 minutes
- **Tests**:
  - Page load time validation (<3s)
  - API response time testing (<200ms)
  - Memory usage monitoring
  - Concurrent user simulation

### Phase 5: Error Handling & Recovery
- **Objective**: Validate graceful error handling
- **Duration**: 5-7 minutes
- **Tests**:
  - Network failure simulation
  - Invalid input handling
  - Service timeout scenarios
  - Graceful degradation validation

## Playwright MCP Integration

### Browser Automation Commands

```bash
# Basic navigation and interaction
npm run test:e2e                    # Full test suite
npm run test:e2e:headed            # Visual test execution
npm run test:e2e:debug             # Debug mode with breakpoints
npm run test:e2e:ui                # Interactive test UI

# Specialized test suites
npm run test:e2e:smoke             # Quick validation tests
npm run test:e2e:performance       # Performance benchmarks
npm run test:e2e:errors            # Error scenario testing

# Phase 3.5 specific testing
npx playwright test phase35-vertex-ai.spec.ts --headed
npx playwright test phase35-vertex-ai.spec.ts --debug
```

### MCP Server Test Scenarios

1. **Content Processing Workflow**
   - Navigate to main application
   - Input sample content for processing
   - Trigger Vertex AI LLM processing
   - Validate entity extraction results
   - Verify relationship detection
   - Check cost tracking accuracy

2. **Model Switching Validation**
   - Submit simple content → Verify Flash model selection
   - Submit complex content → Verify Pro model selection
   - Monitor processing time differences
   - Validate cost variations between models

3. **Quality Metrics Testing**
   - Process content with known entities
   - Verify confidence scores >70%
   - Check completeness scores
   - Validate content preservation ratios

### Error Scenario Testing

1. **Service Unavailability**
   - Simulate API service downtime
   - Verify graceful error messages
   - Test retry mechanisms
   - Validate fallback behaviors

2. **Invalid Input Handling**
   - Submit malformed content
   - Test character limit boundaries
   - Verify input sanitization
   - Check error message clarity

3. **Authentication Failures**
   - Simulate Vertex AI auth failures
   - Test Google Cloud credential issues
   - Verify error logging
   - Check user-friendly error messages

## Automation Scripts

### Quick Test Execution

```bash
# In dev container terminal
.devcontainer/run-tests.sh smoke      # 2-3 minute validation
.devcontainer/run-tests.sh phase35    # 10-15 minute LLM testing
.devcontainer/run-tests.sh all        # 30-45 minute comprehensive suite
```

### Continuous Integration

```bash
# CI/CD pipeline integration
docker-compose -f docker-compose.user-testing.yml \
    --profile devcontainer-testing \
    up devcontainer-test-runner
```

### Debug Mode

```bash
# Interactive debugging
docker-compose -f docker-compose.user-testing.yml \
    --profile debug \
    up playwright-debug

# Access debug interface at http://localhost:9323
```

## Test Results & Reporting

### Automated Reports
- **HTML Report**: Interactive test results with screenshots and videos
- **JSON Report**: Machine-readable results for CI/CD integration
- **JUnit Report**: Compatible with most CI/CD systems
- **Performance Metrics**: Load times, API response times, resource usage

### Report Locations
```
test-results/
├── reports/
│   └── playwright-report-{timestamp}/
│       └── index.html
├── screenshots/
├── videos/
├── traces/
├── results.json
├── junit.xml
└── test-summary-{timestamp}.md
```

### Success Criteria

#### Functional Tests
- ✅ All core functionality tests pass
- ✅ Phase 3.5 LLM processing works correctly
- ✅ Entity extraction confidence >70%
- ✅ Relationship detection accuracy >80%

#### Performance Tests  
- ✅ Page load times <3 seconds
- ✅ API response times <200ms
- ✅ Memory usage <500MB
- ✅ Zero memory leaks detected

#### Error Handling
- ✅ Graceful degradation on service failures
- ✅ Clear error messages for user issues
- ✅ Proper logging for debugging
- ✅ Recovery mechanisms functional

## Deployment Validation

### Pre-Deployment Checklist
1. All E2E tests passing in dev container
2. Performance benchmarks meeting criteria
3. Error scenarios handled gracefully
4. Security validation completed
5. Documentation updated

### Post-Deployment Verification
1. Production environment health checks
2. Real-world content processing validation
3. Performance monitoring active
4. Error tracking configured
5. User acceptance testing completed

## Troubleshooting

### Common Issues

**Playwright Browser Installation**
```bash
# In dev container
npx playwright install
npx playwright install-deps
```

**Service Connection Issues**
```bash
# Check service health
health:check
curl -f http://frontend-testing:5173
curl -f http://firecrawl-service:3001/health
```

**Test Timeouts**
```bash
# Increase timeouts for slow environments
export PLAYWRIGHT_TIMEOUT=180000
npx playwright test --timeout=180000
```

**Memory Issues**
```bash
# Monitor container resources
docker stats kgp-devcontainer
docker-compose logs devcontainer
```

### Debug Commands

```bash
# View service logs
logs:api                   # API service logs
logs:db                    # Database logs
docker-compose logs -f     # All service logs

# Test specific scenarios
npx playwright test --grep "Phase 3.5"
npx playwright test --grep "LLM processing"
npx playwright test --headed --slowMo=1000
```

## Integration with Claude Code SuperClaude

This dev container test protocol integrates with the SuperClaude framework through:

1. **Memory-Enhanced Testing**: Applies patterns from `Docker_Artifact_Registry_PyPI_Conflict_20250814` resolution
2. **Discovery-First Protocol**: Uses systematic validation approach from memory patterns
3. **Architecture-Driven Implementation**: Follows proven deployment patterns from `Implementation_Deployment_Success_20250814`
4. **Error Pattern Prevention**: Applies anti-patterns from `Investigation_Anti_Pattern_Catalog`

The protocol ensures robust, automated testing that validates the Phase 3.5 LLM implementation while providing comprehensive deployment confidence.