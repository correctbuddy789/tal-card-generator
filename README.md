# TAL Company Card Generator

Generates viral "TAL speaks" cards with savage, shareable roasts about company roles. The kind of insider jokes that make entire WhatsApp groups go silent.

## What TAL Does

TAL is a badass who drops uncomfortable truths. Not generic corporate humor - specific, visual, painfully accurate roasts that people screenshot and share saying "TAL chose violence today".

**Example outputs:**

| Company | Role | Roast |
|---------|------|-------|
| **Zepto** | Engineers | "You're stress-testing Kubernetes clusters like it's NASA, just to be an over-engineered sabziwala." |
| **PhonePe** | PMs | "Convincing stakeholders that a user scanning for ₹10 dhaniya is a 'high-intent lead' for your Term Life Insurance pop-up." |
| **Dukaan** | Frontend Engineers | "Debugging hydration errors for a CEO who is currently tweeting that an AI bot writes better code than you." |
| **Porter** | PMs | "You call it 'Logistics Tech,' but your backend is literally just a Tata Ace driver deciding if he feels like climbing stairs today." |
| **Dream11** | Growth Marketing | "You A/B test 'Toss Updates' like you're curing cancer, just to convince a broke student to bet his lunch money on a Rwanda T10 match." |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     poc-card-generator.js                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. getCompanyLogo(company)                                 │
│     └── Logo.dev API (with fallback detection)              │
│                                                             │
│  2. generateRoast(company, role)                            │
│     └── Gemini 3 Pro + Google Search Grounding              │
│         - Researches company in real-time                   │
│         - Generates roast based on guidelines               │
│         - Validates output (length, no LLM preamble)        │
│         - Retries up to 3x if invalid                       │
│                                                             │
│  3. generateCard(company, role, roast, logo)                │
│     └── Puppeteer + HTML template                           │
│         - Renders card-template.html                        │
│         - Injects company, role, roast, logo                │
│         - Screenshots at 2x resolution                      │
│                                                             │
│  4. saveCard(buffer, company)                               │
│     └── Saves PNG to ./output/                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env` file:

```env
GOOGLE_API_KEY=your_gemini_api_key
```

### 3. Add Shiba image

Save your Shiba Inu mascot as `shiba.png` in the root directory. Falls back to emoji if missing.

## Usage

```bash
node poc-card-generator.js <Company> <Role>
```

**Examples:**

```bash
# Tech companies
node poc-card-generator.js "Google" "PMMs"
node poc-card-generator.js "Zepto" "Engineers"
node poc-card-generator.js "PhonePe" "PMs"

# Startups
node poc-card-generator.js "Grapevine" "PMs"
node poc-card-generator.js "Porter" "PMs"
node poc-card-generator.js "OpeninApp" "Backend Developers"

# VC/Finance
node poc-card-generator.js "Elevation Capital" "Associates"
node poc-card-generator.js "Peak XV" "AVPs"
node poc-card-generator.js "ICICI Bank" "Relationship Managers"

# Consulting
node poc-card-generator.js "McKinsey" "Consultants"
node poc-card-generator.js "Zinnov" "Associates"

# Education
node poc-card-generator.js "Ashoka University" "Students"
node poc-card-generator.js "IIIT Ranchi" "Students"
```

## Output

Cards saved to `./output/` as:
```
card-{company}-{timestamp}.png
```

**Format:** 1024 x 1536px @ 2x (2048 x 3072px actual) - perfect for Instagram Stories / WhatsApp

## Configuration

### Model Settings (`CONFIG.gemini`)

```javascript
{
  apiKey: process.env.GOOGLE_API_KEY,
  model: "gemini-3-pro-preview",  // Using Pro for better quality
}
```

The model is configured with:
- `temperature: 0.9` - High creativity
- `topP: 0.95` - Diverse outputs
- `tools: [{ googleSearch: {} }]` - **Google Search grounding for real-time company research**

### Logo Settings (`CONFIG.logoDev`)

```javascript
{
  apiKey: "pk_...",           // Logo.dev publishable key
  baseUrl: "https://img.logo.dev",
  size: 120,
  format: "png",
  theme: "light",
}
```

Logos are fetched from Logo.dev. The system detects fallback/placeholder logos (< 5KB) and skips them.

### Card Template (`CONFIG.template`)

```javascript
{
  width: 1024,
  height: 1536,
  quality: 90,
}
```

## How Roasts Work

### The Guidelines

The roast generator follows these principles (not templates):

```
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
```

### Why Grounding Matters

Google Search grounding allows the model to:
- Research the company's current state, news, controversies
- Understand internal culture and tools
- Find specific details that make roasts hit harder

Without grounding, roasts are generic. With grounding, they reference real things like:
- "Glance" (InMobi's product people hate)
- "Team Match" (Google's internal hiring limbo)
- "Third Wave latte" (Peak XV's Koramangala coffee culture)
- "Draup" (Zinnov's actual platform)

### Validation

Roasts are validated for:
- Length: 20-250 characters
- No LLM preamble ("Here's", "Based on", etc.)
- No markdown formatting
- Must be a clean, quotable line

Failed validations trigger retry (up to 3 attempts).

## Files

```
.
├── poc-card-generator.js   # Main script
├── card-template.html      # HTML/CSS template for card
├── shiba.png              # Mascot image
├── .env                   # API keys
├── output/                # Generated cards
└── README.md              # This file
```

## Customization

### Adding Company Domains

For companies where the domain isn't obvious, add to `COMPANY_DOMAINS`:

```javascript
const COMPANY_DOMAINS = {
  grapevine: "joingrapevineco.com",
  // Add more...
};
```

### Adding Company Types

For company-specific context, add to `COMPANY_TYPES`:

```javascript
const COMPANY_TYPES = {
  zerodha: "startup",
  "elevation capital": "vc",
  // Add more...
};
```

## Troubleshooting

### Roasts too generic?
- Check if grounding is enabled (`tools: [{ googleSearch: {} }]`)
- The model needs to research the company for specific details

### Roasts following same pattern?
- The guidelines emphasize "NO TEMPLATES" - if patterns emerge, adjust the examples in guidelines

### Logo not loading?
- Check if Logo.dev key is valid
- Some companies don't have logos in Logo.dev database
- Fallback logos (< 5KB) are automatically skipped

### Puppeteer fails on server?
- Install Chromium dependencies
- On Docker, use `puppeteer-core` with system Chromium

### Rate limiting?
- Gemini has rate limits - add delays between batch generations
- Logo.dev has generous limits for publishable keys

## Integration Notes

To integrate into production:

1. **Replace file storage** - Use Cloudinary/S3 instead of local files
2. **Add caching** - Cache logos and common roasts
3. **Queue system** - For batch generation
4. **Moderation** - Add content filtering for edge cases
5. **Analytics** - Track which roasts get shared most
