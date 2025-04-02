import { BaseProvider } from './base';

class NetflixMirrorProvider extends BaseProvider {
  constructor() {
    super();
    this.name = 'Netflix Mirror';
    this.baseUrl = 'https://netfree.cc';
    this.language = 'en';
    this.cookieValue = '';
  }

  async #getCookies() {
    if (!this.cookieValue) {
      this.cookieValue = await this.bypass(this.baseUrl);
    }
    return {
      't_hash_t': this.cookieValue,
      'hd': 'on'
    };
  }

  async #fetchWithCookies(url, options = {}) {
    const cookies = await this.#getCookies();
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Cookie': cookieString,
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
  }

  async search(query) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const response = await this.#fetchWithCookies(
        `${this.baseUrl}/mobile/search.php?s=${query}&t=${timestamp}`
      );
      const data = await response.json();

      return data.searchResult.map(item => ({
        title: item.t,
        id: item.id,
        posterUrl: `https://img.nfmirrorcdn.top/poster/v/${item.id}.jpg`,
        type: 'movie' // Will be updated in load()
      }));
    } catch (error) {
      console.error('Error searching Netflix Mirror:', error);
      return [];
    }
  }

  async load(url) {
    try {
      const { id } = JSON.parse(url);
      const timestamp = Math.floor(Date.now() / 1000);
      const response = await this.#fetchWithCookies(
        `${this.baseUrl}/mobile/post.php?id=${id}&t=${timestamp}`
      );
      const data = await response.json();

      const type = data.episodes.first === null ? 'movie' : 'tvshow';
      const episodes = [];

      if (type === 'tvshow') {
        // Process episodes
        for (const episode of data.episodes.filter(ep => ep !== null)) {
          episodes.push({
            id: episode.id,
            title: episode.t,
            season: parseInt(episode.s.replace('S', '')),
            episode: parseInt(episode.ep.replace('E', '')),
            thumbnail: `https://img.nfmirrorcdn.top/epimg/150/${episode.id}.jpg`,
            duration: parseInt(episode.time.replace('m', ''))
          });
        }
      }

      return {
        title: data.title,
        posterUrl: `https://img.nfmirrorcdn.top/poster/v/${id}.jpg`,
        backgroundUrl: `https://img.nfmirrorcdn.top/poster/h/${id}.jpg`,
        description: data.desc,
        year: parseInt(data.year),
        type,
        episodes,
        cast: data.cast?.split(',').map(actor => actor.trim()) || [],
        genre: [data.ua, ...(data.genre?.split(',').map(g => g.trim()) || [])].filter(Boolean),
        rating: parseFloat(data.match?.replace('IMDb ', ''))
      };
    } catch (error) {
      console.error('Error loading content from Netflix Mirror:', error);
      return null;
    }
  }

  async loadLinks(data) {
    try {
      const { title, id } = JSON.parse(data);
      const timestamp = Math.floor(Date.now() / 1000);
      const response = await this.#fetchWithCookies(
        `${this.baseUrl}/mobile/playlist.php?id=${id}&t=${title}&tm=${timestamp}`
      );
      const playlist = await response.json();

      const links = [];
      for (const item of playlist) {
        // Add video sources
        for (const source of item.sources) {
          links.push({
            url: source.file,
            quality: source.label,
            isM3U8: source.file.includes('.m3u8')
          });
        }

        // Add subtitles if available
        if (item.tracks) {
          const subtitles = item.tracks
            .filter(track => track.kind === 'captions')
            .map(track => ({
              url: track.file,
              label: track.label,
              language: track.language
            }));
          links.push(...subtitles);
        }
      }

      return links;
    } catch (error) {
      console.error('Error loading links from Netflix Mirror:', error);
      return [];
    }
  }

  async getMainPage() {
    try {
      const response = await this.#fetchWithCookies(`${this.baseUrl}/mobile/home`);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const sections = [];
      const containers = doc.querySelectorAll('.tray-container, #top10');

      for (const container of containers) {
        const title = container.querySelector('h2, span').textContent;
        const items = Array.from(container.querySelectorAll('article, .top10-post')).map(item => {
          const id = item.querySelector('a')?.getAttribute('data-post') || item.getAttribute('data-post');
          const posterUrl = item.querySelector('.card-img-container img, .top10-img img')?.getAttribute('data-src');
          
          return {
            id,
            posterUrl,
            type: 'movie' // Will be updated in load()
          };
        }).filter(item => item.id);

        sections.push({
          title,
          items
        });
      }

      return sections;
    } catch (error) {
      console.error('Error loading main page from Netflix Mirror:', error);
      return [];
    }
  }
}

export default new NetflixMirrorProvider();