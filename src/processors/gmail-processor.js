import { google } from 'googleapis';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Gmail Email Processor
 * Handles fetching and processing emails from Gmail API
 */
export class GmailProcessor {
    constructor(config, oauthManager) {
        this.config = {
            targetEmail: config.targetEmail || null,
            daysToSearch: config.daysToSearch || 10,
            maxResults: config.maxResults || 20,
            ...config
        };
        this.oauthManager = oauthManager;
        this.gmail = null;
        
        // Email tracking for deduplication
        this.processedEmailsFile = path.join(process.cwd(), '.processed-emails.json');
    }

    /**
     * Initialize Gmail API client
     */
    async _initializeGmail() {
        if (!this.gmail) {
            const authClient = this.oauthManager.getClient();
            this.gmail = google.gmail({ version: 'v1', auth: authClient });
            console.log('📧 Gmail API client initialized');
        }
    }

    /**
     * Process emails from Gmail
     */
    async process() {
        await this._initializeGmail();
        
        console.log(`📥 Fetching emails from Gmail...`);
        
        // Load previously processed email IDs
        const processedIds = await this._loadProcessedEmails();
        
        // Build Gmail query
        const query = this._buildQuery();
        console.log(`🔍 Gmail query: ${query}`);
        
        // Fetch email list
        const messages = await this._fetchEmailList(query);
        
        if (messages.length === 0) {
            console.log(`📭 No emails found matching the query`);
            return [];
        }
        
        // Filter out already processed emails
        const newMessages = messages.filter(msg => !processedIds.includes(msg.id));
        console.log(`📬 Found ${newMessages.length} new emails to process`);
        
        if (newMessages.length === 0) {
            console.log('✅ All emails already processed');
            return [];
        }
        
        // Fetch full email details
        const emails = await this._fetchEmailDetails(newMessages);
        
        // Update processed emails list
        const newIds = newMessages.map(msg => msg.id);
        await this._saveProcessedEmails([...processedIds, ...newIds]);
        
        console.log(`✅ Successfully processed ${emails.length} emails`);
        return emails;
    }

    /**
     * Build Gmail search query
     */
    _buildQuery() {
        let query = 'is:unread';
        
        // Add target email filter if specified
        if (this.config.targetEmail) {
            query += ` to:${this.config.targetEmail}`;
        }
        
        // Add date filter
        query += ` newer_than:${this.config.daysToSearch}d`;
        
        return query;
    }

    /**
     * Fetch list of emails matching query
     */
    async _fetchEmailList(query) {
        try {
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: this.config.maxResults
            });
            
            return response.data.messages || [];
        } catch (error) {
            console.error('❌ Failed to fetch email list:', error.message);
            throw new Error(`Gmail API error: ${error.message}`);
        }
    }

    /**
     * Fetch detailed content for each email
     */
    async _fetchEmailDetails(messages) {
        const emails = [];
        
        console.log(`📄 Fetching details for ${messages.length} emails...`);
        
        for (const message of messages) {
            try {
                const emailDetail = await this._fetchSingleEmail(message.id);
                emails.push(emailDetail);
            } catch (error) {
                console.error(`⚠️  Failed to fetch email ${message.id}:`, error.message);
                // Continue processing other emails
            }
        }
        
        return emails;
    }

    /**
     * Fetch detailed content for a single email
     */
    async _fetchSingleEmail(messageId) {
        const response = await this.gmail.users.messages.get({
            userId: 'me',
            id: messageId
        });
        
        const message = response.data;
        const payload = message.payload;
        
        // Extract headers
        const headers = payload.headers || [];
        const fromHeader = headers.find(h => h.name === 'From')?.value || 'Unknown';
        const subjectHeader = headers.find(h => h.name === 'Subject')?.value || 'No subject';
        const dateHeader = headers.find(h => h.name === 'Date')?.value || 'Unknown date';
        
        // Extract body content
        const body = this._extractEmailBody(payload);
        
        return {
            id: messageId,
            from: fromHeader,
            subject: subjectHeader,
            date: dateHeader,
            body: body.trim(),
            snippet: message.snippet || '',
            threadId: message.threadId
        };
    }

    /**
     * Extract email body content from message payload
     */
    _extractEmailBody(payload) {
        let body = '';
        
        if (payload.parts) {
            // Multi-part message - look for text/plain
            const textPart = payload.parts.find(part => part.mimeType === 'text/plain');
            if (textPart && textPart.body.data) {
                body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
            } else {
                // Fallback to first part with data
                const partWithData = payload.parts.find(part => part.body.data);
                if (partWithData) {
                    body = Buffer.from(partWithData.body.data, 'base64').toString('utf8');
                }
            }
        } else if (payload.body && payload.body.data) {
            // Single-part message
            body = Buffer.from(payload.body.data, 'base64').toString('utf8');
        }
        
        // Clean up common email artifacts
        return this._cleanEmailBody(body);
    }

    /**
     * Clean up email body content
     */
    _cleanEmailBody(body) {
        if (!body) return '';
        
        // Remove common email signatures and footers
        const cleanPatterns = [
            /--\s*\r?\n.*$/s, // Signature separator
            /^\s*On .* wrote:\s*$/m, // Reply headers
            /^\s*From:\s*.*$/m, // Forward headers
            /^\s*Sent:\s*.*$/m, // Outlook headers
        ];
        
        let cleaned = body;
        for (const pattern of cleanPatterns) {
            cleaned = cleaned.replace(pattern, '');
        }
        
        // Remove excessive whitespace
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        cleaned = cleaned.replace(/[ \t]+/g, ' ');
        
        return cleaned.trim();
    }

    /**
     * Load previously processed email IDs
     */
    async _loadProcessedEmails() {
        try {
            await fs.access(this.processedEmailsFile);
            const data = await fs.readFile(this.processedEmailsFile, 'utf8');
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Save processed email IDs
     */
    async _saveProcessedEmails(emailIds) {
        try {
            // Keep only the last 1000 IDs to prevent file from growing too large
            const trimmedIds = emailIds.slice(-1000);
            await fs.writeFile(this.processedEmailsFile, JSON.stringify(trimmedIds, null, 2));
        } catch (error) {
            console.error('⚠️  Failed to save processed emails:', error.message);
        }
    }

    /**
     * Get account information
     */
    async getAccountInfo() {
        await this._initializeGmail();
        
        try {
            const profile = await this.gmail.users.getProfile({ userId: 'me' });
            return {
                email: profile.data.emailAddress,
                threadsTotal: profile.data.threadsTotal,
                messagesTotal: profile.data.messagesTotal,
                historyId: profile.data.historyId
            };
        } catch (error) {
            throw new Error(`Failed to get account info: ${error.message}`);
        }
    }

    /**
     * Mark emails as read (optional functionality)
     */
    async markAsRead(messageIds) {
        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return;
        }

        await this._initializeGmail();
        
        try {
            // Batch modify messages to mark as read
            await this.gmail.users.messages.batchModify({
                userId: 'me',
                requestBody: {
                    ids: messageIds,
                    removeLabelIds: ['UNREAD']
                }
            });
            
            console.log(`📖 Marked ${messageIds.length} emails as read`);
        } catch (error) {
            console.error('⚠️  Failed to mark emails as read:', error.message);
        }
    }

    /**
     * Search emails with custom query
     */
    async searchEmails(customQuery) {
        await this._initializeGmail();
        
        try {
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                q: customQuery,
                maxResults: this.config.maxResults
            });
            
            const messages = response.data.messages || [];
            return await this._fetchEmailDetails(messages);
        } catch (error) {
            throw new Error(`Search failed: ${error.message}`);
        }
    }

    /**
     * Get email thread
     */
    async getThread(threadId) {
        await this._initializeGmail();
        
        try {
            const response = await this.gmail.users.threads.get({
                userId: 'me',
                id: threadId
            });
            
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get thread: ${error.message}`);
        }
    }

    /**
     * Test Gmail connection
     */
    async testConnection() {
        try {
            await this._initializeGmail();
            const accountInfo = await this.getAccountInfo();
            return {
                success: true,
                message: `Connected to ${accountInfo.email}`,
                details: accountInfo
            };
        } catch (error) {
            return {
                success: false,
                message: `Connection failed: ${error.message}`,
                error: error.message
            };
        }
    }
}
