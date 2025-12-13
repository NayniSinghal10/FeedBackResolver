#!/usr/bin/env node

import { program } from 'commander';
import FeedbackResolver from '../src/index.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CLI version
const version = '1.2.0';

/**
 * FeedbackResolver CLI Tool
 * All configuration is read from .env file - no config files needed!
 */

program
    .name('feedback-resolver')
    .description('AI-powered email feedback analysis system')
    .version(version);

// Setup command - interactive wizard
program
    .command('setup')
    .description('Interactive setup wizard')
    .option('-f, --force', 'Overwrite existing .env file')
    .option('--template-only', 'Just create .env template without prompts')
    .action(async (options) => {
        console.log('🚀 Setting up FeedbackResolver...\n');
        
        try {
            const envPath = path.join(process.cwd(), '.env');
            const envExamplePath = path.join(__dirname, '..', '.env.example');
            
            // Check if .env already exists
            try {
                await fs.access(envPath);
                if (!options.force) {
                    console.log('⚠️  .env file already exists!');
                    console.log('💡 Use --force to overwrite, or run: feedback-resolver info');
                    process.exit(0);
                }
            } catch {
                // File doesn't exist, continue
            }
            
            // If template-only, just copy the file
            if (options.templateOnly) {
                const envExample = await fs.readFile(envExamplePath, 'utf8');
                await fs.writeFile(envPath, envExample);
                console.log('✅ Created .env template');
                console.log('💡 Edit .env file with: nano .env (or your preferred editor)');
                return;
            }
            
            // Interactive setup
            const inquirer = (await import('inquirer')).default;
            
            console.log('📝 Let\'s configure FeedbackResolver step by step...\n');
            
            const answers = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'aiProvider',
                    message: 'Choose your AI provider:',
                    choices: [
                        { name: 'Azure OpenAI', value: 'azure' },
                        { name: 'Google Vertex AI', value: 'vertex' },
                        { name: 'AWS Bedrock', value: 'bedrock' },
                        { name: 'Anthropic', value: 'anthropic' },
                        { name: 'OpenAI', value: 'openai' }
                    ]
                },
                {
                    type: 'input',
                    name: 'azureKey',
                    message: 'Enter your Azure OpenAI API key:',
                    when: (answers) => answers.aiProvider === 'azure'
                },
                {
                    type: 'input',
                    name: 'azureEndpoint',
                    message: 'Enter your Azure OpenAI endpoint:',
                    default: 'https://your-resource.openai.azure.com',
                    when: (answers) => answers.aiProvider === 'azure'
                },
                {
                    type: 'input',
                    name: 'vertexProject',
                    message: 'Enter your Google Cloud project ID:',
                    when: (answers) => answers.aiProvider === 'vertex'
                },
                {
                    type: 'input',
                    name: 'awsAccessKey',
                    message: 'Enter your AWS Access Key ID:',
                    when: (answers) => answers.aiProvider === 'bedrock'
                },
                {
                    type: 'input',
                    name: 'awsSecretKey',
                    message: 'Enter your AWS Secret Access Key:',
                    when: (answers) => answers.aiProvider === 'bedrock'
                },
                {
                    type: 'input',
                    name: 'awsRegion',
                    message: 'Enter your AWS region:',
                    default: 'us-east-1',
                    when: (answers) => answers.aiProvider === 'bedrock'
                },
                {
                    type: 'input',
                    name: 'anthropicKey',
                    message: 'Enter your Anthropic API key:',
                    when: (answers) => answers.aiProvider === 'anthropic'
                },
                {
                    type: 'input',
                    name: 'openaiKey',
                    message: 'Enter your OpenAI API key:',
                    when: (answers) => answers.aiProvider === 'openai'
                },
                {
                    type: 'input',
                    name: 'userName',
                    message: 'Enter your full name (for personalized email replies):',
                    default: '',
                    validate: (input) => {
                        if (!input || input.trim().length === 0) {
                            return 'Name is required for personalized replies';
                        }
                        return true;
                    }
                },
                {
                    type: 'input',
                    name: 'userDesignation',
                    message: 'Enter your designation/title (e.g., Customer Support Manager):',
                    default: '',
                    validate: (input) => {
                        if (!input || input.trim().length === 0) {
                            return 'Designation is required for personalized replies';
                        }
                        return true;
                    }
                },
                {
                    type: 'input',
                    name: 'googleClientId',
                    message: 'Enter your Google OAuth Client ID:',
                    default: ''
                },
                {
                    type: 'input',
                    name: 'googleClientSecret',
                    message: 'Enter your Google OAuth Client Secret:',
                    default: ''
                },
                {
                    type: 'input',
                    name: 'targetEmail',
                    message: 'Target email to monitor (leave blank for all):',
                    default: ''
                },
                {
                    type: 'input',
                    name: 'daysToSearch',
                    message: 'How many days back to search?',
                    default: '10'
                },
                {
                    type: 'input',
                    name: 'maxResults',
                    message: 'Maximum emails to process per run (recommended: 5-20):',
                    default: '10',
                    validate: (input) => {
                        const num = parseInt(input);
                        if (isNaN(num) || num < 1 || num > 100) {
                            return 'Please enter a number between 1 and 100';
                        }
                        return true;
                    }
                },
                {
                    type: 'confirm',
                    name: 'enableSlack',
                    message: 'Enable Slack notifications?',
                    default: false
                },
                {
                    type: 'input',
                    name: 'slackWebhook',
                    message: 'Enter your Slack webhook URL:',
                    when: (answers) => answers.enableSlack
                },
                {
                    type: 'confirm',
                    name: 'enableAutoReply',
                    message: 'Enable auto-reply feature?',
                    default: false
                }
            ]);
            
            // Build .env content
            let envContent = `# FeedbackResolver Configuration
# Generated by setup wizard on ${new Date().toISOString()}

# =============================================================================
# USER INFORMATION (for personalized email replies)
# =============================================================================
USER_NAME="${answers.userName}"
USER_DESIGNATION="${answers.userDesignation}"

# =============================================================================
# GMAIL OAUTH CREDENTIALS
# =============================================================================
GOOGLE_CLIENT_ID="${answers.googleClientId}"
GOOGLE_CLIENT_SECRET="${answers.googleClientSecret}"

# =============================================================================
# AI PROVIDER CONFIGURATION
# =============================================================================
NEUROLINK_DEFAULT_PROVIDER="${answers.aiProvider}"

`;
            
            // Add provider-specific config
            if (answers.aiProvider === 'azure') {
                envContent += `# Azure OpenAI
AZURE_OPENAI_API_KEY="${answers.azureKey}"
AZURE_OPENAI_ENDPOINT="${answers.azureEndpoint}"

`;
            } else if (answers.aiProvider === 'vertex') {
                envContent += `# Vertex AI
GOOGLE_VERTEX_PROJECT="${answers.vertexProject}"
GOOGLE_VERTEX_LOCATION="us-central1"

`;
            } else if (answers.aiProvider === 'bedrock') {
                envContent += `# AWS Bedrock
AWS_ACCESS_KEY_ID="${answers.awsAccessKey}"
AWS_SECRET_ACCESS_KEY="${answers.awsSecretKey}"
AWS_REGION="${answers.awsRegion}"

`;
            } else if (answers.aiProvider === 'anthropic') {
                envContent += `# Anthropic
ANTHROPIC_API_KEY="${answers.anthropicKey}"

`;
            } else if (answers.aiProvider === 'openai') {
                envContent += `# OpenAI
OPENAI_API_KEY="${answers.openaiKey}"

`;
            }
            
            envContent += `# =============================================================================
# EMAIL PROCESSING
# =============================================================================
FEEDBACK_RESOLVER_MODE="gmail"
TARGET_EMAIL="${answers.targetEmail}"
DAYS_TO_SEARCH="${answers.daysToSearch}"
MAX_RESULTS="20"

# =============================================================================
# SLACK INTEGRATION
# =============================================================================
SLACK_ENABLED="${answers.enableSlack ? 'true' : 'false'}"
${answers.enableSlack ? `SLACK_WEBHOOK_URL="${answers.slackWebhook}"` : '# SLACK_WEBHOOK_URL=""'}

# =============================================================================
# FILE OUTPUT
# =============================================================================
FILE_ENABLED="true"
FILE_OUTPUT_PATH="./feedback-analysis-report.md"

# =============================================================================
# AUTO-REPLY CONFIGURATION
# =============================================================================
AUTO_REPLY_ENABLED="${answers.enableAutoReply ? 'true' : 'false'}"
AUTO_REPLY_REQUIRE_APPROVAL="true"
AUTO_REPLY_CONFIDENCE_THRESHOLD="0.7"
AUTO_REPLY_MAX_PER_RUN="10"
`;
            
            await fs.writeFile(envPath, envContent);
            
            console.log('\n✅ Configuration saved to .env');
            console.log('\n📋 Next steps:');
            console.log('1. Run: feedback-resolver auth (to authenticate with Gmail)');
            console.log('2. Run: feedback-resolver test (to verify connections)');
            console.log('3. Run: feedback-resolver analyze (to start analyzing)');
            
            if (answers.enableAutoReply) {
                console.log('\n💡 Auto-reply is enabled! Use: feedback-resolver analyze --auto-reply');
            }
            
        } catch (error) {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        }
    });

// Authentication command
program
    .command('auth')
    .description('Authenticate with Gmail (opens browser for OAuth)')
    .action(async () => {
        console.log('🔐 Starting Gmail authentication...\n');
        
        try {
            const resolver = FeedbackResolver.fromEnv();
            
            if (resolver.mode !== 'gmail') {
                console.log('⚠️  Authentication is only needed for Gmail mode');
                console.log(`Current mode: ${resolver.mode}`);
                process.exit(0);
            }
            
            await resolver.authenticate();
            console.log('\n✅ Authentication completed successfully!');
            console.log('💡 You can now run: feedback-resolver analyze');
            
        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            console.log('\n💡 Troubleshooting:');
            console.log('1. Check your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
            console.log('2. Ensure Gmail API is enabled in Google Cloud Console');
            console.log('3. Verify redirect URI is set to http://localhost:3000/oauth2callback');
            process.exit(1);
        }
    });

// Analyze command
program
    .command('analyze')
    .description('Analyze feedback emails')
    .option('--auto-reply', 'Enable auto-reply mode (Gmail only)')
    .option('--dry-run', 'Dry run - show what would be sent without sending')
    .option('--no-slack', 'Disable Slack notifications for this run')
    .option('--no-file', 'Disable file output for this run')
    .action(async (options) => {
        console.log('🔍 Starting feedback analysis...\n');
        
        try {
            const resolver = FeedbackResolver.fromEnv();
            
            // Override notification settings if flags provided
            if (options.noSlack) {
                resolver.config.notifications.slack.enabled = false;
            }
            if (options.noFile) {
                resolver.config.notifications.file.enabled = false;
            }
            
            // Authenticate if Gmail mode
            if (resolver.mode === 'gmail') {
                await resolver.authenticate();
            }
            
            // Run analysis with or without auto-reply
            let result;
            if (options.autoReply || resolver.config.autoReply?.enabled) {
                if (resolver.mode !== 'gmail') {
                    console.error('❌ Auto-reply is only available in Gmail mode');
                    process.exit(1);
                }
                
                console.log('🤖 Auto-reply mode enabled\n');
                result = await resolver.analyzeAndReply({ 
                    dryRun: options.dryRun || false 
                });
            } else {
                result = await resolver.analyze();
            }
            
            // Display results
            console.log('\n📊 Analysis Results:');
            console.log(`• Total emails processed: ${result.emails}`);
            console.log(`• Relevant emails found: ${result.analysis.summary.relevantEmails || 0}`);
            
            if (result.analysis.summary.categories) {
                console.log(`• Categories identified: ${result.analysis.summary.categories.length}`);
            }
            
            if (result.analysis.summary.replyableEmails !== undefined) {
                console.log(`• Emails needing replies: ${result.analysis.summary.replyableEmails}`);
            }
            
            if (result.sentReplies && result.sentReplies.length > 0) {
                console.log(`• Replies sent: ${result.sentReplies.length}`);
            }
            
            console.log(`• Timestamp: ${result.timestamp}`);
            console.log('\n✅ Analysis completed successfully!');
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            console.log('\n💡 Troubleshooting:');
            console.log('1. Check your .env file configuration');
            console.log('2. For Gmail mode, ensure you ran: feedback-resolver auth');
            console.log('3. Verify your AI provider credentials are correct');
            process.exit(1);
        }
    });

// Test command
program
    .command('test')
    .description('Test connections and configuration')
    .option('--gmail', 'Test Gmail connection only')
    .option('--slack', 'Test Slack connection only')
    .option('--ai', 'Test AI connection only')
    .action(async (options) => {
        console.log('🧪 Testing connections...\n');
        
        try {
            const resolver = FeedbackResolver.fromEnv();
            const tests = [];
            
            // Gmail test
            if (!options.slack && !options.ai && (resolver.mode === 'gmail' || options.gmail)) {
                console.log('📧 Testing Gmail connection...');
                try {
                    await resolver.authenticate();
                    const gmailTest = await resolver.processor.testConnection();
                    tests.push({ name: 'Gmail', ...gmailTest });
                    console.log(gmailTest.success ? '✅ Gmail: Connected' : `❌ Gmail: ${gmailTest.message}`);
                } catch (error) {
                    tests.push({ name: 'Gmail', success: false, message: error.message });
                    console.log(`❌ Gmail: ${error.message}`);
                }
            }
            
            // Slack test
            if (!options.gmail && !options.ai && (resolver.config.notifications?.slack?.enabled || options.slack)) {
                console.log('📱 Testing Slack connection...');
                const slackNotifier = resolver.notifiers.find(n => n.constructor.name === 'SlackNotifier');
                if (slackNotifier) {
                    const slackTest = await slackNotifier.testConnection();
                    tests.push({ name: 'Slack', ...slackTest });
                    console.log(slackTest.success ? '✅ Slack: Connected' : `❌ Slack: ${slackTest.message}`);
                } else {
                    console.log('⚠️  Slack not enabled in configuration');
                }
            }
            
            // AI test
            if (!options.gmail && !options.slack) {
                console.log('🤖 Testing AI connection...');
                const aiTest = await resolver.analyzer.testConnection();
                tests.push({ name: 'AI', ...aiTest });
                console.log(aiTest.success ? '✅ AI: Connected' : `❌ AI: ${aiTest.message}`);
            }
            
            // Summary
            console.log('\n📋 Test Summary:');
            const passed = tests.filter(t => t.success).length;
            console.log(`${passed}/${tests.length} tests passed`);
            
            if (passed < tests.length) {
                console.log('\n💡 Check your .env file configuration for failed tests');
                process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            process.exit(1);
        }
    });

// Serve command for continuous monitoring
program
    .command('serve')
    .description('Start continuous feedback monitoring')
    .option('-i, --interval <minutes>', 'Check interval in minutes', '30')
    .action(async (options) => {
        console.log('🔄 Starting continuous feedback monitoring...\n');
        
        try {
            const resolver = FeedbackResolver.fromEnv();
            const interval = parseInt(options.interval) * 60 * 1000;
            
            // Initial authentication for Gmail
            if (resolver.mode === 'gmail') {
                await resolver.authenticate();
            }
            
            console.log(`📊 Monitoring every ${options.interval} minutes`);
            console.log('Press Ctrl+C to stop\n');
            
            // Analysis function
            const runAnalysis = async () => {
                const timestamp = new Date().toLocaleTimeString();
                console.log(`[${timestamp}] 🔍 Running analysis...`);
                
                try {
                    let result;
                    if (resolver.config.autoReply?.enabled) {
                        result = await resolver.analyzeAndReply();
                        const repliesInfo = result.sentReplies ? `, sent ${result.sentReplies.length} replies` : '';
                        console.log(`[${timestamp}] ✅ Processed ${result.emails} emails, found ${result.analysis.summary.relevantEmails} relevant${repliesInfo}`);
                    } else {
                        result = await resolver.analyze();
                        console.log(`[${timestamp}] ✅ Processed ${result.emails} emails, found ${result.analysis.summary.relevantEmails} relevant`);
                    }
                } catch (error) {
                    console.log(`[${timestamp}] ❌ Analysis failed: ${error.message}`);
                }
            };
            
            // Initial run
            await runAnalysis();
            
            // Set up interval
            const intervalId = setInterval(runAnalysis, interval);
            
            // Handle graceful shutdown
            process.on('SIGINT', () => {
                console.log('\n🛑 Stopping monitoring...');
                clearInterval(intervalId);
                process.exit(0);
            });
            
        } catch (error) {
            console.error('❌ Failed to start monitoring:', error.message);
            process.exit(1);
        }
    });

// Info command - show current configuration
program
    .command('info')
    .description('Show current configuration from .env')
    .action(async () => {
        console.log('📋 Current Configuration:\n');
        
        try {
            const resolver = FeedbackResolver.fromEnv();
            
            console.log(`Mode: ${resolver.mode}`);
            console.log(`AI Provider: ${resolver.config.ai.provider}`);
            
            if (resolver.mode === 'gmail') {
                console.log(`Gmail Target: ${resolver.config.gmail.targetEmail || 'All emails'}`);
                console.log(`Days to Search: ${resolver.config.gmail.daysToSearch}`);
                console.log(`Max Results: ${resolver.config.gmail.maxResults}`);
            }
            
            console.log(`\nNotifications:`);
            console.log(`  Slack: ${resolver.config.notifications.slack.enabled ? '✅ Enabled' : '❌ Disabled'}`);
            console.log(`  File: ${resolver.config.notifications.file.enabled ? '✅ Enabled' : '❌ Disabled'}`);
            
            if (resolver.config.autoReply) {
                console.log(`\nAuto-Reply:`);
                console.log(`  Enabled: ${resolver.config.autoReply.enabled ? '✅ Yes' : '❌ No'}`);
                if (resolver.config.autoReply.enabled) {
                    console.log(`  Require Approval: ${resolver.config.autoReply.requireApproval ? 'Yes' : 'No'}`);
                    console.log(`  Confidence Threshold: ${resolver.config.autoReply.confidenceThreshold}`);
                    console.log(`  Max Per Run: ${resolver.config.autoReply.maxRepliesPerRun}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to load configuration:', error.message);
            console.log('\n💡 Make sure you have a .env file configured');
            console.log('Run: feedback-resolver setup');
            process.exit(1);
        }
    });

// Parse and execute
program.parse();
