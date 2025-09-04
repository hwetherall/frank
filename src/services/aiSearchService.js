// Enhanced AI search service for semantic expert matching
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

// Function to analyze and score experts using AI
export const semanticSearchExperts = async (query, experts) => {
  try {
    const prompt = `You are an expert matching system. Given a search query and a list of experts, score how well each expert matches the query based on their skills, experience, and background.

Search Query: "${query}"

Experts to analyze:
${experts.map((expert, index) => `
Expert ${index + 1}:
- Name: ${expert.name}
- Industry: ${expert.industry}
- Function: ${expert.function}
- Expertise: ${expert.expertise.join(', ')}
- Bio: ${expert.bio}
- Experience: ${expert.yearsExperience} years
- Notes: ${expert.notes}
`).join('\n')}

For each expert, provide a relevance score from 0.0 to 1.0 and a brief explanation of why they match or don't match the query.

Respond with ONLY a JSON array in this exact format:
[
  {
    "expertIndex": 0,
    "score": 0.85,
    "explanation": "Brief explanation of why this expert matches the query"
  },
  {
    "expertIndex": 1,
    "score": 0.23,
    "explanation": "Brief explanation of match level"
  }
]

Important: Include ALL experts in your response, even if their score is 0.0.`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'openai/gpt-oss-120b',
      temperature: 0.3,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from AI service');
    }

    // Parse the JSON response
    let scores;
    try {
      scores = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      // Fallback to keyword search if AI parsing fails
      return fallbackKeywordSearch(query, experts);
    }

    // Combine experts with their AI scores and explanations
    const scoredExperts = scores
      .map(scoreData => ({
        ...experts[scoreData.expertIndex],
        aiScore: scoreData.score,
        matchExplanation: scoreData.explanation
      }))
      .filter(expert => expert.aiScore > 0.1) // Filter out very low scores
      .sort((a, b) => b.aiScore - a.aiScore); // Sort by score descending

    return scoredExperts;

  } catch (error) {
    console.error('Error in semantic search:', error);
    // Fallback to keyword search if AI fails
    return fallbackKeywordSearch(query, experts);
  }
};

// Fallback keyword search function
const fallbackKeywordSearch = (query, experts) => {
  if (!query || query.trim() === '') return [];
  
  const lowercaseQuery = query.toLowerCase();
  const results = experts.filter(expert => {
    const searchableText = [
      expert.name,
      expert.location,
      expert.industry,
      expert.function,
      expert.lead,
      ...expert.expertise,
      expert.notes,
      expert.bio
    ].join(' ').toLowerCase();
    
    return searchableText.includes(lowercaseQuery);
  });
  
  // Add basic scoring for fallback
  return results.map(expert => ({
    ...expert,
    aiScore: 0.5, // Default score for keyword matches
    matchExplanation: 'Keyword match found in profile'
  }));
};

// Function to extract search intent and suggest improvements
export const analyzeSearchQuery = async (query) => {
  try {
    const prompt = `Analyze this search query for expert discovery: "${query}"

Provide suggestions to improve the search or clarify what the user might be looking for.

Respond with ONLY a JSON object in this format:
{
  "intent": "Brief description of what the user is looking for",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
  "searchTerms": ["key", "terms", "extracted"]
}`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b',
      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content;
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error analyzing query:', error);
    return {
      intent: "Looking for relevant experts",
      suggestions: [],
      searchTerms: query.split(' ')
    };
  }
};