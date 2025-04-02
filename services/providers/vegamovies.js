import { BaseProvider } from './base';

class VegaMoviesProvider extends BaseProvider {
  constructor() {
    super();
    this.name = 'VegaMovies';
    this.baseUrl = 'https://vegamovies.band';
    this.language = 'hi';
  }

  async #bypassCloudflare(url) {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      return response;
    } catch (error) {
      console.error('Error bypassing Cloudflare:', error);
      throw error;
    }
  }

  async search(query) {
    try {
      const results = [];
      for (let i = 1; i <= 7; i++) {
        const response = await this.#bypassCloudflare(`${this.baseUrl}/page/${i}/?s=${query}`);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const items = doc.querySelectorAll('.post-inner');
        if (items.length === 0) break;

        items.forEach(item => {
          const title = item.querySelector('h2 > a').textContent.replace('Download ', '');
          const href = item.querySelector('a').getAttribute('href');
          let posterUrl = item.querySelector('img').getAttribute('data-src');
          if (!posterUrl) {
            posterUrl = item.querySelector('img').getAttribute('src');
          }

          results.push({
            title,
            url: href,
            posterUrl,
            type: 'movie' // Will be updated in load()
          });
        });
      }
      return results;
    } catch (error) {
      console.error('Error searching VegaMovies:', error);
      return [];
    }
  }

  async load(url) {
    try {
      const response = await this.#bypassCloudflare(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const title = doc.querySelector('meta[property="og:title"]').getAttribute('content').replace('Download ', '');
      const ogTitle = title;
      const posterUrl = doc.querySelector('meta[property="og:image"]').getAttribute('content');
      const div = doc.querySelector('.entry-content, .entry-inner');
      
      // Get description
      const descElement = div?.querySelector('h3:matches((?i)(SYNOPSIS|PLOT)), h4:matches((?i)(SYNOPSIS|PLOT))');
      const description = descElement?.nextElementSibling?.textContent;

      // Get IMDB URL
      const imdbUrl = div?.querySelector('a:matches((?i)(Rating))')?.getAttribute('href');
      const heading = div?.querySelector('h3');

      // Determine content type
      const isSeries = heading?.nextElementSibling?.nextElementSibling?.textContent?.match(/(Series Name|SHOW Name)/i);
      const type = isSeries ? 'series' : 'movie';

      // Get metadata from IMDB
      let metadata = {};
      if (imdbUrl) {
        const imdbId = imdbUrl.match(/title\/(tt\d+)/)?.[1];
        if (imdbId) {
          const metaResponse = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`);
          const metaData = await metaResponse.json();
          if (metaData?.meta) {
            metadata = {
              description: metaData.meta.description || description,
              cast: metaData.meta.cast || [],
              title: metaData.meta.name || title,
              genre: metaData.meta.genre || [],
              rating: metaData.meta.imdbRating,
              year: metaData.meta.year,
              posterUrl: metaData.meta.poster || posterUrl,
              backgroundUrl: metaData.meta.background || posterUrl
            };
          }
        }
      }

      // Handle episodes for TV series
      let episodes = [];
      if (type === 'series') {
        const hTags = div?.querySelectorAll('h3:matches((?i)(4K|[0-9]*0p)), h5:matches((?i)(4K|[0-9]*0p))');
        if (hTags) {
          for (const tag of hTags) {
            if (tag.textContent.includes('Zip')) continue;

            const seasonMatch = tag.textContent.match(/(?:Season |S)(\d+)/);
            const season = seasonMatch ? parseInt(seasonMatch[1]) : 0;

            const pTag = tag.nextElementSibling;
            const links = (pTag?.tagName === 'P' ? pTag : tag).querySelectorAll('a');

            for (const link of links) {
              if (link.textContent.match(/(V-Cloud|Episode|Download|G-Direct)/i)) {
                const episodeUrl = link.getAttribute('href');
                if (episodeUrl) {
                  const episodeDoc = await this.#bypassCloudflare(episodeUrl);
                  const episodeHtml = await episodeDoc.text();
                  
                  // Extract video links
                  const vcloudLinks = episodeHtml.match(/https:\/\/vcloud\.lol\/[^\s"]+/g) || 
                                    episodeHtml.match(/https:\/\/fastdl\.icu\/embed\?download=[a-zA-Z0-9]+/g) || [];
                  
                  vcloudLinks.forEach((vlink, index) => {
                    episodes.push({
                      season,
                      episode: index + 1,
                      url: vlink
                    });
                  });
                }
              }
            }
          }
        }
      } else {
        // Handle movie links
        const buttons = doc.querySelectorAll('p > a:has(button)');
        for (const button of buttons) {
          const link = button.getAttribute('href');
          if (link) {
            const movieDoc = await this.#bypassCloudflare(link);
            const movieHtml = await movieDoc.text();
            const vcloudLink = movieHtml.match(/https:\/\/vcloud\.lol\/[^\s"]+/)?.[0];
            if (vcloudLink) {
              episodes.push({ url: vcloudLink });
            }
          }
        }
      }

      return {
        ...metadata,
        title: metadata.title || title,
        posterUrl: metadata.posterUrl || posterUrl,
        description: metadata.description || description,
        type,
        episodes
      };
    } catch (error) {
      console.error('Error loading content from VegaMovies:', error);
      return null;
    }
  }

  async getMainPage() {
    const sections = [
      { url: '/page/%d/', title: 'Home' },
      { url: '/web-series/netflix/page/%d/', title: 'Netflix' },
      { url: '/web-series/disney-plus-hotstar/page/%d/', title: 'Disney Plus Hotstar' },
      { url: '/web-series/amazon-prime-video/page/%d/', title: 'Amazon Prime' },
      { url: '/web-series/mx-original/page/%d/', title: 'MX Original' },
      { url: '/anime-series/page/%d/', title: 'Anime Series' },
      { url: '/korean-series/page/%d/', title: 'Korean Series' }
    ];

    const results = await Promise.all(sections.map(async section => {
      try {
        const response = await this.#bypassCloudflare(
          `${this.baseUrl}${section.url.replace('%d', '1')}`
        );
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const items = Array.from(doc.querySelectorAll('.post-inner')).map(item => ({
          title: item.querySelector('h2 > a').textContent.replace('Download ', ''),
          url: item.querySelector('a').getAttribute('href'),
          posterUrl: item.querySelector('img').getAttribute('data-src') || 
                    item.querySelector('img').getAttribute('src'),
          type: section.url.includes('series') ? 'tvshow' : 'movie'
        }));

        return {
          title: section.title,
          items
        };
      } catch (error) {
        console.error(`Error loading section ${section.title}:`, error);
        return {
          title: section.title,
          items: []
        };
      }
    }));

    return results;
  }
}

export default new VegaMoviesProvider();