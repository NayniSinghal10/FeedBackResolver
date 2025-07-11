# 📝 AI-Powered Feedback Analyzer

This application is an AI-powered agent that transforms raw, unstructured user feedback into structured, actionable insights. It leverages the power of the Juspay Neurolink library to analyze text and provide a detailed breakdown of issues, positives, and suggestions, helping teams make faster, data-driven decisions.

---

## The Problem

Organizations receive a high volume of feedback daily from various sources like customer support chats, surveys, app reviews, and social media. Manually processing this feedback is:

-   **Time-consuming:** Reading and categorizing hundreds of entries takes hours.
-   **Inefficient:** Key insights can be easily missed in the noise.
-   **Unstructured:** Raw feedback is often messy and difficult to quantify.
-   **Inactionable:** Without clear analysis, it's hard to create a concrete action plan.

As a result, valuable feedback often ends up ignored, leading to missed opportunities for improvement and a disconnect with the user base.

---

## The Solution: An AI-Powered Agent

This Feedback Analyzer provides a simple yet powerful solution to this problem. It uses a sophisticated AI model, accessed through the **Juspay Neurolink** library, to perform a deep analysis of the feedback.

The agent processes bulk feedback and generates a human-readable Markdown report that includes:

-   ✅ **Issue Extraction:** Identifies recurring pain points and bugs.
-   ✅ **Positive Highlights:** Pinpoints what users love about the product.
-   ✅ **Actionable Suggestions:** Captures user-generated ideas for improvement.
-   ✅ **Sentiment Analysis:** Determines the overall vibe of the feedback (e.g., "Mixed," "Positive").
-   ✅ **AI-Generated Action Plan:** Provides a prioritized list of recommendations for the development and product teams.

---

## Features

-   **Bulk Feedback Processing:** Analyze multiple feedback entries at once from a single file.
-   **Human-Readable Report:** Get a clean, easy-to-read analysis in Markdown format.
-   **Powered by Neurolink:** Utilizes a powerful AI provider for state-of-the-art text analysis.
-   **Easy to Use:** Simply add your feedback to a text file and run a single command.
-   **Secure API Key Management:** Uses a `.env` file to keep your API keys safe and out of the source code.
-   **Extensible:** Built on a foundation that can be extended to integrate directly with platforms like Zendesk, HubSpot, or Google Sheets.

---

## Getting Started

Follow these steps to set up and run the Feedback Analyzer on your local machine.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v16 or higher)
-   [npm](https://www.npmjs.com/) (comes with Node.js)

### 1. Clone the Repository

First, clone this repository to your local machine:

```bash
git clone <your-repository-url>
cd <repository-directory>
```

### 2. Install Dependencies

Install the necessary npm packages, including `@juspay/neurolink`:

```bash
npm install
```

### 3. Set Up Your API Key

The application requires an API key from an AI provider like Google AI.

1.  Create a file named `.env` in the root of the project directory.
2.  Add your API key to the `.env` file as shown below:

    ```
    # Replace with your actual Google AI API key
    GOOGLE_AI_API_KEY="YOUR_API_KEY_HERE"
    ```

---

## How to Use the Feedback Analyzer

### 1. Add Your Feedback

Open the `feedback.txt` file in the project directory. Delete the sample content and paste in all the raw feedback you want to analyze. You can add as many entries as you like, separated by new lines.

**Example `feedback.txt`:**

```
The new dark mode is a game-changer! But the app keeps crashing on my new phone.
I love the design, but the search function is not very accurate.
Customer support was very helpful and resolved my issue quickly.
```

### 2. Run the Analysis

Execute the following command in your terminal:

```bash
npm start
```

### 3. View the Results

The application will read the feedback from `feedback.txt`, send it to the AI for analysis, and save the results in a new file named `analysis_report.md`.

You can open `analysis_report.md` to see the detailed, human-readable insights.

---

## Example Output

Here is a sample of the Markdown report you can expect in `analysis_report.md`:

```markdown
# Feedback Analysis Report

## Overall Sentiment: Mixed

### Issues
- The app frequently crashes on the user's new phone.
- The search function is not providing accurate results.

### Positives
- The new dark mode is highly appreciated.
- The user loves the design of the app.
- Customer support was helpful and resolved an issue quickly.

### Suggestions
- Investigate and fix the app crashing issue, particularly on newer phone models.
- Improve the algorithm or indexing for the search function to increase its accuracy.

### AI Recommendation
High priority should be placed on addressing the application stability and crashing issues, as this is a critical bug affecting usability. A secondary priority should be to improve the search functionality. The positive feedback on the UI/design and customer support should be passed to the relevant teams to reinforce their good work.
```

---

## Future Enhancements

This project can be extended to create a fully automated feedback pipeline. Potential next steps include:

-   **Direct Platform Integration:** Use Neurolink's MCP (Model Context Protocol) to connect directly to APIs from Zendesk, HubSpot, Intercom, or Google Sheets.
-   **Automated Reporting:** Generate weekly or monthly feedback summary reports.
-   **Database Storage:** Store the structured analysis in a database to track trends over time.

---

## Demo

You can watch a video demonstration of the project here: [Demo Video](https://drive.google.com/file/d/1Fz6GjtgUiQHEq9p-OiDOTwSC26Sa_Uf6/view?usp=sharing)
