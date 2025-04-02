import { BaseProvider } from './base';

class MoviesmodProvider extends BaseProvider {
  constructor() {
    super();
    this.name = 'Moviesmod';
    this.baseUrl = 'https://moviesmod.net';
    this.language = 'hi';
  }

  async search(query) {
    try {
      const results = [];
      const response = await fetch(`${this.baseUrl}/?s=${query}`);
      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      const items = doc.querySelectorAll('article.post');
      items.forEach(item => {
        const title = item.querySelector('.entry-title a')?.textContent.trim();
        const url = item.querySelector('.entry-title a')?.getAttribute('href');
        const posterUrl = item.querySelector('img')?.getAttribute('src');
        const type = title?.toLowerCase().includes('series') ? 'tvshow' : 'movie';

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
      console.error('Error searching Moviesmod:', error);
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
      
      // Get description
      let description = '';
      const descriptionHeaders = doc.querySelectorAll('h2, h3, h4');
      for (const header of descriptionHeaders) {
        if (header.textContent.match(/storyline|plot|synopsis/i)) {
          description = header.nextElementSibling?.textContent.trim() || '';
          break;
        }
      }

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
                description: metaData.meta.description || description,
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
      let downloadLinks = [];
      if (type === 'movie') {
        // Find quality sections (1080p, 720p, etc.)
        const qualitySections = doc.querySelectorAll('h4:contains("p"), h3:contains("p"), h5:contains("p")');
        
        for (const section of qualitySections) {
          const quality = section.textContent.match(/\d{3,4}p|4K|HD|FHD/i)?.[0] || 'HD';
          let linkContainer = section.nextElementSibling;
          
          while (linkContainer && !linkContainer.matches('h3, h4, h5')) {
            const links = linkContainer.querySelectorAll('a[href*="gdtot"], a[href*="filepress"], a[href*="drive.google"]');
            
            links.forEach(link => {
              const url = link.getAttribute('href');
              if (url) {
                downloadLinks.push({
                  url,
                  quality
                });
              }
            });
            
            linkContainer = linkContainer.nextElementSibling;
          }
        }
      } else {
        // Handle TV series episodes
        const seasonContainers = doc.querySelectorAll('h3:contains("Season"), h4:contains("Season"), div:contains("Season")');
        
        for (const container of seasonContainers) {
          const seasonMatch = container.textContent.match(/Season\s*(\d+)/i);
          if (!seasonMatch) continue;
          
          const season = parseInt(seasonMatch[1]);
          let episodeContainer = container.nextElementSibling;
          
          while (episodeContainer && !episodeContainer.matches('h3, h4')) {
            const episodeMatch = episodeContainer.textContent.match(/Episode\s*(\d+)/i);
            if (episodeMatch) {
              const episode = parseInt(episodeMatch[1]);
              const links = episodeContainer.querySelectorAll('a[href*="gdtot"], a[href*="filepress"], a[href*="drive.google"]');
              
              links.forEach(link => {
                const url = link.getAttribute('href');
                if (url) {
                  const quality = link.textContent.match(/\d{3,4}p|4K|HD|FHD/i)?.[0] || 'HD';
                  downloadLinks.push({
                    season,
                    episode,
                    url,
                    quality
                  });
                }
              });
            }
            
            episodeContainer = episodeContainer.nextElementSibling;
          }
        }
      }

      return {
        title,
        posterUrl,
        description: metadata.description || description,
        type,
        downloadLinks,
        ...metadata
      };
    } catch (error) {
      console.error('Error loading content from Moviesmod:', error);
      return null;
    }
  }

  async getMainPage() {
    try {
      const sections = [
        { url: '/', title: 'Latest Updates' },
        { url: '/category/web-series/', title: 'Web Series' },
        { url: '/category/movies/', title: 'Movies' },
        { url: '/category/tv-shows/', title: 'TV Shows' }
      ];

      const results = await Promise.all(sections.map(async section => {
        try {
          const response = await fetch(this.baseUrl + section.url);
          const html = await response.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');

          const items = Array.from(doc.querySelectorAll('article.post')).map(item => {
            const title = item.querySelector('.entry-title a')?.textContent.trim();
            const url = item.querySelector('.entry-title a')?.getAttribute('href');
            const posterUrl = item.querySelector('img')?.getAttribute('src');
            const type = section.url.includes('series') || section.url.includes('shows') ? 'tvshow' : 'movie';

            return {
              title,
              url,
              posterUrl,
              type
            };
          }).filter(item => item.title && item.url);

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
    } catch (error) {
      console.error('Error loading main page from Moviesmod:', error);
      return [];
    }
  }
}

export default new MoviesmodProvider();