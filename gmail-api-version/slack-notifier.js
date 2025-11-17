import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

class SlackNotifier {
    constructor() {
        this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
        this.enabled = process.env.SLACK_ENABLED === 'true';
        
        if (this.enabled && !this.webhookUrl) {
            console.warn('⚠️  Slack is enabled but SLACK_WEBHOOK_URL is not configured');
            this.enabled = false;
        }
    }

    /**
     * Format analysis report for Slack
     */
    formatForSlack(analysisData) {
        const { relevantEmails, reportPath } = analysisData;
        const timestamp = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Read the markdown report to extract categories
        let reportContent = '';
        try {
            reportContent = fs.readFileSync(reportPath, 'utf8');
        } catch (error) {
            console.warn('Could not read report file for Slack formatting:', error.message);
        }

        // Extract sections from the markdown
        const sections = this.extractSections(reportContent);
        
        // Build Slack message
        let message = `🔔 *Feedback Analysis Report*\n`;
        message += `📅 ${timestamp}\n\n`;
        
        if (relevantEmails === 0) {
            message += `📊 No new feedback emails found.\n`;
            message += `✅ All caught up!`;
            return { text: message };
        }

        message += `📊 *Summary*: ${relevantEmails} relevant email${relevantEmails > 1 ? 's' : ''} processed\n\n`;

        // Add categorized feedback
        if (sections.technical && sections.technical.length > 0) {
            message += `🔧 *Technical Queries & Issues*:\n`;
            sections.technical.forEach(item => message += `   • ${item}\n`);
            message += `\n`;
        }

        if (sections.features && sections.features.length > 0) {
            message += `✨ *Feature & Implementation Requests*:\n`;
            sections.features.forEach(item => message += `   • ${item}\n`);
            message += `\n`;
        }

        if (sections.service && sections.service.length > 0) {
            message += `💼 *Service & Billing Changes*:\n`;
            sections.service.forEach(item => message += `   • ${item}\n`);
            message += `\n`;
        }

        if (sections.meetings && sections.meetings.length > 0) {
            message += `📅 *Meeting & Scheduling Requests*:\n`;
            sections.meetings.forEach(item => message += `   • ${item}\n`);
            message += `\n`;
        }

        if (sections.general && sections.general.length > 0) {
            message += `💬 *General Inquiries & Communications*:\n`;
            sections.general.forEach(item => message += `   • ${item}\n`);
            message += `\n`;
        }

        message += `📄 Full report saved to: \`${reportPath}\``;

        return { text: message };
    }

    /**
     * Extract sections from markdown content
     */
    extractSections(content) {
        const sections = {
            technical: [],
            features: [],
            service: [],
            meetings: [],
            general: []
        };

        const lines = content.split('\n');
        let currentSection = null;

        for (const line of lines) {
            if (line.includes('Technical Queries & Issues')) {
                currentSection = 'technical';
            } else if (line.includes('Feature & Implementation Requests')) {
                currentSection = 'features';
            } else if (line.includes('Service & Billing Changes')) {
                currentSection = 'service';
            } else if (line.includes('Meeting & Scheduling Requests')) {
                currentSection = 'meetings';
            } else if (line.includes('General Inquiries & Communications')) {
                currentSection = 'general';
            } else if (line.startsWith('*   ') && currentSection) {
                // Extract bullet point content
                const content = line.replace('*   ', '').trim();
                if (content) {
                    sections[currentSection].push(content);
                }
            }
        }

        return sections;
    }

    /**
     * Send message to Slack
     */
    async sendNotification(analysisData) {
        if (!this.enabled) {
            console.log('📢 Slack notifications disabled');
            return { success: false, reason: 'disabled' };
        }

        try {
            const slackMessage = this.formatForSlack(analysisData);
            
            console.log('📤 Sending feedback report to Slack...');
            
            const response = await axios.post(this.webhookUrl, slackMessage, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 200) {
                console.log('✅ Slack notification sent successfully');
                return { success: true };
            } else {
                throw new Error(`Unexpected response status: ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to send Slack notification:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Test Slack connection
     */
    async testConnection() {
        if (!this.enabled) {
            return { success: false, reason: 'Slack notifications are disabled' };
        }

        try {
            const testMessage = {
                text: '🧪 *Test Message*\nFeedbackResolver Slack integration is working! 🎉'
            };

            const response = await axios.post(this.webhookUrl, testMessage);
            
            if (response.status === 200) {
                return { success: true, message: 'Slack connection test successful' };
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

export default SlackNotifier;
