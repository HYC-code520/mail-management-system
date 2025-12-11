# Translation Service Configuration

The system now supports **multiple translation providers with automatic fallback**:

## Translation Providers (in order of priority)

### 1. Amazon Translate (Primary - if configured)
- **Setup**: Set AWS credentials in `.env`
- **Rate Limits**: High (AWS paid service)
- **Quality**: Excellent
- **Environment Variables**:
  ```bash
  AWS_ACCESS_KEY_ID=your-aws-access-key
  AWS_SECRET_ACCESS_KEY=your-aws-secret-key
  AWS_REGION=us-east-1
  ```

### 2. Google Translate API (Backup - if configured)
- **Setup**: Get API key from Google Cloud Console
- **Rate Limits**: Moderate (Google Cloud paid service)
- **Quality**: Excellent
- **Environment Variable**:
  ```bash
  GOOGLE_TRANSLATE_API_KEY=your-google-api-key
  ```

### 3. LibreTranslate (Final Fallback - always available)
- **Setup**: None required! Uses free public instance
- **Rate Limits**: Low (free public API)
- **Quality**: Good
- **Environment Variables** (optional):
  ```bash
  LIBRETRANSLATE_URL=https://libretranslate.com/translate  # Default
  LIBRETRANSLATE_API_KEY=your-libre-api-key  # Optional, for higher limits
  ```

## How It Works

The system automatically tries providers in order:
1. **Amazon** → If fails or not configured, try...
2. **Google** → If fails or not configured, try...
3. **LibreTranslate** → Always available as final fallback

## Quick Start

### Option 1: Use LibreTranslate Only (No setup required!)
Just start the backend - LibreTranslate will work automatically.

### Option 2: Add Amazon Translate (Recommended)
1. Create AWS account
2. Enable Amazon Translate service
3. Create IAM user with translate permissions
4. Add credentials to `.env`:
   ```bash
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_REGION=us-east-1
   ```

### Option 3: Add Google Translate (Alternative)
1. Create Google Cloud account
2. Enable Cloud Translation API
3. Create API key
4. Add to `.env`:
   ```bash
   GOOGLE_TRANSLATE_API_KEY=your-google-key
   ```

## Rate Limit Handling

- The system will automatically switch providers if one hits rate limits
- Built-in rate limiting: 20 translations/minute per user
- If all providers fail, a clear error message is returned

## Testing

```bash
# Check translation status
curl http://localhost:5000/api/translate/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Translate text
curl -X POST http://localhost:5000/api/translate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello, how are you?"}'
```

## Troubleshooting

### "Too Many Requests" (429 Error)
- **Solution**: System will automatically try next provider
- **If all fail**: Wait 1 hour for rate limits to reset
- **Prevention**: Configure multiple providers or use paid tiers

### "Translation service not configured"
- **Solution**: At least LibreTranslate is always available
- **Check**: Make sure backend is running
- **Verify**: Visit `/api/translate/status` endpoint

### LibreTranslate Not Working
- **Check internet connection**: LibreTranslate requires external API
- **Alternative**: Set up your own LibreTranslate instance
  ```bash
  # Docker setup
  docker run -ti --rm -p 5000:5000 libretranslate/libretranslate
  
  # Then set in .env:
  LIBRETRANSLATE_URL=http://localhost:5000/translate
  ```

## Cost Comparison

| Provider | Free Tier | Paid Pricing | Rate Limits |
|----------|-----------|--------------|-------------|
| **LibreTranslate** | Unlimited (public) | Self-host: Free | Low (shared) |
| **Amazon Translate** | 2M chars/month (12 months) | $15/1M chars | Very High |
| **Google Translate** | $0 | $20/1M chars | High |

## Recommendation

**For Development**: Use LibreTranslate (no setup needed)

**For Production**: 
1. Set up Amazon Translate (best quality, good free tier)
2. Add Google as backup
3. Keep LibreTranslate as emergency fallback

