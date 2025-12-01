/**
 * Configuration validator for FeedbackResolver
 * Validates configuration based on mode and provides helpful error messages
 */
export class ConfigValidator {
    
    /**
     * Validate configuration for the given mode
     */
    static validate(mode, config) {
        console.log(`🔍 Validating configuration for ${mode} mode...`);
        
        const errors = [];
        
        switch (mode) {
            case 'gmail':
                this._validateGmailConfig(config.gmail || {}, errors);
                break;
            case 'file':
                this._validateFileConfig(config.file || {}, errors);
                break;
            case 'test':
                // Test mode has minimal requirements
                break;
            default:
                errors.push(`Unsupported mode: ${mode}. Supported modes: gmail, file, test`);
        }
        
        // Validate AI config (required for all modes except test)
        if (mode !== 'test') {
            this._validateAIConfig(config.ai || {}, errors);
        }
        
        // Validate notifications config (optional but validate if provided)
        if (config.notifications) {
            this._validateNotificationsConfig(config.notifications, errors);
        }
        
        // Validate auto-reply config (optional but validate if provided)
        if (config.autoReply) {
            this._validateAutoReplyConfig(config.autoReply, errors);
        }
        
        if (errors.length > 0) {
            const errorMessage = `Configuration validation failed:\n${errors.map(e => `- ${e}`).join('\n')}`;
            throw new Error(errorMessage);
        }
        
        console.log('✅ Configuration validation passed');
        return true;
    }
    
    /**
     * Validate Gmail configuration
     */
    static _validateGmailConfig(gmailConfig, errors) {
        const required = ['clientId', 'clientSecret'];
        
        for (const field of required) {
            if (!gmailConfig[field] || gmailConfig[field].trim() === '') {
                errors.push(`Gmail config missing required field: ${field}`);
            }
        }
        
        // Validate optional fields with reasonable defaults
        if (gmailConfig.daysToSearch && (isNaN(gmailConfig.daysToSearch) || gmailConfig.daysToSearch < 1 || gmailConfig.daysToSearch > 365)) {
            errors.push('Gmail config: daysToSearch must be between 1 and 365');
        }
        
        if (gmailConfig.maxResults && (isNaN(gmailConfig.maxResults) || gmailConfig.maxResults < 1 || gmailConfig.maxResults > 500)) {
            errors.push('Gmail config: maxResults must be between 1 and 500');
        }
        
        if (gmailConfig.port && (isNaN(gmailConfig.port) || gmailConfig.port < 1000 || gmailConfig.port > 65535)) {
            errors.push('Gmail config: port must be between 1000 and 65535');
        }
        
        if (gmailConfig.targetEmail && !this._isValidEmail(gmailConfig.targetEmail)) {
            errors.push('Gmail config: targetEmail must be a valid email address');
        }
    }
    
    /**
     * Validate File configuration
     */
    static _validateFileConfig(fileConfig, errors) {
        // File mode is flexible - can accept file path or direct content
        if (fileConfig.path && typeof fileConfig.path !== 'string') {
            errors.push('File config: path must be a string');
        }
        
        if (fileConfig.encoding && !['utf8', 'ascii', 'base64'].includes(fileConfig.encoding)) {
            errors.push('File config: encoding must be utf8, ascii, or base64');
        }
    }
    
    /**
     * Validate AI configuration
     */
    static _validateAIConfig(aiConfig, errors) {
        const supportedProviders = ['vertex', 'anthropic', 'openai', 'google-ai', 'azure', 'bedrock'];
        
        if (!aiConfig.provider) {
            errors.push('AI config missing required field: provider');
        } else if (!supportedProviders.includes(aiConfig.provider)) {
            errors.push(`AI config: provider must be one of: ${supportedProviders.join(', ')}`);
        }
        
        // Validate timeout format
        if (aiConfig.timeout && !this._isValidTimeout(aiConfig.timeout)) {
            errors.push('AI config: timeout must be in format like "30000s" or "5m"');
        }
        
        // Provider-specific validations
        if (aiConfig.provider === 'vertex') {
            if (!process.env.GOOGLE_VERTEX_PROJECT && !aiConfig.projectId) {
                errors.push('Vertex AI requires GOOGLE_VERTEX_PROJECT environment variable or projectId in config');
            }
        }
        
        if (aiConfig.provider === 'openai') {
            if (!process.env.OPENAI_API_KEY && !aiConfig.apiKey) {
                errors.push('OpenAI requires OPENAI_API_KEY environment variable or apiKey in config');
            }
        }
        
        if (aiConfig.provider === 'azure') {
            if (!process.env.AZURE_OPENAI_API_KEY && !aiConfig.apiKey) {
                errors.push('Azure OpenAI requires AZURE_OPENAI_API_KEY environment variable or apiKey in config');
            }
            if (!process.env.AZURE_OPENAI_ENDPOINT && !aiConfig.endpoint) {
                errors.push('Azure OpenAI requires AZURE_OPENAI_ENDPOINT environment variable or endpoint in config');
            }
        }
        
        if (aiConfig.provider === 'bedrock') {
            if (!process.env.AWS_ACCESS_KEY_ID) {
                errors.push('AWS Bedrock requires AWS_ACCESS_KEY_ID environment variable');
            }
            if (!process.env.AWS_SECRET_ACCESS_KEY) {
                errors.push('AWS Bedrock requires AWS_SECRET_ACCESS_KEY environment variable');
            }
            if (!process.env.AWS_REGION) {
                errors.push('AWS Bedrock requires AWS_REGION environment variable');
            }
        }
        
        if (aiConfig.provider === 'anthropic') {
            if (!process.env.ANTHROPIC_API_KEY && !aiConfig.apiKey) {
                errors.push('Anthropic requires ANTHROPIC_API_KEY environment variable or apiKey in config');
            }
        }
    }
    
    /**
     * Validate notifications configuration
     */
    static _validateNotificationsConfig(notificationsConfig, errors) {
        if (notificationsConfig.slack) {
            const slackConfig = notificationsConfig.slack;
            
            if (slackConfig.enabled && !slackConfig.webhookUrl) {
                errors.push('Slack notifications enabled but webhookUrl is missing');
            }
            
            if (slackConfig.webhookUrl && !this._isValidUrl(slackConfig.webhookUrl)) {
                errors.push('Slack webhookUrl must be a valid URL');
            }
        }
        
        if (notificationsConfig.file) {
            const fileConfig = notificationsConfig.file;
            
            if (fileConfig.path && typeof fileConfig.path !== 'string') {
                errors.push('File notification path must be a string');
            }
        }
    }
    
    /**
     * Validate auto-reply configuration
     */
    static _validateAutoReplyConfig(autoReplyConfig, errors) {
        if (typeof autoReplyConfig.enabled !== 'boolean') {
            errors.push('Auto-reply config: enabled must be a boolean');
        }
        
        if (autoReplyConfig.requireApproval !== undefined && typeof autoReplyConfig.requireApproval !== 'boolean') {
            errors.push('Auto-reply config: requireApproval must be a boolean');
        }
        
        if (autoReplyConfig.confidenceThreshold !== undefined) {
            const threshold = parseFloat(autoReplyConfig.confidenceThreshold);
            if (isNaN(threshold) || threshold < 0 || threshold > 1) {
                errors.push('Auto-reply config: confidenceThreshold must be between 0 and 1');
            }
        }
        
        if (autoReplyConfig.maxPerRun !== undefined) {
            const max = parseInt(autoReplyConfig.maxPerRun);
            if (isNaN(max) || max < 1 || max > 100) {
                errors.push('Auto-reply config: maxPerRun must be between 1 and 100');
            }
        }
        
        if (autoReplyConfig.dryRun !== undefined && typeof autoReplyConfig.dryRun !== 'boolean') {
            errors.push('Auto-reply config: dryRun must be a boolean');
        }
    }
    
    /**
     * Generate default configuration for a mode
     */
    static getDefaults(mode) {
        const defaults = {
            gmail: {
                daysToSearch: 10,
                maxResults: 20,
                port: 3000,
                scopes: [
                    'https://www.googleapis.com/auth/gmail.readonly',
                    'https://www.googleapis.com/auth/gmail.send'
                ]
            },
            file: {
                encoding: 'utf8'
            },
            ai: {
                provider: 'vertex',
                timeout: '30000s'
            },
            autoReply: {
                enabled: false,
                requireApproval: true,
                confidenceThreshold: 0.7,
                maxPerRun: 10,
                dryRun: false
            },
            notifications: {
                slack: { enabled: false },
                file: {
                    enabled: true,
                    path: './feedback-analysis-report.md'
                }
            }
        };
        
        return defaults[mode] || {};
    }
    
    /**
     * Validate email format
     */
    static _isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Validate URL format
     */
    static _isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Validate timeout format (e.g., "30000s", "5m", "1h")
     */
    static _isValidTimeout(timeout) {
        const timeoutRegex = /^\d+[smh]$/;
        return timeoutRegex.test(timeout);
    }
    
    /**
     * Get configuration template for a mode
     */
    static getTemplate(mode) {
        const templates = {
            gmail: {
                mode: 'gmail',
                config: {
                    gmail: {
                        clientId: 'your-google-client-id',
                        clientSecret: 'your-google-client-secret',
                        targetEmail: 'optional-target-email@domain.com',
                        daysToSearch: 10,
                        maxResults: 20,
                        port: 3000
                    },
                    ai: {
                        provider: 'vertex',
                        timeout: '30000s'
                    },
                    autoReply: {
                        enabled: false,
                        requireApproval: true,
                        confidenceThreshold: 0.7,
                        maxPerRun: 10,
                        dryRun: false
                    },
                    notifications: {
                        slack: {
                            enabled: true,
                            webhookUrl: 'your-slack-webhook-url'
                        },
                        file: {
                            enabled: true,
                            path: './feedback-analysis-report.md'
                        }
                    }
                }
            },
            file: {
                mode: 'file',
                config: {
                    file: {
                        path: './feedback.txt',
                        encoding: 'utf8'
                    },
                    ai: {
                        provider: 'vertex',
                        timeout: '30000s'
                    },
                    notifications: {
                        slack: {
                            enabled: false
                        },
                        file: {
                            enabled: true,
                            path: './feedback-analysis-report.md'
                        }
                    }
                }
            }
        };
        
        return templates[mode] || null;
    }
    
    /**
     * Validate and sanitize configuration
     */
    static sanitize(config) {
        // Remove empty strings and null values
        const sanitized = JSON.parse(JSON.stringify(config, (key, value) => {
            if (value === '' || value === null || value === undefined) {
                return undefined;
            }
            return value;
        }));
        
        return sanitized;
    }
    
    /**
     * Check environment variables for common issues
     */
    static validateEnvironment(mode) {
        const issues = [];
        
        if (mode === 'gmail') {
            if (!process.env.GOOGLE_CLIENT_ID) {
                issues.push('GOOGLE_CLIENT_ID environment variable not set');
            }
            if (!process.env.GOOGLE_CLIENT_SECRET) {
                issues.push('GOOGLE_CLIENT_SECRET environment variable not set');
            }
        }
        
        // Check for AI provider credentials
        const provider = process.env.NEUROLINK_DEFAULT_PROVIDER || 'vertex';
        
        if (provider === 'vertex' && !process.env.GOOGLE_VERTEX_PROJECT) {
            issues.push('GOOGLE_VERTEX_PROJECT environment variable not set for Vertex AI');
        }
        
        if (provider === 'openai' && !process.env.OPENAI_API_KEY) {
            issues.push('OPENAI_API_KEY environment variable not set for OpenAI');
        }
        
        return issues;
    }
}
