import { BaseProvider } from './base';

class BollyflixProvider extends BaseProvider {
  constructor() {
    super();
    this.name = 'Bollyflix';
    this.baseUrl = 'https://bollyflix.guru';
    this.language = 'hi';
  }

  async search(query) {
    try {
      const results = [];
      for (let i = 1; i <= 6; i++) {
        const response = await fetch(`${this.baseUrl}/search/${query}/page/${i}/`);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const items = doc.querySelectorAll('div.post-cards > article');
        if (items.length === 0) break;

        items.forEach(item => {
          const title = item.querySelector('a').getAttribute('title').replace('Download ', '');
          const href = item.querySelector('a').getAttribute('href');
          const posterUrl = item.querySelector('img').getAttribute('src');

          results.push({
            title,
            url: href,
            posterUrl,
            type: 'movie' // Default to movie, will be updated in load()
          });
        });
      }
      return results;
    } catch (error) {
      console.error('Error searching Bollyflix:', error);
      return [];
    }
  }

  async load(url) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const title = doc.querySelector('title').textContent.replace('Download ', '');
      const posterUrl = doc.querySelector('meta[property="og:image"]').getAttribute('content');
      const description = doc.querySelector('span#summary')?.textContent;
      
      const isSeries = title.includes('Series') || url.includes('web-series');
      const type = isSeries ? 'tvshow' : 'movie';

      let downloadLinks = [];
      const dlButtons = doc.querySelectorAll('a.dl');
      
      for (const button of dlButtons) {
        const id = new URL(button.href).searchParams.get('id');
        if (id) {
          const decodedUrl = await this.bypass(id);
          downloadLinks.push({ url: decodedUrl });
        }
      }

      // Get IMDB metadata if available
      const imdbUrl = doc.querySelector('div.imdb_left > a')?.getAttribute('href');
      let metadata = {};
      
      if (imdbUrl) {
        const imdbId = imdbUrl.match(/title\/(tt\d+)/)?.[1];
        if (imdbId) {
          const metaResponse = await fetch(`https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`);
          const metaData = await metaResponse.json();
          if (metaData?.meta) {
            metadata = {
              cast: metaData.meta.cast || [],
              genre: metaData.meta.genre || [],
              rating: metaData.meta.imdbRating,
              year: metaData.meta.year,
              background: metaData.meta.background
            };
          }
        }
      }

      return {
        title,
        posterUrl,
        description,
        type,
        downloadLinks,
        ...metadata
      };
    } catch (error) {
      console.error('Error loading content from Bollyflix:', error);
      return null;
    }
  }

  async getMainPage() {
    const sections = [
      { url: '/', title: 'Home' },
      { url: '/movies/bollywood/', title: 'Bollywood Movies' },
      { url: '/movies/hollywood/', title: 'Hollywood Movies' },
      { url: '/web-series/ongoing-series/', title: 'Ongoing Series' },
      { url: '/anime/', title: 'Anime' }
    ];

    const results = await Promise.all(sections.map(async section => {
      try {
        const response = await fetch(this.baseUrl + section.url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const items = Array.from(doc.querySelectorAll('div.post-cards > article')).map(item => ({
          title: item.querySelector('a').getAttribute('title').replace('Download ', ''),
          url: item.querySelector('a').getAttribute('href'),
          posterUrl: item.querySelector('img').getAttribute('src'),
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

export default new BollyflixProvider();