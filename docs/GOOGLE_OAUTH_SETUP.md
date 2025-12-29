# Google OAuth Setup Guide - Privacy Policy & Terms of Service

## What I've Created

I've set up two separate pages for your Privacy Policy and Terms of Service that are publicly accessible and properly formatted for Google OAuth verification.

### New Pages Created:

1. **Privacy Policy** - `/privacy-policy`
   - Location: `frontend/src/pages/PrivacyPolicy.tsx`
   - Includes comprehensive data handling information
   - Specifically addresses Google API Services Limited Use requirements
   - Contains all required disclosures for Gmail API usage

2. **Terms of Service** - `/terms-of-service`
   - Location: `frontend/src/pages/TermsOfService.tsx`
   - Based on the document your client provided
   - Includes all business terms and Gmail API compliance sections
   - Properly formatted with all 16 sections

### User Experience:

- Both pages are accessible WITHOUT login (public routes)
- Added footer links on the login page for easy access
- Professional, clean layout matching your app's design
- Mobile-responsive design
- Cross-linking between the two pages

## URLs for Google OAuth Verification

Once your app is deployed, you'll use these URLs in the Google Cloud Console:

### Production URLs (replace with your actual domain):
```
Application Privacy Policy Link:
https://yourdomain.com/privacy-policy

Application Terms of Service Link:
https://yourdomain.com/terms-of-service
```

### For Local Testing:
```
http://localhost:5173/privacy-policy
http://localhost:5173/terms-of-service
```

## How to Add These to Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **OAuth consent screen**
4. Scroll to **Authorized domains** section
5. Add your domain (e.g., `yourdomain.com`)
6. Under **Application information**, fill in:
   - **Application privacy policy link**: `https://yourdomain.com/privacy-policy`
   - **Application terms of service link**: `https://yourdomain.com/terms-of-service`
7. Click **Save and Continue**

## Important Notes

### About the Document Your Client Provided

The document your client gave you was excellent and comprehensive! However, Google requires **two separate URLs** - one for Privacy Policy and one for Terms of Service. 

I've split them intelligently:

- **Terms of Service**: Contains all business terms, service agreements, and Gmail API usage terms
- **Privacy Policy**: Focuses on data collection, usage, security, and user rights (especially important for Google API compliance)

### Google API Services Compliance

Both documents include specific sections addressing:
- ✅ Limited Use requirements
- ✅ Data minimization
- ✅ No selling of data
- ✅ User ability to revoke access
- ✅ Transparency about Gmail data usage
- ✅ Links to Google's policies

This meets Google's requirements for Gmail API verification.

## Testing Your Pages

1. Start your development server
2. Navigate to:
   - `http://localhost:5173/privacy-policy`
   - `http://localhost:5173/terms-of-service`
3. Verify all content displays correctly
4. Test the links between pages work

## Before Submitting for Google Verification

- ✅ Deploy your app to production
- ✅ Ensure both pages are publicly accessible (no login required)
- ✅ Test that the URLs work in an incognito browser window
- ✅ Add your production domain to Google's Authorized Domains list
- ✅ Use the full production URLs in the OAuth consent screen

## Need to Update Content?

Both page files are located in `frontend/src/pages/`:
- `PrivacyPolicy.tsx` - Edit privacy policy content
- `TermsOfService.tsx` - Edit terms of service content

Remember to update the "Last Updated" date when making changes!

## Visual Design

The pages include:
- Company logo and branding
- Professional typography and spacing
- Highlighted important sections (e.g., Google API commitments)
- Contact information in styled boxes
- Navigation links between pages
- Back to Sign In links

---

**Questions?** The implementation follows Google's OAuth verification requirements and best practices for legal document presentation.

