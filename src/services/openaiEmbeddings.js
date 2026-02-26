const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('Missing VITE_OPENAI_API_KEY in .env');
}

/**
 * Generate embeddings using OpenAI text-embedding-3-small.
 * @param {string|string[]} text - Text or array of texts to embed
 * @param {Object} options
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function generateEmbeddings(text, options = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Set VITE_OPENAI_API_KEY in .env');
  }

  const { model = 'text-embedding-3-small', dimensions = 1536, batchSize = 100 } = options;
  const texts = Array.isArray(text) ? text : [text];
  const results = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, input: batch, dimensions }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error ${response.status}: ${err.error?.message || 'Unknown'}`);
    }

    const data = await response.json();
    results.push(...data.data.map(item => item.embedding));

    if (i + batchSize < texts.length) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  return results;
}

/**
 * Embed a single search query.
 */
export async function embedSearchQuery(query) {
  const enhanced = enhanceSearchQuery(query);
  const [embedding] = await generateEmbeddings(enhanced);
  return embedding;
}

/**
 * Enhance a search query with contextual keywords for better vector matching.
 */
function enhanceSearchQuery(query) {
  const q = query.toLowerCase();
  const parts = [`Search for professional: ${query}`];

  const contextMaps = {
    geo: {
      'california': 'California, CA, Silicon Valley, Bay Area, San Francisco, Los Angeles',
      'new york': 'New York, NYC, Manhattan, East Coast',
      'boston': 'Boston, Massachusetts, Cambridge, Harvard, MIT',
      'texas': 'Texas, Austin, Dallas, Houston',
      'japan': 'Japan, Tokyo, Osaka, Japanese',
      'uk': 'United Kingdom, London, England, British',
      'germany': 'Germany, Berlin, Munich, German',
      'china': 'China, Beijing, Shanghai, Chinese',
      'india': 'India, Bangalore, Mumbai, Delhi, Indian',
    },
    industry: {
      'ai': 'artificial intelligence, machine learning, deep learning, neural networks, data science',
      'legal': 'legal, law, attorney, lawyer, counsel, litigation, compliance',
      'finance': 'finance, banking, investment, fintech, wealth management',
      'biotech': 'biotechnology, pharmaceutical, life sciences, clinical research',
      'energy': 'energy, renewable, oil, gas, solar, nuclear, power',
      'mining': 'mining, extraction, geology, minerals, resources',
      'healthcare': 'healthcare, medical, clinical, health services',
      'aerospace': 'aerospace, aviation, defense, space',
    },
    role: {
      'engineer': 'engineer, developer, architect, technical',
      'researcher': 'researcher, scientist, academic, professor, PhD',
      'manager': 'manager, director, leader, executive, VP',
      'founder': 'founder, entrepreneur, startup, CEO, co-founder',
      'consultant': 'consultant, advisor, expert, specialist',
    },
  };

  for (const [, map] of Object.entries(contextMaps)) {
    for (const [key, expansion] of Object.entries(map)) {
      if (q.includes(key)) {
        parts.push(expansion);
        break; // one match per category
      }
    }
  }

  return parts.join('. ');
}

/**
 * Validate an OpenAI API key format.
 */
export function validateOpenAIKey(key) {
  return typeof key === 'string' && key.startsWith('sk-') && key.length > 20;
}

/**
 * Test the OpenAI Embeddings API connection.
 */
export async function testEmbeddingsAPI() {
  try {
    if (!OPENAI_API_KEY) return { success: false, message: 'VITE_OPENAI_API_KEY not set' };
    await generateEmbeddings('connection test');
    return { success: true, message: 'OpenAI Embeddings API working' };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
