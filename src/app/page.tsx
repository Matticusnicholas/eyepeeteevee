'use client';

import { useEffect, useState } from 'react';
import { useIPTVStore } from '@/store';
import LoginForm from '@/components/LoginForm';
import Header from '@/components/Header';
import ChannelBrowser from '@/components/ChannelBrowser';
import MultiScreenPlayer from '@/components/MultiScreenPlayer';
import EPGDisplay from '@/components/EPGDisplay';
import AdBanner from '@/components/AdBanner';
import { PanelLeftClose, PanelLeft, Calendar } from 'lucide-react';

export default function Home() {
  const { isAuthenticated, credentials } = useIPTVStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showEPG, setShowEPG] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Handle hydration mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Auto-login if credentials are cached
  useEffect(() => {
    if (isHydrated && credentials && !isAuthenticated) {
      useIPTVStore.getState().login(credentials).catch(() => {
        // If auto-login fails, clear credentials
        useIPTVStore.getState().logout();
      });
    }
  }, [isHydrated, credentials, isAuthenticated]);

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Channel Browser */}
        <aside
          className={`${
            sidebarOpen ? 'w-80 lg:w-96' : 'w-0'
          } flex-shrink-0 transition-all duration-300 overflow-hidden border-r border-gray-800`}
        >
          <ChannelBrowser />
        </aside>

        {/* Main Player Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-4 left-4 z-10 p-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-5 h-5 text-white" />
            ) : (
              <PanelLeft className="w-5 h-5 text-white" />
            )}
          </button>

          {/* Toggle EPG Button */}
          <button
            onClick={() => setShowEPG(!showEPG)}
            className="absolute top-4 right-4 z-10 p-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors"
            title={showEPG ? 'Hide EPG' : 'Show EPG'}
          >
            <Calendar className={`w-5 h-5 ${showEPG ? 'text-blue-400' : 'text-white'}`} />
          </button>

          {/* Video Player */}
          <div className="flex-1">
            <MultiScreenPlayer />
          </div>

          {/* EPG Panel */}
          {showEPG && (
            <div className="h-48 border-t border-gray-800">
              <EPGDisplay />
            </div>
          )}
        </main>
      </div>

      {/* Ad Banner */}
      <AdBanner position="bottom" />
    </div>
  );
}
