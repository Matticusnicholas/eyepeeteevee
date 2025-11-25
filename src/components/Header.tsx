'use client';

import { useState } from 'react';
import { useIPTVStore } from '@/store';
import {
  Tv,
  Settings,
  LogOut,
  RefreshCw,
  User,
  Calendar,
  X,
  Moon,
  Sun,
  Volume2,
} from 'lucide-react';

export default function Header() {
  const { credentials, logout, refreshData, refreshEPG, isLoading } = useIPTVStore();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">EyePeeTeevee</h1>
            {credentials?.type === 'xtream' && (
              <p className="text-gray-500 text-xs">{credentials.username}@{new URL(credentials.serverUrl).host}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refreshData();
              refreshEPG();
            }}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
  );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { credentials } = useIPTVStore();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Account Info */}
          <div>
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Account
            </h3>
            <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
              {credentials?.type === 'xtream' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Server</span>
                    <span className="text-white text-sm">{new URL(credentials.serverUrl).host}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Username</span>
                    <span className="text-white text-sm">{credentials.username}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Type</span>
                  <span className="text-white text-sm">M3U Playlist</span>
                </div>
              )}
            </div>
          </div>

          {/* Player Settings */}
          <div>
            <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Player
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Auto-play on channel select</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Show EPG overlay</span>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* About */}
          <div className="pt-4 border-t border-gray-800">
            <p className="text-gray-500 text-sm text-center">
              EyePeeTeevee v1.0.0
            </p>
            <p className="text-gray-600 text-xs text-center mt-1">
              Free IPTV Player - Your credentials are stored locally
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
