import "dotenv/config";
import { readFileSync, mkdirSync, existsSync } from "fs";
import { writeFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import puppeteer from "puppeteer";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  gemini: {
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-3-pro-preview",
  },
  logoDev: {
    apiKey: "pk_KV9Z5AZ6RKGwJDRsWiv80g",
    baseUrl: "https://img.logo.dev",
    size: 120, // Good size for card visibility
    format: "png", // PNG for transparency
    theme: "light", // For orange background
  },
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
  template: {
    width: 1024,
    height: 1536,
    quality: 90,
  },
  outputDir: join(__dirname, "output"),
  shibaImagePath: join(__dirname, "shiba.png"),
};

// Initialize Gemini
const genAI = new GoogleGenerativeAI(CONFIG.gemini.apiKey);

// Company name to domain mapping (for popular companies)
const COMPANY_DOMAINS = {
  google: "google.com",
  amazon: "amazon.com",
  microsoft: "microsoft.com",
  meta: "meta.com",
  facebook: "meta.com",
  apple: "apple.com",
  netflix: "netflix.com",
  tesla: "tesla.com",
  uber: "uber.com",
  airbnb: "airbnb.com",
  spotify: "spotify.com",
  zoom: "zoom.us",
  slack: "slack.com",
  twitter: "x.com",
  x: "x.com",

  // Indian IT companies
  ltimindtree: "ltimindtree.com",
  tcs: "tcs.com",
  infosys: "infosys.com",
  wipro: "wipro.com",
  hcl: "hcltech.com",
  "tech mahindra": "techmahindra.com",
  techmahindra: "techmahindra.com",

  // Indian startups
  grapevine: "joingrapevineco.com",
  zomato: "zomato.com",
  swiggy: "swiggy.com",
  paytm: "paytm.com",
  flipkart: "flipkart.com",
  ola: "olacabs.com",
  razorpay: "razorpay.com",
  cred: "cred.club",
  phonepe: "phonepe.com",
  byju: "byjus.com",
  meesho: "meesho.com",
  dunzo: "dunzo.com",
  zerodha: "zerodha.com",
};

// Company type classification
const COMPANY_TYPES = {
  // Banks
  "icici bank": "bank",
  icici: "bank",
  "hdfc bank": "bank",
  hdfc: "bank",
  kotak: "bank",
  "axis bank": "bank",
  sbi: "bank",
  "yes bank": "bank",

  // Service/IT
  tcs: "service",
  infosys: "service",
  wipro: "service",
  hcl: "service",
  "tech mahindra": "service",
  ltimindtree: "service",
  cognizant: "service",
  accenture: "consulting",
  deloitte: "consulting",
  pwc: "consulting",
  kpmg: "consulting",
  ey: "consulting",
  mckinsey: "consulting",
  bcg: "consulting",
  bain: "consulting",

  // Big Tech
  google: "bigtech",
  amazon: "bigtech",
  microsoft: "bigtech",
  meta: "bigtech",
  apple: "bigtech",
  netflix: "bigtech",
  uber: "bigtech",
  airbnb: "bigtech",

  // Indian Startups
  swiggy: "startup",
  zomato: "startup",
  cred: "startup",
  razorpay: "startup",
  phonepe: "startup",
  paytm: "startup",
  flipkart: "startup",
  meesho: "startup",
  zerodha: "startup",
  ola: "startup",
  dunzo: "startup",
  grapevine: "startup",

  // VC/PE
  "elevation capital": "vc",
  elevation: "vc",
  "peak xv": "vc",
  sequoia: "vc",
  accel: "vc",
  matrix: "vc",
  lightspeed: "vc",
  nexus: "vc",
  blume: "vc",
  kalaari: "vc",

  // Education
  "mesa school": "edtech",
  mesa: "edtech",
  isb: "edtech",
  iim: "edtech",
  upgrad: "edtech",
  byju: "edtech",
};

// GUIDELINES for a perfect roast
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

/**
 * Get company domain from name
 */
function getCompanyDomain(companyName) {
  const normalized = companyName.toLowerCase().trim();

  // Check hardcoded mapping first
  if (COMPANY_DOMAINS[normalized]) {
    return COMPANY_DOMAINS[normalized];
  }

  // Fallback: convert company name to domain
  // "LTI Mindtree" -> "ltimindtree.com"
  const domain = normalized.replace(/[^a-z0-9]/g, "") + ".com";
  return domain;
}

/**
 * Get company logo from Logo.dev (with fallback detection)
 */
async function getCompanyLogo(companyName) {
  const domain = getCompanyDomain(companyName);

  // Build Logo.dev URL with parameters
  const params = new URLSearchParams({
    token: CONFIG.logoDev.apiKey,
    size: CONFIG.logoDev.size.toString(),
    format: CONFIG.logoDev.format,
    theme: CONFIG.logoDev.theme,
  });

  const logoUrl = `${CONFIG.logoDev.baseUrl}/${domain}?${params.toString()}`;

  console.log(`🎨 Checking logo for ${companyName} (${domain})...`);

  try {
    // Fetch the actual image to check if it's a real logo or fallback
    const response = await fetch(logoUrl);
    if (!response.ok) {
      console.log(`⚠️  No logo found for ${companyName}`);
      return null;
    }

    // Check content-length - Logo.dev fallback letters are very small (~2-4KB)
    // Real logos are usually larger (>5KB)
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) < 5000) {
      console.log(
        `⚠️  Fallback logo detected for ${companyName} (${contentLength} bytes), skipping`,
      );
      return null;
    }

    console.log(`✅ Logo found: ${logoUrl}`);
    return logoUrl;
  } catch (error) {
    console.log(`⚠️  Logo check failed: ${error.message}`);
    return null;
  }
}

/**
 * Get company type for example selection
 */
function getCompanyType(companyName) {
  const normalized = companyName.toLowerCase().trim();
  return COMPANY_TYPES[normalized] || "default";
}

/**
 * Validate roast quality
 */
function isValidRoast(roast) {
  if (!roast) return false;
  if (roast.length > 250) return false;
  if (roast.length < 20) return false;

  // Reject LLM preamble/thinking - only filter obvious garbage
  const garbagePatterns = [
    /^(Here|Based|OK|I |Let me|Background|Research|Context|Think|Step|First)/i,
    /^(The roast|Roast:|Output:|My roast)/i,
    /\*\*/, // Markdown bold
  ];

  for (const pattern of garbagePatterns) {
    if (pattern.test(roast)) return false;
  }

  return true;
}

/**
 * Clean up roast output
 */
function cleanRoast(roast) {
  return roast
    .replace(/^["'`]|["'`]$/g, "") // Remove quotes
    .replace(/^\*+|\*+$/g, "") // Remove asterisks
    .replace(/^[-•]\s*/g, "") // Remove bullet points
    .replace(/^(Here's|Based on|OK,|Okay,|Alright,|Sure,).+?:/gi, "")
    .replace(/^(The roast|Roast|My roast|Output):\s*/gi, "")
    .replace(/\n+/g, " ") // Replace newlines with space (formula can span lines)
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Generate a roast using the framework - making the LLM THINK, not pattern-match
 */
async function generateRoast(companyName, role = "Engineers") {
  console.log(`🤖 Generating roast for ${role} at ${companyName}...`);

  // Model with high creativity + Google Search grounding for real-time context
  const model = genAI.getGenerativeModel({
    model: CONFIG.gemini.model,
    generationConfig: {
      temperature: 0.9,
      topP: 0.95,
    },
    tools: [{ googleSearch: {} }],
  });

  // The prompt - let it cook
  const prompt = `You're a comedian writing a roast about ${role} at ${companyName}.

${ROAST_GUIDELINES}

Research ${companyName}. Get in their heads. What's the funniest, most painfully accurate thing you could say that would make them screenshot it and send to their work group chat?

Be creative. Surprise me. No lazy takes.

OUTPUT ONLY THE ROAST:`;

  // Try up to 3 times
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const rawText = result.response.text();
      let roast = cleanRoast(rawText);
      console.log(`📝 Cleaned roast (attempt ${attempt}): "${roast}"`);
      console.log(
        `   Length: ${roast.length}, has "don't": ${roast.includes("don't")}, has "call it": ${roast.toLowerCase().includes("call it")}`,
      );

      if (isValidRoast(roast)) {
        console.log(`✨ Roast (attempt ${attempt}): "${roast}"`);
        return roast;
      }

      console.log(
        `⚠️  Invalid roast (attempt ${attempt}): "${roast.substring(0, 60)}..."`,
      );
    } catch (e) {
      console.log(`⚠️  Generation failed (attempt ${attempt}): ${e.message}`);
    }
  }

  // Fallback - short and punchy
  console.log(`⚠️  Using fallback`);
  return `Your LinkedIn writes checks your JIRA can't cash.`;
}

/**
 * Generate card image using Puppeteer
 */
async function generateCard(companyName, role, roastText, logoUrl) {
  console.log(`🎨 Generating card image...`);

  // Load HTML template
  const templatePath = join(__dirname, "card-template.html");
  let html = readFileSync(templatePath, "utf-8");

  // Convert shiba image to base64 data URL
  let shibaDataUrl = "";
  try {
    const shibaBuffer = readFileSync(CONFIG.shibaImagePath);
    const base64 = shibaBuffer.toString("base64");
    shibaDataUrl = `data:image/png;base64,${base64}`;
  } catch (error) {
    console.warn("⚠️  Shiba image not found, using emoji fallback");
    // Fallback to emoji if image not found
    shibaDataUrl =
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSI3NSIgZm9udC1zaXplPSI4MCI+8J+YiTwvdGV4dD48L3N2Zz4=";
  }

  // Escape HTML special characters
  const escapeHtml = (text) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  // Replace placeholders
  // Use transparent 1px GIF as fallback for logo when not available
  const transparentGif =
    "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

  html = html
    .replace(/{{COMPANY_NAME}}/g, escapeHtml(companyName))
    .replace(/{{ROLE}}/g, escapeHtml(role))
    .replace(/{{ROAST_TEXT}}/g, escapeHtml(roastText))
    .replace(/{{SHIBA_IMAGE}}/g, shibaDataUrl)
    .replace(/{{COMPANY_LOGO}}/g, logoUrl || transparentGif)
    .replace(/{{HAS_LOGO}}/g, logoUrl ? "true" : "false");

  // Launch Puppeteer
  const browser = await puppeteer.launch(CONFIG.puppeteer);
  const page = await browser.newPage();

  // Set viewport
  await page.setViewport({
    width: CONFIG.template.width,
    height: CONFIG.template.height,
    deviceScaleFactor: 2, // Retina quality
  });

  // Load HTML
  await page.setContent(html, { waitUntil: "networkidle0" });

  // Take screenshot (PNG doesn't support quality parameter)
  const buffer = await page.screenshot({
    type: "png",
    fullPage: false,
  });

  await browser.close();

  console.log(`✅ Card generated`);
  return buffer;
}

/**
 * Save card to output directory
 */
async function saveCard(buffer, companyName) {
  // Create output directory if it doesn't exist
  if (!existsSync(CONFIG.outputDir)) {
    mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  // Generate filename
  const timestamp = Date.now();
  const sanitized = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const filename = `card-${sanitized}-${timestamp}.png`;
  const filepath = join(CONFIG.outputDir, filename);

  // Save file
  await writeFile(filepath, buffer);

  console.log(`💾 Saved to: ${filepath}`);
  return filepath;
}

/**
 * Main function
 */
async function main() {
  const companyName = process.argv[2];
  const role = process.argv[3] || "Engineers"; // Default to Engineers

  if (!companyName) {
    console.error("❌ Usage: node poc-card-generator.js <CompanyName> [Role]");
    console.error("   Example: node poc-card-generator.js Google Engineers");
    console.error('   Example: node poc-card-generator.js "Peak XV" Investors');
    console.error(
      '   Example: node poc-card-generator.js Swiggy "Product Managers"',
    );
    process.exit(1);
  }

  if (!process.env.GOOGLE_API_KEY) {
    console.error("❌ Missing GOOGLE_API_KEY in .env file");
    process.exit(1);
  }

  console.log(`\n🚀 TAL Company Card Generator POC\n`);
  console.log(`📝 Company: ${companyName}`);
  console.log(`👤 Role: ${role}\n`);

  try {
    // Step 1: Get company logo
    const logoUrl = await getCompanyLogo(companyName);

    // Step 2: Generate roast
    const roastText = await generateRoast(companyName, role);

    // Step 3: Generate card image
    const imageBuffer = await generateCard(companyName, role, roastText, logoUrl);

    // Step 4: Save to file
    const filepath = await saveCard(imageBuffer, companyName);

    console.log(`\n✨ Success! Card created for ${role} at ${companyName}`);
    console.log(`📁 Location: ${filepath}`);
    console.log(`\n💡 Open the image to see your viral card!\n`);
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
