// src/services/smartQueryService.js
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

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
    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b',
      temperature: 0.3,
      max_tokens: 250,
    });

    const enhancedQuery = completion.choices[0]?.message?.content?.trim();
    
    if (!enhancedQuery) {
      console.warn('❌ No enhanced query generated, using original');
      return {
        success: false,
        original: userQuery,
        enhanced: userQuery
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
    return {
      success: false,
      original: userQuery,
      enhanced: userQuery,
      error: error.message
    };
  }
};

/**
 * Test function to verify the service is working
 */
export const testSmartQuery = async () => {
  console.log('🧪 Testing smart query service...');
  
  const testQuery = "AI consultant";
  const result = await enhanceSearchQuery(testQuery);
  
  console.log('Test Result:', result);
  return result;
};