# FeedbackResolver

[![npm version](https://badge.fury.io/js/feedback-resolver.svg)](https://badge.fury.io/js/feedback-resolver)
[![Node.js CI](https://github.com/NayniSinghal10/FeedBackResolver/workflows/Node.js%20CI/badge.svg)](https://github.com/NayniSinghal10/FeedBackResolver/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AI-powered email feedback analysis system with automated OAuth and multi-mode support. Transform your customer feedback emails into actionable insights with intelligent categorization and automated notifications.

## ✨ Features

- **🤖 AI-Powered Analysis**: Intelligent email triage and categorization using NeuroLink
- **📧 Gmail Integration**: Automated OAuth flow with no manual token management
- **📱 Slack Notifications**: Real-time feedback reports delivered to your team
- **📁 Multi-Mode Support**: Process Gmail, files, or direct text input
- **🔧 CLI Tools**: Command-line interface for easy automation
- **🎯 Event-Driven**: Extensible event system for custom integrations
- **⚙️ Configurable**: Flexible configuration with environment support

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
# Initialize with guided setup
feedback-resolver init

# Authenticate with Gmail (automated OAuth)
feedback-resolver auth

# Analyze feedback
feedback-resolver analyze

# Test connections
feedback-resolver test
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

### Environment Variables

Create a `.env` file with your configuration:

```env
# Gmail OAuth Credentials
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Provider Configuration
NEUROLINK_DEFAULT_PROVIDER="vertex"
GOOGLE_VERTEX_PROJECT="your-vertex-project"

# Email Processing
TARGET_EMAIL="support@yourcompany.com"
DAYS_TO_SEARCH="10"
MAX_RESULTS="20"

# Slack Integration
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
SLACK_ENABLED="true"
```

### Configuration File

```json
{
  "mode": "gmail",
  "config": {
    "gmail": {
      "clientId": "your-client-id",
      "clientSecret": "your-client-secret",
      "targetEmail": "support@example.com",
      "daysToSearch": 10,
      "maxResults": 20
    },
    "ai": {
      "provider": "vertex",
      "timeout": "30000s"
    },
    "notifications": {
      "slack": {
        "enabled": true,
        "webhookUrl": "your-slack-webhook"
      },
      "file": {
        "enabled": true,
        "path": "./feedback-analysis-report.md"
      }
    }
  }
}
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
    provider: string,          // Required: 'vertex', 'anthropic', 'openai'
    model?: string,           // Optional: Specific model name
    timeout?: string          // Optional: Timeout (default: '30000s')
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

### Global Commands

```bash
# Initialize new configuration
feedback-resolver init [options]
  -m, --mode <mode>     Mode: gmail, file, or test
  -o, --output <file>   Output configuration file

# Authenticate with services
feedback-resolver auth [options]
  -c, --config <file>   Configuration file

# Analyze feedback
feedback-resolver analyze [options]
  -c, --config <file>   Configuration file
  -i, --input <text>    Direct text input
  --no-slack           Disable Slack notifications
  --no-file           Disable file output

# Test connections
feedback-resolver test [options]
  -c, --config <file>   Configuration file
  --gmail             Test Gmail only
  --slack             Test Slack only
  --ai               Test AI only

# Continuous monitoring
feedback-resolver serve [options]
  -c, --config <file>   Configuration file
  -i, --interval <min>  Check interval in minutes

# Configuration management
feedback-resolver config [options]
  --template <mode>    Generate configuration template
  --validate <file>    Validate configuration file
  --show <file>       Show current configuration
```

## 🔍 How It Works

1. **Email Fetching**: Connects to Gmail using OAuth2 and fetches unread emails based on your criteria
2. **AI Triage**: Each email is analyzed by AI to determine business relevance
3. **Consolidation**: Relevant emails are batch-analyzed and categorized into business areas:
   - Technical Queries & Issues
   - Feature & Implementation Requests
   - Service & Billing Changes
   - Meeting & Scheduling Requests
   - General Inquiries & Communications
4. **Delivery**: Results are delivered via Slack notifications and saved as markdown reports

## 🚧 Setup Guide

### 1. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add `http://localhost:3000/oauth2callback` as authorized redirect URI

### 2. AI Provider Setup

**For Vertex AI:**
```bash
# Install Google Cloud SDK
gcloud auth application-default login
gcloud config set project YOUR-PROJECT-ID
```

**For other providers:**
- Set appropriate API keys in environment variables

### 3. Slack Setup

1. Create a Slack app in your workspace
2. Add incoming webhooks
3. Copy the webhook URL to your configuration

### 4. Installation & Configuration

```bash
# Install globally
npm install -g feedback-resolver

# Run setup wizard
feedback-resolver init

# Authenticate
feedback-resolver auth

# Test connections
feedback-resolver test

# Run analysis
feedback-resolver analyze
```

## 🧪 Testing

```bash
# Run test suite
npm test

# Run examples
npm run example

# Test specific connections
feedback-resolver test --gmail
feedback-resolver test --slack
feedback-resolver test --ai
```

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
