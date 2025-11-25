'use client';

interface AdBannerProps {
  position?: 'top' | 'bottom';
}

export default function AdBanner({ position = 'bottom' }: AdBannerProps) {
  return (
    <div
      className={`bg-gray-800 border-gray-700 ${
        position === 'top' ? 'border-b' : 'border-t'
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 py-2">
        {/* Ad placeholder - Replace with actual ad code (e.g., Google AdSense) */}
        <div className="bg-gray-700/50 rounded-lg h-16 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-xs">Advertisement</p>
            <p className="text-gray-600 text-xs mt-0.5">
              {/*
                To add Google AdSense or other ad networks:
                1. Sign up for an ad account
                2. Get your ad code snippet
                3. Replace this placeholder with the ad code

                Example for Google AdSense:
                <ins
                  className="adsbygoogle"
                  style={{ display: 'block' }}
                  data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
                  data-ad-slot="XXXXXXXXXX"
                  data-ad-format="auto"
                  data-full-width-responsive="true"
                />
              */}
              728x90 banner space
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Smaller ad format for sidebar or mobile
export function AdBannerSmall() {
  return (
    <div className="bg-gray-800/50 rounded-lg p-2">
      <div className="bg-gray-700/30 rounded h-24 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-xs">Ad</p>
          <p className="text-gray-600 text-[10px]">300x250</p>
        </div>
      </div>
    </div>
  );
}
