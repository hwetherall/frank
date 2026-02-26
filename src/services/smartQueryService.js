// src/services/smartQueryService.js

// Use fetch instead of Groq SDK to avoid CORS issues
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/**
 * Step 1: Basic Smart Query Enhancement
 * This transforms user queries into much better search terms
 */

/**
 * Transform a basic user query into an enhanced search query
 * This is the core improvement that makes search feel smarter
 */
export const enhanceSearchQuery = async (userQuery) => {
  console.log('🔍 Enhancing query:', userQuery);
  
  const prompt = `You are a search enhancement expert. Transform this user search into a comprehensive query that will find the best matching experts.

User Query: "${userQuery}"

Create an enhanced search query that includes:
1. The core expertise/skills needed
2. Related technologies and domains  
3. Types of projects they should handle
4. Industry context and knowledge areas
5. Professional qualities and experience level

Keep it natural and comprehensive, around 100-150 words.

Examples:
- "AI advisor" → "Experienced artificial intelligence expert and strategic advisor with deep expertise in machine learning, neural networks, and AI product development. Strong background in technology strategy, AI implementation, and guiding companies through digital transformation. Proven track record in AI consulting, technical leadership, and scaling AI solutions. Understanding of AI market dynamics, ethical AI, and emerging technologies. Experience with AI strategy development, team building, and translating AI research into business value."

- "React developer" → "Skilled React developer with expertise in modern JavaScript, component-based architecture, and frontend development. Experience with React ecosystem including Redux, hooks, routing, and state management. Knowledge of responsive design, performance optimization, and testing frameworks. Understanding of UI/UX principles, accessibility, and cross-browser compatibility. Experience with agile development, code reviews, and collaborative development practices."

Enhanced query:`;

  try {
    const response = await fetch('/api/groq/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai/gpt-oss-120b',
        temperature: 0.3,
        max_tokens: 250,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API Error ${response.status}:`, errorText);
      throw new Error(`Groq API error: ${response.status} - ${response.statusText}`);
    }

    const completion = await response.json();
    console.log('🔍 Groq API Response:', completion);
    
    const enhancedQuery = completion.choices[0]?.message?.content?.trim();
    
    if (!enhancedQuery) {
      console.warn('❌ No enhanced query generated, using fallback enhancement');
      const fallbackEnhanced = createFallbackEnhancement(userQuery);
      return {
        success: false,
        original: userQuery,
        enhanced: fallbackEnhanced,
        fallback: true
      };
    }

    console.log('✅ Query enhanced successfully');
    return {
      success: true,
      original: userQuery,
      enhanced: enhancedQuery
    };
    
  } catch (error) {
    console.error('❌ Query enhancement failed:', error);
    
    // Fallback: Create a simple enhanced query without external API
    const fallbackEnhanced = createFallbackEnhancement(userQuery);
    
    return {
      success: false,
      original: userQuery,
      enhanced: fallbackEnhanced,
      error: error.message,
      fallback: true
    };
  }
};

/**
 * Create a simple enhanced query without external API
 * @param {string} userQuery - Original user query
 * @returns {string} - Enhanced query
 */
const createFallbackEnhancement = (userQuery) => {
  const query = userQuery.toLowerCase().trim();
  
  // Common expertise keywords and their expansions
  const expansions = {
    'ai': 'artificial intelligence machine learning AI expert consultant advisor technology strategy',
    'ml': 'machine learning artificial intelligence data science AI expert statistical modeling',
    'data': 'data science analytics big data machine learning statistics expert business intelligence',
    'tech': 'technology technical expert consultant CTO engineering software development',
    'startup': 'startup entrepreneur business development venture capital expert fundraising scaling',
    'finance': 'financial expert advisor CFO investment banking consultant capital markets',
    'marketing': 'marketing expert digital marketing growth strategy consultant brand management',
    'sales': 'sales expert business development revenue growth consultant customer acquisition',
    'product': 'product management expert product strategy development consultant user experience',
    'design': 'design expert UX UI user experience product design consultant creative direction',
    'engineering': 'engineering expert technical consultant software development architecture',
    'healthcare': 'healthcare expert medical consultant life sciences advisor clinical research',
    'biotech': 'biotechnology expert life sciences medical consultant advisor pharmaceutical research',
    'fintech': 'fintech expert financial technology consultant advisor digital payments',
    'blockchain': 'blockchain expert cryptocurrency web3 consultant advisor decentralized finance',
    'cybersecurity': 'cybersecurity expert security consultant advisor risk management',
    'cloud': 'cloud computing expert AWS Azure consultant advisor infrastructure',
    'money': 'fundraising venture capital investment advisor financial consultant capital raising',
    'funding': 'fundraising venture capital investment advisor financial consultant capital raising',
    'investment': 'investment advisor venture capital financial consultant portfolio management',
    'capital': 'venture capital investment advisor financial consultant fundraising strategy'
  };
  
  let enhanced = `Professional expert consultant specializing in ${userQuery}`;
  
  // Add relevant expansions based on keywords found
  let foundMatch = false;
  for (const [keyword, expansion] of Object.entries(expansions)) {
    if (query.includes(keyword)) {
      enhanced += ` with deep expertise in ${expansion}`;
      foundMatch = true;
      break; // Use the first match to avoid too much duplication
    }
  }
  
  // If no specific match found, add general business expertise
  if (!foundMatch) {
    enhanced += ' with extensive business expertise and industry knowledge';
  }
  
  // Add common professional qualities
  enhanced += '. Experienced professional with proven track record, strategic thinking, and leadership capabilities. Ideal for consulting, advisory roles, and strategic guidance.';
  
  console.log('🔄 Created fallback enhancement:', enhanced);
  return enhanced;
};

/**
 * Test function to verify the service is working
 */
/**
 * Test the fallback enhancement function
 * @param {string} query - Test query
 * @returns {string} - Enhanced query
 */
export const testFallbackEnhancement = (query) => {
  console.log('🧪 Testing fallback enhancement...');
  const result = createFallbackEnhancement(query);
  console.log('Fallback Result:', result);
  return result;
};

export const testSmartQuery = async () => {
  console.log('🧪 Testing smart query service...');
  
  const testQuery = "AI consultant";
  const result = await enhanceSearchQuery(testQuery);
  
  console.log('Test Result:', result);
  return result;
};