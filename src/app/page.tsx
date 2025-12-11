'use client';

import { useEffect, useState } from 'react';
import { useIPTVStore } from '@/store';
import LoginForm from '@/components/LoginForm';
import Header from '@/components/Header';
import ChannelBrowser from '@/components/ChannelBrowser';
import MultiScreenPlayer from '@/components/MultiScreenPlayer';
import { EPGDrawer, EPGButton, EPGMiniOverlay } from '@/components/EPGDisplay';
import AdBanner from '@/components/AdBanner';
import { PanelLeftClose, PanelLeft, Loader2 } from 'lucide-react';

export default function Home() {
  const {
    isAuthenticated,
    credentials,
    activeStreams,
    hasHydrated,
    isLoading,
  } = useIPTVStore();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [epgOpen, setEpgOpen] = useState(false);
  const [isAutoLogging, setIsAutoLogging] = useState(false);

  // Auto-login if credentials are cached
  useEffect(() => {
    if (hasHydrated && credentials && !isAuthenticated && !isAutoLogging) {
      setIsAutoLogging(true);
      useIPTVStore
        .getState()
        .login(credentials)
        .catch(() => {
          // If auto-login fails, clear credentials
          useIPTVStore.getState().logout();
        })
        .finally(() => {
          setIsAutoLogging(false);
        });
    }
  }, [hasHydrated, credentials, isAuthenticated, isAutoLogging]);

  // Show loading state while hydrating or auto-logging in
  if (!hasHydrated || isAutoLogging) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-gray-400">
          {isAutoLogging ? 'Connecting to your IPTV...' : 'Loading...'}
        </p>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const hasActiveStream = activeStreams.length > 0;

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <Header />

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar - Channel Browser */}
        <aside
          className={`${
            sidebarOpen ? 'w-80 lg:w-96' : 'w-0'
          } flex-shrink-0 transition-all duration-300 border-r border-gray-800 overflow-hidden`}
        >
          <div className="h-full overflow-hidden">
            <ChannelBrowser />
          </div>
        </aside>

        {/* Main Player Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Toggle Sidebar Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="absolute top-4 left-4 z-10 p-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-colors backdrop-blur-sm"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-5 h-5 text-white" />
            ) : (
              <PanelLeft className="w-5 h-5 text-white" />
            )}
          </button>

          {/* Video Player */}
          <div className="flex-1 relative">
            <MultiScreenPlayer />

            {/* EPG Mini Overlay - shows current program on video */}
            {hasActiveStream && <EPGMiniOverlay />}

            {/* EPG Button - bottom center of video */}
            {hasActiveStream && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <EPGButton onClick={() => setEpgOpen(true)} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Ad Banner */}
      <AdBanner position="bottom" />

      {/* EPG Drawer */}
      <EPGDrawer isOpen={epgOpen} onClose={() => setEpgOpen(false)} />
    </div>
  );
}
