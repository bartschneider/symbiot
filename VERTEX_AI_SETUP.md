# Google Vertex AI Setup Guide for Phase 3.5

This guide explains how to set up Google Cloud Vertex AI authentication for the Phase 3.5 LLM integration using Gemini 2.5 Pro/Flash models.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. A GCP project with billing enabled
3. Node.js 18+ installed locally

## Step 1: Create and Configure GCP Project

### 1.1 Create a Project
```bash
# Install Google Cloud CLI if not already installed
# Visit: https://cloud.google.com/sdk/docs/install

# Create a new project (or use existing)
gcloud projects create your-project-id --name="Knowledge Graph Platform"

# Set the project as active
gcloud config set project your-project-id
```

### 1.2 Enable Required APIs
```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Enable Cloud Resource Manager API (if needed)
gcloud services enable cloudresourcemanager.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled --filter="aiplatform.googleapis.com"
```

### 1.3 Set Up Billing
- Go to [GCP Console > Billing](https://console.cloud.google.com/billing)
- Link your project to a billing account
- Set up budget alerts (recommended: $50/month for development)

## Step 2: Authentication Setup

### Method 1: Default Application Credentials (Recommended for Development)

```bash
# Authenticate with your Google account
gcloud auth application-default login

# Verify authentication
gcloud auth list
```

### Method 2: Service Account (Recommended for Production)

```bash
# Create a service account
gcloud iam service-accounts create vertex-ai-service \
    --display-name="Vertex AI Service Account" \
    --description="Service account for Vertex AI operations"

# Grant necessary permissions
gcloud projects add-iam-policy-binding your-project-id \
    --member="serviceAccount:vertex-ai-service@your-project-id.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Create and download key file
gcloud iam service-accounts keys create vertex-ai-key.json \
    --iam-account=vertex-ai-service@your-project-id.iam.gserviceaccount.com

# Set environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/vertex-ai-key.json"
```

## Step 3: Configure Application

### 3.1 Update Environment Variables

Edit your `.env` file:

```bash
# Phase 3.5: Google Cloud Vertex AI Configuration
GOOGLE_CLOUD_PROJECT=your-actual-project-id
GOOGLE_CLOUD_LOCATION=us-central1

# LLM Processing Configuration  
LLM_AUTO_PROCESSING=true
LLM_DAILY_COST_LIMIT_CENTS=500
VERTEX_PREFERRED_MODEL=auto

# Optional: Service account key path (if using Method 2)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/vertex-ai-key.json
```

### 3.2 Install Dependencies

```bash
# Install the Vertex AI SDK (already included in package.json)
npm install @google-cloud/vertexai
```

## Step 4: Test Authentication

### 4.1 Test API Endpoint

```bash
# Start your application
npm run dev

# Test the health check endpoint
curl http://localhost:3000/api/llm/stats?action=health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "overall": true,
    "provider": "vertex-ai",
    "authentication": {
      "method": "default-application-credentials",
      "project": "your-project-id",
      "status": "authenticated"
    },
    "models": {
      "available": ["gemini-2.5-pro", "gemini-2.5-flash"],
      "defaultStrategy": "auto-select-by-complexity"
    }
  }
}
```

### 4.2 Test Content Processing

```bash
# Test entity extraction
curl -X POST http://localhost:3000/api/llm/process \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "content": "Google Cloud Platform offers Vertex AI for machine learning.",
    "options": {
      "model": "gemini-2.5-flash"
    }
  }'
```

## Step 5: Model Selection Strategy

### Gemini 2.5 Pro
- **Use for**: Complex reasoning, high-accuracy tasks, large documents
- **Context**: 2M tokens
- **Cost**: ~$1.25 per 1K tokens
- **Best for**: Detailed analysis, relationship detection, complex entities

### Gemini 2.5 Flash  
- **Use for**: Fast processing, simple extractions, cost-sensitive operations
- **Context**: 1M tokens
- **Cost**: ~$0.075 per 1K tokens  
- **Best for**: Quick analysis, basic entity extraction, validation

### Auto Selection
- Content complexity analysis determines optimal model
- Complexity score >0.6 → Gemini 2.5 Pro
- Complexity score ≤0.6 → Gemini 2.5 Flash

## Cost Management

### Daily Cost Limits
```bash
# Set in .env file
LLM_DAILY_COST_LIMIT_CENTS=500  # $5 per day
```

### Cost Monitoring
- Check costs: `/api/llm/stats` endpoint
- Set up GCP budget alerts
- Monitor usage in GCP Console

### Cost Optimization Tips
1. Use Gemini 2.5 Flash for simple tasks
2. Enable auto-processing limits
3. Set appropriate confidence thresholds
4. Monitor daily usage via API

## Troubleshooting

### Common Issues

**1. Authentication Failed**
```
Error: Vertex AI authentication failed: Could not load the default credentials
```
Solution: Run `gcloud auth application-default login`

**2. Project Not Set**
```
Error: GOOGLE_CLOUD_PROJECT environment variable not set
```
Solution: Update `.env` file with your actual project ID

**3. API Not Enabled**
```
Error: Vertex AI API has not been used in project
```
Solution: Run `gcloud services enable aiplatform.googleapis.com`

**4. Insufficient Permissions**
```
Error: Permission 'aiplatform.endpoints.predict' denied
```
Solution: Add IAM role `roles/aiplatform.user` to your account/service account

### Health Check Endpoint

Use the health check endpoint to diagnose issues:
```bash
curl http://localhost:3000/api/llm/stats?action=health
```

### Logs

Check application logs for detailed error messages:
```bash
# View application logs
npm run dev

# Check for authentication errors in console output
```

## Production Deployment

### Environment Setup
1. Use service account authentication (Method 2)
2. Store service account key securely
3. Set up proper IAM roles and permissions
4. Configure monitoring and alerting
5. Set appropriate cost limits

### Security Best Practices
1. Rotate service account keys regularly
2. Use least-privilege IAM roles
3. Monitor API usage and costs
4. Enable audit logging
5. Set up budget alerts

### Scaling Considerations
1. Vertex AI has generous quotas
2. Monitor token usage and costs
3. Implement caching for repeated content
4. Use Flash model for high-volume operations
5. Consider regional deployment for latency

## Next Steps

1. **Test Integration**: Run through all endpoints to ensure proper setup
2. **Monitor Costs**: Watch daily usage and adjust limits as needed  
3. **Optimize Models**: Use complexity analysis to fine-tune model selection
4. **Scale Gradually**: Start with low limits and increase as confidence grows
5. **Monitor Quality**: Track extraction quality and adjust thresholds

For additional support, check:
- [Google Cloud Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Gemini API Documentation](https://cloud.google.com/vertex-ai/docs/generative-ai)
- Application logs and health check endpoint