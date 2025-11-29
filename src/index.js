import { OAuthManager } from './auth/oauth-manager.js';
import { GmailProcessor } from './processors/gmail-processor.js';
import { FileProcessor } from './processors/file-processor.js';
import { SlackNotifier } from './notifiers/slack-notifier.js';
import { FileNotifier } from './notifiers/file-notifier.js';
import { AIAnalyzer } from './analyzers/ai-analyzer.js';
import { ConfigValidator } from './utils/config-validator.js';
import dotenv from 'dotenv';
import { EventEmitter } from 'events';

// Load environment variables
dotenv.config();

/**
 * FeedbackResolver - AI-powered email feedback analysis system
 */
export default class FeedbackResolver extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.mode = options.mode || 'gmail';
        this.config = this._mergeConfig(options.config || {});
        this.authenticated = false;
        
        // Validate configuration
        ConfigValidator.validate(this.mode, this.config);
        
        // Initialize components
        this._initializeComponents();
        
        console.log(`FeedbackResolver initialized in ${this.mode} mode`);
    }

    /**
     * Create FeedbackResolver from environment variables
     */
    static fromEnv() {
        const config = {
            gmail: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                targetEmail: process.env.TARGET_EMAIL,
                daysToSearch: parseInt(process.env.DAYS_TO_SEARCH) || 10,
                maxResults: parseInt(process.env.MAX_RESULTS) || 20
            },
            ai: {
                provider: process.env.NEUROLINK_DEFAULT_PROVIDER || 'vertex',
                model: process.env.NEUROLINK_DEFAULT_MODEL
            },
            notifications: {
                slack: {
                    webhookUrl: process.env.SLACK_WEBHOOK_URL,
                    enabled: process.env.SLACK_ENABLED === 'true'
                }
            }
        };

        return new FeedbackResolver({
            mode: process.env.FEEDBACK_RESOLVER_MODE || 'gmail',
            config
        });
    }

    /**
     * Create FeedbackResolver from config file
     */
    static async fromConfig(configPath) {
        const { promises: fs } = await import('fs');
        const configData = JSON.parse(await fs.readFile(configPath, 'utf8'));
        return new FeedbackResolver(configData);
    }

    /**
     * Interactive setup wizard
     */
    static async setupWizard() {
        const inquirer = await import('inquirer');
        
        const answers = await inquirer.default.prompt([
            {
                type: 'list',
                name: 'mode',
                message: 'What mode would you like to use?',
                choices: [
                    { name: 'Gmail Integration', value: 'gmail' },
                    { name: 'File Processing', value: 'file' },
                    { name: 'Test Mode', value: 'test' }
                ]
            },
            {
                type: 'input',
                name: 'clientId',
                message: 'Enter your Google Client ID:',
                when: (answers) => answers.mode === 'gmail'
            },
            {
                type: 'input',
                name: 'clientSecret',
                message: 'Enter your Google Client Secret:',
                when: (answers) => answers.mode === 'gmail'
            },
            {
                type: 'input',
                name: 'targetEmail',
                message: 'Enter target email address (leave blank for all emails):',
                when: (answers) => answers.mode === 'gmail'
            },
            {
                type: 'list',
                name: 'aiProvider',
                message: 'Choose AI provider:',
                choices: ['vertex', 'anthropic', 'openai'],
                default: 'vertex'
            },
            {
                type: 'input',
                name: 'slackWebhook',
                message: 'Enter Slack webhook URL (optional):'
            }
        ]);

        const config = {
            mode: answers.mode,
            config: {
                gmail: {
                    clientId: answers.clientId,
                    clientSecret: answers.clientSecret,
                    targetEmail: answers.targetEmail
                },
                ai: {
                    provider: answers.aiProvider
                },
                notifications: {
                    slack: {
                        webhookUrl: answers.slackWebhook,
                        enabled: !!answers.slackWebhook
                    }
                }
            }
        };

        return new FeedbackResolver(config);
    }

    /**
     * Authenticate with the configured service
     */
    async authenticate() {
        this.emit('authenticationStarted', { mode: this.mode });
        
        try {
            if (this.mode === 'gmail') {
                await this.oauthManager.authenticate();
                this.authenticated = true;
                this.emit('authenticationCompleted', { mode: this.mode });
                console.log('✅ Gmail authentication successful');
            } else {
                this.authenticated = true;
                this.emit('authenticationCompleted', { mode: this.mode });
                console.log(`✅ Authentication completed for ${this.mode} mode`);
            }
        } catch (error) {
            this.emit('authenticationFailed', { mode: this.mode, error });
            throw new Error(`Authentication failed: ${error.message}`);
        }
    }

    /**
     * Analyze feedback
     */
    async analyze(input = null) {
        if (!this.authenticated && this.mode === 'gmail') {
            throw new Error('Not authenticated. Call authenticate() first.');
        }

        this.emit('analysisStarted', { mode: this.mode });

        try {
            // Process emails/content based on mode
            let emails;
            if (this.mode === 'gmail') {
                emails = await this.processor.process();
            } else if (this.mode === 'file') {
                emails = await this.processor.process(input);
            } else {
                throw new Error(`Unsupported mode: ${this.mode}`);
            }

            this.emit('emailsProcessed', { count: emails.length });

            // Analyze with AI
            const analysis = await this.analyzer.analyze(emails);
            this.emit('analysisCompleted', { analysis });

            // Send notifications
            const notifications = await this._sendNotifications(analysis);
            this.emit('notificationsSent', { notifications });

            const result = {
                emails: emails.length,
                analysis,
                notifications,
                timestamp: new Date().toISOString()
            };

            this.emit('processComplete', result);
            return result;

        } catch (error) {
            this.emit('analysisError', { error });
            throw error;
        }
    }

    /**
     * Analyze multiple sources in batch
     */
    async analyzeBatch(sources) {
        const results = [];
        
        for (const source of sources) {
            const resolver = new FeedbackResolver(source);
            await resolver.authenticate();
            const result = await resolver.analyze();
            results.push(result);
        }

        return results;
    }

    /**
     * Add custom plugin
     */
    use(plugin) {
        if (typeof plugin.process === 'function') {
            this.plugins = this.plugins || [];
            this.plugins.push(plugin);
            console.log(`Added plugin: ${plugin.constructor.name}`);
        } else {
            throw new Error('Plugin must have a process() method');
        }
    }

    /**
     * Initialize components based on mode and config
     */
    _initializeComponents() {
        // Initialize OAuth manager for Gmail mode
        if (this.mode === 'gmail') {
            this.oauthManager = new OAuthManager(this.config.gmail);
        }

        // Initialize processor based on mode
        if (this.mode === 'gmail') {
            this.processor = new GmailProcessor(this.config.gmail, this.oauthManager);
        } else if (this.mode === 'file') {
            this.processor = new FileProcessor(this.config.file || {});
        }

        // Initialize AI analyzer
        this.analyzer = new AIAnalyzer(this.config.ai);

        // Initialize notifiers
        this.notifiers = [];
        
        if (this.config.notifications?.slack?.enabled) {
            this.notifiers.push(new SlackNotifier(this.config.notifications.slack));
        }
        
        // Always add file notifier as backup
        this.notifiers.push(new FileNotifier(this.config.notifications?.file || {}));
    }

    /**
     * Merge user config with defaults
     */
    _mergeConfig(userConfig) {
        const defaultConfig = {
            gmail: {
                daysToSearch: 10,
                maxResults: 20
            },
            ai: {
                provider: 'vertex',
                timeout: '30000s'
            },
            notifications: {
                slack: { enabled: false },
                file: { enabled: true }
            }
        };

        return this._deepMerge(defaultConfig, userConfig);
    }

    /**
     * Deep merge objects
     */
    _deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this._deepMerge(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    /**
     * Send notifications through all configured channels
     */
    async _sendNotifications(analysis) {
        const notifications = [];
        
        for (const notifier of this.notifiers) {
            try {
                const result = await notifier.send(analysis);
                notifications.push({
                    type: notifier.constructor.name,
                    success: true,
                    result
                });
            } catch (error) {
                notifications.push({
                    type: notifier.constructor.name,
                    success: false,
                    error: error.message
                });
                console.error(`❌ Notification failed: ${notifier.constructor.name}`, error.message);
            }
        }

        return notifications;
    }
}

// Export additional classes for direct use
export { OAuthManager } from './auth/oauth-manager.js';
export { GmailProcessor } from './processors/gmail-processor.js';
export { FileProcessor } from './processors/file-processor.js';
export { SlackNotifier } from './notifiers/slack-notifier.js';
export { FileNotifier } from './notifiers/file-notifier.js';
export { AIAnalyzer } from './analyzers/ai-analyzer.js';
export { ConfigValidator } from './utils/config-validator.js';
