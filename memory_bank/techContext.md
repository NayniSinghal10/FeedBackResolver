# Technical Context - FeedBackResolver

## Technology Stack

### Core Technologies
- **Runtime**: Node.js v18.20.8+ (ES Modules)
- **Package Manager**: npm/pnpm (dual support)
- **Language**: JavaScript (ES6+ with import/export modules)
- **Authentication**: OAuth2 (Google Cloud)
- **AI Engine**: NeuroLink (@juspay/neurolink v6.1.0) with Vertex AI
- **HTTP Client**: Axios for Slack webhook communication

### Key Dependencies
```json
{
  "dependencies": {
    "@juspay/neurolink": "6.1.0",
    "googleapis": "152.0.0", 
    "dotenv": "17.2.1",
    "axios": "^1.x",
    "open": "10.2.0",
    "inquirer": "12.8.2"
  }
}
```

## Project Structure

### Dual-Version Architecture
```
FeedBackResolver/
├── text-file-version/          # Standalone file-based version
│   ├── index.js               # Main analysis engine
│   ├── feedback.txt           # Sample feedback input
│   ├── .env                   # Environment configuration
│   └── package.json           # Dependencies
├── gmail-api-version/         # Production Gmail integration
│   ├── index.js               # Main application with Gmail + Slack
│   ├── slack-notifier.js      # Slack integration module
│   ├── get-refresh-token.js   # OAuth2 token generation utility
│   ├── test-slack.js          # Slack connection testing
│   ├── .env                   # Production environment variables
│   ├── .env.example           # Environment template
│   ├── package.json           # Production dependencies
│   ├── processed_emails.json  # Email tracking (auto-generated)
│   └── analysis_report.md     # Generated reports (auto-generated)
└── memory_bank/               # Project documentation
    ├── projectbrief.md        # High-level project overview
    ├── techContext.md         # Technical implementation (this file)
    ├── systemPatterns.md      # Architecture patterns
    ├── productContext.md      # Business context
    ├── activeContext.md       # Current development state
    └── progress.md            # Development timeline
```

## Core Modules & Components

### 1. Gmail Integration (`gmail-api-version/`)

#### OAuth2 Authentication Flow
- **Setup**: Google Cloud Console project with Gmail API enabled
- **Credentials**: Client ID, Client Secret, Redirect URI
- **Token Management**: Refresh token for long-term access
- **Scopes**: `https://www.googleapis.com/auth/gmail.readonly`

#### Email Processing Pipeline
1. **Fetch**: Query unread emails with date filters
2. **Filter**: Remove previously processed emails (tracked in processed_emails.json)
3. **Parse**: Extract headers (From, Subject) and body content
4. **Triage**: AI-powered relevance detection
5. **Analyze**: Consolidated AI analysis for relevant emails

### 2. AI Analysis Engine (NeuroLink Integration)

#### Provider Configuration
- **Primary**: Google Vertex AI
- **Model**: claude-sonnet-4@20250514
- **Fallback**: Configurable through NEUROLINK_DEFAULT_PROVIDER
- **Timeout**: 30000s per request

#### Two-Stage AI Processing
1. **Email Triage**: Individual email relevance classification
   ```javascript
   // Expected output format:
   {
     "isRelevant": boolean,
     "cleanedMessage": string
   }
   ```

2. **Consolidated Analysis**: Batch processing of relevant emails
   - Categorizes into 5 business-relevant sections
   - Generates structured Markdown report
   - Preserves sender attribution

### 3. Slack Integration (`slack-notifier.js`)

#### Webhook-Based Architecture
- **Method**: HTTP POST to Slack webhook URL
- **Format**: JSON payload with formatted text
- **Features**:
  - Emoji-enhanced formatting
  - Structured categorization display
  - Smart "no emails" handling
  - Connection testing capability

#### Message Structure
```javascript
{
  text: "🔔 *Feedback Analysis Report*\n📅 [timestamp]\n📊 *Summary*: X emails processed\n[categorized content]"
}
```

### 4. Configuration Management

#### Environment Variables (.env)
```bash
# Google OAuth2 Credentials
GOOGLE_CLIENT_ID="[client-id]"
GOOGLE_CLIENT_SECRET="[client-secret]" 
GMAIL_REFRESH_TOKEN="[refresh-token]"

# Google Vertex AI
GOOGLE_VERTEX_PROJECT="[project-id]"
GOOGLE_APPLICATION_CREDENTIALS="[path-to-service-account]"
GOOGLE_VERTEX_LOCATION="[vertex-region]"
NEUROLINK_DEFAULT_MODEL="claude-sonnet-4@20250514"
NEUROLINK_DEFAULT_PROVIDER="vertex"

# Email Processing
TARGET_EMAIL="[target-email-address]"
DAYS_TO_SEARCH="10"
MAX_RESULTS="20"

# Slack Integration  
SLACK_WEBHOOK_URL="[slack-webhook-url]"
SLACK_ENABLED="true"
```

## Data Flow Architecture

### Input Processing
1. **Gmail Query**: `is:unread to:{TARGET_EMAIL} newer_than:{DAYS}d`
2. **Email Extraction**: Headers + plain-text body content
3. **Deduplication**: Skip previously processed email IDs

### AI Processing Chain
1. **Individual Triage**: Each email → Relevance classification
2. **Batch Consolidation**: Relevant emails → Categorized analysis
3. **Report Generation**: Analysis → Structured Markdown

### Output Distribution
1. **File System**: analysis_report.md (backup)
2. **Slack Webhook**: Formatted team notification
3. **State Tracking**: processed_emails.json (persistence)

## Error Handling & Resilience

### Gmail API Error Handling
- **OAuth Errors**: Automatic token refresh
- **Rate Limiting**: Built-in Gmail API rate limiting
- **Network Issues**: Graceful degradation with error reporting

### AI Processing Error Handling
- **Malformed Responses**: JSON parsing with fallback
- **Provider Failures**: Error logging with continuation
- **Timeout Management**: 30-second timeout per AI request

### Slack Integration Error Handling
- **Webhook Failures**: Non-blocking error logging
- **Connectivity Issues**: Graceful degradation (analysis continues)
- **Configuration Errors**: Clear error messaging

## Performance Characteristics

### Scalability Metrics
- **Email Volume**: Optimized for 1-100 emails per run
- **Processing Time**: ~2-3 seconds per email (AI analysis)
- **Memory Usage**: Minimal (stateless processing)
- **Storage**: Lightweight JSON tracking files

### Optimization Features
- **Incremental Processing**: Only analyze new emails
- **Batch AI Calls**: Consolidated analysis for efficiency
- **Async Operations**: Non-blocking I/O throughout pipeline

## Security Considerations

### Credential Management
- **Environment Variables**: All sensitive data in .env
- **OAuth2 Tokens**: Refresh tokens with automatic renewal
- **API Keys**: Vertex AI credentials via service account

### Data Privacy
- **No Data Persistence**: Email content not stored locally
- **Minimal Tracking**: Only email IDs for deduplication
- **Secure Transmission**: HTTPS for all API communications

## Development & Testing

### Testing Infrastructure
- **Slack Testing**: Dedicated test-slack.js utility
- **OAuth Testing**: get-refresh-token.js for credential setup
- **Environment Validation**: .env.example templates

### Development Workflow
- **Branch Strategy**: Feature branches for major changes
- **Version Control**: Git with meaningful commit messages
- **Environment Separation**: Development vs production .env files
