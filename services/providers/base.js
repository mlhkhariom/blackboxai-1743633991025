import { loadExtractor } from '../extractors';

export class BaseProvider {
  constructor() {
    this.name = '';
    this.baseUrl = '';
    this.language = 'en';
    this.supportedTypes = ['movie', 'tvshow'];
  }

  async search(query) {
    throw new Error('Search method must be implemented');
  }

  async getMainPage() {
    throw new Error('getMainPage method must be implemented');
  }

  async load(url) {
    throw new Error('Load method must be implemented');
  }

  async loadLinks(data) {
    try {
      const sources = JSON.parse(data);
      const links = [];
      
      for (const source of sources) {
        const extractedLinks = await loadExtractor(source.url);
        links.push(...extractedLinks);
      }
      
      return links;
    } catch (error) {
      console.error('Error loading links:', error);
      return [];
    }
  }

  async bypass(url) {
    // Implementation for bypassing URL shorteners/protectors
    try {
      const response = await fetch(url);
      const text = await response.text();
      // Extract actual URL from response
      return text;
    } catch (error) {
      console.error('Error bypassing URL:', error);
      return url;
    }
  }
}