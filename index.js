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
    fs.writeFileSync("analysis_result.json", result.text);
    console.log("📝 Analysis saved to analysis_result.json");

  } catch (error) {
    console.error("❌ Error during feedback analysis:", error.message);
    if (error.message.includes("API key")) {
      console.log("\n💡 Setup help:");
      console.log("Please add your GOOGLE_AI_API_KEY to the .env file.");
    }
  }
}

analyzeFeedback();
