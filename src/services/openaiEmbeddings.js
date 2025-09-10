// Direct API approach using fetch since OpenAI SDK doesn't work well in browser
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY. Please add VITE_OPENAI_API_KEY to your .env file');
}

/**
 * Generate embeddings using OpenAI's text-embedding-3-small model
 * @param {string|Array<string>} text - Text or array of texts to embed
 * @param {Object} options - Options for embedding generation
 * @returns {Promise<Array>} - Array of embedding vectors
 */
export const generateEmbeddings = async (text, options = {}) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your .env file');
  }

  try {
    const {
      model = 'text-embedding-3-small',
      dimensions = 1536, // Default dimensions for text-embedding-3-small
      batchSize = 100 // OpenAI allows up to 2048 inputs per request
    } = options;

    const texts = Array.isArray(text) ? text : [text];
    const results = [];

    // Process in batches to respect API limits
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          input: batch,
          dimensions: dimensions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Extract embeddings from response
      const embeddings = data.data.map(item => item.embedding);
      results.push(...embeddings);

      // Add a small delay between batches to be respectful to the API
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
};

/**
 * Create searchable text from contact data
 * This combines multiple fields into a meaningful text for embedding
 * @param {Object} contact - Contact data object
 * @returns {string} - Combined text for embedding
 */
export const createSearchableText = (contact) => {
  const parts = [];

  // Add name (most important)
  if (contact.name) {
    parts.push(`Name: ${contact.name}`);
  }

  // Add title/position
  if (contact.title) {
    parts.push(`Title: ${contact.title}`);
  }

  // Add company
  if (contact.company) {
    parts.push(`Company: ${contact.company}`);
  }

  // Add industries (convert JSON array to readable text)
  if (contact.industry) {
    let industries = contact.industry;
    if (typeof industries === 'string') {
      try {
        industries = JSON.parse(industries);
      } catch (e) {
        industries = [industries];
      }
    }
    if (Array.isArray(industries)) {
      parts.push(`Industries: ${industries.join(', ')}`);
    }
  }

  // Create a comprehensive description
  const searchableText = parts.join('. ');
  
  // Add some context to make embeddings more meaningful
  return `Professional profile: ${searchableText}`;
};

/**
 * Process contacts data and generate embeddings with AI-powered text enrichment
 * @param {Array} contacts - Array of contact objects
 * @param {Function} onProgress - Progress callback
 * @param {boolean} useAIEnrichment - Whether to use AI for text enrichment (default: true)
 * @returns {Promise<Array>} - Array of contacts with embeddings
 */
export const processContactsForEmbedding = async (contacts, onProgress = null, useAIEnrichment = true) => {
  try {
    let contactsWithSearchableText;
    
    if (useAIEnrichment) {
      // Use AI-powered enrichment for smarter search
      const { processContactsWithEnrichment } = await import('./textEnrichment.js');
      
      if (onProgress) {
        onProgress({
          step: 'enriching',
          message: 'AI is enhancing contact profiles for smarter search...',
          processed: 0,
          total: contacts.length
        });
      }
      
      contactsWithSearchableText = await processContactsWithEnrichment(contacts, onProgress);
    } else {
      // Use basic searchable text creation
      contactsWithSearchableText = contacts.map(contact => ({
        ...contact,
        searchable_text: createSearchableText(contact)
      }));
      
      if (onProgress) {
        onProgress({
          step: 'preparing',
          message: 'Preparing texts for embedding...',
          processed: contacts.length,
          total: contacts.length
        });
      }
    }

    // Extract the searchable texts for embedding
    const searchableTexts = contactsWithSearchableText.map(contact => contact.searchable_text);

    // Generate embeddings in batches
    if (onProgress) {
      onProgress({
        step: 'embedding',
        message: 'Generating embeddings with OpenAI...',
        processed: 0,
        total: contacts.length
      });
    }
    
    const embeddings = await generateEmbeddings(searchableTexts);

    if (onProgress) {
      onProgress({
        step: 'embedding',
        message: 'Embeddings generated successfully!',
        processed: embeddings.length,
        total: contacts.length
      });
    }

    // Combine contacts with their embeddings
    const contactsWithEmbeddings = contactsWithSearchableText.map((contact, index) => ({
      ...contact,
      embedding: embeddings[index],
      embedding_model: 'text-embedding-3-small',
      embedding_dimensions: 1536
    }));

    if (onProgress) {
      onProgress({
        step: 'complete',
        message: 'Smart embeddings created successfully!',
        processed: contactsWithEmbeddings.length,
        total: contacts.length
      });
    }

    return contactsWithEmbeddings;
  } catch (error) {
    console.error('Error processing contacts for embedding:', error);
    throw error;
  }
};

/**
 * Generate embedding for a search query with enhanced context
 * @param {string} query - Search query
 * @returns {Promise<Array>} - Embedding vector
 */
export const embedSearchQuery = async (query) => {
  try {
    // Enhance the search query with context to improve matching
    const enhancedQuery = enhanceSearchQuery(query);
    const embeddings = await generateEmbeddings(enhancedQuery);
    return embeddings[0];
  } catch (error) {
    console.error('Error embedding search query:', error);
    throw error;
  }
};

/**
 * Enhance search query with additional context for better matching
 * @param {string} query - Original search query
 * @returns {string} - Enhanced search query
 */
const enhanceSearchQuery = (query) => {
  const queryLower = query.toLowerCase();
  const enhancements = [];
  
  // Add the original query
  enhancements.push(`Search for: ${query}`);
  
  // Add geographic context
  const geoTerms = {
    'california': ['California', 'CA', 'West Coast', 'Silicon Valley', 'Bay Area', 'Los Angeles', 'San Francisco', 'San Diego'],
    'new york': ['New York', 'NY', 'NYC', 'East Coast', 'Manhattan'],
    'boston': ['Boston', 'Massachusetts', 'MA', 'Cambridge', 'Harvard', 'MIT'],
    'texas': ['Texas', 'TX', 'Austin', 'Dallas', 'Houston'],
    'florida': ['Florida', 'FL', 'Miami', 'Tampa', 'Orlando'],
    'washington': ['Washington', 'WA', 'Seattle', 'Microsoft', 'Amazon'],
    'chicago': ['Chicago', 'Illinois', 'IL', 'Midwest']
  };
  
  for (const [key, terms] of Object.entries(geoTerms)) {
    if (queryLower.includes(key)) {
      enhancements.push(`Geographic context: ${terms.join(', ')}`);
      break;
    }
  }
  
  // Add industry context
  const industryTerms = {
    'legal': ['legal', 'law', 'attorney', 'lawyer', 'counsel', 'legal consulting', 'legal advisory', 'legal expert', 'legal services', 'regulatory compliance', 'contract law', 'corporate law', 'litigation', 'legal research', 'paralegal', 'solicitor', 'barrister'],
    'law': ['legal', 'law', 'attorney', 'lawyer', 'counsel', 'legal consulting', 'legal advisory', 'legal expert', 'legal services', 'regulatory compliance', 'contract law', 'corporate law', 'litigation', 'legal research'],
    'attorney': ['attorney', 'lawyer', 'legal counsel', 'legal expert', 'legal advisory', 'legal consulting', 'law practice', 'legal services', 'legal representation'],
    'lawyer': ['lawyer', 'attorney', 'legal counsel', 'legal expert', 'legal advisory', 'legal consulting', 'law practice', 'legal services', 'legal representation'],
    'technology': ['technology', 'tech', 'software', 'engineering', 'AI', 'machine learning', 'data science', 'programming', 'development'],
    'ai': ['artificial intelligence', 'machine learning', 'deep learning', 'neural networks', 'data science', 'automation', 'robotics'],
    'biotech': ['biotechnology', 'pharmaceutical', 'medical', 'healthcare', 'life sciences', 'clinical research', 'drug development'],
    'finance': ['finance', 'banking', 'investment', 'fintech', 'trading', 'wealth management', 'insurance'],
    'energy': ['energy', 'renewable', 'oil', 'gas', 'solar', 'wind', 'nuclear', 'power generation'],
    'aerospace': ['aerospace', 'aviation', 'defense', 'space', 'aircraft', 'satellite', 'rocket'],
    'mining': ['mining', 'extraction', 'geology', 'minerals', 'resources', 'exploration'],
    'medical': ['medical', 'healthcare', 'physician', 'doctor', 'clinical', 'health', 'medical expert', 'healthcare consulting', 'medical advisory'],
    'healthcare': ['healthcare', 'medical', 'health', 'clinical', 'physician', 'doctor', 'health services', 'medical consulting', 'health strategy']
  };
  
  for (const [key, terms] of Object.entries(industryTerms)) {
    if (queryLower.includes(key)) {
      enhancements.push(`Industry expertise: ${terms.join(', ')}`);
      break;
    }
  }
  
  // Add role context
  const roleTerms = {
    'expert': ['expert', 'specialist', 'consultant', 'advisor', 'authority', 'professional'],
    'researcher': ['researcher', 'scientist', 'academic', 'professor', 'PhD', 'research'],
    'engineer': ['engineer', 'developer', 'architect', 'technical', 'programming'],
    'manager': ['manager', 'director', 'leader', 'executive', 'VP', 'chief'],
    'founder': ['founder', 'entrepreneur', 'startup', 'CEO', 'co-founder']
  };
  
  for (const [key, terms] of Object.entries(roleTerms)) {
    if (queryLower.includes(key)) {
      enhancements.push(`Professional role: ${terms.join(', ')}`);
      break;
    }
  }
  
  // Add institutional context
  if (queryLower.includes('university') || queryLower.includes('college') || queryLower.includes('academic')) {
    enhancements.push('Institutional context: university, college, academic institution, research, education, professor, faculty');
  }
  
  if (queryLower.includes('startup') || queryLower.includes('entrepreneur')) {
    enhancements.push('Business context: startup, entrepreneurship, innovation, venture capital, early stage, growth');
  }
  
  return enhancements.join('. ');
};
