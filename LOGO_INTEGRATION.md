# Logo.dev Integration

## How It Works

1. **Company Name to Domain**: Uses hardcoded mapping for 30+ companies, falls back to `{name}.com`

2. **Logo.dev URL**:
   ```
   https://img.logo.dev/{domain}?token={PUBLISHABLE_KEY}&size=120&format=png
   ```

3. **Display**: Logo appears next to company name with white background

## API Key

**Important:** Logo.dev image CDN requires a **publishable key** (starts with `pk_`), NOT a secret key.

```
pk_KV9Z5AZ6RKGwJDRsWiv80g
```

If logos aren't loading, check:
- Key starts with `pk_` not `sk_`
- Domain mapping is correct for the company

## Supported Companies (Pre-mapped)

### Tech Giants
Google, Amazon, Microsoft, Meta, Apple, Netflix, Tesla, Uber, Airbnb, Spotify, Zoom, Slack, X

### Indian IT
TCS, Infosys, Wipro, HCL, Tech Mahindra, LTIMindtree

### Indian Startups
Zomato, Swiggy, Paytm, Flipkart, Ola, Razorpay, CRED, PhonePe, Meesho, Zerodha

## Adding Companies

Edit `COMPANY_DOMAINS` in `poc-card-generator.js`:

```javascript
const COMPANY_DOMAINS = {
  'yourcompany': 'yourcompany.com',
};
```
