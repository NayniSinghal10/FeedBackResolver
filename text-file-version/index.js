import { NeuroLink } from '@juspay/neurolink';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// --- Setup ---
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Constants ---
const FEEDBACK_PATH = path.join(__dirname, 'feedback.txt');
const ANALYSIS_REPORT_PATH = path.join(__dirname, 'analysis_report.md');

// --- Core AI Functions ---
async function performDeepAnalysis(feedbackContent) {
    if (!feedbackContent.trim()) {
        return "No actionable feedback found in the provided text.";
    }

    const neurolink = new NeuroLink();

    const prompt = `
Analyze the entire block of text provided below, which contains multiple emails. Your task is to read all of them and generate a single, consolidated Markdown report that categorizes the key information from every email.

Do not skip any email. Every piece of information should be sorted into an appropriate category.

The final report should have the following structure. For each category, list the relevant items from the emails, making sure to mention who the request is from.

**Consolidated Merchant Communication Report**

### Technical Queries & Issues
*   [e.g., "User can't find a refund in the dashboard (From: Megha)"]
*   [e.g., "User is not able to trigger a forgot password email (From: gaurav.taneja@arvindfashions.com)"]

### Feature & Implementation Requests
*   [e.g., "Request to start sending full URL and UTM parameters in order notes (From: Juspay Team email)"]
*   [e.g., "User wants to know if they can customize their cart page (From: sayednehalibrahim@gmail.com)"]

### Service & Billing Changes
*   [e.g., "Request to discontinue Juspay service and not raise an invoice for July (From: Marketing ReFit)"]
*   [e.g., "Details on new Partial COD payment terms (From: Team email)"]

### Meeting & Scheduling Requests
*   [e.g., "Request to schedule a technical call for tomorrow at 12:30pm (From: Gautam Jain)"]

### General Inquiries & Communications
*   [e.g., "Sharing a Pipecat plugin guide and asking about interest in a Slack channel (From: Michael Miller)"]

**Important Rules:**
*   Accurately categorize every email's content.
*   Ensure every email is represented in the final report.
*   Do not invent or add any information that is not explicitly present in the text.
        ---
        ${feedbackContent}
        ---
    `;

    console.log('Performing deep analysis...');
    const response = await neurolink.generate({
        input: { text: prompt },
        provider: "vertex",
        timeout: "60s"
    });

    return response.content;
}

// --- Main Workflow ---
async function main() {
    console.log('Starting feedback analyzer...');
    try {
        const feedbackContent = await fs.readFile(FEEDBACK_PATH, 'utf8');
        const analysis = await performDeepAnalysis(feedbackContent);

        let fullReport = `# Feedback Analysis Report - ${new Date().toISOString()}\n\n`;
        fullReport += analysis;

        await fs.writeFile(ANALYSIS_REPORT_PATH, fullReport);
        console.log(`Analysis complete. Report saved to ${ANALYSIS_REPORT_PATH}`);

    } catch (error) {
        console.error('A critical error occurred in the main workflow:', error);
        await fs.writeFile(ANALYSIS_REPORT_PATH, `# Analysis Failed\n\nAn error occurred: ${error.message}`);
    }
}

main();
