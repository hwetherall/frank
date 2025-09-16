// Expert-specific embedding service using OpenAI's text-embedding-3-small model
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY. Please add VITE_OPENAI_API_KEY to your .env file');
} else if (!OPENAI_API_KEY.startsWith('sk-')) {
  console.error('Invalid OPENAI_API_KEY format. OpenAI API keys should start with "sk-"');
} else {
  console.log('✅ OpenAI API key loaded successfully');
}

/**
 * Create searchable text from expert profile data
 * @param {Object} expert - Expert profile object
 * @returns {string} - Searchable text for embedding
 */
export const createSearchableText = (expert) => {
  const parts = [];
  
  // Core identity
  parts.push(`Expert: ${expert.name}`);
  
  // Position information (prioritize ld_position, fallback to position)
  const positionText = expert.ld_position || expert.position;
  if (positionText) {
    parts.push(`Position: ${positionText}`);
  }
  
  // Company information (prioritize ld_company, fallback to current_company)
  let companyText = expert.ld_company;
  if (!companyText && expert.current_company) {
    if (typeof expert.current_company === 'string') {
      companyText = expert.current_company;
    } else if (expert.current_company.name) {
      companyText = expert.current_company.name;
    }
  }
  if (companyText) {
    parts.push(`Company: ${companyText}`);
  }
  
  // Industry information
  if (expert.industry && Array.isArray(expert.industry) && expert.industry.length > 0) {
    parts.push(`Industries: ${expert.industry.join(', ')}`);
  }
  
  // Location
  if (expert.location) {
    parts.push(`Location: ${expert.location}`);
  }
  
  // About section (truncated for relevance)
  if (expert.about) {
    const aboutText = expert.about.substring(0, 300).trim();
    parts.push(`About: ${aboutText}`);
  }
  
  // Experience highlights
  if (expert.experience && Array.isArray(expert.experience)) {
    const experienceTexts = expert.experience.slice(0, 3).map(exp => {
      const title = exp.title || 'Unknown Role';
      const company = exp.company || 'Unknown Company';
      return `${title} at ${company}`;
    });
    if (experienceTexts.length > 0) {
      parts.push(`Experience: ${experienceTexts.join('; ')}`);
    }
  }
  
  // Education highlights
  if (expert.educations_details && Array.isArray(expert.educations_details)) {
    const educationTexts = expert.educations_details.slice(0, 2).map(edu => {
      const degree = edu.degree || 'Degree';
      const school = edu.title || edu.school || 'Institution';
      return `${degree} from ${school}`;
    });
    if (educationTexts.length > 0) {
      parts.push(`Education: ${educationTexts.join('; ')}`);
    }
  }
  
  // Certifications
  if (expert.certifications && Array.isArray(expert.certifications)) {
    const certTexts = expert.certifications.slice(0, 3).map(cert => 
      cert.title || cert.name || 'Certification'
    );
    if (certTexts.length > 0) {
      parts.push(`Certifications: ${certTexts.join(', ')}`);
    }
  }
  
  // Publications (if any)
  if (expert.publications && Array.isArray(expert.publications) && expert.publications.length > 0) {
    parts.push(`Publications: ${expert.publications.length} published works`);
  }
  
  // Patents (if any)
  if (expert.patents && Array.isArray(expert.patents) && expert.patents.length > 0) {
    parts.push(`Patents: ${expert.patents.length} patents`);
  }
  
  // Social proof metrics
  if (expert.followers > 0 || expert.connections > 0) {
    parts.push(`Network: ${expert.followers} followers, ${expert.connections} connections`);
  }
  
  // Expert scoring info
  if (expert.expert_score) {
    parts.push(`Expert Score: ${expert.expert_score}/5`);
  }
  
  return `Innovation consulting expert profile: ${parts.join('. ')}`;
};

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
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          // If we can't parse error JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        if (response.status === 401) {
          throw new Error(`OpenAI API authentication failed: ${errorMessage}. Please check your API key in the .env file.`);
        } else if (response.status === 429) {
          throw new Error(`OpenAI API rate limit exceeded: ${errorMessage}. Please try again later.`);
        } else {
          throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`);
        }
      }

      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from OpenAI API');
      }

      // Extract embeddings from response
      const batchEmbeddings = data.data.map(item => ({
        embedding: item.embedding,
        index: item.index,
        model: data.model,
        usage: data.usage
      }));

      results.push(...batchEmbeddings);

      // Add small delay between batches to be respectful to the API
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;

  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
};

/**
 * Process expert profiles for embedding generation
 * @param {Array} experts - Array of expert profile objects
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Array>} - Array of experts with embeddings
 */
export const processExpertsForEmbedding = async (experts, progressCallback = null) => {
  const processedExperts = [];
  
  for (let i = 0; i < experts.length; i++) {
    try {
      const expert = experts[i];
      
      // Create searchable text
      const searchableText = createSearchableText(expert);
      
      // Generate embedding
      const embeddingResults = await generateEmbeddings(searchableText);
      const embedding = embeddingResults[0]?.embedding;
      
      if (!embedding) {
        throw new Error('Failed to generate embedding');
      }
      
      // Add embedding data to expert
      const processedExpert = {
        ...expert,
        searchable_text: searchableText,
        embedding: embedding,
        embedding_model: 'text-embedding-3-small',
        embedding_dimensions: 1536
      };
      
      processedExperts.push(processedExpert);
      
      // Call progress callback if provided
      if (progressCallback) {
        progressCallback({
          completed: i + 1,
          total: experts.length,
          percentage: Math.round(((i + 1) / experts.length) * 100),
          currentExpert: expert.name
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error processing expert ${experts[i]?.name || i}:`, error);
      
      // Add expert without embedding (for error tracking)
      processedExperts.push({
        ...experts[i],
        searchable_text: null,
        embedding: null,
        embedding_error: error.message
      });
    }
  }
  
  return processedExperts;
};

/**
 * Generate embedding for search query
 * @param {string} query - Search query text
 * @returns {Promise<Array>} - Embedding vector for the query
 */
export const embedSearchQuery = async (query) => {
  if (!query || query.trim() === '') {
    throw new Error('Search query cannot be empty');
  }
  
  try {
    // Enhance query for better expert matching
    const enhancedQuery = `Find innovation consulting expert: ${query}`;
    
    const embeddingResults = await generateEmbeddings(enhancedQuery);
    return embeddingResults[0]?.embedding;
  } catch (error) {
    console.warn('⚠️ OpenAI embedding failed, falling back to simple text matching:', error.message);
    // Return null to indicate fallback to text search should be used
    return null;
  }
};

/**
 * Validate OpenAI API key format
 * @param {string} apiKey - API key to validate
 * @returns {Object} - Validation result
 */
export const validateOpenAIKey = (apiKey) => {
  if (!apiKey) {
    return {
      valid: false,
      message: 'API key is missing'
    };
  }
  
  if (!apiKey.startsWith('sk-')) {
    return {
      valid: false,
      message: 'API key should start with "sk-"'
    };
  }
  
  // Basic length check - OpenAI keys are typically around 51 characters
  if (apiKey.length < 40) {
    return {
      valid: false,
      message: 'API key appears to be too short'
    };
  }
  
  return {
    valid: true,
    message: 'API key format is valid'
  };
};

/**
 * Test the OpenAI embeddings API connection
 * @returns {Promise<Object>} - Test result
 */
export const testEmbeddingsAPI = async () => {
  try {
    if (!OPENAI_API_KEY) {
      return {
        success: false,
        message: 'OpenAI API key not configured'
      };
    }
    
    const validation = validateOpenAIKey(OPENAI_API_KEY);
    if (!validation.valid) {
      return {
        success: false,
        message: `Invalid API key: ${validation.message}`
      };
    }
    
    const testEmbedding = await generateEmbeddings('Test embedding generation');
    
    if (testEmbedding && testEmbedding[0]?.embedding) {
      return {
        success: true,
        message: 'OpenAI Embeddings API connection successful',
        dimensions: testEmbedding[0].embedding.length
      };
    } else {
      return {
        success: false,
        message: 'Failed to generate test embedding'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `OpenAI Embeddings API error: ${error.message}`
    };
  }
};