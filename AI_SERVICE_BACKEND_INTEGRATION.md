# AI Service Integration Guide for Backend

## Overview

The QuickCheck AI Service is now fully production-ready with comprehensive error handling, logging, and validation. This guide explains how to properly integrate with it from your Node.js backend.

## 🎯 Key Changes for Backend Integration

### Before (Old Behavior)
```
Frontend → Backend → AI Service
                     ↓
          Returns: "Downstream service error"
          (No details, no context, unhelpful)
```

### After (New Behavior)
```
Frontend → Backend → AI Service
                     ↓
          Detailed responses:
          - Specific error messages
          - Proper HTTP status codes
          - Full error context
          - Always JSON responses
```

## API Endpoints

### 1. POST /analyze - Certificate Analysis

**Endpoint**: `http://localhost:8001/analyze`

**Request Format** (multipart/form-data):
```javascript
const formData = new FormData();
formData.append('file', certificateFile);  // Required
formData.append('student_name', 'John Smith');  // Optional
formData.append('organization', 'Acme Corp');  // Optional
formData.append('certificate_id', 'CERT-12345');  // Optional
formData.append('issue_date', '2024-05-01');  // Optional
formData.append('template_profile', JSON.stringify(templateData));  // Optional

const response = await fetch('http://localhost:8001/analyze', {
    method: 'POST',
    body: formData
});
```

**Success Response (HTTP 200)**:
```json
{
  "fraudProbability": 15.2,
  "confidence": 92.5,
  "recommendation": "ACCEPT",
  "verificationStatus": "VERIFIED",
  "nameSimilarity": 95,
  "visualSimilarity": 88.5,
  "suspiciousIndicators": [],
  "anomalies": [],
  "qrData": "cert-12345",
  "ocrText": "Certificate of Achievement...",
  "textFingerprint": "certificate achievement john smith",
  "visualComponents": {
    "resolution": 100.0,
    "color": 85.5,
    "edge": 88.2,
    "brightness": 90.1
  },
  "matchedNameText": "John Smith",
  "imageHash": "abc123def456",
  "extractedFields": {
    "studentName": "John Smith",
    "certificateId": "CERT-12345",
    "issueDate": "2024-05-01",
    "organization": "Acme Corp",
    "resolution": {
      "width": 1600,
      "height": 1130,
      "aspectRatio": 1.4159
    },
    "dominantColors": ["#FFFFFF", "#000000", "#1E90FF"]
  }
}
```

**Error Responses** (HTTP 400, 500):
```json
{
  "detail": "File too large: 65.3MB (max 50MB)"
}
```

or

```json
{
  "detail": "Unsupported file type: .exe. Supported: {.pdf, .png, .jpg, .jpeg}"
}
```

or

```json
{
  "detail": "Failed to convert PDF: [specific error details]"
}
```

### Error Code Mapping

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 200 | Success | Process response normally |
| 400 | Bad Request | Validate file type/size, show user error |
| 500 | Server Error | Log error, show generic message to user |
| 501 | Not Implemented | Feature unavailable (e.g., template extractor) |
| 503 | Service Unavailable | Database/dependency issue, retry later |

### 2. GET /health - Service Health Check

**Endpoint**: `http://localhost:8001/health`

**Response (HTTP 200)**:
```json
{
  "status": "operational",
  "service": "quickcheck-ai",
  "version": "1.0.0",
  "dependencies": {
    "opencv": true,
    "tesseract": true,
    "poppler": true,
    "pyzbar": true,
    "pymongo": true,
    "mongodb": true
  },
  "warnings": [
    "Poppler not found - PDF conversion will not work"
  ]
}
```

**Usage**:
```javascript
async function checkAiServiceHealth() {
  try {
    const response = await fetch('http://localhost:8001/health');
    const health = await response.json();
    
    if (response.ok) {
      console.log('AI Service is healthy:', health.status);
      
      if (health.warnings.length > 0) {
        console.warn('Warnings:', health.warnings);
      }
      
      return true;
    } else {
      console.error('AI Service unhealthy');
      return false;
    }
  } catch (err) {
    console.error('Cannot reach AI Service:', err.message);
    return false;
  }
}
```

### 3. POST /templates/extract - Extract Template Profile

**Endpoint**: `http://localhost:8001/templates/extract`

**Request Format**:
```javascript
const formData = new FormData();
formData.append('certification_id', 'google-cloud-associate');
formData.append('files', certificateFile1);
formData.append('files', certificateFile2);
formData.append('files', certificateFile3);

const response = await fetch('http://localhost:8001/templates/extract', {
    method: 'POST',
    body: formData
});
```

**Success Response**:
```json
{
  "extractedProfile": { ... },
  "thresholds": {
    "nameSimilarity": 75.2,
    "visualSimilarity": 72.1,
    "fraudReview": 70,
    "fraudReject": 90
  },
  "sampleCount": 5,
  "aggregationQuality": "good"
}
```

### 4. GET /templates/list - List Templates

**Response**:
```json
{
  "count": 2,
  "templates": [
    {
      "id": "507f1f77bcf86cd799439011",
      "certificationId": "google-cloud",
      "version": 1,
      "trainedSamples": 5,
      "trainingQuality": "good",
      "trainedAt": "2024-05-01T10:30:00"
    }
  ]
}
```

### 5. GET /templates/{id} - Get Template Details

**Response**:
```json
{
  "id": "507f1f77bcf86cd799439011",
  "extractedProfile": { ... },
  "components": [ ... ],
  "relationships": [ ... ],
  "hashes": { ... },
  "thresholds": { ... },
  "metadata": { ... }
}
```

## 🔧 Proper Error Handling in Backend

### Don't Do This Anymore
```javascript
// ❌ BAD - Generic fallback
try {
    const response = await fetch('http://localhost:8001/analyze', ...);
    const data = await response.json();
    return { success: false, message: 'AI service error' };
} catch (err) {
    return { success: false, message: 'Downstream service error' };
}
```

### Do This Instead
```javascript
// ✅ GOOD - Handle specific errors
async function analyzeWithAi(file, studentName) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('student_name', studentName);

    const response = await fetch('http://localhost:8001/analyze', {
      method: 'POST',
      body: formData,
      timeout: 30000
    });

    if (response.ok) {
      const analysis = await response.json();
      return {
        success: true,
        data: analysis
      };
    }

    // Handle specific error codes
    if (response.status === 400) {
      const error = await response.json();
      return {
        success: false,
        error: 'INVALID_FILE',
        message: error.detail, // "File too large: ..." or "Unsupported file type: ..."
        statusCode: 400
      };
    }

    if (response.status === 500) {
      const error = await response.json();
      return {
        success: false,
        error: 'AI_ERROR',
        message: error.detail, // Specific error like "PDF conversion failed"
        statusCode: 500
      };
    }

    if (response.status === 503) {
      return {
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'AI service is temporarily unavailable',
        statusCode: 503
      };
    }

    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: `HTTP ${response.status}`,
      statusCode: response.status
    };

  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        success: false,
        error: 'TIMEOUT',
        message: 'AI service request timed out (30s)'
      };
    }

    return {
      success: false,
      error: 'CONNECTION_ERROR',
      message: `Cannot reach AI service: ${err.message}`
    };
  }
}
```

## 📋 Integration Checklist

- [ ] Check AI service health at startup
- [ ] Validate file before sending (type, size)
- [ ] Handle all HTTP error codes (400, 500, 501, 503)
- [ ] Parse error.detail for specific error messages
- [ ] Implement proper timeout (30+ seconds)
- [ ] Log all AI service calls (request, response, errors)
- [ ] Provide user-friendly error messages
- [ ] Retry on 503 (service unavailable)
- [ ] Don't retry on 400 (invalid request)
- [ ] Monitor health endpoint periodically

## 🧪 Testing Checklist

### Test Cases
1. ✅ Valid certificate image
   - Expected: 200 response with analysis
   
2. ✅ Valid certificate PDF
   - Expected: 200 response with analysis
   
3. ✅ Invalid file type (.docx)
   - Expected: 400 response, specific error
   
4. ✅ Too large file (>50MB)
   - Expected: 400 response, specific error
   
5. ✅ Empty file
   - Expected: 400 response, specific error
   
6. ✅ Valid certificate + template
   - Expected: 200 response with template-based analysis
   
7. ✅ With student name
   - Expected: 200 response with name similarity score
   
8. ✅ Health check
   - Expected: 200 response with dependency status

## 📝 Example Implementation

### Node.js/Express
```javascript
// ai.service.js
const axios = require('axios');

class AiService {
  constructor(baseUrl = 'http://localhost:8001') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000
    });
  }

  async checkHealth() {
    try {
      const { data, status } = await this.client.get('/health');
      return { status, data, healthy: status === 200 };
    } catch (err) {
      return { healthy: false, error: err.message };
    }
  }

  async analyzeCertificate(file, options = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      if (options.studentName) {
        formData.append('student_name', options.studentName);
      }
      if (options.organization) {
        formData.append('organization', options.organization);
      }
      if (options.templateProfile) {
        formData.append('template_profile', JSON.stringify(options.templateProfile));
      }

      const { data } = await this.client.post('/analyze', formData, {
        headers: formData.getHeaders()
      });

      return { success: true, data };

    } catch (err) {
      if (err.response?.status === 400) {
        return { 
          success: false, 
          error: 'INVALID_REQUEST',
          message: err.response.data.detail,
          statusCode: 400
        };
      }

      if (err.response?.status === 503) {
        return { 
          success: false, 
          error: 'SERVICE_UNAVAILABLE',
          message: 'AI service temporarily unavailable',
          statusCode: 503
        };
      }

      if (err.code === 'ECONNREFUSED') {
        return { 
          success: false, 
          error: 'SERVICE_UNREACHABLE',
          message: 'Cannot connect to AI service'
        };
      }

      if (err.code === 'ECONNABORTED') {
        return { 
          success: false, 
          error: 'TIMEOUT',
          message: 'AI service request timed out'
        };
      }

      return { 
        success: false, 
        error: 'UNKNOWN',
        message: err.message
      };
    }
  }

  async listTemplates() {
    try {
      const { data } = await this.client.get('/templates/list');
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = new AiService();
```

### Usage
```javascript
// In your controller
const aiService = require('./ai.service');

router.post('/analyze', async (req, res) => {
  try {
    // Validate file
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Call AI service
    const result = await aiService.analyzeCertificate(req.file, {
      studentName: req.body.studentName,
      organization: req.body.organization
    });

    if (!result.success) {
      // Specific error handling
      if (result.error === 'TIMEOUT') {
        return res.status(504).json({ error: 'AI service timed out' });
      }
      if (result.error === 'SERVICE_UNAVAILABLE') {
        return res.status(503).json({ error: 'AI service unavailable' });
      }
      if (result.error === 'INVALID_REQUEST') {
        return res.status(400).json({ error: result.message });
      }
      
      return res.status(500).json({ error: result.message });
    }

    // Success
    return res.json(result.data);

  } catch (err) {
    logger.error('Certificate analysis failed', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

## 🚀 Deployment Notes

1. **Environment Variables**
   - Set `AI_SERVICE_URL` to point to the AI service
   - Example: `http://localhost:8001` (development)
   - Example: `http://ai-service:8001` (Docker)
   - Example: `http://ai.internal.company.com` (Production)

2. **Health Checks**
   - Call `/health` periodically (every 30 seconds)
   - Log warnings from response
   - Alert if service becomes unhealthy

3. **Error Logging**
   - Log all AI service errors with full context
   - Include request details (file size, type)
   - Include response details (status, error message)
   - Include timestamps and trace IDs

4. **Monitoring**
   - Track AI service response times
   - Monitor error rates
   - Alert on timeouts or connection failures
   - Track number of analyses performed

## 📞 Common Issues

**"Cannot reach AI service"**
- Verify AI_SERVICE_URL environment variable
- Ensure AI service is running
- Check network connectivity
- Check firewall rules

**"Request timed out"**
- Increase timeout to 30+ seconds
- Check AI service performance
- Monitor server resources
- May indicate PDF conversion issues

**"Invalid file type"**
- Only PDF, PNG, JPG, JPEG supported
- Validate file extension before sending
- Check file headers (not just extension)

**"File too large"**
- Default max: 50MB
- Resize images before uploading
- Compress PDFs if possible

## 🎉 You're All Set!

Your backend can now safely integrate with the AI service with confidence that:
- ✅ All errors are properly reported
- ✅ No generic "service error" messages
- ✅ Specific error codes and messages
- ✅ Proper HTTP status codes
- ✅ Comprehensive logging
- ✅ Graceful error handling
