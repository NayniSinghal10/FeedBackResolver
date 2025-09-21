# Feedback Analyzer Project

This project contains two versions of an AI-powered feedback analysis tool. Both versions are designed to take text-based feedback, analyze it using an AI model, and generate a consolidated report.

## Project Demo

A video demonstration of the project can be found here: [Project Demo](https://drive.google.com/file/d/15WC4NDSzVGiQGX9WN0_VCgByGvTKg0Vg/view?usp=drive_link)

## Project Structure

The project is organized into two main directories:

-   `gmail-api-version/`: Connects to the Gmail API to fetch and analyze emails.
-   `text-file-version/`: Reads feedback directly from a local text file.

---

## 1. Gmail API Version

This version of the script authenticates with your Google account, fetches unread emails sent to a specified address, and performs a two-step AI analysis to generate a consolidated report.

### Prerequisites

-   **Node.js** (v16 or higher) and npm installed on your machine
-   **Google account** with access to Google Cloud Console
-   **AI Provider credentials** (Vertex AI, Google AI, or other supported providers)

### Setup Instructions

#### Step 1: Configure Google Cloud Project

1.  **Go to the Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2.  **Create a new project** (or select an existing one).
3.  **Enable the Gmail API**:
    -   In the navigation menu, go to **APIs & Services > Library**.
    -   Search for "Gmail API" and click **Enable**.
4.  **Configure OAuth Consent Screen**:
    -   Go to **APIs & Services > OAuth consent screen**.
    -   Select **External** and click **Create**.
    -   Provide an **App name** (e.g., "Feedback Analyzer"), your **User support email**, and a **Developer contact email**.
    -   Click **Save and Continue** through the Scopes and Test Users sections.
    -   **Important**: Add yourself as a test user in the "Test users" section to avoid access_denied errors
5.  **Create OAuth 2.0 Credentials**:
    -   Go to **APIs & Services > Credentials**.
    -   Click **Create Credentials > OAuth client ID**.
    -   For the **Application type**, select **Web application**.
    -   Under **Authorized redirect URIs**, click **Add URI** and enter `http://localhost:3000/oauth2callback`.
    -   Click **Create**.
    -   A window will pop up showing your **Client ID** and **Client Secret**. Copy these two values.

#### Step 2: Configure Local Project

1.  **Navigate to the directory**:
    ```bash
    cd gmail-api-version
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Create `.env` file**:
    Create a new file named `.env` inside the `gmail-api-version` directory with the following configuration:

    ```env
    # Required: Google OAuth Credentials
    GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_HERE"
    GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET_HERE"
    GMAIL_REFRESH_TOKEN="WILL_BE_GENERATED_IN_STEP_4"

    # Required: AI Provider API Key
    GOOGLE_AI_API_KEY="YOUR_GOOGLE_AI_API_KEY_HERE"

    # Optional: Email Configuration (with fallbacks)
    TARGET_EMAIL="your.email@domain.com"           # Default: ALL emails in account (leave empty for all)
    DAYS_TO_SEARCH="10"                            # Default: 10

    # Optional: AI Provider Configuration (with fallback)
    NEUROLINK_DEFAULT_PROVIDER="vertex"            # Default: vertex
    # Supported providers: vertex, google-ai, openai, anthropic
    ```

    **Environment Variables Explained:**
    - **Required Variables:**
      - `GOOGLE_CLIENT_ID`: OAuth client ID from Google Cloud Console
      - `GOOGLE_CLIENT_SECRET`: OAuth client secret from Google Cloud Console
      - `GMAIL_REFRESH_TOKEN`: Generated in Step 4 below
      - `GOOGLE_AI_API_KEY`: Your AI provider API key
    
    - **Optional Variables (with smart defaults):**
      - `TARGET_EMAIL`: Specific email address to monitor (if not set, analyzes ALL emails in the account)
      - `DAYS_TO_SEARCH`: How many days back to search for emails (1-365)
      - `MAX_RESULTS`: Maximum number of emails to fetch per run (1-500, default: 20)
      - `NEUROLINK_DEFAULT_PROVIDER`: AI provider for analysis

4.  **Generate Refresh Token**:
    ```bash
    node get-refresh-token.js
    ```
    -   This will open a browser window for Google OAuth authentication
    -   **Log in with the Google account** whose emails you want to analyze
    -   Grant the application permission to read your Gmail
    -   Return to your terminal and copy the `GMAIL_REFRESH_TOKEN` line into your `.env` file

#### Step 3: Handle Authentication Issues

**If you see "Access blocked: Feedback Analyzer Script has not completed the Google verification process":**

1. **Add yourself as a test user**:
   - Go to: https://console.cloud.google.com/apis/credentials/consent
   - Scroll to "Test users" section
   - Click "+ ADD USERS"
   - Enter your email address
   - Click "SAVE"

2. **Re-run the authentication**:
   ```bash
   node get-refresh-token.js
   ```

### Running the Script

Once the setup is complete, you can run the script with:

```bash
npm start
```

**What happens when you run the script:**
1. Connects to Gmail using OAuth credentials
2. Searches for unread emails based on your configuration
3. Uses AI to filter relevant business communications
4. Generates a categorized analysis report
5. Saves results to `gmail-api-version/analysis_report.md`
6. Tracks processed emails to avoid reprocessing

### Configuration Examples

**Monitor different email address:**
```env
TARGET_EMAIL="support@yourcompany.com"
```

**Search longer time period:**
```env
DAYS_TO_SEARCH="30"
```

**Use different AI provider:**
```env
NEUROLINK_DEFAULT_PROVIDER="google-ai"
```

### Troubleshooting

**Common Issues:**

1. **`invalid_grant` error**: Your refresh token has expired
   - Solution: Run `node get-refresh-token.js` to generate a new token

2. **`access_denied` error**: You're not added as a test user
   - Solution: Add your email to test users in Google Cloud Console

3. **`Cannot find package 'open'` error**: Missing dependency
   - Solution: Run `npm install` to install all dependencies

4. **No emails found**: Check your query configuration
   - Verify `TARGET_EMAIL` is correct
   - Increase `DAYS_TO_SEARCH` value
   - Check if there are actually unread emails matching your criteria

**Logs and Debugging:**
The script provides detailed logging including:
- Configuration being used
- Gmail queries being executed
- Number of emails found and processed
- AI analysis progress
- Fallback behavior when needed

---

## 2. Text File Version

This version is simpler and reads its input directly from a `feedback.txt` file. It's useful for quick tests or for analyzing feedback from sources other than Gmail.

### Setup

1.  **Navigate to the directory**:
    ```bash
    cd text-file-version
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Add Feedback**:
    -   Open the `text-file-version/feedback.txt` file.
    -   Add the text feedback you want to analyze.

### Running the Script

Once the setup is complete, you can run the script with the following command:

```bash
npm start
```

The script will read the contents of `feedback.txt`, analyze it, and save the output to `text-file-version/analysis_report.md`.
