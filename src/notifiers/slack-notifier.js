import axios from 'axios';

/**
 * Slack Notifier
 * Sends formatted feedback analysis reports to Slack channels
 */
export class SlackNotifier {
    constructor(config = {}) {
        this.config = {
            webhookUrl: config.webhookUrl,
            enabled: config.enabled !== false, // Default to true unless explicitly disabled
            channel: config.channel || null,
            username: config.username || 'FeedbackResolver',
            iconEmoji: config.iconEmoji || ':email:',
            ...config
        };

        if (!this.config.webhookUrl) {
            throw new Error('Slack webhook URL is required for SlackNotifier');
        }

        console.log('📱 Slack notifier initialized');
    }

    /**
     * Send analysis report to Slack
     */
    async send(analysisResult) {
        if (!this.config.enabled) {
            console.log('📱 Slack notifications disabled, skipping...');
            return { success: true, message: 'Notifications disabled' };
        }

        console.log('📤 Sending notification to Slack...');

        try {
            const message = this._formatMessage(analysisResult);
            const payload = this._buildSlackPayload(message);
            
            const response = await axios.post(this.config.webhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000 // 10 second timeout
            });

            if (response.status === 200) {
                console.log('✅ Slack notification sent successfully');
                return {
                    success: true,
                    message: 'Slack notification sent successfully',
                    timestamp: new Date().toISOString()
                };
            } else {
                throw new Error(`Unexpected response status: ${response.status}`);
            }

        } catch (error) {
            console.error('❌ Slack notification failed:', error.message);
            return {
                success: false,
                message: `Slack notification failed: ${error.message}`,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Format analysis result into Slack message
     */
    _formatMessage(analysisResult) {
        const { summary, analysis, timestamp } = analysisResult;
        
        // Handle empty reports
        if (summary.relevantEmails === 0) {
            return this._formatEmptyMessage(summary, timestamp);
        }

        // Format full report
        const date = new Date(timestamp).toLocaleDateString();
        const time = new Date(timestamp).toLocaleTimeString();
        
        let message = `🔔 *Feedback Analysis Report*\n`;
        message += `📅 ${date} at ${time}\n\n`;
        
        // Summary section
        message += `📊 *Summary*\n`;
        message += `• Total emails processed: ${summary.totalEmails}\n`;
        message += `• Relevant business communications: ${summary.relevantEmails}\n`;
        
        if (summary.categories && summary.categories.length > 0) {
            message += `• Categories found: ${summary.categories.length}\n`;
        }
        
        message += '\n';

        // Key insights
        if (summary.keyInsights && summary.keyInsights.length > 0) {
            message += `💡 *Key Insights*\n`;
            summary.keyInsights.forEach(insight => {
                message += `• ${insight}\n`;
            });
            message += '\n';
        }

        // Abbreviated analysis content
        const condensedAnalysis = this._condenseAnalysis(analysis);
        if (condensedAnalysis) {
            message += `📋 *Feedback Categories*\n`;
            message += condensedAnalysis;
        }

        // Footer
        message += `\n---\n`;
        message += `🤖 Powered by FeedbackResolver AI | ${analysisResult.metadata?.aiProvider || 'AI'} Analysis`;

        return message;
    }

    /**
     * Format message for empty reports
     */
    _formatEmptyMessage(summary, timestamp) {
        const date = new Date(timestamp).toLocaleDateString();
        const time = new Date(timestamp).toLocaleTimeString();
        
        let message = `📭 *Feedback Analysis Report*\n`;
        message += `📅 ${date} at ${time}\n\n`;
        message += `✨ No new relevant feedback found.\n`;
        
        if (summary.totalEmails > 0) {
            message += `📧 Processed ${summary.totalEmails} email(s), but none contained business-relevant feedback.\n`;
        } else {
            message += `📪 No new emails found to analyze.\n`;
        }
        
        message += `\n🔄 FeedbackResolver will continue monitoring for new feedback.`;
        
        return message;
    }

    /**
     * Condense analysis for Slack message
     */
    _condenseAnalysis(analysis) {
        if (!analysis || typeof analysis !== 'string') {
            return null;
        }

        let condensed = '';
        const lines = analysis.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            // Include category headers
            if (trimmed.startsWith('### ')) {
                condensed += `\n*${trimmed.replace('### ', '')}*\n`;
            }
            // Include bullet points but limit length
            else if (trimmed.startsWith('*   ') || trimmed.startsWith('* ')) {
                let bulletContent = trimmed.replace(/^\*\s+/, '');
                
                // Truncate long bullet points
                if (bulletContent.length > 120) {
                    bulletContent = bulletContent.substring(0, 117) + '...';
                }
                
                condensed += `• ${bulletContent}\n`;
            }
        }

        return condensed.trim() || null;
    }

    /**
     * Build Slack webhook payload
     */
    _buildSlackPayload(message) {
        const payload = {
            text: message,
            username: this.config.username,
            icon_emoji: this.config.iconEmoji
        };

        if (this.config.channel) {
            payload.channel = this.config.channel;
        }

        return payload;
    }

    /**
     * Send a simple test message to Slack
     */
    async sendTestMessage() {
        console.log('🧪 Sending test message to Slack...');

        const testMessage = `🧪 *FeedbackResolver Test*\n` +
            `✅ Slack integration is working correctly!\n` +
            `📅 ${new Date().toLocaleString()}\n\n` +
            `This is a test message to verify your Slack webhook configuration.`;

        try {
            const payload = this._buildSlackPayload(testMessage);
            const response = await axios.post(this.config.webhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });

            if (response.status === 200) {
                console.log('✅ Test message sent successfully');
                return {
                    success: true,
                    message: 'Test message sent to Slack successfully'
                };
            } else {
                throw new Error(`Unexpected response status: ${response.status}`);
            }

        } catch (error) {
            console.error('❌ Test message failed:', error.message);
            return {
                success: false,
                message: `Test message failed: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Validate Slack webhook URL and connection
     */
    async testConnection() {
        console.log('🔗 Testing Slack webhook connection...');

        try {
            // Send a minimal payload to test the webhook
            const testPayload = {
                text: '🔗 Connection test from FeedbackResolver',
                username: this.config.username
            };

            const response = await axios.post(this.config.webhookUrl, testPayload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 5000 // Shorter timeout for connection test
            });

            if (response.status === 200) {
                return {
                    success: true,
                    message: 'Slack webhook is accessible and responding',
                    responseTime: new Date().toISOString()
                };
            } else {
                return {
                    success: false,
                    message: `Webhook returned status ${response.status}`,
                    statusCode: response.status
                };
            }

        } catch (error) {
            let errorMessage = 'Unknown connection error';
            
            if (error.code === 'ECONNREFUSED') {
                errorMessage = 'Connection refused - check webhook URL';
            } else if (error.code === 'ENOTFOUND') {
                errorMessage = 'DNS resolution failed - check webhook URL';
            } else if (error.code === 'ETIMEDOUT') {
                errorMessage = 'Connection timed out - Slack may be unreachable';
            } else if (error.response) {
                errorMessage = `HTTP ${error.response.status}: ${error.response.data || 'Unknown error'}`;
            } else {
                errorMessage = error.message;
            }

            return {
                success: false,
                message: `Slack connection test failed: ${errorMessage}`,
                error: error.message
            };
        }
    }

    /**
     * Send custom message to Slack
     */
    async sendCustomMessage(text, options = {}) {
        const message = options.formatted ? text : this._escapeSlackMarkdown(text);
        
        const payload = {
            text: message,
            username: options.username || this.config.username,
            icon_emoji: options.iconEmoji || this.config.iconEmoji,
            ...(options.channel && { channel: options.channel })
        };

        try {
            const response = await axios.post(this.config.webhookUrl, payload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000
            });

            return {
                success: response.status === 200,
                status: response.status,
                message: response.status === 200 ? 'Message sent successfully' : 'Message delivery failed'
            };

        } catch (error) {
            return {
                success: false,
                message: `Failed to send message: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Escape special Slack markdown characters
     */
    _escapeSlackMarkdown(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Get notifier configuration info
     */
    getConfig() {
        return {
            type: 'slack',
            enabled: this.config.enabled,
            hasWebhookUrl: !!this.config.webhookUrl,
            username: this.config.username,
            iconEmoji: this.config.iconEmoji,
            channel: this.config.channel || 'default'
        };
    }

    /**
     * Enable or disable notifications
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        console.log(`📱 Slack notifications ${enabled ? 'enabled' : 'disabled'}`);
    }
}
