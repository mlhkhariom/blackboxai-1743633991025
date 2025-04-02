import providers from './providers/index';

/**
 * Get a list of all available providers
 * @returns {Array} Array of provider metadata objects
 */
export const getProviders = () => {
  return Object.keys(providers).map(key => ({
    id: key,
    name: providers[key].name,
    baseUrl: providers[key].baseUrl,
    language: providers[key].language
  }));
};

/**
 * Get a specific provider by ID
 * @param {string} providerId The provider ID
 * @returns {Object|null} The provider object or null if not found
 */
export const getProvider = (providerId) => {
  return providers[providerId] || null;
};

/**
 * Search for content across all providers or a specific provider
 * @param {string} query The search query
 * @param {string} [providerId] Optional provider ID to search specifically
 * @returns {Promise<Array>} Array of search results
 */
export const search = async (query, providerId = null) => {
  try {
    if (providerId) {
      const provider = providers[providerId];
      if (!provider) {
        throw new Error('Provider not found');
      }
      return await provider.search(query);
    }

    // Search across all providers
    const results = await Promise.all(
      Object.values(providers).map(async provider => {
        try {
          const providerResults = await provider.search(query);
          return providerResults.map(result => ({
            ...result,
            provider: provider.name
          }));
        } catch (error) {
          console.error(`Error searching ${provider.name}:`, error);
          return [];
        }
      })
    );

    return results.flat();
  } catch (error) {
    console.error('Error searching providers:', error);
    return [];
  }
};

/**
 * Load content details from a specific provider
 * @param {string} providerId The provider ID
 * @param {string} url The content URL
 * @returns {Promise<Object|null>} Content details or null if not found
 */
export const loadContent = async (providerId, url) => {
  try {
    const provider = providers[providerId];
    if (!provider) {
      throw new Error('Provider not found');
    }
    return await provider.load(url);
  } catch (error) {
    console.error('Error loading content:', error);
    return null;
  }
};

/**
 * Get the main page content from a specific provider
 * @param {string} providerId The provider ID
 * @returns {Promise<Array>} Array of content sections
 */
export const getMainPage = async (providerId) => {
  try {
    const provider = providers[providerId];
    if (!provider) {
      throw new Error('Provider not found');
    }
    return await provider.getMainPage();
  } catch (error) {
    console.error('Error getting main page:', error);
    return [];
  }
};

/**
 * Load streaming/download links for specific content
 * @param {string} providerId The provider ID
 * @param {string} data Provider-specific content data
 * @returns {Promise<Array>} Array of links
 */
export const loadLinks = async (providerId, data) => {
  try {
    const provider = providers[providerId];
    if (!provider) {
      throw new Error('Provider not found');
    }
    return await provider.loadLinks(data);
  } catch (error) {
    console.error('Error loading links:', error);
    return [];
  }
};

/**
 * Get all available content from all providers
 * @returns {Promise<Array>} Array of content from all providers
 */
export const getAllContent = async () => {
  try {
    const results = await Promise.all(
      Object.entries(providers).map(async ([id, provider]) => {
        try {
          const content = await provider.getMainPage();
          return {
            providerId: id,
            providerName: provider.name,
            sections: content
          };
        } catch (error) {
          console.error(`Error getting content from ${provider.name}:`, error);
          return {
            providerId: id,
            providerName: provider.name,
            sections: []
          };
        }
      })
    );
    return results;
  } catch (error) {
    console.error('Error getting all content:', error);
    return [];
  }
};