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
            
            // Filter relevant emails
            const relevantEmails = triageResults.filter(result => result.isRelevant);
            console.log(`✅ Found ${relevantEmails.length} relevant emails out of ${emails.length}`);
            
            if (relevantEmails.length === 0) {
                return this._generateEmptyReport('No relevant business communications found.');
            }

            // Stage 2: Consolidated analysis
            console.log('📊 Stage 2: Performing consolidated analysis...');
            const consolidatedAnalysis = await this._performConsolidatedAnalysis(relevantEmails);

            // Generate final report
            const report = this._generateReport(consolidatedAnalysis, relevantEmails.length, emails.length);
            
            console.log('✅ AI analysis completed successfully');
            return report;

        } catch (error) {
            console.error('❌ AI analysis failed:', error.message);
            throw new Error(`AI analysis failed: ${error.message}`);
        }
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
     * Perform consolidated analysis on relevant emails
     */
    async _performConsolidatedAnalysis(relevantEmails) {
        const emailBatch = relevantEmails
            .map(result => `(From: ${result.from})\n${result.cleanedMessage}`)
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

If relevant, extract the core message removing greetings, signatures, and conversational fluff.

Return result as JSON with these fields:
- "isRelevant" (boolean): true if business-relevant
- "cleanedMessage" (string): cleaned core message if relevant, otherwise empty
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
Your task is to read all messages and generate a consolidated Markdown report categorizing the key information.

Every message should be represented in the final report. Do not skip any content.

Use this structure for the report:

**Consolidated Feedback Analysis Report**

### Technical Queries & Issues
*   [List technical problems, bugs, integration issues with sender attribution]

### Feature & Implementation Requests  
*   [List feature requests, enhancement suggestions with sender attribution]

### Service & Billing Changes
*   [List service modifications, billing requests, account changes with sender attribution]

### Meeting & Scheduling Requests
*   [List meeting requests, call scheduling with sender attribution]

### General Inquiries & Communications
*   [List general questions, informational requests with sender attribution]

**Important Rules:**
- Categorize every message appropriately
- Include sender information: "(From: Name/Email)"
- Use clear, concise bullet points
- Do not invent information not present in the text
- If unsure about categorization, use "General Inquiries"

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
    _generateReport(consolidatedAnalysis, relevantCount, totalCount) {
        const timestamp = new Date().toISOString();
        const summary = this._extractSummary(consolidatedAnalysis);

        return {
            timestamp,
            summary: {
                totalEmails: totalCount,
                relevantEmails: relevantCount,
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
