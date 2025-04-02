import { BaseProvider } from './base';

class MoviesDriveProvider extends BaseProvider {
  constructor() {
    super();
    this.name = 'MoviesDrive';
    this.baseUrl = 'https://moviesdrive.xyz';
    this.language = 'hi';
  }

  async search(query) {
    try {
      const response = await fetch(`${this.baseUrl}/?s=${query}`);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const results = [];
      const items = doc.querySelectorAll('article.post');
      
      items.forEach(item => {
        const title = item.querySelector('.entry-title')?.textContent.trim();
        const url = item.querySelector('a')?.getAttribute('href');
        const posterUrl = item.querySelector('img')?.getAttribute('src');
        const type = item.querySelector('.entry-title')?.textContent.toLowerCase().includes('series') ? 'tvshow' : 'movie';

        if (title && url) {
          results.push({
            title,
            url,
            posterUrl,
            type
          });
        }
      });

      return results;
    } catch (error) {
      console.error('Error searching MoviesDrive:', error);
      return [];
    }
  }

  async load(url) {
    try {
      const response = await fetch(url);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Get basic info
      const title = doc.querySelector('.entry-title')?.textContent.trim();
      const posterUrl = doc.querySelector('.entry-content img')?.getAttribute('src');
      const description = doc.querySelector('.entry-content p')?.textContent.trim();
      
      // Determine content type
      const type = title?.toLowerCase().includes('series') ? 'tvshow' : 'movie';

      // Get IMDB info if available
      const imdbUrl = doc.querySelector('a[href*="imdb.com"]')?.getAttribute('href');
      let metadata = {};
      
      if (imdbUrl) {
        const imdbId = imdbUrl.match(/title\/(tt\d+)/)?.[1];
        if (imdbId) {
          try {
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
          } catch (error) {
            console.error('Error fetching metadata:', error);
          }
        }
      }

      // Extract download links
      const downloadLinks = [];
      const linkContainers = doc.querySelectorAll('.entry-content p, .entry-content div');
      
      for (const container of linkContainers) {
        const links = container.querySelectorAll('a[href*="drive.google.com"], a[href*="gdtot"], a[href*="filepress"]');
        
        for (const link of links) {
          const url = link.getAttribute('href');
          if (url) {
            const quality = link.textContent.match(/\d{3,4}p|4K|HD|FHD/i)?.[0] || 'HD';
            downloadLinks.push({
              url,
              quality
            });
          }
        }
      }

      // Handle episodes for TV shows
      let episodes = [];
      if (type === 'tvshow') {
        const seasonContainers = doc.querySelectorAll('h3:contains("Season"), h4:contains("Season")');
        
        for (const container of seasonContainers) {
          const seasonMatch = container.textContent.match(/Season\s*(\d+)/i);
          const season = seasonMatch ? parseInt(seasonMatch[1]) : 1;
          
          let episodeContainer = container.nextElementSibling;
          while (episodeContainer && !episodeContainer.matches('h3, h4')) {
            const episodeLinks = episodeContainer.querySelectorAll('a[href*="drive.google.com"], a[href*="gdtot"], a[href*="filepress"]');
            
            episodeLinks.forEach((link, index) => {
              const url = link.getAttribute('href');
              if (url) {
                episodes.push({
                  season,
                  episode: index + 1,
                  url,
                  quality: link.textContent.match(/\d{3,4}p|4K|HD|FHD/i)?.[0] || 'HD'
                });
              }
            });
            
            episodeContainer = episodeContainer.nextElementSibling;
          }
        }
      }

      return {
        title,
        posterUrl,
        description,
        type,
        downloadLinks: type === 'movie' ? downloadLinks : episodes,
        ...metadata
      };
    } catch (error) {
      console.error('Error loading content from MoviesDrive:', error);
      return null;
    }
  }

  async getMainPage() {
    try {
      const response = await fetch(this.baseUrl);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const latestMovies = [];
      const latestSeries = [];

      const articles = doc.querySelectorAll('article.post');
      
      articles.forEach(article => {
        const title = article.querySelector('.entry-title')?.textContent.trim();
        const url = article.querySelector('a')?.getAttribute('href');
        const posterUrl = article.querySelector('img')?.getAttribute('src');
        
        if (title && url) {
          const item = {
            title,
            url,
            posterUrl
          };

          if (title.toLowerCase().includes('series')) {
            latestSeries.push({ ...item, type: 'tvshow' });
          } else {
            latestMovies.push({ ...item, type: 'movie' });
          }
        }
      });

      return [
        {
          title: 'Latest Movies',
          items: latestMovies
        },
        {
          title: 'Latest Series',
          items: latestSeries
        }
      ];
    } catch (error) {
      console.error('Error loading main page from MoviesDrive:', error);
      return [];
    }
  }
}

export default new MoviesDriveProvider();