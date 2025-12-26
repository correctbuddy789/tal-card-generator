#!/usr/bin/env node
/**
 * Standalone roast generator - outputs just the roast text
 * Called by Python Streamlit app to keep roast generation identical
 */

import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const CONFIG = {
  gemini: {
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-3-pro-preview",
  },
};

const genAI = new GoogleGenerativeAI(CONFIG.gemini.apiKey);

const ROAST_GUIDELINES = `
TAL is the friend who roasts you so hard the group chat goes silent.

PRINCIPLES (not templates):

1. MAKE THEM SEE IT
   Paint a picture. "Aggressive eye contact while dumping rice" > "serving food rudely"

2. BE PAINFULLY SPECIFIC
   Real tools, real places, real jargon. Generic = forgettable.

3. FIND THE ABSURDITY THEY'VE NORMALIZED
   What ridiculous thing do they do daily without questioning it?

4. THE PUNCHLINE IS EVERYTHING
   Build to it. Land on it. Stop.

5. WOULD THEY TAG THEIR COWORKER?
   If not, it's not sharp enough.

6. SURPRISE THEM
   If they can predict where it's going, rewrite it.

NO TEMPLATES. NO FORMULAS. Just be funny and true.
Write like a comedian, not a corporate copywriter.

Max 25 words. Must hit.
`;

function isValidRoast(roast) {
  if (!roast) return false;
  if (roast.length > 250) return false;
  if (roast.length < 20) return false;

  const garbagePatterns = [
    /^(Here|Based|OK|I |Let me|Background|Research|Context|Think|Step|First)/i,
    /^(The roast|Roast:|Output:|My roast)/i,
    /\*\*/,
  ];

  for (const pattern of garbagePatterns) {
    if (pattern.test(roast)) return false;
  }

  return true;
}

function cleanRoast(roast) {
  return roast
    .replace(/^["'`]|["'`]$/g, "")
    .replace(/^\*+|\*+$/g, "")
    .replace(/\*([^*]+)\*/g, "$1") // Remove inline *emphasis*
    .replace(/^[-•]\s*/g, "")
    .replace(/^(Here's|Based on|OK,|Okay,|Alright,|Sure,).+?:/gi, "")
    .replace(/^(The roast|Roast|My roast|Output):\s*/gi, "")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function generateRoast(companyName, role = "Engineers") {
  const model = genAI.getGenerativeModel({
    model: CONFIG.gemini.model,
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
    },
    tools: [{ googleSearch: {} }],
  });

  const prompt = `You're a comedian writing a roast about ${role} at ${companyName}.

${ROAST_GUIDELINES}

Research ${companyName}. Get in their heads. What's the funniest, most painfully accurate thing you could say that would make them screenshot it and send to their work group chat?

Be creative. Surprise me. No lazy takes.

OUTPUT ONLY THE ROAST:`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const rawText = result.response.text();
      let roast = cleanRoast(rawText);

      if (isValidRoast(roast)) {
        return roast;
      }
    } catch (e) {
      // Continue to next attempt
    }
  }

  return `Your LinkedIn writes checks your JIRA can't cash.`;
}

async function main() {
  const companyName = process.argv[2];
  const role = process.argv[3] || "Engineers";

  if (!companyName) {
    console.error("Usage: node generate-roast.js <CompanyName> [Role]");
    process.exit(1);
  }

  if (!process.env.GOOGLE_API_KEY) {
    console.error("Missing GOOGLE_API_KEY");
    process.exit(1);
  }

  const roast = await generateRoast(companyName, role);
  // Output just the roast for Python to capture
  console.log(roast);
}

main();
