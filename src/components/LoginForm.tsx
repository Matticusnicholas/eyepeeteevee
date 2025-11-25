'use client';

import { useState } from 'react';
import { useIPTVStore } from '@/store';
import { Tv, Loader2, AlertCircle, Link, User, Lock, Server } from 'lucide-react';

type LoginType = 'xtream' | 'm3u';

export default function LoginForm() {
  const { login, isLoading, error } = useIPTVStore();
  const [loginType, setLoginType] = useState<LoginType>('xtream');

  // Xtream fields
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // M3U fields
  const [m3uUrl, setM3uUrl] = useState('');
  const [epgUrl, setEpgUrl] = useState('');

  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    try {
      if (loginType === 'xtream') {
        if (!serverUrl || !username || !password) {
          setLocalError('Please fill in all fields');
          return;
        }

        // Normalize server URL
        let normalizedUrl = serverUrl.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
          normalizedUrl = 'http://' + normalizedUrl;
        }

        await login({
          type: 'xtream',
          serverUrl: normalizedUrl,
          username: username.trim(),
          password: password.trim(),
        });
      } else {
        if (!m3uUrl) {
          setLocalError('Please enter an M3U URL');
          return;
        }

        await login({
          type: 'm3u',
          m3uUrl: m3uUrl.trim(),
          epgUrl: epgUrl.trim() || undefined,
        });
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-4">
            <Tv className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">EyePeeTeevee</h1>
          <p className="text-gray-400">Your free IPTV player</p>
        </div>

        {/* Login Type Tabs */}
        <div className="flex bg-gray-800/50 rounded-lg p-1 mb-6">
          <button
            onClick={() => setLoginType('xtream')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginType === 'xtream'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Xtream Codes
          </button>
          <button
            onClick={() => setLoginType('m3u')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginType === 'm3u'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            M3U Playlist
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-800/50 backdrop-blur rounded-xl p-6 shadow-xl">
          {loginType === 'xtream' ? (
            <>
              {/* Server URL */}
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Server URL
                </label>
                <div className="relative">
                  <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://example.com:8080"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Username */}
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Your username"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* M3U URL */}
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  M3U Playlist URL
                </label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={m3uUrl}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    placeholder="http://example.com/playlist.m3u"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* EPG URL (Optional) */}
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  EPG URL <span className="text-gray-500">(Optional)</span>
                </label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={epgUrl}
                    onChange={(e) => setEpgUrl(e.target.value)}
                    placeholder="http://example.com/epg.xml"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </>
          )}

          {/* Error Display */}
          {(error || localError) && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error || localError}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </button>
        </form>

        {/* Info */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Your credentials are stored locally and never sent to our servers.
        </p>
      </div>
    </div>
  );
}
