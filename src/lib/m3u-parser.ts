import type { M3UChannel, Category, LiveStream } from '@/types';

export function parseM3U(content: string): M3UChannel[] {
  const channels: M3UChannel[] = [];
  const lines = content.split('\n');

  let currentChannel: Partial<M3UChannel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXTINF:')) {
      // Parse channel info
      currentChannel = {
        name: '',
        logo: '',
        group: 'Uncategorized',
        url: '',
        tvgId: '',
        tvgName: '',
      };

      // Extract tvg-id
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
      if (tvgIdMatch) currentChannel.tvgId = tvgIdMatch[1];

      // Extract tvg-name
      const tvgNameMatch = line.match(/tvg-name="([^"]*)"/i);
      if (tvgNameMatch) currentChannel.tvgName = tvgNameMatch[1];

      // Extract tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      if (logoMatch) currentChannel.logo = logoMatch[1];

      // Extract group-title
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      if (groupMatch) currentChannel.group = groupMatch[1];

      // Extract channel name (after the last comma)
      const nameMatch = line.match(/,(.+)$/);
      if (nameMatch) currentChannel.name = nameMatch[1].trim();
    } else if (line && !line.startsWith('#') && currentChannel) {
      // This is the URL line
      currentChannel.url = line;
      channels.push(currentChannel as M3UChannel);
      currentChannel = null;
    }
  }

  return channels;
}

export function m3uToCategories(channels: M3UChannel[]): Category[] {
  const groupSet = new Set<string>();
  channels.forEach((ch) => groupSet.add(ch.group));

  return Array.from(groupSet).map((group, index) => ({
    category_id: index.toString(),
    category_name: group,
    parent_id: 0,
  }));
}

export function m3uToLiveStreams(channels: M3UChannel[]): LiveStream[] {
  const categoryMap = new Map<string, string>();
  const categories = m3uToCategories(channels);
  categories.forEach((cat) => {
    categoryMap.set(cat.category_name, cat.category_id);
  });

  return channels.map((ch, index) => ({
    num: index + 1,
    name: ch.name,
    stream_type: 'live',
    stream_id: index + 1,
    stream_icon: ch.logo,
    epg_channel_id: ch.tvgId || ch.tvgName || '',
    added: '',
    category_id: categoryMap.get(ch.group) || '0',
    custom_sid: '',
    tv_archive: 0,
    direct_source: ch.url,
    tv_archive_duration: 0,
  }));
}

export async function fetchAndParseM3U(url: string): Promise<{
  channels: M3UChannel[];
  categories: Category[];
  streams: LiveStream[];
}> {
  const response = await fetch(url);
  const content = await response.text();
  const channels = parseM3U(content);
  const categories = m3uToCategories(channels);
  const streams = m3uToLiveStreams(channels);

  return { channels, categories, streams };
}
