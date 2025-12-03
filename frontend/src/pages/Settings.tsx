import { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, RefreshCw, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../lib/api-client';

interface GmailStatus {
  connected: boolean;
  gmailAddress?: string;
}

export default function SettingsPage() {
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  // Load Gmail connection status on mount
  useEffect(() => {
    loadGmailStatus();
  }, []);

  const loadGmailStatus = async () => {
    try {
      setLoading(true);
      const status = await api.oauth.getGmailStatus();
      setGmailStatus(status);
    } catch (error: any) {
      console.error('Failed to load Gmail status:', error);
      // If API call fails, assume not connected
      setGmailStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      setConnecting(true);
      // Get the OAuth authorization URL from backend
      const response = await api.oauth.getGmailAuthUrl();
      
      // Redirect to Google's OAuth consent screen
      window.location.href = response.authUrl;
    } catch (error: any) {
      console.error('Failed to connect Gmail:', error);
      toast.error(error.message || 'Failed to connect Gmail');
      setConnecting(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!confirm('Are you sure you want to disconnect your Gmail account? You will need to reconnect to send emails.')) {
      return;
    }

    try {
      setConnecting(true);
      await api.oauth.disconnectGmail();
      setGmailStatus({ connected: false });
      toast.success('Gmail disconnected successfully');
    } catch (error: any) {
      console.error('Failed to disconnect Gmail:', error);
      toast.error(error.message || 'Failed to disconnect Gmail');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header - Matches Dashboard Style */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account settings and integrations</p>
      </div>

      {/* Gmail Integration Section - Matches Dashboard Card Style */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                Gmail Integration
                
                {/* Info Icon with Tooltip */}
                <div className="relative group inline-block">
                  <Info className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
                  
                  {/* Tooltip */}
                  <div className="absolute left-0 top-full mt-2 px-4 py-3 bg-gray-200 text-gray-900 text-[11px] text-left leading-relaxed shadow-lg border border-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-75 w-80 z-50 pointer-events-none">
                    <div className="space-y-2.5">
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">🔒 Secure OAuth2 Connection</p>
                        <p>We use Google's secure OAuth2 protocol. Your Gmail password is never shared with our app.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">✓ Permissions</p>
                        <p>We only request permission to send emails on your behalf. We cannot read your existing emails.</p>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 mb-1">→ Disconnect Anytime</p>
                        <p>You can disconnect your Gmail account at any time from this page.</p>
                      </div>
                    </div>
                    <div className="absolute bottom-full left-6 border-4 border-transparent border-b-gray-200"></div>
                  </div>
                </div>
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Connect your Gmail account to send email notifications
              </p>
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-6">
          {/* Connection Status */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {gmailStatus.connected ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : (
                <XCircle className="w-12 h-12 text-gray-400" />
              )}
            </div>

            <div className="flex-grow">
              {gmailStatus.connected ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Gmail Connected
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Your Gmail account is connected and ready to send emails.
                  </p>
                  {gmailStatus.gmailAddress && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                      <p className="text-sm font-semibold text-green-900 mb-1">Connected Account</p>
                      <p className="text-green-700 font-mono text-sm">{gmailStatus.gmailAddress}</p>
                    </div>
                  )}
                  <button
                    onClick={handleDisconnectGmail}
                    disabled={connecting}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {connecting ? 'Disconnecting...' : 'Disconnect Gmail'}
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    Gmail Not Connected
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Connect your Gmail account to enable email notifications. This is a secure OAuth2 connection - we never store your password.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
                    <h4 className="font-semibold text-blue-900 mb-3 text-sm">What you'll be able to do:</h4>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Send email notifications to customers directly from the app</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Use pre-built templates with automatic customer info</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>Track which emails have been sent</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>No more copy-pasting into Gmail manually</span>
                      </li>
                    </ul>
                  </div>
                  <button
                    onClick={handleConnectGmail}
                    disabled={connecting}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                  >
                    <Mail className="w-5 h-5" />
                    {connecting ? 'Connecting...' : 'Connect Gmail Account'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Future Settings Sections Can Go Here */}
      {/* Example: Profile Settings, Notification Preferences, etc. */}
    </div>
  );
}

