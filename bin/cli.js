#!/usr/bin/env node

import { program } from 'commander';
import FeedbackResolver, { ConfigValidator } from '../src/index.js';
import { promises as fs } from 'fs';
import path from 'path';

// CLI version
const version = '1.0.0';

/**
 * FeedbackResolver CLI Tool
 * Provides command-line interface for the FeedbackResolver package
 */

program
    .name('feedback-resolver')
    .description('AI-powered email feedback analysis system')
    .version(version);

// Initialize command
program
    .command('init')
    .description('Initialize FeedbackResolver with guided setup')
    .option('-m, --mode <mode>', 'Mode: gmail, file, or test', 'gmail')
    .option('-o, --output <file>', 'Output configuration file', './feedback-resolver.config.json')
    .action(async (options) => {
        console.log('🚀 Initializing FeedbackResolver...\n');
        
        try {
            const resolver = await FeedbackResolver.setupWizard();
            
            // Save configuration to file
            const configPath = path.resolve(options.output);
            await fs.writeFile(configPath, JSON.stringify({
                mode: resolver.mode,
                config: resolver.config
            }, null, 2));
            
            console.log(`\n✅ Configuration saved to: ${configPath}`);
            console.log('\n📋 Next steps:');
            console.log('1. Run: feedback-resolver auth (for Gmail mode)');
            console.log('2. Run: feedback-resolver analyze');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            process.exit(1);
        }
    });

// Authentication command
program
    .command('auth')
    .description('Authenticate with email services (Gmail)')
    .option('-c, --config <file>', 'Configuration file', './feedback-resolver.config.json')
    .action(async (options) => {
        console.log('🔐 Starting authentication...\n');
        
        try {
            const config = await loadConfig(options.config);
            const resolver = new FeedbackResolver(config);
            
            await resolver.authenticate();
            console.log('\n✅ Authentication completed successfully!');
            
        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            process.exit(1);
        }
    });

// Analyze command
program
    .command('analyze')
    .description('Analyze feedback from configured sources')
    .option('-c, --config <file>', 'Configuration file', './feedback-resolver.config.json')
    .option('-i, --input <text>', 'Direct text input (for file mode)')
    .option('--no-slack', 'Disable Slack notifications')
    .option('--no-file', 'Disable file output')
    .action(async (options) => {
        console.log('🔍 Starting feedback analysis...\n');
        
        try {
            const config = await loadConfig(options.config);
            
            // Override notification settings based on CLI options
            if (options.noSlack && config.config.notifications?.slack) {
                config.config.notifications.slack.enabled = false;
            }
            if (options.noFile && config.config.notifications?.file) {
                config.config.notifications.file.enabled = false;
            }
            
            const resolver = new FeedbackResolver(config);
            
            // Authenticate if needed
            if (config.mode === 'gmail') {
                await resolver.authenticate();
            }
            
            // Run analysis
            const result = await resolver.analyze(options.input || null);
            
            console.log('\n📊 Analysis Results:');
            console.log(`• Total emails processed: ${result.emails}`);
            console.log(`• Analysis timestamp: ${result.timestamp}`);
            
            if (result.analysis.summary.relevantEmails > 0) {
                console.log(`• Relevant emails found: ${result.analysis.summary.relevantEmails}`);
                console.log(`• Categories: ${result.analysis.summary.categories?.length || 0}`);
            }
            
            console.log('\n✅ Analysis completed successfully!');
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            process.exit(1);
        }
    });

// Test command
program
    .command('test')
    .description('Test connections and configurations')
    .option('-c, --config <file>', 'Configuration file', './feedback-resolver.config.json')
    .option('--gmail', 'Test Gmail connection only')
    .option('--slack', 'Test Slack connection only')
    .option('--ai', 'Test AI connection only')
    .action(async (options) => {
        console.log('🧪 Testing connections...\n');
        
        try {
            const config = await loadConfig(options.config);
            const resolver = new FeedbackResolver(config);
            
            const tests = [];
            
            // Gmail test
            if (!options.slack && !options.ai && (config.mode === 'gmail' || options.gmail)) {
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
            if (!options.gmail && !options.ai && (config.config.notifications?.slack?.enabled || options.slack)) {
                console.log('📱 Testing Slack connection...');
                const slackNotifier = resolver.notifiers.find(n => n.constructor.name === 'SlackNotifier');
                if (slackNotifier) {
                    const slackTest = await slackNotifier.testConnection();
                    tests.push({ name: 'Slack', ...slackTest });
                    console.log(slackTest.success ? '✅ Slack: Connected' : `❌ Slack: ${slackTest.message}`);
                }
            }
            
            // AI test
            if (!options.gmail && !options.slack && (config.mode !== 'test' || options.ai)) {
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
                process.exit(1);
            }
            
        } catch (error) {
            console.error('❌ Test failed:', error.message);
            process.exit(1);
        }
    });

// Config command
program
    .command('config')
    .description('Manage configuration')
    .option('--template <mode>', 'Generate configuration template for mode')
    .option('--validate <file>', 'Validate configuration file')
    .option('--show <file>', 'Show current configuration')
    .action(async (options) => {
        try {
            if (options.template) {
                console.log('📋 Configuration template:\n');
                const template = ConfigValidator.getTemplate(options.template);
                console.log(JSON.stringify(template, null, 2));
                return;
            }
            
            if (options.validate) {
                console.log('🔍 Validating configuration...');
                const config = await loadConfig(options.validate);
                ConfigValidator.validate(config.mode, config.config);
                console.log('✅ Configuration is valid');
                return;
            }
            
            if (options.show) {
                console.log('📄 Current configuration:\n');
                const config = await loadConfig(options.show);
                console.log(JSON.stringify(config, null, 2));
                return;
            }
            
            console.log('Please specify an action: --template, --validate, or --show');
            
        } catch (error) {
            console.error('❌ Config operation failed:', error.message);
            process.exit(1);
        }
    });

// Serve command for continuous monitoring
program
    .command('serve')
    .description('Start continuous feedback monitoring')
    .option('-c, --config <file>', 'Configuration file', './feedback-resolver.config.json')
    .option('-i, --interval <minutes>', 'Check interval in minutes', '30')
    .action(async (options) => {
        console.log('🔄 Starting continuous feedback monitoring...\n');
        
        try {
            const config = await loadConfig(options.config);
            const resolver = new FeedbackResolver(config);
            const interval = parseInt(options.interval) * 60 * 1000; // Convert to milliseconds
            
            // Initial authentication for Gmail
            if (config.mode === 'gmail') {
                await resolver.authenticate();
            }
            
            console.log(`📊 Monitoring every ${options.interval} minutes`);
            console.log('Press Ctrl+C to stop\n');
            
            // Initial run
            await runAnalysis(resolver);
            
            // Set up interval
            const intervalId = setInterval(async () => {
                try {
                    await runAnalysis(resolver);
                } catch (error) {
                    console.error('❌ Analysis failed:', error.message);
                }
            }, interval);
            
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

// Helper functions
async function loadConfig(configFile) {
    try {
        const configPath = path.resolve(configFile);
        const configData = await fs.readFile(configPath, 'utf8');
        return JSON.parse(configData);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`❌ Configuration file not found: ${configFile}`);
            console.log('💡 Run "feedback-resolver init" to create a configuration file');
        } else {
            console.error(`❌ Failed to read configuration: ${error.message}`);
        }
        process.exit(1);
    }
}

async function runAnalysis(resolver) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] 🔍 Running analysis...`);
    
    try {
        const result = await resolver.analyze();
        console.log(`[${timestamp}] ✅ Processed ${result.emails} emails, found ${result.analysis.summary.relevantEmails} relevant`);
    } catch (error) {
        console.log(`[${timestamp}] ❌ Analysis failed: ${error.message}`);
        throw error;
    }
}

// Parse and execute
program.parse();
