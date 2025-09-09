import Groq from 'groq-sdk';

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true // Required for browser usage
});

/**
 * Expert Scoring Service using Groq API with gpt-oss-120b model
 * Scores professionals from 1-5 based on their suitability as experts for innovation consulting
 */

/**
 * Create a comprehensive prompt for expert scoring
 * @param {Object} profile - The professional profile data
 * @returns {string} - The formatted prompt for the AI
 */
function createExpertScoringPrompt(profile) {
  // Extract key information for scoring
  const name = profile.name || 'Unknown';
  
  // Comprehensive position analysis - analyze all 3 position-related columns
  const positions = [];
  if (profile.position) positions.push(`Current Position: ${profile.position}`);
  if (profile.ld_position && profile.ld_position !== profile.position) positions.push(`LinkedIn Position: ${profile.ld_position}`);
  const positionText = positions.length > 0 ? positions.join('; ') : 'Not specified';
  
  // Comprehensive company analysis - analyze both company-related columns
  const companies = [];
  if (profile.ld_company) companies.push(`LinkedIn Company: ${profile.ld_company}`);
  if (profile.current_company?.name && profile.current_company.name !== profile.ld_company) {
    companies.push(`Current Company: ${profile.current_company.name}`);
  } else if (profile.current_company && typeof profile.current_company === 'string' && profile.current_company !== profile.ld_company) {
    companies.push(`Current Company: ${profile.current_company}`);
  }
  const companyText = companies.length > 0 ? companies.join('; ') : 'Not specified';
  
  // Industry information
  const industryText = profile.industry && Array.isArray(profile.industry) && profile.industry.length > 0 
    ? `Industries: ${profile.industry.join(', ')}` 
    : 'Industry not specified';
  
  const location = profile.location || 'Not specified';
  const about = profile.about || 'No description available';
  const followersCount = profile.followers || 0;
  const connectionsCount = profile.connections || 0;
  const postsCount = profile.posts_count || 0;
  const activityCount = profile.activity_count || 0;
  const recommendationsCount = profile.recommendations_count || 0;

  // Process experience data
  let experienceText = 'No experience data available';
  if (profile.experience && Array.isArray(profile.experience)) {
    experienceText = profile.experience.map(exp => {
      const title = exp.title || 'Unknown Role';
      const company = exp.company || 'Unknown Company';
      const duration = exp.duration || exp.start_date ? `${exp.start_date} - ${exp.end_date || 'Present'}` : 'Duration not specified';
      return `${title} at ${company} (${duration})`;
    }).join('; ');
  }

  // Process education data
  let educationText = 'No education data available';
  if (profile.educations_details && Array.isArray(profile.educations_details)) {
    educationText = profile.educations_details.map(edu => {
      const degree = edu.degree || 'Unknown Degree';
      const school = edu.title || edu.school || 'Unknown Institution';
      const field = edu.field ? ` in ${edu.field}` : '';
      return `${degree}${field} from ${school}`;
    }).join('; ');
  }

  // Process publications, patents, awards
  const publicationsCount = profile.publications ? (Array.isArray(profile.publications) ? profile.publications.length : 0) : 0;
  const patentsCount = profile.patents ? (Array.isArray(profile.patents) ? profile.patents.length : 0) : 0;
  const awardsCount = profile.honors_and_awards ? (Array.isArray(profile.honors_and_awards) ? profile.honors_and_awards.length : 0) : 0;

  // Process certifications
  let certificationsText = 'No certifications available';
  if (profile.certifications && Array.isArray(profile.certifications)) {
    certificationsText = profile.certifications.map(cert => cert.title || cert.name || 'Unknown Certification').join('; ');
  }

  // Process volunteer experience
  let volunteerText = 'No volunteer experience available';
  if (profile.volunteer_experience && Array.isArray(profile.volunteer_experience)) {
    volunteerText = profile.volunteer_experience.map(vol => {
      const title = vol.title || 'Unknown Role';
      const org = vol.subtitle || vol.organization || 'Unknown Organization';
      return `${title} at ${org}`;
    }).join('; ');
  }

  return `You are an expert evaluator for an innovation consulting platform called Frank. Your job is to score professionals on their suitability as experts for innovation consulting across various industries.

SCORING CRITERIA (1-5 scale):

Score 5 - Exceptional Experts (Top Tier):
- Senior leadership roles (C-level, VP, Director, Partner) at well-known companies
- 15+ years of experience with clear career progression
- Strong thought leadership (publications, patents, awards, speaking)
- Premium education from top institutions
- High social proof (1000+ followers, many recommendations)
- Industry recognition and advisory roles

Score 4 - Strong Experts (High Value):
- Mid-senior management (Senior Manager, Principal, Lead) at reputable companies
- 8-15 years of solid experience
- Some thought leadership and industry involvement
- Good education and relevant certifications
- Moderate social proof (500+ followers)
- Active in professional development

Score 3 - Competent Professionals (Moderate Value):
- Mid-level roles (Manager, Specialist, experienced individual contributor)
- 4-8 years of experience
- Basic professional development and certifications
- Standard education
- Some social proof (200+ connections)
- Professional organization membership

Score 2 - Emerging Professionals (Limited Value):
- Junior-mid roles (Associate, Coordinator, Junior Specialist)
- 1-4 years of experience
- Minimal certifications or thought leadership
- Entry-level education
- Low social proof (100+ connections)

Score 1 - Entry Level/Unsuitable (Low Value):
- Entry-level roles (Intern, Student, Assistant)
- 0-1 years of experience
- No thought leadership or recognition
- Student or basic education
- Minimal social proof (<100 connections)

PROFESSIONAL TO EVALUATE:

Name: ${name}
Positions: ${positionText}
Companies: ${companyText}
${industryText}
Location: ${location}
About: ${about}

Professional Experience: ${experienceText}
Education: ${educationText}
Certifications: ${certificationsText}
Volunteer Experience: ${volunteerText}

Social Proof & Activity:
- LinkedIn Followers: ${followersCount.toLocaleString()}
- LinkedIn Connections: ${connectionsCount.toLocaleString()}
- LinkedIn Posts Count: ${postsCount}
- LinkedIn Activity Count: ${activityCount}
- Recommendations Count: ${recommendationsCount}

Thought Leadership Indicators:
- Publications: ${publicationsCount}
- Patents: ${patentsCount}
- Awards/Honors: ${awardsCount}

INSTRUCTIONS:
1. Analyze all the provided information carefully, including ALL position titles and company information
2. Consider BOTH LinkedIn Position and Current Position when evaluating seniority and leadership level
3. Evaluate BOTH LinkedIn Company and Current Company for company reputation and industry standing
4. Cross-reference the experience history with current positions for career progression analysis
5. Assign a score from 1-5 based on the criteria above
6. Provide a brief rationale (2-3 sentences) explaining your scoring decision
7. Focus on expertise depth, leadership experience, industry recognition, and innovation potential

Respond in this EXACT format:
SCORE: [number from 1-5]
RATIONALE: [2-3 sentences explaining the score based on experience, leadership, thought leadership, and suitability for innovation consulting]`;
}

/**
 * Score a single expert profile using Groq API
 * @param {Object} profile - The professional profile to score
 * @returns {Promise<Object>} - Object containing score and rationale
 */
export async function scoreExpertProfile(profile) {
  try {
    if (!import.meta.env.VITE_GROQ_API_KEY) {
      throw new Error('Groq API key not configured. Please set VITE_GROQ_API_KEY in your .env file.');
    }

    const prompt = createExpertScoringPrompt(profile);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "openai/gpt-oss-120b", // Using available Groq model as gpt-oss-120b might not be available
      temperature: 0.3, // Low temperature for consistent scoring
      max_tokens: 500,
      top_p: 1,
      stream: false
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response received from Groq API');
    }

    // Parse the response to extract score and rationale
    const scoreMatch = response.match(/SCORE:\s*(\d)/);
    const rationaleMatch = response.match(/RATIONALE:\s*(.*?)(?:\n|$)/s);

    if (!scoreMatch) {
      throw new Error('Could not parse score from AI response');
    }

    const score = parseInt(scoreMatch[1]);
    const rationale = rationaleMatch ? rationaleMatch[1].trim() : 'No rationale provided';

    // Validate score is in range
    if (score < 1 || score > 5) {
      throw new Error(`Invalid score received: ${score}. Score must be between 1-5.`);
    }

    return {
      success: true,
      score: score,
      rationale: rationale,
      model: "openai/gpt-oss-120b", // Update when gpt-oss-120b is available
      scored_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error scoring expert profile:', error);
    return {
      success: false,
      error: error.message,
      score: null,
      rationale: null
    };
  }
}

/**
 * Score multiple expert profiles in batch with progress tracking
 * @param {Array} profiles - Array of professional profiles to score
 * @param {Function} onProgress - Callback function for progress updates
 * @param {number} batchSize - Number of profiles to process in parallel
 * @returns {Promise<Array>} - Array of scoring results
 */
export async function scoreExpertProfilesBatch(profiles, onProgress = null, batchSize = 3) {
  const results = [];
  const total = profiles.length;
  let completed = 0;

  // Process in batches to avoid rate limiting
  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (profile, index) => {
      try {
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 200));
        
        const result = await scoreExpertProfile(profile);
        return {
          profile: profile,
          ...result
        };
      } catch (error) {
        return {
          profile: profile,
          success: false,
          error: error.message,
          score: null,
          rationale: null
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    completed += batch.length;
    
    // Call progress callback if provided
    if (onProgress) {
      onProgress({
        completed,
        total,
        percentage: Math.round((completed / total) * 100),
        currentBatch: Math.ceil(i / batchSize) + 1,
        totalBatches: Math.ceil(profiles.length / batchSize)
      });
    }

    // Add delay between batches to be respectful to the API
    if (i + batchSize < profiles.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Test the Groq API connection
 * @returns {Promise<Object>} - Connection test result
 */
export async function testGroqConnection() {
  try {
    if (!import.meta.env.VITE_GROQ_API_KEY) {
      return {
        success: false,
        message: 'Groq API key not configured. Please set VITE_GROQ_API_KEY in your .env file.'
      };
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: "Say 'Groq connection test successful' if you can read this."
        }
      ],
      model: "openai/gpt-oss-120b",
      temperature: 0,
      max_tokens: 50,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (response && response.toLowerCase().includes('successful')) {
      return {
        success: true,
        message: 'Groq API connection successful',
        model: "openai/gpt-oss-120b"
      };
    } else {
      return {
        success: false,
        message: 'Groq API responded but with unexpected content'
      };
    }

  } catch (error) {
    return {
      success: false,
      message: `Groq API connection failed: ${error.message}`
    };
  }
}
