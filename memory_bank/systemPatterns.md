# System Patterns & Architecture - FeedBackResolver

## Architecture Patterns

### 1. Pipeline Pattern
The system follows a clear pipeline architecture for email processing:

```
Input → Authentication → Fetch → Filter → Triage → Analyze → Output
```

**Implementation:**
- Each stage has clear inputs/outputs
- Stages are loosely coupled
- Error handling at each stage
- Async/await pattern for non-blocking operations

### 2. Dual-Output Pattern
System generates two parallel outputs for different use cases:

```
Analysis Result → ├── File System (analysis_report.md) [Backup/Archive]
                  └── Slack Webhook (Real-time notification) [Team Collaboration]
```

**Benefits:**
- Fault tolerance (if Slack fails, file backup remains)
- Different consumption patterns (immediate vs. historical)
- Scalability (can add more output channels easily)

### 3. State Management Pattern
Incremental processing using lightweight state tracking:

```javascript
// processed_emails.json tracks email IDs to prevent reprocessing
{
  "processed": ["emailId1", "emailId2", "emailId3"]
}
```

**Implementation Details:**
- JSON-based persistence (simple, readable)
- Append-only operations (safe for concurrent runs)
- Automatic cleanup (old IDs naturally age out)

### 4. Configuration-Driven Pattern
Environment-based configuration for different deployment contexts:

```
.env.example → .env (development) → Production Environment Variables
```

**Key Principles:**
- No hardcoded credentials or settings
- Environment-specific overrides
- Sensible defaults with validation
- Clear documentation in .env.example

## Design Patterns

### 1. Factory Pattern (AI Provider Selection)
NeuroLink abstracts different AI providers behind a common interface:

```javascript
// Configurable provider selection
const neurolink = new NeuroLink();
await neurolink.generate({
    provider: neurolinkProvider, // 'vertex', 'openai', 'anthropic'
    input: { text: emailContent }
});
```

### 2. Strategy Pattern (Email Processing)
Different processing strategies based on email characteristics:

```javascript
// Two-stage processing strategy
1. Individual Triage Strategy: Quick relevance classification
2. Batch Analysis Strategy: Deep categorization of relevant emails
```

### 3. Observer Pattern (Slack Notifications)
Slack integration follows observer pattern:

```javascript
// Analysis completion triggers notification
analysisComplete → slackNotifier.sendNotification(analysisData)
```

### 4. Template Method Pattern (Report Generation)
Structured report generation with consistent format:

```javascript
// Consistent report structure across all runs
generateReport() {
    addHeader();
    addSummary();
    addCategorizedContent();
    addFooter();
}
```

## Data Flow Patterns

### 1. Stream Processing Pattern
Email processing as a stream of operations:

```javascript
emails
  .filter(email => !processedIds.includes(email.id))
  .map(email => extractContent(email))
  .map(content => triageContent(content))
  .filter(result => result.isRelevant)
  .collect(relevantEmails => analyzeConsolidated(relevantEmails))
```

### 2. Batch Processing Pattern
AI analysis optimizes for batch operations:

```
Individual emails → Batch triage → Collect relevant → Single consolidated analysis
```

**Benefits:**
- Reduced AI API calls
- Better context understanding
- Cost optimization
- Improved consistency

### 3. Event-Driven Pattern
System responds to events rather than polling:

```
Email Fetch Event → Triage Events → Analysis Event → Notification Event
```

## Error Handling Patterns

### 1. Graceful Degradation
System continues operation despite component failures:

```javascript
// Slack notification failure doesn't stop email processing
try {
    await slackNotifier.sendNotification(data);
} catch (error) {
    console.error('Slack notification failed:', error);
    // Continue with file output
}
```

### 2. Circuit Breaker Pattern
Protection against cascading failures:

```javascript
// AI provider failures with fallback
if (aiResponseInvalid) {
    logError();
    useDefaultClassification();
    continue; // Don't stop entire pipeline
}
```

### 3. Retry Pattern
Automatic retry for transient failures:

```javascript
// OAuth token refresh on authentication failure
try {
    await gmailAPI.call();
} catch (authError) {
    await refreshToken();
    await gmailAPI.call(); // Retry once
}
```

## Integration Patterns

### 1. API Gateway Pattern
NeuroLink acts as gateway to multiple AI providers:

```
Application → NeuroLink → ├── Vertex AI
                          ├── OpenAI  
                          ├── Anthropic
                          └── Other providers
```

### 2. Webhook Pattern
Slack integration uses webhook pattern for real-time delivery:

```
Analysis Complete → HTTP POST → Slack Webhook → Channel Notification
```

### 3. OAuth2 Flow Pattern
Standard OAuth2 authorization code flow for Gmail:

```
Application → Google OAuth → User Consent → Authorization Code → Access Token
```

## Code Organization Patterns

### 1. Modular Architecture
Clear separation of concerns across modules:

```
index.js           → Main orchestration
slack-notifier.js  → Slack integration
get-refresh-token.js → OAuth utilities
```

### 2. Configuration Module Pattern
Centralized configuration management:

```javascript
// Environment variables loaded once, validated, with defaults
const config = {
    gmail: { clientId, clientSecret, refreshToken },
    ai: { provider, model, timeout },
    slack: { webhookUrl, enabled }
};
```

### 3. Utility Module Pattern
Shared utilities across the application:

```javascript
// Reusable functions for common operations
function extractJsonFromCodeBlock(text) { /* ... */ }
function saveProcessedEmails(ids) { /* ... */ }
```

## Scalability Patterns

### 1. Horizontal Scaling Pattern
System designed for easy horizontal scaling:

```
Multiple instances → Shared state (processed_emails.json) → Distributed processing
```

**Considerations:**
- Stateless processing (except for email ID tracking)
- Idempotent operations
- File-based coordination (simple but effective)

### 2. Rate Limiting Pattern
Respects API rate limits:

```javascript
// Gmail API built-in rate limiting
// Slack webhook natural rate limiting
// AI provider timeout management (30s)
```

### 3. Caching Pattern
Minimize redundant operations:

```javascript
// Email ID caching prevents reprocessing
// OAuth token caching with refresh
// No content caching (privacy consideration)
```

## Security Patterns

### 1. Credential Management Pattern
Secure credential handling:

```
Environment Variables → Runtime Configuration → API Clients
(Never in code)         (In-memory only)        (Secure transmission)
```

### 2. Minimal Privilege Pattern
OAuth scopes request only necessary permissions:

```
Gmail API Scope: 'gmail.readonly' (read-only access)
```

### 3. Data Minimization Pattern
Store only necessary data:

```
Email Content: Not stored (processed and discarded)
Email IDs: Stored (for deduplication only)
Credentials: Environment variables only
```

## Testing Patterns

### 1. Integration Testing Pattern
End-to-end testing with external services:

```javascript
// test-slack.js - Real Slack webhook testing
// get-refresh-token.js - Real OAuth flow testing
```

### 2. Mocking Pattern
External dependencies can be mocked for unit testing:

```javascript
// Gmail API responses
// AI provider responses  
// Slack webhook responses
```

### 3. Configuration Testing Pattern
Environment validation and testing:

```javascript
// .env.example provides testing template
// Validation of required environment variables
// Graceful handling of missing configuration
```

## Deployment Patterns

### 1. Environment Promotion Pattern
Configuration moves through environments:

```
Development (.env) → Staging (env vars) → Production (secure env vars)
```

### 2. Blue-Green Deployment Pattern
Stateless design enables simple deployments:

```
New Version Deployment → Health Check → Traffic Switch → Old Version Shutdown
```

### 3. Monitoring Pattern
Built-in logging and error reporting:

```javascript
// Console logging for operations
// Error logging for failures
// Success confirmations for integrations
