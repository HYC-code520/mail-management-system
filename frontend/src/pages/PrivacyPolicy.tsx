import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
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

        {/* Privacy Policy Content */}
        <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 mb-8">Last Updated: December 2025</p>

          <div className="prose prose-gray max-w-none space-y-6 text-gray-700">
            <p>
              Mei Way Mail Plus ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we 
              collect, use, disclose, and safeguard your information when you use our services, including our mail management system 
              and any integrations with third-party services such as Google Gmail.
            </p>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">1. Information We Collect</h2>
              
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">1.1 Personal Information</h3>
              <p>We collect personal information that you provide to us, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Name, email address, phone number, and mailing address</li>
                <li>Government-issued identification (as required for mailbox services)</li>
                <li>Payment information (processed securely through third-party payment processors)</li>
                <li>Business information (for business service customers)</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">1.2 Mail and Package Information</h3>
              <p>In the course of providing our services, we collect:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Sender and recipient information from mail and packages</li>
                <li>Tracking numbers and delivery confirmations</li>
                <li>Scanned images of mail (for virtual mailbox services)</li>
                <li>Notes and instructions related to mail handling</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">1.3 Usage and Technical Information</h3>
              <p>We automatically collect certain information when you use our services:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>IP address, browser type, and device information</li>
                <li>Log data and usage patterns</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">1.4 Google User Data (Gmail API)</h3>
              <p>
                If you authorize our application to access your Gmail account, we collect only the minimum data necessary to provide 
                email notification services:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Email address (to send notifications)</li>
                <li>Permission to send emails on your behalf (for service notifications only)</li>
              </ul>
              <p className="mt-4 font-semibold">
                We do NOT read, analyze, store, or access the content of your Gmail messages beyond what is necessary to send 
                service-related notifications.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve our mail and shipping services</li>
                <li>Process payments and manage your account</li>
                <li>Send you notifications about mail, packages, invoices, and account updates</li>
                <li>Respond to your inquiries and provide customer support</li>
                <li>Comply with legal obligations and enforce our Terms of Service</li>
                <li>Detect, prevent, and address fraud or security issues</li>
                <li>Send marketing communications (with your consent, where required)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">3. Google API Services - Limited Use Disclosure</h2>
              <p className="font-semibold">
                Mei Way Mail Plus's use and transfer of information received from Google APIs adheres to the{' '}
                <a 
                  href="https://developers.google.com/terms/api-services-user-data-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand-hover underline"
                >
                  Google API Services User Data Policy
                </a>, including the Limited Use requirements.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
                <h4 className="font-semibold text-gray-900 mb-3">Our Gmail API Commitments:</h4>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Limited Use:</strong> Gmail data is used solely to send mail-related notifications to you.</li>
                  <li><strong>No Human Reading:</strong> We do not read or analyze your Gmail messages.</li>
                  <li><strong>No Sharing:</strong> Gmail data is not shared with third parties except as necessary to provide the service or comply with law.</li>
                  <li><strong>No Advertising:</strong> Gmail data is not used for advertising, marketing, or profiling purposes.</li>
                  <li><strong>Revocable:</strong> You can revoke our access to your Gmail account at any time through your Google Account settings.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">4. How We Share Your Information</h2>
              <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
              
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4.1 Service Providers</h3>
              <p>
                We may share information with third-party vendors who perform services on our behalf, such as payment processing, 
                shipping carriers, and email services. These providers are contractually obligated to protect your information.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4.2 Legal Requirements</h3>
              <p>We may disclose your information if required by law, legal process, or government request.</p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4.3 Business Transfers</h3>
              <p>
                In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">4.4 With Your Consent</h3>
              <p>We may share your information for any other purpose with your explicit consent.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational measures to protect your personal information from unauthorized 
                access, disclosure, alteration, or destruction. However, no method of transmission over the internet or electronic 
                storage is 100% secure, and we cannot guarantee absolute security.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Secure authentication and access controls</li>
                <li>Regular security assessments and updates</li>
                <li>Limited employee access to personal information on a need-to-know basis</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">6. Data Retention</h2>
              <p>
                We retain your personal information for as long as necessary to provide our services and comply with legal obligations. 
                When you close your account, we will delete or anonymize your information unless we are required to retain it by law.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Account information: Retained while your account is active and for legal/regulatory purposes afterward</li>
                <li>Mail records: Retained according to postal regulations and customer agreements</li>
                <li>Gmail API access: Can be revoked immediately through your Google Account settings</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">7. Your Rights and Choices</h2>
              <p>You have the following rights regarding your personal information:</p>
              
              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">7.1 Access and Correction</h3>
              <p>You may request access to or correction of your personal information by contacting us.</p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">7.2 Deletion</h3>
              <p>You may request deletion of your personal information, subject to legal retention requirements.</p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">7.3 Opt-Out</h3>
              <p>You may opt out of marketing communications by following the unsubscribe instructions in our emails.</p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-3">7.4 Revoke Google Access</h3>
              <p>
                You can revoke our access to your Gmail account at any time by visiting your{' '}
                <a 
                  href="https://myaccount.google.com/permissions" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand-hover underline"
                >
                  Google Account Permissions
                </a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">8. Children's Privacy</h2>
              <p>
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information 
                from children. If we become aware that we have collected information from a child, we will take steps to delete it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. We take 
                appropriate measures to ensure your information receives adequate protection in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">10. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated 
                policy on our website with a revised "Last Updated" date. Your continued use of our services constitutes acceptance 
                of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">11. Contact Us</h2>
              <p>
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
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
          <Link to="/terms-of-service" className="text-brand hover:text-brand-hover">View Terms of Service</Link>
          {' · '}
          <Link to="/" className="text-brand hover:text-brand-hover">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}

