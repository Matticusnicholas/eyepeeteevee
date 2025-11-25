# EyePeeTeevee

A free, web-based IPTV player with Xtream Codes and M3U playlist support. No downloads required - just open the website and start watching.

## Features

- **Xtream Codes Support** - Login with your server URL, username, and password
- **M3U Playlist Support** - Use any M3U/M3U8 playlist URL
- **Live TV, Movies & Series** - Browse and watch all your content
- **EPG (Electronic Program Guide)** - See what's on now and coming up
- **Multi-Screen Layouts** - Watch multiple channels at once (PiP, 2x2, 3x3 grids)
- **1-Minute Recording Buffer** - Capture and download the last minute of video
- **Favorites & Watch History** - Quick access to your favorite channels
- **Responsive Design** - Works on phones, tablets, computers, and smart TVs
- **Credential Caching** - Login once, auto-reconnect on return visits
- **100% Free** - No trials, no subscriptions

## Getting Started

### Using the Web App

1. Visit [eyepeeteevee.com](https://eyepeeteevee.com)
2. Choose your login type:
   - **Xtream Codes**: Enter your server URL, username, and password
   - **M3U Playlist**: Enter your M3U URL (and optional EPG URL)
3. Start watching!

### Self-Hosting

```bash
# Clone the repository
git clone https://github.com/yourusername/eyepeeteevee.git
cd eyepeeteevee

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first styling
- **HLS.js** - HTTP Live Streaming support
- **Zustand** - Lightweight state management
- **Lucide React** - Beautiful icons

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── page.tsx        # Main app page
│   ├── layout.tsx      # Root layout
│   └── globals.css     # Global styles
├── components/          # React components
│   ├── VideoPlayer.tsx # HLS video player
│   ├── LoginForm.tsx   # Xtream/M3U login
│   ├── ChannelBrowser.tsx # Channel list
│   ├── MultiScreenPlayer.tsx # Multi-screen layouts
│   ├── EPGDisplay.tsx  # Program guide
│   ├── Header.tsx      # App header
│   └── AdBanner.tsx    # Ad placeholder
├── lib/                 # Utility libraries
│   ├── xtream-api.ts   # Xtream Codes API client
│   └── m3u-parser.ts   # M3U playlist parser
├── store/               # Zustand state store
│   └── index.ts        # App state management
└── types/               # TypeScript types
    └── index.ts        # Type definitions
```

## Multi-Screen Layouts

| Layout | Description |
|--------|-------------|
| Single | One full-screen video |
| PiP | Main video with picture-in-picture overlay |
| 2x1 | Two videos side by side |
| 2x2 | Four videos in a grid |
| 3x3 | Nine videos in a grid |
| 1+3 | One large + three small videos |

## Recording Feature

The app includes a 1-minute rolling buffer for recording. Click the record button to start capturing, then click again to download the recording. Great for:

- Capturing memorable moments
- Creating clips for social media
- Saving highlights

## Privacy

- All credentials are stored locally in your browser
- No data is sent to any third-party servers
- Streams connect directly to your IPTV provider

## Deployment

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/eyepeeteevee)

### Docker

```bash
docker build -t eyepeeteevee .
docker run -p 3000:3000 eyepeeteevee
```

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Render
- AWS Amplify
- Self-hosted with Node.js

## License

MIT License - feel free to use, modify, and distribute.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
