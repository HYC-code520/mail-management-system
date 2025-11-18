import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getUser } from '@/utils/supabase/queries';
import Link from 'next/link';

export default async function HomePage() {
  const supabase = createClient();
  const user = await getUser(supabase);

  // Redirect logged-in users to dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-6">
            <span className="text-7xl">📬</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Mei Way Outreach Tracker
          </h1>
          
          <p className="text-xl md:text-2xl text-zinc-400 mb-4 max-w-2xl mx-auto">
            Streamline your mail center customer communication
          </p>
          
          <p className="text-lg text-green-400 mb-12">
            Reduce outreach time from 5 minutes to under 1 minute per customer
          </p>
          
          <div className="flex gap-4 justify-center mb-20">
            <Link
              href="/signin"
              className="bg-white text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-zinc-200 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/signin"
              className="bg-zinc-800 text-white px-8 py-4 rounded-lg font-semibold text-lg border border-zinc-700 hover:bg-zinc-700 transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center hover:border-zinc-700 transition-colors">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-white mb-3">Centralized Dashboard</h3>
              <p className="text-zinc-400">
                All client communications (email + SMS) tracked in one place
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center hover:border-zinc-700 transition-colors">
              <div className="text-5xl mb-4">📧</div>
              <h3 className="text-xl font-bold text-white mb-3">Quick Templates</h3>
              <p className="text-zinc-400">
                Send messages with one click using pre-built templates
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center hover:border-zinc-700 transition-colors">
              <div className="text-5xl mb-4">⏰</div>
              <h3 className="text-xl font-bold text-white mb-3">Auto Follow-ups</h3>
              <p className="text-zinc-400">
                Never miss a follow-up with automatic reminders
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-20 p-12 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl">
            <div className="text-6xl font-bold text-green-400 mb-4">87%</div>
            <p className="text-2xl font-semibold text-white mb-3">Time Saved</p>
            <p className="text-zinc-400 text-lg">
              Reduce communication time from 5 minutes to under 1 minute per customer
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
