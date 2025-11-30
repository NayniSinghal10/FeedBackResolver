import { google } from 'googleapis';

/**
 * Gmail Reply Sender
 * Handles sending email replies via Gmail API with proper threading
 */
export class GmailReplySender {
    constructor(oauthManager) {
        this.oauthManager = oauthManager;
        this.gmail = null;
    }

    /**
     * Initialize Gmail API client
     */
    async _initializeGmail() {
        if (!this.gmail) {
            const authClient = this.oauthManager.getClient();
            this.gmail = google.gmail({ version: 'v1', auth: authClient });
            console.log('📤 Gmail Reply Sender initialized');
        }
    }

    /**
     * Send a reply to an email
     * @param {Object} originalEmail - The original email object
     * @param {string} replyContent - The reply message content
     * @param {Object} options - Additional options
     * @returns {Object} Result with success status and details
     */
    async sendReply(originalEmail, replyContent, options = {}) {
        await this._initializeGmail();

        try {
            // Extract sender email from "From" header
            const toEmail = this._extractEmail(originalEmail.from);
            const subject = originalEmail.subject.startsWith('Re:') 
                ? originalEmail.subject 
                : `Re: ${originalEmail.subject}`;

            // Create RFC 2822 formatted email message
            const rawMessage = this._createRawMessage({
                to: toEmail,
                subject: subject,
                body: replyContent,
                threadId: originalEmail.threadId,
                messageId: originalEmail.id,
                inReplyTo: originalEmail.id
            });

            // Send the email
            const response = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: rawMessage,
                    threadId: originalEmail.threadId // This ensures threading
                }
            });

            console.log(`✅ Reply sent successfully to ${toEmail}`);

            return {
                success: true,
                messageId: response.data.id,
                threadId: response.data.threadId,
                to: toEmail,
                subject: subject,
                sentAt: new Date().toISOString()
            };

        } catch (error) {
            console.error(`❌ Failed to send reply to ${originalEmail.from}:`, error.message);
            return {
                success: false,
                error: error.message,
                to: this._extractEmail(originalEmail.from),
                subject: originalEmail.subject
            };
        }
    }

    /**
     * Send multiple replies in batch
     * @param {Array} repliesData - Array of {email, replyContent} objects
     * @returns {Object} Results summary
     */
    async sendBatch(repliesData) {
        const results = {
            sent: [],
            failed: [],
            total: repliesData.length
        };

        console.log(`📤 Sending ${repliesData.length} email replies...`);

        for (const { email, replyContent } of repliesData) {
            const result = await this.sendReply(email, replyContent);
            
            if (result.success) {
                results.sent.push({
                    ...result,
                    originalEmail: email
                });
            } else {
                results.failed.push({
                    ...result,
                    originalEmail: email
                });
            }

            // Small delay to avoid rate limiting
            await this._delay(500);
        }

        console.log(`✅ Batch send complete: ${results.sent.length} sent, ${results.failed.length} failed`);
        return results;
    }

    /**
     * Create RFC 2822 formatted email message
     * @private
     */
    _createRawMessage({ to, subject, body, threadId, messageId, inReplyTo }) {
        const messageParts = [
            `To: ${to}`,
            `Subject: ${subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=utf-8',
            'Content-Transfer-Encoding: 7bit'
        ];

        // Add threading headers for proper Gmail conversation threading
        if (inReplyTo) {
            messageParts.push(`In-Reply-To: <${inReplyTo}>`);
            messageParts.push(`References: <${inReplyTo}>`);
        }

        // Add empty line between headers and body
        messageParts.push('');
        messageParts.push(body);

        const message = messageParts.join('\r\n');

        // Encode the message in base64url format
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        return encodedMessage;
    }

    /**
     * Extract email address from "Name <email@domain.com>" format
     * @private
     */
    _extractEmail(fromHeader) {
        const emailMatch = fromHeader.match(/<(.+?)>/);
        return emailMatch ? emailMatch[1] : fromHeader;
    }

    /**
     * Delay helper for rate limiting
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Test sending capability
     */
    async testConnection() {
        try {
            await this._initializeGmail();
            
            // Test by getting user profile (doesn't send anything)
            const profile = await this.gmail.users.getProfile({ userId: 'me' });
            
            return {
                success: true,
                message: `Reply sender ready for ${profile.data.emailAddress}`,
                email: profile.data.emailAddress
            };
        } catch (error) {
            return {
                success: false,
                message: `Reply sender connection failed: ${error.message}`,
                error: error.message
            };
        }
    }

    /**
     * Send a test email to yourself
     */
    async sendTestEmail() {
        try {
            await this._initializeGmail();
            
            const profile = await this.gmail.users.getProfile({ userId: 'me' });
            const myEmail = profile.data.emailAddress;

            const rawMessage = this._createRawMessage({
                to: myEmail,
                subject: 'FeedbackResolver Test Email',
                body: 'This is a test email from FeedbackResolver to verify email sending capability.\n\nIf you received this, the reply sender is working correctly!'
            });

            const response = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: rawMessage
                }
            });

            return {
                success: true,
                message: `Test email sent to ${myEmail}`,
                messageId: response.data.id
            };
        } catch (error) {
            return {
                success: false,
                message: `Test email failed: ${error.message}`,
                error: error.message
            };
        }
    }
}