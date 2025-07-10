import { AIProviderFactory } from "@juspay/neurolink";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

async function analyzeFeedback() {
  console.log("🧠 Feedback Analyzer Initializing...");

  try {
    console.log("Reading feedback from feedback.txt...");
    const feedbackData = fs.readFileSync("feedback.txt", "utf-8");

    const provider = await AIProviderFactory.createProvider("google-ai");

    if (!provider) {
      console.log("   ❌ No provider available (check API keys in .env file)");
      return;
    }

    const prompt = `
      Analyze the following feedback and provide a structured JSON output with the following keys: "issues", "positives", "suggestions", "sentiment", and "ai_recommendation".

      Feedback:
      ${feedbackData}
    `;

    console.log("\n🔄 Analyzing feedback...");
    const result = await provider.generateText({
      prompt: prompt,
    });

    console.log("✅ Feedback Analysis Complete:");

    // Clean the response to remove markdown code block formatting
    let cleanedText = result.text.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.substring(7).trim();
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3).trim();
    }

    // Parse the JSON string
    const analysis = JSON.parse(cleanedText);

    // Format the output as Markdown
    let markdownOutput = `# Feedback Analysis Report\n\n`;
    markdownOutput += `## Overall Sentiment: ${analysis.sentiment}\n\n`;

    markdownOutput += `### Issues\n`;
    if (analysis.issues && analysis.issues.length > 0) {
      analysis.issues.forEach(issue => {
        markdownOutput += `- ${issue}\n`;
      });
    } else {
      markdownOutput += `- No issues identified.\n`;
    }

    markdownOutput += `\n### Positives\n`;
    if (analysis.positives && analysis.positives.length > 0) {
      analysis.positives.forEach(positive => {
        markdownOutput += `- ${positive}\n`;
      });
    } else {
      markdownOutput += `- No positives identified.\n`;
    }

    markdownOutput += `\n### Suggestions\n`;
    if (analysis.suggestions && analysis.suggestions.length > 0) {
      analysis.suggestions.forEach(suggestion => {
        markdownOutput += `- ${suggestion}\n`;
      });
    } else {
      markdownOutput += `- No suggestions identified.\n`;
    }

    markdownOutput += `\n### AI Recommendation\n`;
    if (analysis.ai_recommendation) {
      markdownOutput += `${analysis.ai_recommendation}\n`;
    } else {
      markdownOutput += `- No recommendation provided.\n`;
    }

    fs.writeFileSync("analysis_report.md", markdownOutput);
    console.log("📝 Analysis saved to analysis_report.md");

  } catch (error) {
    console.error("❌ Error during feedback analysis:", error.message);
    if (error.message.includes("API key")) {
      console.log("\n💡 Setup help:");
      console.log("Please add your GOOGLE_AI_API_KEY to the .env file.");
    }
  }
}

analyzeFeedback();
