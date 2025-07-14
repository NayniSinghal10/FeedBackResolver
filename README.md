# Feedback Analyzer Project

This project contains two versions of an AI-powered feedback analysis tool. Both versions are designed to take text-based feedback, analyze it using an AI model, and generate a consolidated report.

## Project Structure

The project is organized into two main directories:

-   `gmail-api-version/`: Connects to the Gmail API to fetch and analyze emails.
-   `text-file-version/`: Reads feedback directly from a local text file.

---

## 1. Gmail API Version

This version of the script authenticates with your Google account, fetches unread emails sent to a specified address, and performs a two-step AI analysis to generate a consolidated report.

### Setup

1.  **Navigate to the directory**:
    ```bash
    cd gmail-api-version
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Credentials**:
    -   This script requires Google Cloud credentials to access the Gmail API. Open the `.env` file in this directory.
    -   You will need to provide your `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GMAIL_REFRESH_TOKEN`.
    -   You will also need to provide a `GOOGLE_AI_API_KEY` for the AI analysis.

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
    -   Add the text feedback you want to analyze, with each distinct piece of feedback separated by a new line.

### Running the Script

Once the setup is complete, you can run the script with the following command:

```bash
npm start
```

The script will read the contents of `feedback.txt`, analyze it, and save the output to `text-file-version/analysis_report.md`.
