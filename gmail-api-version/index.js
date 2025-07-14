import { createBestAIProvider } from '@juspay/neurolink';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import dotenv from 'dotenv';

// --- Setup ---
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Constants ---
const PROCESSED_EMAILS_PATH = path.join(__dirname, 'processed_emails.json');
const ANALYSIS_REPORT_PATH = path.join(__dirname, 'analysis_report.md');
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GOOGLE_AI_API_KEY } = process.env;

// --- Gmail Service ---
let gmail;

async function initializeGmailService() {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
        throw new Error('Missing Google credentials in .env file. Please run authenticate.js first.');
    }
    const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    oAuth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });
    gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    console.log('Gmail service initialized successfully.');
}

// --- Helper Functions ---
async function loadProcessedEmails() {
    try {
        await fs.access(PROCESSED_EMAILS_PATH);
        const data = await fs.readFile(PROCESSED_EMAILS_PATH, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveProcessedEmails(emailIds) {
    await fs.writeFile(PROCESSED_EMAILS_PATH, JSON.stringify(emailIds, null, 2));
}

// --- Core AI Functions ---
async function triageEmailContent(email) {
    const aiProvider = await createBestAIProvider();
    const prompt = `
        Analyze the following email and determine if it is a relevant business communication.
        - If it is relevant (e.g., a query, feedback, request), extract the core message, removing all conversational fluff, greetings, and signatures.
        - If it is irrelevant (e.g., spam, marketing, out-of-office), classify it as 'skip'.
        Return the result as a JSON object with "isRelevant" (boolean) and "cleanedMessage" (string) keys.
        
        Email to analyze:
        ---
        From: ${email.from}
        Subject: ${email.subject}

        ${email.body}
        ---
    `;
    console.log(`Triaging email from: ${email.from}`);
    const response = await aiProvider.generateText({ prompt });
    try {
        const cleanedResponse = response.text.trim().replace(/```json\n?|\n?```/g, '');
        const result = JSON.parse(cleanedResponse);
        return {
            ...result,
            from: email.from, // Pass sender info along
        };
    } catch (e) {
        console.error('Failed to parse triage response:', response.text);
        return { isRelevant: false, cleanedMessage: '', from: email.from };
    }
}

async function performConsolidatedAnalysis(cleanedEmails) {
    if (cleanedEmails.length === 0) {
        return "No relevant new emails to analyze.";
    }
    const aiProvider = await createBestAIProvider();
    const emailBatch = cleanedEmails.map(email => `(From: ${email.from})\n${email.cleanedMessage}`).join('\n\n---\n\n');

    const prompt = `
Analyze the entire block of text provided below, which contains multiple cleaned email messages separated by "---". Your task is to read all of them and generate a single, consolidated Markdown report that categorizes the key information from every message.

Do not skip any message. Every piece of information should be sorted into an appropriate category.

The final report should have the following structure. For each category, list the relevant items from the messages, making sure to include the sender information provided.

**Consolidated Merchant Communication Report**

### Technical Queries & Issues
*   [e.g., "User can't find a refund in the dashboard (From: Megha)"]

### Feature & Implementation Requests
*   [e.g., "Request to start sending full URL and UTM parameters in order notes (From: Juspay Team email)"]

### Service & Billing Changes
*   [e.g., "Request to discontinue Juspay service and not raise an invoice for July (From: Marketing ReFit)"]

### Meeting & Scheduling Requests
*   [e.g., "Request to schedule a technical call for tomorrow at 12:30pm (From: Gautam Jain)"]

### General Inquiries & Communications
*   [e.g., "Sharing a Pipecat plugin guide and asking about interest in a Slack channel (From: Michael Miller)"]

**Important Rules:**
*   Accurately categorize every message's content.
*   Ensure every message is represented in the final report.
*   Do not invent or add any information that is not explicitly present in the text.
        ---
        ${emailBatch}
        ---
    `;
    console.log('Performing consolidated analysis on cleaned email batch...');
    const response = await aiProvider.generateText({ prompt });
    return response.text;
}

// --- Main Workflow ---
async function main() {
    console.log('Starting advanced feedback analyzer...');
    try {
        await initializeGmailService();
        const processedIds = await loadProcessedEmails();
        
        const res = await gmail.users.messages.list({
            userId: 'me',
            q: 'is:unread to:nayni.singhal@juspay.in newer_than:10d',
            maxResults: 10,
        });

        const messages = res.data.messages || [];
        if (messages.length === 0) {
            console.log('No new emails found in the last 10 days.');
            return;
        }

        const newEmails = messages.filter(msg => !processedIds.includes(msg.id));
        console.log(`Found ${newEmails.length} new emails to process.`);
        if (newEmails.length === 0) {
            console.log('No new, unprocessed emails to analyze.');
            return;
        }

        const emailDetails = await Promise.all(newEmails.map(async (message) => {
            const msg = await gmail.users.messages.get({ userId: 'me', id: message.id });
            const fromHeader = msg.data.payload.headers.find(h => h.name === 'From').value;
            const subjectHeader = msg.data.payload.headers.find(h => h.name === 'Subject').value;
            
            let body = '';
            if (msg.data.payload.parts) {
                const part = msg.data.payload.parts.find(p => p.mimeType === 'text/plain');
                if (part) {
                    body = Buffer.from(part.body.data, 'base64').toString('utf8');
                }
            } else if (msg.data.payload.body.data) {
                body = Buffer.from(msg.data.payload.body.data, 'base64').toString('utf8');
            }
            return { id: message.id, from: fromHeader, subject: subjectHeader, body: body };
        }));

        const triageResults = await Promise.all(emailDetails.map(triageEmailContent));
        const relevantEmails = triageResults.filter(result => result.isRelevant);
        
        console.log(`Found ${relevantEmails.length} relevant emails to analyze.`);

        const analysisResult = await performConsolidatedAnalysis(relevantEmails);

        let fullReport = `# Feedback Analysis Report - ${new Date().toISOString()}\n\n${analysisResult}`;

        await fs.writeFile(ANALYSIS_REPORT_PATH, fullReport);
        console.log(`Analysis complete. Report saved to ${ANALYSIS_REPORT_PATH}`);

        const newlyProcessedIds = newEmails.map(msg => msg.id);
        const updatedProcessedIds = [...processedIds, ...newlyProcessedIds];
        await saveProcessedEmails(updatedProcessedIds);
        console.log('Updated the list of processed emails.');

    } catch (error) {
        console.error('A critical error occurred in the main workflow:', error);
        await fs.writeFile(ANALYSIS_REPORT_PATH, `# Analysis Failed\n\nAn error occurred: ${error.message}`);
    }
}

main();
