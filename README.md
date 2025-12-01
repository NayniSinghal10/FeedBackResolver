# FeedbackResolver

[![npm version](https://badge.fury.io/js/feedback-resolver.svg)](https://badge.fury.io/js/feedback-resolver)
[![Node.js CI](https://github.com/NayniSinghal10/FeedBackResolver/workflows/Node.js%20CI/badge.svg)](https://github.com/NayniSinghal10/FeedBackResolver/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AI-powered email feedback analysis system with automated OAuth and multi-mode support. Transform your customer feedback emails into actionable insights with intelligent categorization and automated notifications.

## ✨ Features

- **🤖 AI-Powered Analysis**: Intelligent email triage and categorization using NeuroLink
- **📧 Gmail Integration**: Automated OAuth flow with no manual token management
- **✉️ Auto-Reply System**: AI-generated contextual email responses with approval workflow
- **📱 Slack Notifications**: Real-time feedback reports delivered to your team
- **🌐 Multi-Provider AI**: Support for Vertex AI, Azure OpenAI, AWS Bedrock, Anthropic, OpenAI
- **📁 Multi-Mode Support**: Process Gmail, files, or direct text input
- **🔧 Simple CLI**: No config files needed - everything in `.env`
- **🎯 Event-Driven**: Extensible event system for custom integrations

## 📦 Installation

```bash
# Install globally for CLI usage
npm install -g feedback-resolver

# Or install locally in your project
npm install feedback-resolver
```

## 🚀 Quick Start

### Command Line Interface

```bash
# 1. Interactive setup wizard (recommended)
feedback-resolver setup

# The wizard will ask you:
# - Which AI provider to use
# - Your API keys and credentials
# - Gmail OAuth settings
# - Slack webhook (optional)
# - Auto-reply preferences

# 2. Authenticate with Gmail (automated OAuth)
feedback-resolver auth

# 3. Test connections
feedback-resolver test

# 4. Analyze feedback
feedback-resolver analyze

# 5. (Optional) Enable auto-reply
feedback-resolver analyze --auto-reply
```

### Alternative: Manual Setup

```bash
# Create .env template without prompts
feedback-resolver setup --template-only

# Edit .env with your preferred editor
nano .env  # or vim, code, etc.

# Then continue with auth and analyze
feedback-resolver auth
feedback-resolver analyze
```

### Programmatic Usage

```javascript
import FeedbackResolver from 'feedback-resolver';

// Initialize with configuration
const resolver = new FeedbackResolver({
    mode: 'gmail',
    config: {
        gmail: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            targetEmail: 'support@yourcompany.com'
        },
        ai: {
            provider: 'vertex'
        },
        notifications: {
            slack: {
                enabled: true,
                webhookUrl: process.env.SLACK_WEBHOOK_URL
            }
        }
    }
});

// Authenticate and analyze
await resolver.authenticate();
const result = await resolver.analyze();
```

## 🔧 Configuration

### Interactive Setup (Recommended)

The easiest way to get started:

```bash
feedback-resolver setup
```

This launches an interactive wizard that asks for:
- ✅ AI provider choice (Azure, Vertex, Bedrock, Anthropic, OpenAI)
- ✅ Provider-specific credentials
- ✅ Gmail OAuth credentials
- ✅ Email processing preferences
- ✅ Slack integration (optional)
- ✅ Auto-reply settings (optional)

No manual file editing required!

### Manual Setup (Advanced)

For users who prefer editing files directly:

```bash
# Create .env template
feedback-resolver setup --template-only

# Edit with your preferred editor
nano .env  # or vim, code, emacs, etc.
```

### Environment Variables

```env
# Gmail OAuth Credentials (Required for Gmail mode)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Provider - Choose ONE: vertex, azure, bedrock, anthropic, openai
NEUROLINK_DEFAULT_PROVIDER="azure"

# Azure OpenAI (if using azure)
AZURE_OPENAI_API_KEY="your-azure-key"
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"

# Vertex AI (if using vertex)
# GOOGLE_VERTEX_PROJECT="your-project-id"
# GOOGLE_VERTEX_LOCATION="us-central1"

# AWS Bedrock (if using bedrock)
# AWS_ACCESS_KEY_ID="your-access-key"
# AWS_SECRET_ACCESS_KEY="your-secret-key"
# AWS_REGION="us-east-1"

# Anthropic (if using anthropic)
# ANTHROPIC_API_KEY="your-api-key"

# OpenAI (if using openai)
# OPENAI_API_KEY="your-api-key"

# Email Processing
TARGET_EMAIL="support@yourcompany.com"
DAYS_TO_SEARCH="10"
MAX_RESULTS="20"

# Slack Integration
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
SLACK_ENABLED="true"

# Auto-Reply (Optional - Gmail only)
AUTO_REPLY_ENABLED="false"
AUTO_REPLY_REQUIRE_APPROVAL="true"
AUTO_REPLY_CONFIDENCE_THRESHOLD="0.7"
AUTO_REPLY_MAX_PER_RUN="10"
```

## 🎯 Usage Examples

### 1. Gmail Integration with Slack

```javascript
import FeedbackResolver from 'feedback-resolver';

const resolver = new FeedbackResolver({
    mode: 'gmail',
    config: {
        gmail: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            targetEmail: 'feedback@yourcompany.com'
        },
        ai: { provider: 'vertex' },
        notifications: {
            slack: {
                enabled: true,
                webhookUrl: process.env.SLACK_WEBHOOK_URL
            }
        }
    }
});

// Automated OAuth flow - no manual token management!
await resolver.authenticate();

// Analyze and get results
const result = await resolver.analyze();
console.log(`Processed ${result.emails} emails`);
```

### 2. File Processing

```javascript
const resolver = new FeedbackResolver({
    mode: 'file',
    config: {
        file: { path: './customer-feedback.txt' },
        ai: { provider: 'vertex' }
    }
});

const result = await resolver.analyze();
```

### 3. Direct Text Analysis

```javascript
const resolver = new FeedbackResolver({
    mode: 'file',
    config: { ai: { provider: 'vertex' } }
});

const feedback = `
From: customer@example.com
Subject: Feature Request

We would love to see dark mode support in your application.
This would greatly improve the user experience for night-time usage.
`;

const result = await resolver.analyze(feedback);
```

### 4. Event Listeners

```javascript
const resolver = new FeedbackResolver(config);

resolver.on('authenticationCompleted', () => {
    console.log('✅ Successfully authenticated');
});

resolver.on('emailsProcessed', (data) => {
    console.log(`📧 Processed ${data.count} emails`);
});

resolver.on('analysisCompleted', (data) => {
    console.log(`🔍 Found ${data.analysis.summary.relevantEmails} relevant emails`);
});

await resolver.authenticate();
await resolver.analyze();
```

### 5. Continuous Monitoring

```javascript
// Set up continuous monitoring
setInterval(async () => {
    try {
        const result = await resolver.analyze();
        console.log(`[${new Date().toISOString()}] Processed ${result.emails} emails`);
    } catch (error) {
        console.error('Analysis failed:', error.message);
    }
}, 30 * 60 * 1000); // Every 30 minutes
```

## 🔌 API Reference

### FeedbackResolver Class

#### Constructor

```javascript
new FeedbackResolver(options)
```

**Parameters:**
- `options.mode` - Processing mode: `'gmail'`, `'file'`, or `'test'`
- `options.config` - Configuration object

#### Static Methods

```javascript
// Create from environment variables
const resolver = FeedbackResolver.fromEnv();

// Create from config file
const resolver = await FeedbackResolver.fromConfig('./config.json');

// Interactive setup wizard
const resolver = await FeedbackResolver.setupWizard();
```

#### Instance Methods

```javascript
// Authenticate (for Gmail mode)
await resolver.authenticate();

// Analyze feedback
const result = await resolver.analyze(input?);

// Batch processing
const results = await resolver.analyzeBatch(sources);

// Add custom plugin
resolver.use(customPlugin);
```

#### Events

- `authenticationStarted` - OAuth flow begins
- `authenticationCompleted` - OAuth flow completed
- `authenticationFailed` - OAuth flow failed
- `analysisStarted` - Analysis begins
- `emailsProcessed` - Emails fetched and processed
- `analysisCompleted` - AI analysis completed
- `notificationsSent` - Notifications delivered
- `processComplete` - Entire process finished
- `analysisError` - Error during analysis

### Configuration Options

#### Gmail Configuration

```javascript
gmail: {
    clientId: string,           // Required: Google OAuth client ID
    clientSecret: string,       // Required: Google OAuth client secret
    targetEmail?: string,       // Optional: Specific email to monitor
    daysToSearch?: number,      // Optional: Days to search (default: 10)
    maxResults?: number,        // Optional: Max emails per run (default: 20)
    port?: number              // Optional: OAuth callback port (default: 3000)
}
```

#### AI Configuration

```javascript
ai: {
    provider: string,          // Required: 'vertex', 'azure', 'bedrock', 'anthropic', 'openai'
    model?: string,           // Optional: Specific model name
    timeout?: string          // Optional: Timeout (default: '30000s')
}
```

#### Auto-Reply Configuration

```javascript
autoReply: {
    enabled: boolean,              // Enable auto-reply feature
    requireApproval: boolean,      // Require user approval before sending
    confidenceThreshold: number,   // Min confidence for auto-approval (0.0-1.0)
    maxRepliesPerRun: number      // Safety limit per execution
}
```

#### Notifications Configuration

```javascript
notifications: {
    slack?: {
        enabled: boolean,      // Enable Slack notifications
        webhookUrl: string,    // Slack webhook URL
        channel?: string,      // Optional: Override channel
        username?: string      // Optional: Bot username
    },
    file?: {
        enabled: boolean,      // Enable file output
        path: string,         // Output file path
        format?: string       // 'markdown' or 'json'
    }
}
```

## 🛠️ CLI Commands

All commands read configuration from `.env` file - no config files needed!

### Setup & Authentication

```bash
# Create .env file from template
feedback-resolver setup
  -f, --force          Overwrite existing .env

# Authenticate with Gmail (opens browser)
feedback-resolver auth
```

### Analysis Commands

```bash
# Analyze feedback emails
feedback-resolver analyze
  --auto-reply         Enable auto-reply mode
  --dry-run           Show what would be sent (no actual sending)
  --no-slack          Disable Slack for this run
  --no-file           Disable file output for this run

# Examples:
feedback-resolver analyze                    # Basic analysis
feedback-resolver analyze --auto-reply       # With auto-reply (interactive)
feedback-resolver analyze --auto-reply --dry-run  # Preview replies
```

### Testing & Monitoring

```bash
# Test connections
feedback-resolver test
  --gmail             Test Gmail only
  --slack             Test Slack only
  --ai                Test AI only

# Continuous monitoring
feedback-resolver serve
  -i, --interval <min>  Check interval in minutes (default: 30)

# Show current configuration
feedback-resolver info
```

## 🔍 How It Works

### Standard Analysis Flow

1. **Email Fetching**: Connects to Gmail using OAuth2 and fetches unread emails based on your criteria
2. **AI Triage**: Each email is analyzed by AI to determine business relevance
3. **Consolidation**: Relevant emails are batch-analyzed and categorized into business areas:
   - Technical Queries & Issues
   - Feature & Implementation Requests
   - Service & Billing Changes
   - Meeting & Scheduling Requests
   - General Inquiries & Communications
4. **Delivery**: Results are delivered via Slack notifications and saved as markdown reports

### Auto-Reply Flow (Optional)

When auto-reply is enabled (`--auto-reply` flag or `AUTO_REPLY_ENABLED=true`):

1. **Email Analysis**: Same as standard flow, plus AI identifies which emails need replies
2. **Reply Generation**: AI generates contextual, professional responses for each replyable email
3. **Confidence Scoring**: Each reply gets a confidence score (0.0-1.0) based on AI's certainty
4. **Approval Workflow**:
   - **Interactive Mode** (`AUTO_REPLY_REQUIRE_APPROVAL=true`): You review and approve each reply
   - **Auto Mode** (`AUTO_REPLY_REQUIRE_APPROVAL=false`): Replies above confidence threshold are sent automatically
5. **Sending**: Approved replies are sent via Gmail API with proper threading
6. **Reporting**: Sent replies are included in Slack notifications and markdown reports

**Safety Features:**
- Dry-run mode to preview without sending (`--dry-run`)
- Maximum replies per run limit (`AUTO_REPLY_MAX_PER_RUN`)
- Confidence threshold for auto-approval (`AUTO_REPLY_CONFIDENCE_THRESHOLD`)
- Full audit trail in reports

## 🚧 Setup Guide

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add `http://localhost:3000/oauth2callback` as authorized redirect URI

### 2. AI Provider Setup

Choose ONE AI provider and configure it:

**For Vertex AI (Google Cloud):**
```bash
# Install Google Cloud SDK
gcloud auth application-default login
gcloud config set project YOUR-PROJECT-ID

# Set in .env:
NEUROLINK_DEFAULT_PROVIDER="vertex"
GOOGLE_VERTEX_PROJECT="your-project-id"
GOOGLE_VERTEX_LOCATION="us-central1"
```

**For Azure OpenAI:**
```bash
# Get credentials from Azure Portal
# Set in .env:
NEUROLINK_DEFAULT_PROVIDER="azure"
AZURE_OPENAI_API_KEY="your-key"
AZURE_OPENAI_ENDPOINT="https://your-resource.openai.azure.com"
```

**For AWS Bedrock:**
```bash
# Configure AWS credentials
aws configure

# Set in .env:
NEUROLINK_DEFAULT_PROVIDER="bedrock"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_REGION="us-east-1"
```

**For Anthropic:**
```bash
# Get API key from console.anthropic.com
# Set in .env:
NEUROLINK_DEFAULT_PROVIDER="anthropic"
ANTHROPIC_API_KEY="your-key"
```

**For OpenAI:**
```bash
# Get API key from platform.openai.com
# Set in .env:
NEUROLINK_DEFAULT_PROVIDER="openai"
OPENAI_API_KEY="your-key"
```

### 3. Slack Setup

1. Create a Slack app in your workspace
2. Add incoming webhooks
3. Copy the webhook URL to your configuration

### 4. Installation & Configuration

```bash
# Install globally
npm install -g feedback-resolver

# Create .env file
feedback-resolver setup

# Edit .env with your credentials
nano .env

# Authenticate with Gmail
feedback-resolver auth

# Test all connections
feedback-resolver test

# Run analysis
feedback-resolver analyze

# (Optional) Enable auto-reply
feedback-resolver analyze --auto-reply
```

## 🧪 Testing

```bash
# Run test suite
npm test

# Run integration test
npm run integration-test

# Run examples
npm run example

# Test specific connections
feedback-resolver test --gmail
feedback-resolver test --slack
feedback-resolver test --ai

# Show current configuration
feedback-resolver info
```

## 🔧 Troubleshooting

### Common Issues

#### "Configuration file not found"
**Solution:** The CLI now uses `.env` files only. Run `feedback-resolver setup` to create one.

#### "Authentication failed"
**Possible causes:**
- Incorrect `GOOGLE_CLIENT_ID` or `GOOGLE_CLIENT_SECRET` in `.env`
- Gmail API not enabled in Google Cloud Console
- Redirect URI not set to `http://localhost:3000/oauth2callback`

**Solution:**
```bash
# Verify your .env settings
feedback-resolver info

# Re-authenticate
feedback-resolver auth
```

#### "AI provider validation failed"
**Possible causes:**
- Missing API keys for selected provider
- Incorrect provider name in `NEUROLINK_DEFAULT_PROVIDER`

**Solution:**
```bash
# Check which provider is configured
feedback-resolver info

# Verify you have the correct environment variables:
# - Azure: AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT
# - Vertex: GOOGLE_VERTEX_PROJECT
# - Bedrock: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
# - Anthropic: ANTHROPIC_API_KEY
# - OpenAI: OPENAI_API_KEY
```

#### "No emails found"
**Possible causes:**
- No unread emails in the specified time range
- `TARGET_EMAIL` filter too restrictive
- `DAYS_TO_SEARCH` too short

**Solution:**
```bash
# Check your email settings in .env
DAYS_TO_SEARCH="30"  # Increase search range
TARGET_EMAIL=""      # Remove filter to search all emails
```

#### "Slack notification failed"
**Possible causes:**
- Invalid `SLACK_WEBHOOK_URL`
- Slack app not properly configured

**Solution:**
```bash
# Test Slack connection
feedback-resolver test --slack

# Verify webhook URL in .env
# Get a new webhook from: https://api.slack.com/apps
```

#### "Auto-reply not working"
**Possible causes:**
- `AUTO_REPLY_ENABLED` not set to `true`
- Gmail API missing send permission
- Not running in Gmail mode

**Solution:**
```bash
# Check configuration
feedback-resolver info

# Ensure .env has:
AUTO_REPLY_ENABLED="true"
FEEDBACK_RESOLVER_MODE="gmail"

# Re-authenticate to get send permission
feedback-resolver auth
```

### Debug Mode

Enable detailed logging:
```bash
# Set in .env
DEBUG="feedback-resolver:*"
LOG_LEVEL="debug"
```

### Getting Help

1. Check the [documentation](https://github.com/NayniSinghal10/FeedBackResolver/wiki)
2. Search [existing issues](https://github.com/NayniSinghal10/FeedBackResolver/issues)
3. Create a [new issue](https://github.com/NayniSinghal10/FeedBackResolver/issues/new) with:
   - Your `.env` configuration (remove sensitive values!)
   - Error messages
   - Steps to reproduce

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](https://github.com/NayniSinghal10/FeedBackResolver/wiki)
- 🐛 [Issues](https://github.com/NayniSinghal10/FeedBackResolver/issues)
- 💬 [Discussions](https://github.com/NayniSinghal10/FeedBackResolver/discussions)

## 🎉 Acknowledgments

- **NeuroLink**: AI provider abstraction layer
- **Google APIs**: Gmail integration
- **Slack API**: Team notifications
- **Commander.js**: CLI framework

---

**Made with ❤️ by [Nayni Singhal](https://github.com/NayniSinghal10)**
