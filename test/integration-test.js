#!/usr/bin/env node

/**
 * FeedbackResolver Integration Test
 * 
 * This test uses real Gmail credentials and Slack webhook to test the complete
 * end-to-end functionality including:
 * - OAuth authentication with Gmail
 * - Fetching real emails 
 * - AI analysis with Azure OpenAI
 * - Slack notifications
 * - File report generation
 */

import FeedbackResolver from '../src/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Integration Test Configuration
 */
const testConfig = {
    mode: 'gmail',
    config: {
        gmail: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            targetEmail: process.env.TARGET_EMAIL,
            daysToSearch: parseInt(process.env.DAYS_TO_SEARCH) || 7,
            maxResults: parseInt(process.env.MAX_RESULTS) || 10,
            port: 3000
        },
        ai: {
            provider: process.env.NEUROLINK_DEFAULT_PROVIDER || 'azure',
            model: process.env.NEUROLINK_DEFAULT_MODEL,
            timeout: '45000s'
        },
        autoReply: {
            enabled: process.env.AUTO_REPLY_ENABLED === 'true',
            requireApproval: process.env.AUTO_REPLY_REQUIRE_APPROVAL !== 'false',
            confidenceThreshold: parseFloat(process.env.AUTO_REPLY_CONFIDENCE_THRESHOLD) || 0.7,
            maxRepliesPerRun: parseInt(process.env.AUTO_REPLY_MAX_PER_RUN) || 10
        },
        notifications: {
            slack: {
                enabled: process.env.SLACK_ENABLED === 'true',
                webhookUrl: process.env.SLACK_WEBHOOK_URL,
                channel: '#general', // Optional: override channel
                username: 'FeedbackResolver Bot' // Optional: bot name
            },
            file: {
                enabled: true,
                path: process.env.FILE_OUTPUT_PATH || './integration-test-report.md'
            }
        }
    }
};

/**
 * Test Results Tracking
 */
const testResults = {
    steps: [],
    startTime: new Date(),
    errors: [],
    emailsProcessed: 0,
    relevantEmails: 0,
    replyableEmails: 0,
    repliesSent: 0,
    notificationsSent: 0
};

/**
 * Log test step
 */
function logStep(step, status = 'info', details = null) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, step, status, details };
    testResults.steps.push(logEntry);
    
    const statusEmoji = {
        'info': '🔍',
        'success': '✅',
        'error': '❌',
        'warning': '⚠️'
    };
    
    console.log(`${statusEmoji[status]} [${timestamp}] ${step}`);
    if (details) {
        console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
}

/**
 * Validate Environment Variables
 */
function validateEnvironment() {
    logStep('Validating environment variables...');
    
    const required = [
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET', 
        'SLACK_WEBHOOK_URL',
        'AZURE_OPENAI_API_KEY',
        'AZURE_OPENAI_ENDPOINT'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
        logStep(`Missing required environment variables: ${missing.join(', ')}`, 'error');
        return false;
    }
    
    logStep('All required environment variables present', 'success');
    return true;
}

/**
 * Test Slack Webhook Connection
 */
async function testSlackConnection() {
    logStep('Testing Slack webhook connection...');
    
    try {
        const testMessage = {
            text: '🧪 FeedbackResolver Integration Test Started',
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '*FeedbackResolver Integration Test*\n\n🚀 Testing complete workflow:\n• Gmail OAuth authentication\n• Email fetching and processing\n• AI analysis with Azure OpenAI\n• Slack notifications\n• Report generation'
                    }
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: `Started at: ${testResults.startTime.toLocaleString()}`
                        }
                    ]
                }
            ]
        };
        
        const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testMessage)
        });
        
        if (response.ok) {
            logStep('Slack webhook test successful', 'success');
            return true;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        logStep('Slack webhook test failed', 'error', { error: error.message });
        return false;
    }
}

/**
 * Run Integration Test
 */
async function runIntegrationTest() {
    console.log('🚀 Starting FeedbackResolver Integration Test');
    console.log('=' .repeat(60));
    console.log(`Test Configuration:`);
    console.log(`• Mode: ${testConfig.mode}`);
    console.log(`• Target Email: ${testConfig.config.gmail.targetEmail}`);
    console.log(`• Days to Search: ${testConfig.config.gmail.daysToSearch}`);
    console.log(`• Max Results: ${testConfig.config.gmail.maxResults}`);
    console.log(`• AI Provider: ${testConfig.config.ai.provider}`);
    console.log(`• Slack Enabled: ${testConfig.config.notifications.slack.enabled}`);
    console.log(`• Auto-Reply Enabled: ${testConfig.config.autoReply.enabled}`);
    if (testConfig.config.autoReply.enabled) {
        console.log(`• Require Approval: ${testConfig.config.autoReply.requireApproval}`);
    }
    console.log('=' .repeat(60));
    
    try {
        // Step 1: Validate Environment
        if (!validateEnvironment()) {
            throw new Error('Environment validation failed');
        }
        
        // Step 2: Test Slack Connection
        if (testConfig.config.notifications.slack.enabled) {
            const slackOk = await testSlackConnection();
            if (!slackOk) {
                logStep('Continuing without Slack notifications', 'warning');
                testConfig.config.notifications.slack.enabled = false;
            }
        }
        
        // Step 3: Initialize FeedbackResolver
        logStep('Initializing FeedbackResolver...');
        const resolver = new FeedbackResolver(testConfig);
        
        // Set up event listeners for detailed logging
        resolver.on('authenticationStarted', () => {
            logStep('OAuth authentication started - browser should open', 'info');
        });
        
        resolver.on('authenticationCompleted', () => {
            logStep('OAuth authentication completed successfully', 'success');
        });
        
        resolver.on('authenticationFailed', (data) => {
            logStep('OAuth authentication failed', 'error', data);
        });
        
        resolver.on('emailsProcessed', (data) => {
            testResults.emailsProcessed = data.count;
            logStep(`Processed ${data.count} emails from Gmail`, 'success');
        });
        
        resolver.on('analysisCompleted', (data) => {
            testResults.relevantEmails = data.analysis.summary.relevantEmails;
            testResults.replyableEmails = data.analysis.summary.replyableEmails || 0;
            logStep(`AI analysis completed: ${data.analysis.summary.relevantEmails} relevant emails found`, 'success');
            if (testResults.replyableEmails > 0) {
                logStep(`Found ${testResults.replyableEmails} emails that may need replies`, 'info');
            }
        });
        
        resolver.on('repliesGenerated', (data) => {
            logStep(`Generated ${data.count} suggested replies`, 'info');
        });
        
        resolver.on('repliesSending', (data) => {
            logStep(`Sending ${data.count} approved replies...`, 'info');
        });
        
        resolver.on('repliesSent', (data) => {
            testResults.repliesSent = data.sent;
            logStep(`Replies sent: ${data.sent} successful, ${data.failed} failed`, data.failed > 0 ? 'warning' : 'success');
        });
        
        resolver.on('notificationsSent', (data) => {
            testResults.notificationsSent = data.notifications.filter(n => n.success).length;
            logStep(`Notifications sent: ${testResults.notificationsSent} successful`, 'success');
        });
        
        resolver.on('analysisError', (data) => {
            logStep('Analysis error occurred', 'error', data);
            testResults.errors.push(data.error);
        });
        
        // Step 4: Authenticate with Gmail
        logStep('Starting Gmail authentication...');
        await resolver.authenticate();
        
        // Step 5: Analyze Feedback (with or without auto-reply)
        logStep('Starting email analysis...');
        let result;
        
        if (testConfig.config.autoReply.enabled) {
            logStep('Auto-reply is enabled - using analyzeAndReply()', 'info');
            result = await resolver.analyzeAndReply({ dryRun: false });
        } else {
            result = await resolver.analyze();
        }
        
        // Step 6: Log Results
        const resultDetails = {
            emailsProcessed: result.emails,
            relevantEmails: result.analysis.summary.relevantEmails,
            categories: result.analysis.summary.categories?.length || 0,
            timestamp: result.timestamp
        };
        
        if (testConfig.config.autoReply.enabled) {
            resultDetails.replyableEmails = result.analysis.summary.replyableEmails || 0;
            resultDetails.repliesSent = result.sentReplies?.length || 0;
        }
        
        logStep('Analysis completed successfully', 'success', resultDetails);
        
        // Step 7: Send Success Notification to Slack
        if (testConfig.config.notifications.slack.enabled) {
            await sendSuccessNotification(result);
        }
        
        // Step 8: Display Final Results
        displayTestResults(result);
        
        return result;
        
    } catch (error) {
        logStep('Integration test failed', 'error', { error: error.message, stack: error.stack });
        testResults.errors.push(error.message);
        
        // Send failure notification to Slack
        if (testConfig.config.notifications.slack.enabled) {
            await sendFailureNotification(error);
        }
        
        throw error;
    }
}

/**
 * Send success notification to Slack
 */
async function sendSuccessNotification(result) {
    try {
        const successMessage = {
            text: '✅ FeedbackResolver Integration Test - SUCCESS',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '✅ FeedbackResolver Test Completed Successfully'
                    }
                },
                {
                    type: 'section',
                    fields: [
                        {
                            type: 'mrkdwn',
                            text: `*Emails Processed:*\n${result.emails}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Relevant Emails:*\n${result.analysis.summary.relevantEmails}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Categories Found:*\n${result.analysis.summary.categories?.length || 0}`
                        },
                        {
                            type: 'mrkdwn',
                            text: `*Processing Time:*\n${new Date(result.timestamp).toLocaleString()}`
                        }
                    ]
                }
            ]
        };
        
        // Add auto-reply results if enabled
        if (testConfig.config.autoReply.enabled && result.sentReplies) {
            successMessage.blocks.push({
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Replyable Emails:*\n${result.analysis.summary.replyableEmails || 0}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Replies Sent:*\n${result.sentReplies.length}`
                    }
                ]
            });
        }
        
        successMessage.blocks.push({
                type: 'divider'
            });
        
        // Re-add the insights section
        successMessage.blocks.push({
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Emails Processed:*\n${result.emails}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Relevant Emails:*\n${result.analysis.summary.relevantEmails}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Categories Found:*\n${result.analysis.summary.categories?.length || 0}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Processing Time:*\n${new Date(result.timestamp).toLocaleString()}`
                    }
                ]
            });
        
        // Remove duplicate section
        successMessage.blocks = [
            successMessage.blocks[0], // header
            successMessage.blocks[1], // first fields section
            ...(testConfig.config.autoReply.enabled && result.sentReplies ? [successMessage.blocks[2]] : []) // auto-reply section if exists
        ];
        
        // Re-structure properly
        successMessage.blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '✅ FeedbackResolver Test Completed Successfully'
                }
            },
            {
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*Emails Processed:*\n${result.emails}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Relevant Emails:*\n${result.analysis.summary.relevantEmails}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Categories Found:*\n${result.analysis.summary.categories?.length || 0}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*Processing Time:*\n${new Date(result.timestamp).toLocaleString()}`
                    }
                ]
            }
        ];
        
        // Add auto-reply section if enabled
        if (testConfig.config.autoReply.enabled && result.sentReplies) {
            successMessage.blocks.push({
                type: 'section',
                fields: [
                    {
                        type: 'mrkdwn',
                        text: `*📧 Replyable Emails:*\n${result.analysis.summary.replyableEmails || 0}`
                    },
                    {
                        type: 'mrkdwn',
                        text: `*✅ Replies Sent:*\n${result.sentReplies.length}`
                    }
                ]
            });
        }
        
        if (result.analysis.summary.keyInsights?.length > 0) {
            successMessage.blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Key Insights:*\n${result.analysis.summary.keyInsights.slice(0, 3).map(insight => `• ${insight}`).join('\n')}`
                }
            });
        }
        
        await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(successMessage)
        });
        
        logStep('Success notification sent to Slack', 'success');
    } catch (error) {
        logStep('Failed to send success notification to Slack', 'warning', { error: error.message });
    }
}

/**
 * Send failure notification to Slack
 */
async function sendFailureNotification(error) {
    try {
        const failureMessage = {
            text: '❌ FeedbackResolver Integration Test - FAILED',
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: '❌ FeedbackResolver Test Failed'
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Error:* ${error.message}`
                    }
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: `Failed at: ${new Date().toLocaleString()}`
                        }
                    ]
                }
            ]
        };
        
        await fetch(process.env.SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(failureMessage)
        });
        
        logStep('Failure notification sent to Slack', 'success');
    } catch (slackError) {
        logStep('Failed to send failure notification to Slack', 'warning', { error: slackError.message });
    }
}

/**
 * Display final test results
 */
function displayTestResults(result = null) {
    const endTime = new Date();
    const duration = Math.round((endTime - testResults.startTime) / 1000);
    
    console.log('\n' + '=' .repeat(60));
    console.log('📊 INTEGRATION TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📧 Emails Processed: ${testResults.emailsProcessed}`);
    console.log(`🎯 Relevant Emails: ${testResults.relevantEmails}`);
    if (testConfig.config.autoReply.enabled) {
        console.log(`💬 Replyable Emails: ${testResults.replyableEmails}`);
        console.log(`✅ Replies Sent: ${testResults.repliesSent}`);
    }
    console.log(`📨 Notifications Sent: ${testResults.notificationsSent}`);
    console.log(`❌ Errors: ${testResults.errors.length}`);
    
    if (result) {
        console.log(`📁 Report Generated: ${testConfig.config.notifications.file.path}`);
        console.log(`🕐 Analysis Timestamp: ${result.timestamp}`);
    }
    
    console.log('\n📋 Test Steps:');
    testResults.steps.forEach(step => {
        const statusEmoji = {
            'info': '🔍',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️'
        };
        console.log(`${statusEmoji[step.status]} ${step.step}`);
    });
    
    if (testResults.errors.length > 0) {
        console.log('\n❌ Errors:');
        testResults.errors.forEach(error => {
            console.log(`  • ${error}`);
        });
    }
    
    console.log('\n💡 Next Steps:');
    if (result) {
        console.log('  • Check your Slack channel for the notification');
        console.log(`  • Review the generated report: ${testConfig.config.notifications.file.path}`);
        console.log('  • Integration test completed successfully!');
    } else {
        console.log('  • Check the error logs above');
        console.log('  • Verify your credentials and configuration');
        console.log('  • Try running the test again');
    }
}

/**
 * Cleanup function
 */
function cleanup() {
    console.log('\n🧹 Cleaning up...');
    process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runIntegrationTest()
        .then(() => {
            console.log('\n🎉 Integration test completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Integration test failed:', error.message);
            process.exit(1);
        });
}

// Export for potential use in other tests
export default runIntegrationTest;
export { testConfig, testResults };
