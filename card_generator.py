"""
TAL Company Card Generator - Core Logic
Pure Python implementation for Streamlit Cloud deployment
"""

import os
import re
import base64
import subprocess
import requests
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types
from playwright.sync_api import sync_playwright

# Install Playwright browsers on first import (for Streamlit Cloud)
def _install_playwright_browsers():
    try:
        subprocess.run(
            ["playwright", "install", "chromium"],
            check=True,
            capture_output=True,
        )
    except Exception:
        pass  # Ignore if already installed or fails

_install_playwright_browsers()

# Load environment variables
load_dotenv()

# Configuration
CONFIG = {
    "logo_dev": {
        "api_key": "pk_KV9Z5AZ6RKGwJDRsWiv80g",
        "base_url": "https://img.logo.dev",
        "size": 120,
        "format": "png",
        "theme": "light",
    },
    "template": {
        "width": 1024,
        "height": 1536,
    },
}

# Get the directory where this script is located
SCRIPT_DIR = Path(__file__).parent
TEMPLATE_PATH = SCRIPT_DIR / "card-template.html"
SHIBA_PATH = SCRIPT_DIR / "shiba.png"

# Company name to domain mapping
COMPANY_DOMAINS = {
    "google": "google.com",
    "amazon": "amazon.com",
    "microsoft": "microsoft.com",
    "meta": "meta.com",
    "facebook": "meta.com",
    "apple": "apple.com",
    "netflix": "netflix.com",
    "tesla": "tesla.com",
    "uber": "uber.com",
    "airbnb": "airbnb.com",
    "spotify": "spotify.com",
    "zoom": "zoom.us",
    "slack": "slack.com",
    "twitter": "x.com",
    "x": "x.com",
    # Indian IT companies
    "ltimindtree": "ltimindtree.com",
    "tcs": "tcs.com",
    "infosys": "infosys.com",
    "wipro": "wipro.com",
    "hcl": "hcltech.com",
    "tech mahindra": "techmahindra.com",
    "techmahindra": "techmahindra.com",
    # Indian startups
    "grapevine": "joingrapevineco.com",
    "zomato": "zomato.com",
    "swiggy": "swiggy.com",
    "paytm": "paytm.com",
    "flipkart": "flipkart.com",
    "ola": "olacabs.com",
    "razorpay": "razorpay.com",
    "cred": "cred.club",
    "phonepe": "phonepe.com",
    "byju": "byjus.com",
    "meesho": "meesho.com",
    "dunzo": "dunzo.com",
    "zerodha": "zerodha.com",
}

# Company type classification
COMPANY_TYPES = {
    # Banks
    "icici bank": "bank", "icici": "bank", "hdfc bank": "bank", "hdfc": "bank",
    "kotak": "bank", "axis bank": "bank", "sbi": "bank", "yes bank": "bank",
    # Service/IT
    "tcs": "service", "infosys": "service", "wipro": "service", "hcl": "service",
    "tech mahindra": "service", "ltimindtree": "service", "cognizant": "service",
    "accenture": "consulting", "deloitte": "consulting", "pwc": "consulting",
    "kpmg": "consulting", "ey": "consulting", "mckinsey": "consulting",
    "bcg": "consulting", "bain": "consulting",
    # Big Tech
    "google": "bigtech", "amazon": "bigtech", "microsoft": "bigtech",
    "meta": "bigtech", "apple": "bigtech", "netflix": "bigtech",
    "uber": "bigtech", "airbnb": "bigtech",
    # Indian Startups
    "swiggy": "startup", "zomato": "startup", "cred": "startup",
    "razorpay": "startup", "phonepe": "startup", "paytm": "startup",
    "flipkart": "startup", "meesho": "startup", "zerodha": "startup",
    "ola": "startup", "dunzo": "startup", "grapevine": "startup",
    # VC/PE
    "elevation capital": "vc", "elevation": "vc", "peak xv": "vc",
    "sequoia": "vc", "accel": "vc", "matrix": "vc", "lightspeed": "vc",
    "nexus": "vc", "blume": "vc", "kalaari": "vc",
    # Education
    "mesa school": "edtech", "mesa": "edtech", "isb": "edtech",
    "iim": "edtech", "upgrad": "edtech", "byju": "edtech",
}

# Roast guidelines
ROAST_GUIDELINES = """
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
"""


def get_company_domain(company_name: str) -> str:
    """Get company domain from name"""
    normalized = company_name.lower().strip()

    if normalized in COMPANY_DOMAINS:
        return COMPANY_DOMAINS[normalized]

    # Fallback: convert company name to domain
    domain = re.sub(r'[^a-z0-9]', '', normalized) + ".com"
    return domain


def get_company_type(company_name: str) -> str:
    """Get company type for context"""
    normalized = company_name.lower().strip()
    return COMPANY_TYPES.get(normalized, "default")


def get_company_logo(company_name: str) -> Optional[str]:
    """Get company logo from Logo.dev (with fallback detection)"""
    domain = get_company_domain(company_name)

    params = {
        "token": CONFIG["logo_dev"]["api_key"],
        "size": str(CONFIG["logo_dev"]["size"]),
        "format": CONFIG["logo_dev"]["format"],
        "theme": CONFIG["logo_dev"]["theme"],
    }

    logo_url = f"{CONFIG['logo_dev']['base_url']}/{domain}"

    try:
        response = requests.get(logo_url, params=params, timeout=10)
        if not response.ok:
            return None

        # Check content-length - Logo.dev fallback letters are very small (~2-4KB)
        content_length = response.headers.get("content-length")
        if content_length and int(content_length) < 5000:
            return None

        # Return full URL with params
        return f"{logo_url}?{'&'.join(f'{k}={v}' for k, v in params.items())}"
    except Exception:
        return None


def is_valid_roast(roast: str) -> bool:
    """Validate roast quality"""
    if not roast:
        return False
    if len(roast) > 250:
        return False
    if len(roast) < 20:
        return False

    # Reject LLM preamble/thinking
    garbage_patterns = [
        r'^(Here|Based|OK|I |Let me|Background|Research|Context|Think|Step|First)',
        r'^(The roast|Roast:|Output:|My roast)',
        r'\*\*',  # Markdown bold
    ]

    for pattern in garbage_patterns:
        if re.search(pattern, roast, re.IGNORECASE):
            return False

    return True


def clean_roast(roast: str) -> str:
    """Clean up roast output"""
    result = roast
    result = re.sub(r'^["\'`]|["\'`]$', '', result)  # Remove quotes
    result = re.sub(r'^\*+|\*+$', '', result)  # Remove asterisks at start/end
    result = re.sub(r'\*([^*]+)\*', r'\1', result)  # Remove inline *emphasis*
    result = re.sub(r'^[-•]\s*', '', result)  # Remove bullet points
    result = re.sub(r"^(Here's|Based on|OK,|Okay,|Alright,|Sure,).+?:", '', result, flags=re.IGNORECASE)
    result = re.sub(r'^(The roast|Roast|My roast|Output):\s*', '', result, flags=re.IGNORECASE)
    result = re.sub(r'\n+', ' ', result)  # Replace newlines with space
    result = re.sub(r'\s+', ' ', result)  # Normalize whitespace
    return result.strip()


def generate_roast(company_name: str, role: str = "Engineers") -> dict:
    """Generate a roast using Gemini with Google Search grounding

    Returns dict with: roast, input_tokens, output_tokens, cost
    """
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("Missing GOOGLE_API_KEY in environment")

    # Initialize client with new SDK
    client = genai.Client(api_key=api_key)

    prompt = f"""You're a comedian writing a roast about {role} at {company_name}.

{ROAST_GUIDELINES}

Research {company_name}. Get in their heads. What's the funniest, most painfully accurate thing you could say that would make them screenshot it and send to their work group chat?

Be creative. Surprise me. No lazy takes.

OUTPUT ONLY THE ROAST:"""

    # Pricing for gemini-3-pro-preview (per 1M tokens)
    INPUT_PRICE_PER_M = 2.00
    OUTPUT_PRICE_PER_M = 12.00
    SEARCH_PRICE_PER_QUERY = 14.00 / 1000  # $14 per 1000 queries

    total_input_tokens = 0
    total_output_tokens = 0

    # Try up to 3 times
    for attempt in range(3):
        try:
            response = client.models.generate_content(
                model="gemini-3-pro-preview",
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.9,
                    top_p=0.95,
                    tools=[types.Tool(google_search=types.GoogleSearch())],
                ),
            )

            # Track token usage
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                total_input_tokens += getattr(response.usage_metadata, 'prompt_token_count', 0)
                total_output_tokens += getattr(response.usage_metadata, 'candidates_token_count', 0)

            raw_text = response.text
            roast = clean_roast(raw_text)

            if is_valid_roast(roast):
                # Calculate cost
                input_cost = (total_input_tokens / 1_000_000) * INPUT_PRICE_PER_M
                output_cost = (total_output_tokens / 1_000_000) * OUTPUT_PRICE_PER_M
                search_cost = SEARCH_PRICE_PER_QUERY  # 1 search query per generation
                total_cost = input_cost + output_cost + search_cost

                return {
                    "roast": roast,
                    "input_tokens": total_input_tokens,
                    "output_tokens": total_output_tokens,
                    "cost": total_cost,
                }
        except Exception as e:
            print(f"Generation failed (attempt {attempt + 1}): {e}")

    # Fallback
    return {
        "roast": "Your LinkedIn writes checks your JIRA can't cash.",
        "input_tokens": 0,
        "output_tokens": 0,
        "cost": 0,
    }


def escape_html(text: str) -> str:
    """Escape HTML special characters"""
    return (text
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#039;"))


def generate_card(company_name: str, role: str, roast_text: str, logo_url: Optional[str]) -> bytes:
    """Generate card image using Playwright"""

    # Load HTML template
    html = TEMPLATE_PATH.read_text()

    # Convert shiba image to base64 data URL
    if SHIBA_PATH.exists():
        shiba_base64 = base64.b64encode(SHIBA_PATH.read_bytes()).decode()
        shiba_data_url = f"data:image/png;base64,{shiba_base64}"
    else:
        # Fallback to emoji
        shiba_data_url = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48dGV4dCB5PSI3NSIgZm9udC1zaXplPSI4MCI+8J+YiTwvdGV4dD48L3N2Zz4="

    # Transparent 1px GIF as fallback for logo
    transparent_gif = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="

    # Replace placeholders
    html = html.replace("{{COMPANY_NAME}}", escape_html(company_name))
    html = html.replace("{{ROLE}}", escape_html(role))
    html = html.replace("{{ROAST_TEXT}}", escape_html(roast_text))
    html = html.replace("{{SHIBA_IMAGE}}", shiba_data_url)
    html = html.replace("{{COMPANY_LOGO}}", logo_url or transparent_gif)
    html = html.replace("{{HAS_LOGO}}", "true" if logo_url else "false")

    # Use Playwright to render and screenshot
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(
            viewport={
                "width": CONFIG["template"]["width"],
                "height": CONFIG["template"]["height"],
            },
            device_scale_factor=2,  # Retina quality
        )

        page.set_content(html)
        page.wait_for_load_state("networkidle")

        # Take screenshot
        screenshot = page.screenshot(type="png")

        browser.close()

    return screenshot
