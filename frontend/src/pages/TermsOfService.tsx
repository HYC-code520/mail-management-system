import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-brand hover:text-brand-hover transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-3xl font-bold text-brand">
            <Mail className="w-8 h-8" />
            <span>Mei Way Mail Plus</span>
          </div>
        </div>

        {/* Terms Content */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: December 2025</p>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
            <p>
              These Terms of Service ("Terms") govern your access to and use of the services provided by Mei Way Mail Plus 
              ("Mei Way Mail Plus," "we," "us," or "our"). By accessing our website, using our services, or authorizing any 
              connected applications, you agree to be bound by these Terms.
            </p>
            <p className="font-semibold">
              If you do not agree to these Terms, do not use our services.
            </p>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Description of Services</h2>
              <p>Mei Way Mail Plus provides mail, shipping, and business support services, including but not limited to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Private mailbox rentals</li>
                <li>Mail and package receiving, logging, storage, and pickup</li>
                <li>Virtual mailbox services (mail scanning and forwarding, where applicable)</li>
                <li>Domestic and international shipping services</li>
                <li>eBay consignment services</li>
                <li>Business services such as LLC formation assistance and document handling</li>
                <li>Email notifications related to mail, packages, invoices, and account activity</li>
              </ul>
              <p className="mt-4">
                Some services may be provided through third-party platforms or integrations (such as email notifications via Gmail).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. Eligibility</h2>
              <p>
                You must be at least 18 years old to use our services. By using Mei Way Mail Plus, you represent that you are 
                legally able to enter into a binding agreement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Account Registration and Accuracy</h2>
              <p>
                You agree to provide accurate, current, and complete information when registering for services or opening a mailbox. 
                You are responsible for maintaining the accuracy of your information and for all activity associated with your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. Email and App Integrations (Google / Gmail API Compliance)</h2>
              <p>
                Mei Way Mail Plus may offer optional email-based notifications and integrations, including the use of Google Gmail APIs, 
                subject to your explicit authorization.
              </p>
              
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4.1 Use of Google User Data</h3>
              <p>If you authorize access to your Gmail account:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We access only the minimum data necessary to send notifications or log mail-related communications.</li>
                <li>We do not read, analyze, or sell email content for advertising or profiling purposes.</li>
                <li>We do not use Gmail data for any purpose other than providing the requested service.</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4.2 Data Handling</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>Gmail data is used solely to send or manage service-related emails (e.g., mail notifications, delivery confirmations, invoice reminders).</li>
                <li>Gmail data is not shared with third parties, except as required to provide the service or comply with law.</li>
                <li>Data access can be revoked at any time via your Google account permissions.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Privacy</h2>
              <p>
                Your use of our services is also governed by our <Link to="/privacy-policy" className="text-brand hover:text-brand-hover underline">Privacy Policy</Link>, 
                which describes how we collect, use, and protect your information. By using our services, you consent to the collection and 
                use of information as outlined in that policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. Fees and Payments</h2>
              <p>Certain services require payment, including mailbox rentals, shipping, consignment fees, and business services.</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Fees are disclosed at the time of service or in your service agreement.</li>
                <li>All payments are non-refundable unless otherwise stated in writing.</li>
                <li>You are responsible for any applicable taxes, duties, or government fees.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">7. Mail Handling and Limitations</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Mei Way Mail Plus is not a government postal service.</li>
                <li>We are not responsible for delays or losses caused by USPS, carriers, or third-party shipping providers.</li>
                <li>Certified mail, legal notices, or time-sensitive documents should be clearly disclosed to us by the customer.</li>
                <li>Mail is handled according to our posted policies and customer instructions.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">8. Acceptable Use</h2>
              <p>You agree not to use our services for:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Illegal activities</li>
                <li>Fraud, impersonation, or misrepresentation</li>
                <li>Harassment or abuse</li>
                <li>Shipping or storing prohibited or hazardous materials</li>
              </ul>
              <p className="mt-4">We reserve the right to refuse service or terminate accounts for violations.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">9. Intellectual Property</h2>
              <p>
                All website content, branding, software, templates, and materials are the property of Mei Way Mail Plus or its licensors 
                and may not be copied or reused without permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">10. Termination</h2>
              <p>We may suspend or terminate your access to services at any time for:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Violation of these Terms</li>
                <li>Non-payment</li>
                <li>Legal or regulatory requirements</li>
              </ul>
              <p className="mt-4">
                You may terminate your account by contacting us, subject to any outstanding obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">11. Disclaimers</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>Services are provided "as is" and "as available."</li>
                <li>We make no guarantees regarding uninterrupted service, delivery times, or outcomes.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">12. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Mei Way Mail Plus shall not be liable for indirect, incidental, or consequential 
                damages, including loss of data, profits, or business opportunities.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">13. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless Mei Way Mail Plus from claims arising out of your use of the services, 
                violation of these Terms, or misuse of mail or shipping services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">14. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the State of New York, without regard to conflict-of-law principles.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">15. Changes to These Terms</h2>
              <p>
                We may update these Terms from time to time. The updated version will be posted on our website with a revised 
                "Last Updated" date. Continued use of the services constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">16. Contact Information</h2>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-4">
                <p className="font-semibold text-gray-900">Mei Way Mail Plus</p>
                <p className="mt-2">37-02 Main Street, Unit B1</p>
                <p>Flushing, NY 11354</p>
                <p className="mt-4">📞 Phone: <a href="tel:646-535-0363" className="text-brand hover:text-brand-hover">646-535-0363</a></p>
                <p>📧 Email: <a href="mailto:info@meiwaymail.com" className="text-brand hover:text-brand-hover">info@meiwaymail.com</a></p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <Link to="/privacy-policy" className="text-brand hover:text-brand-hover">View Privacy Policy</Link>
          {' · '}
          <Link to="/" className="text-brand hover:text-brand-hover">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}

