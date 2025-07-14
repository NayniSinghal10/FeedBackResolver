# Feedback Analyzer Project

This project contains two versions of an AI-powered feedback analysis tool. Both versions are designed to take text-based feedback, analyze it using an AI model, and generate a consolidated report.

## Project Structure

The project is organized into two main directories:

-   `gmail-api-version/`: Connects to the Gmail API to fetch and analyze emails.
-   `text-file-version/`: Reads feedback directly from a local text file.

---

## 1. Gmail API Version

This version of the script authenticates with your Google account, fetches unread emails sent to a specified address, and performs a two-step AI analysis to generate a consolidated report.

### Prerequisites

-   Node.js and npm installed on your machine.
-   A Google account.

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
    -   Finally, click **Publish App** and confirm to make it available for use.
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

2.  **Create `.env` file**:
    -   Create a new file named `.env` inside the `gmail-api-version` directory.
    -   Add your credentials to this file in the following format:
        ```
        GOOGLE_CLIENT_ID="YOUR_CLIENT_ID_HERE"
        GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET_HERE"
        GOOGLE_AI_API_KEY="YOUR_GOOGLE_AI_API_KEY_HERE"
        ```
    -   Replace the placeholder values with the actual credentials you copied from the Google Cloud Console and your Google AI API key.

3.  **Install dependencies**:
    ```bash
    npm install
    ```

4.  **Generate Refresh Token**:
    -   Run the helper script to generate your refresh token:
        ```bash
        node get-refresh-token.js
        ```
    -   This will open a browser window. **Log in with the Google account** whose emails you want to analyze.
    -   Grant the application permission.
    -   Return to your terminal. It will display a line like `GMAIL_REFRESH_TOKEN="..."`.
    -   Copy this entire line and paste it into your `.env` file.

### Running the Script

Once the setup is complete, you can run the script with the following command:

```bash
npm start
```

The script will fetch the latest unread emails, analyze them, and save the output to `gmail-api-version/analysis_report.md`.

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
