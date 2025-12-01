import { NeuroLink } from '@juspay/neurolink';

/**
 * AI-powered feedback analyzer using NeuroLink
 * Handles email triage and consolidated analysis
 */
export class AIAnalyzer {
    constructor(config = {}) {
        this.config = {
            provider: config.provider || 'vertex',
            model: config.model || null,
            timeout: config.timeout || '30000s',
            ...config
        };
        
        this.neurolink = new NeuroLink();
        console.log(`🤖 AI Analyzer initialized with ${this.config.provider} provider`);
    }

    /**
     * Main analysis method - processes emails through AI pipeline
     */
    async analyze(emails) {
        console.log(`🔍 Starting AI analysis of ${emails.length} emails...`);
        
        if (emails.length === 0) {
            return this._generateEmptyReport();
        }

        try {
            // Stage 1: Triage emails for relevance
            console.log('📋 Stage 1: Triaging emails for business relevance...');
            const triageResults = await this._triageEmails(emails);
            
            // Separate relevant and non-relevant emails
            const relevantEmails = triageResults.filter(result => result.isRelevant);
            const nonRelevantEmails = triageResults.filter(result => !result.isRelevant);
            console.log(`✅ Found ${relevantEmails.length} relevant emails and ${nonRelevantEmails.length} general emails out of ${emails.length}`);
            
            // Stage 2: Consolidated analysis (include ALL emails)
            console.log('📊 Stage 2: Performing consolidated analysis...');
            const consolidatedAnalysis = await this._performConsolidatedAnalysis(triageResults);

            // Generate final report
            const report = this._generateReport(consolidatedAnalysis, relevantEmails.length, emails.length, nonRelevantEmails.length);
            
            console.log('✅ AI analysis completed successfully');
            return report;

        } catch (error) {
            console.error('❌ AI analysis failed:', error.message);
            throw new Error(`AI analysis failed: ${error.message}`);
        }
    }

    /**
     * Analyze emails with reply detection - identifies which emails need responses
     * @param {Array} emails - Array of email objects
     * @returns {Object} Analysis with replyable emails identified
     */
    async analyzeWithReplies(emails) {
        console.log(`🔍 Starting AI analysis with reply detection for ${emails.length} emails...`);
        
        if (emails.length === 0) {
            return this._generateEmptyReport();
        }

        try {
            // Stage 1: Triage emails for relevance AND reply detection
            console.log('📋 Stage 1: Triaging emails and detecting replyable messages...');
            const triageResults = await this._triageEmailsWithReplyDetection(emails);
            
            // Separate relevant, replyable, and non-relevant emails
            const relevantEmails = triageResults.filter(result => result.isRelevant);
            const replyableEmails = triageResults.filter(result => result.isReplyable);
            const nonRelevantEmails = triageResults.filter(result => !result.isRelevant);
            
            console.log(`✅ Found ${relevantEmails.length} relevant emails, ${replyableEmails.length} need replies`);
            
            // Stage 2: Consolidated analysis
            console.log('📊 Stage 2: Performing consolidated analysis...');
            const consolidatedAnalysis = await this._performConsolidatedAnalysis(triageResults);

            // Generate final report with reply information
            const report = this._generateReport(consolidatedAnalysis, relevantEmails.length, emails.length, nonRelevantEmails.length);
            
            // Add replyable emails to the report
            report.replyableEmails = replyableEmails.map(result => ({
                email: result.email,
                suggestedReply: result.suggestedReply,
                replyReason: result.replyReason,
                replyConfidence: result.replyConfidence,
                isReplyable: result.isReplyable
            }));
            
            report.summary.replyableEmails = replyableEmails.length;
            
            console.log('✅ AI analysis with reply detection completed successfully');
            return report;

        } catch (error) {
            console.error('❌ AI analysis failed:', error.message);
            throw new Error(`AI analysis failed: ${error.message}`);
        }
    }

    /**
     * Triage emails with reply detection
     * @private
     */
    async _triageEmailsWithReplyDetection(emails) {
        const results = [];
        
        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            console.log(`📧 Analyzing email ${i + 1}/${emails.length} from: ${email.from}`);
            
            try {
                const triageResult = await this._triageEmailWithReply(email);
                results.push({
                    ...triageResult,
                    email: email
                });
            } catch (error) {
                console.error(`⚠️  Analysis failed for email from ${email.from}:`, error.message);
                // Default to not relevant and not replyable if analysis fails
                results.push({
                    isRelevant: false,
                    isReplyable: false,
                    cleanedMessage: email.body,
                    email: email,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Triage a single email with reply detection
     * @private
     */
    async _triageEmailWithReply(email) {
        const prompt = this._buildTriageWithReplyPrompt(email);
        
        const response = await this.neurolink.generate({
            input: { text: prompt },
            provider: this.config.provider,
            timeout: this.config.timeout,
            ...(this.config.model && { model: this.config.model })
        });

        const parsed = this._extractJsonFromResponse(response.content);
        
        if (!parsed || typeof parsed.isRelevant !== 'boolean') {
            console.warn('Invalid triage response format, defaulting to not relevant');
            return {
                isRelevant: false,
                isReplyable: false,
                cleanedMessage: email.body,
                from: email.from
            };
        }

        return {
            isRelevant: parsed.isRelevant,
            isReplyable: parsed.isReplyable || false,
            cleanedMessage: (parsed.cleanedMessage || email.body).trim(),
            suggestedReply: parsed.suggestedReply || null,
            replyReason: parsed.replyReason || null,
            replyConfidence: parsed.replyConfidence || null,
            from: email.from,
            confidence: parsed.confidence || null,
            category: parsed.category || null
        };
    }

    /**
     * Build triage prompt with reply detection
     * @private
     */
    _buildTriageWithReplyPrompt(email) {
        // Check if email is from a no-reply address
        const isNoReply = this._isNoReplyAddress(email.from);
        
        return `
Analyze the following email and determine:
1. If it is a relevant business communication
2. If it requires a reply from us

Guidelines for relevance:
- Relevant: Queries, feedback, feature requests, support issues, business inquiries, meeting requests
- Not relevant: Spam, marketing, newsletters, automated notifications, receipts, out-of-office replies

Guidelines for replyability:
- Needs reply: Questions, support requests, feature inquiries, meeting requests, complaints, feedback requiring acknowledgment
- No reply needed: FYI messages, confirmations, thank you notes, automated notifications, spam
- NEVER reply to: no-reply addresses, do-not-reply addresses, automated system emails, notification emails

**CRITICAL: The sender email is "${email.from}". ${isNoReply ? 'This is a NO-REPLY address - set isReplyable to FALSE regardless of content.' : 'Check if this is a replyable address.'}**

If the email needs a reply AND the sender address is replyable, generate a professional, contextual response that:
- Addresses the sender's specific concerns
- Provides helpful information or next steps
- Maintains a professional and friendly tone
- Is ready to send (complete sentences, proper formatting)

Return result as JSON with these fields:
- "isRelevant" (boolean): true if business-relevant
- "isReplyable" (boolean): true ONLY if this email needs a response AND the sender address is replyable (not no-reply/do-not-reply)
- "cleanedMessage" (string): complete email content with subject line
- "suggestedReply" (string): if isReplyable is true, provide a complete, ready-to-send reply
- "replyReason" (string): if isReplyable is true, brief explanation why it needs a reply
- "replyConfidence" (number): if isReplyable is true, confidence score 0-1 for the suggested reply
- "confidence" (number): confidence score 0-1 for relevance classification
- "category" (string): brief category if relevant

Email to analyze:
---
From: ${email.from}
Subject: ${email.subject}
Date: ${email.date}

${email.body}
---

JSON Response:`;
    }

    /**
     * Check if an email address is a no-reply address
     * @private
     */
    _isNoReplyAddress(emailAddress) {
        if (!emailAddress) return true;
        
        const lowerEmail = emailAddress.toLowerCase();
        const noReplyPatterns = [
            'noreply',
            'no-reply',
            'no_reply',
            'donotreply',
            'do-not-reply',
            'do_not_reply',
            'notifications@',
            'automated@',
            'system@',
            'mailer@',
            'daemon@',
            'postmaster@'
        ];
        
        return noReplyPatterns.some(pattern => lowerEmail.includes(pattern));
    }

    /**
     * Triage individual emails for business relevance
     */
    async _triageEmails(emails) {
        const results = [];
        
        for (let i = 0; i < emails.length; i++) {
            const email = emails[i];
            console.log(`📧 Triaging email ${i + 1}/${emails.length} from: ${email.from}`);
            
            try {
                const triageResult = await this._triageEmail(email);
                results.push({
                    ...triageResult,
                    email: email
                });
            } catch (error) {
                console.error(`⚠️  Triage failed for email from ${email.from}:`, error.message);
                // Default to not relevant if triage fails
                results.push({
                    isRelevant: false,
                    cleanedMessage: email.body,
                    email: email,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Triage a single email for relevance
     */
    async _triageEmail(email) {
        const prompt = this._buildTriagePrompt(email);
        
        const response = await this.neurolink.generate({
            input: { text: prompt },
            provider: this.config.provider,
            timeout: this.config.timeout,
            ...(this.config.model && { model: this.config.model })
        });

        const parsed = this._extractJsonFromResponse(response.content);
        
        if (!parsed || typeof parsed.isRelevant !== 'boolean') {
            console.warn('Invalid triage response format, defaulting to not relevant');
            return {
                isRelevant: false,
                cleanedMessage: email.body,
                from: email.from
            };
        }

        return {
            isRelevant: parsed.isRelevant,
            cleanedMessage: (parsed.cleanedMessage || email.body).trim(),
            from: email.from,
            confidence: parsed.confidence || null,
            category: parsed.category || null
        };
    }

    /**
     * Perform consolidated analysis on all emails (relevant and non-relevant)
     * Processes in batches to avoid token limits
     */
    async _performConsolidatedAnalysis(allTriageResults) {
        // Limit batch size to prevent token overflow
        const BATCH_SIZE = 15; // Process max 15 emails at a time
        
        if (allTriageResults.length <= BATCH_SIZE) {
            // Small batch - process all at once
            return await this._processBatch(allTriageResults);
        }
        
        // Large batch - process in chunks and combine
        console.log(`⚠️  Processing ${allTriageResults.length} emails in batches of ${BATCH_SIZE} to avoid token limits...`);
        const batches = [];
        
        for (let i = 0; i < allTriageResults.length; i += BATCH_SIZE) {
            const batch = allTriageResults.slice(i, i + BATCH_SIZE);
            console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allTriageResults.length / BATCH_SIZE)} (${batch.length} emails)...`);
            const batchResult = await this._processBatch(batch);
            batches.push(batchResult);
        }
        
        // Combine all batch results
        return batches.join('\n\n---\n\n## Next Batch\n\n');
    }
    
    /**
     * Process a single batch of emails
     * @private
     */
    async _processBatch(triageResults) {
        const emailBatch = triageResults
            .map(result => `(From: ${result.from}) [${result.isRelevant ? 'RELEVANT' : 'GENERAL'}]\n${result.cleanedMessage}`)
            .join('\n\n---\n\n');

        const prompt = this._buildConsolidatedPrompt(emailBatch);

        const response = await this.neurolink.generate({
            input: { text: prompt },
            provider: this.config.provider,
            timeout: this.config.timeout,
            ...(this.config.model && { model: this.config.model })
        });

        return response.content;
    }

    /**
     * Build triage prompt for individual email
     */
    _buildTriagePrompt(email) {
        return `
Analyze the following email and determine if it is a relevant business communication.

Guidelines:
- Relevant: Queries, feedback, feature requests, support issues, business inquiries, meeting requests
- Not relevant: Spam, marketing, newsletters, automated notifications, receipts, out-of-office replies

Preserve the complete email content for detailed analysis - do not truncate or summarize.

Return result as JSON with these fields:
- "isRelevant" (boolean): true if business-relevant
- "cleanedMessage" (string): complete email content with subject line, preserving all important details
- "confidence" (number): confidence score 0-1 (optional)
- "category" (string): brief category if relevant (optional)

Email to analyze:
---
From: ${email.from}
Subject: ${email.subject}

${email.body}
---

JSON Response:`;
    }

    /**
     * Build consolidated analysis prompt
     */
    _buildConsolidatedPrompt(emailBatch) {
        return `
Analyze the entire block of text below, which contains multiple cleaned email messages separated by "---". 
Each message is tagged as [RELEVANT] or [GENERAL] to help with categorization.
Your task is to read all messages and generate a comprehensive Markdown report with detailed analysis and intelligent replies.

Every message should be represented in the final report with complete details and contextual responses.

Use this structure for the report:

**Consolidated Feedback Analysis Report**

### Technical Queries & Issues
For each email in this category, provide:
**Email from [Sender Name/Company]**
- **Subject:** [Full email subject]
- **Analysis:** [Detailed explanation of the technical issue, including context, impact, and specifics]
- **Suggested Reply:**
\`\`\`
[Generate a helpful, specific reply that addresses their technical concern with practical solutions, troubleshooting steps, or next actions. Make it professional and actionable.]
\`\`\`

### Feature & Implementation Requests  
For each email in this category, provide:
**Email from [Sender Name/Company]**
- **Subject:** [Full email subject]
- **Analysis:** [Detailed explanation of the feature request, business justification, and requirements]
- **Suggested Reply:**
\`\`\`
[Generate a thoughtful response acknowledging their request, explaining feasibility, timeline considerations, or alternative solutions.]
\`\`\`

### Service & Billing Changes
For each email in this category, provide:
**Email from [Sender Name/Company]**
- **Subject:** [Full email subject]
- **Analysis:** [Detailed explanation of the service/billing request and business implications]
- **Suggested Reply:**
\`\`\`
[Generate a helpful response with specific next steps, policy explanations, or account management guidance.]
\`\`\`

### Meeting & Scheduling Requests
For each email in this category, provide:
**Email from [Sender Name/Company]**
- **Subject:** [Full email subject]
- **Analysis:** [Detailed explanation of the meeting purpose, urgency, and context]
- **Suggested Reply:**
\`\`\`
[Generate a professional response with availability, meeting logistics, or scheduling coordination.]
\`\`\`

### General Inquiries & Communications
For each email in this category, provide:
**Email from [Sender Name/Company]**
- **Subject:** [Full email subject]
- **Analysis:** [Detailed explanation of their inquiry or communication purpose]
- **Suggested Reply:**
\`\`\`
[Generate a helpful, specific response that addresses their question or provides relevant information. Even for general emails, make it contextual and useful.]
\`\`\`

**Important Rules:**
- Provide complete email analysis, not summaries or snippets
- Generate intelligent, contextual replies that specifically address each sender's needs
- Include all relevant details from the email content
- Make suggested replies professional, helpful, and actionable
- Do not use generic responses - tailor each reply to the specific email content
- Include sender information clearly
- If technical details are mentioned, address them specifically in the reply

Messages to analyze:
---
${emailBatch}
---

Consolidated Report:`;
    }

    /**
     * Extract JSON from AI response
     */
    _extractJsonFromResponse(responseContent) {
        try {
            // Try to find JSON in code blocks first
            const codeBlockMatch = responseContent.match(/```json\s*([\s\S]*?)```/);
            if (codeBlockMatch) {
                return JSON.parse(codeBlockMatch[1]);
            }

            // Try to find JSON in the response directly
            const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            console.warn('No JSON found in AI response');
            return null;
        } catch (error) {
            console.error('Failed to parse JSON from AI response:', error.message);
            return null;
        }
    }

    /**
     * Generate final analysis report
     */
    _generateReport(consolidatedAnalysis, relevantCount, totalCount, generalCount = 0) {
        const timestamp = new Date().toISOString();
        const summary = this._extractSummary(consolidatedAnalysis);

        return {
            timestamp,
            summary: {
                totalEmails: totalCount,
                relevantEmails: relevantCount,
                generalEmails: generalCount,
                categories: summary.categories,
                keyInsights: summary.insights
            },
            analysis: consolidatedAnalysis,
            metadata: {
                aiProvider: this.config.provider,
                model: this.config.model,
                processingTime: new Date().toISOString()
            }
        };
    }

    /**
     * Generate empty report when no emails found
     */
    _generateEmptyReport(reason = 'No emails found to analyze.') {
        return {
            timestamp: new Date().toISOString(),
            summary: {
                totalEmails: 0,
                relevantEmails: 0,
                categories: [],
                keyInsights: [reason]
            },
            analysis: `# Feedback Analysis Report - ${new Date().toLocaleDateString()}\n\n${reason}`,
            metadata: {
                aiProvider: this.config.provider,
                model: this.config.model,
                processingTime: new Date().toISOString()
            }
        };
    }

    /**
     * Extract summary insights from consolidated analysis
     */
    _extractSummary(analysisContent) {
        const categories = [];
        const insights = [];

        // Extract categories from markdown headers
        const categoryMatches = analysisContent.match(/### ([^#\n]+)/g);
        if (categoryMatches) {
            categories.push(...categoryMatches.map(match => match.replace('### ', '').trim()));
        }

        // Count items in each category
        const bulletPoints = analysisContent.match(/^\s*\*\s+.+$/gm);
        const itemCount = bulletPoints ? bulletPoints.length : 0;

        if (itemCount > 0) {
            insights.push(`${itemCount} feedback items identified across ${categories.length} categories`);
        }

        // Extract key themes
        if (analysisContent.includes('Technical')) {
            insights.push('Technical issues and integration requests present');
        }
        if (analysisContent.includes('Feature')) {
            insights.push('Feature enhancement requests identified');
        }
        if (analysisContent.includes('Meeting')) {
            insights.push('Meeting and scheduling requests found');
        }

        return { categories, insights };
    }

    /**
     * Test AI connection and capabilities
     */
    async testConnection() {
        try {
            console.log('🧪 Testing AI analyzer connection...');
            
            const testPrompt = 'Respond with JSON: {"status": "connected", "provider": "' + this.config.provider + '"}';
            
            const response = await this.neurolink.generate({
                input: { text: testPrompt },
                provider: this.config.provider,
                timeout: '10000s'
            });

            const parsed = this._extractJsonFromResponse(response.content);

            return {
                success: true,
                message: `AI analyzer connected successfully using ${this.config.provider}`,
                response: parsed,
                provider: this.config.provider
            };
        } catch (error) {
            return {
                success: false,
                message: `AI analyzer connection failed: ${error.message}`,
                error: error.message,
                provider: this.config.provider
            };
        }
    }

    /**
     * Analyze sentiment of feedback (optional feature)
     */
    async analyzeSentiment(emails) {
        if (emails.length === 0) return null;

        try {
            const sentimentPrompt = `
Analyze the overall sentiment of these feedback messages and provide a JSON response:

Messages:
${emails.map(e => `- ${e.body.substring(0, 200)}...`).join('\n')}

Respond with JSON:
{
  "overallSentiment": "positive|neutral|negative",
  "confidence": 0.85,
  "breakdown": {
    "positive": 2,
    "neutral": 3, 
    "negative": 1
  },
  "insights": ["Key insight 1", "Key insight 2"]
}`;

            const response = await this.neurolink.generate({
                input: { text: sentimentPrompt },
                provider: this.config.provider,
                timeout: this.config.timeout
            });

            return this._extractJsonFromResponse(response.content);
        } catch (error) {
            console.error('Sentiment analysis failed:', error.message);
            return null;
        }
    }

    /**
     * Get AI provider capabilities
     */
    getProviderInfo() {
        return {
            provider: this.config.provider,
            model: this.config.model,
            timeout: this.config.timeout,
            features: {
                triage: true,
                consolidatedAnalysis: true,
                sentimentAnalysis: true,
                jsonParsing: true
            }
        };
    }
}
