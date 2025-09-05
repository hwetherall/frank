// @ts-ignore - groq-sdk doesn't have TypeScript declarations
import Groq from 'groq-sdk';
import type { Expert, AIExpertResponse, ExpertType, ExpertIndustry, ExpertFunction, ExpertAvailability } from '../types';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

// Helper function to generate unique IDs for AI-generated experts
const generateId = (): string => 'ai-' + Math.random().toString(36).substr(2, 9);

// Helper function to generate avatar URLs
const generateAvatar = (name: string): string => {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366F1&color=fff&size=200`;
};

// Helper function to determine expert type based on location and context
const determineExpertType = (location: string, _query: string): ExpertType => {
  // Simple logic: if location is in common internal locations, make internal, otherwise external
  const internalLocations = ['Chicago', 'New York', 'San Francisco', 'Singapore', 'Perth'];
  const isInternalLocation = internalLocations.some(loc => location.includes(loc));
  
  // Bias towards external for AI-generated experts to show discovery capability
  return Math.random() > 0.7 && isInternalLocation ? 'Internal' : 'External';
};

// Helper function to randomly assign a lead from the available names
const getRandomLead = (): string => {
  const leads = ['Daniel', 'Bobby', 'Kamran', 'Pedram', 'Harry'];
  return leads[Math.floor(Math.random() * leads.length)];
};

// Main function to generate experts using AI
export const generateExpertsForQuery = async (searchQuery: string): Promise<Expert[]> => {
  try {
    const prompt = `You are an expert discovery system. Based on the search query: "${searchQuery}", generate 2-3 realistic expert profiles that would be perfect matches.

For each expert, provide ONLY a valid JSON object with these exact fields:
- name: Full professional name (realistic, diverse backgrounds)
- location: City, State/Country (global locations)
- industry: One of: Nuclear, Venture Capital, Robotics, AI/ML, Mining, Biotech, Aerospace, Energy, Finance, Healthcare
- function: One of: Engineering, Finance, Research, Operations, Strategy, Consulting, Academia
- email: Professional email address
- phone: International phone number
- expertise: Array of 4-6 specific technical skills relevant to the query
- bio: 2-3 sentence professional biography highlighting relevant experience
- notes: Brief note about their specialization and availability
- yearsExperience: Number between 8-35
- certifications: Array of 1-3 relevant professional certifications
- availability: One of: Available, Busy, Unknown

Note: Do not include a 'lead' field - this will be automatically assigned.

Respond with ONLY a JSON array of 2-3 expert objects. No additional text, explanations, or markdown formatting.

Example format:
[
  {
    "name": "Dr. Jane Smith",
    "location": "Boston, MA",
    "industry": "Biotech",
    "function": "Research",
    "email": "jane.smith@biotechcorp.com",
    "phone": "+1 (617) 555-0123",
    "expertise": ["Gene Therapy", "Clinical Trials", "Regulatory Affairs", "Biomarker Discovery"],
    "bio": "Leading biotechnology researcher with 15 years in gene therapy development. Published 40+ papers and led 3 successful clinical trials.",
    "notes": "Expert in rare disease therapeutics. Currently available for consulting projects.",
    "yearsExperience": 15,
    "certifications": ["PhD - Harvard Medical", "Clinical Research Certification"],
    "availability": "Available"
  }
]`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'openai/gpt-oss-120b', // Using available model instead of the specified one
      temperature: 0.7,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error('No response from AI service');
    }

    // Parse the JSON response
    let expertsData: AIExpertResponse[];
    try {
      expertsData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      // Fallback to hardcoded experts if parsing fails
      return generateFallbackExperts(searchQuery);
    }

    // Ensure we have an array
    if (!Array.isArray(expertsData)) {
      expertsData = [expertsData];
    }

    // Process and enhance the generated experts
    const processedExperts: Expert[] = expertsData.slice(0, 3).map(expert => ({
      id: generateId(),
      name: expert.name,
      photo: generateAvatar(expert.name),
      location: expert.location,
      industry: expert.industry,
      function: expert.function,
      type: determineExpertType(expert.location, searchQuery),
      lead: getRandomLead(),
      email: expert.email,
      phone: expert.phone,
      expertise: expert.expertise || [],
      bio: expert.bio,
      notes: expert.notes,
      lastContact: null, // AI-generated experts haven't been contacted yet
      availability: expert.availability || 'Unknown',
      yearsExperience: expert.yearsExperience || Math.floor(Math.random() * 20) + 10,
      certifications: expert.certifications || [],
      isAIGenerated: true // Flag to track AI-generated experts
    }));

    return processedExperts;

  } catch (error) {
    console.error('Error generating experts with AI:', error);
    // Return fallback experts if AI fails
    return generateFallbackExperts(searchQuery);
  }
};

// Fallback expert generation for when AI fails
const generateFallbackExperts = (searchQuery: string): Expert[] => {
  const fallbackExperts: Expert[] = [
    {
      id: generateId(),
      name: 'Dr. Alexandra Martinez',
      photo: generateAvatar('Dr. Alexandra Martinez'),
      location: 'Barcelona, Spain',
      industry: getIndustryFromQuery(searchQuery),
      function: 'Research' as ExpertFunction,
      type: 'External' as ExpertType,
      lead: getRandomLead(),
      email: 'a.martinez@techresearch.es',
      phone: '+34 93 555 0123',
      expertise: getExpertiseFromQuery(searchQuery),
      bio: 'International expert with extensive experience in cutting-edge research and development.',
      notes: 'Highly recommended specialist. Available for strategic consulting and technical reviews.',
      lastContact: null,
      availability: 'Available' as ExpertAvailability,
      yearsExperience: 18,
      certifications: ['PhD - Technical University', 'International Research Fellow'],
      isAIGenerated: true
    },
    {
      id: generateId(),
      name: 'Michael Chen',
      photo: generateAvatar('Michael Chen'),
      location: 'Vancouver, Canada',
      industry: getIndustryFromQuery(searchQuery),
      function: 'Engineering' as ExpertFunction,
      type: 'External' as ExpertType,
      lead: getRandomLead(),
      email: 'mchen@innovativetech.ca',
      phone: '+1 (604) 555-0156',
      expertise: getExpertiseFromQuery(searchQuery),
      bio: 'Senior engineer with proven track record in complex technical implementations and team leadership.',
      notes: 'Excellent problem solver with strong industry connections. Currently taking on new projects.',
      lastContact: null,
      availability: 'Available' as ExpertAvailability,
      yearsExperience: 22,
      certifications: ['Professional Engineer', 'Project Management Professional'],
      isAIGenerated: true
    }
  ];

  return fallbackExperts.slice(0, Math.floor(Math.random() * 2) + 2); // Return 2-3 experts
};

// Helper functions for fallback expert generation
const getIndustryFromQuery = (query: string): ExpertIndustry => {
  const lowercaseQuery = query.toLowerCase();
  if (lowercaseQuery.includes('nuclear')) return 'Nuclear';
  if (lowercaseQuery.includes('robot')) return 'Robotics';
  if (lowercaseQuery.includes('ai') || lowercaseQuery.includes('machine learning')) return 'AI/ML';
  if (lowercaseQuery.includes('mining')) return 'Mining';
  if (lowercaseQuery.includes('venture') || lowercaseQuery.includes('funding')) return 'Venture Capital';
  if (lowercaseQuery.includes('bio')) return 'Biotech';
  if (lowercaseQuery.includes('aerospace') || lowercaseQuery.includes('space')) return 'Aerospace';
  if (lowercaseQuery.includes('energy')) return 'Energy';
  return 'Technology';
};

const getExpertiseFromQuery = (query: string): string[] => {
  const lowercaseQuery = query.toLowerCase();
  const expertiseMap: Record<string, string[]> = {
    nuclear: ['Nuclear Safety', 'Reactor Design', 'Radiation Protection', 'Nuclear Waste Management'],
    robot: ['Robotics Engineering', 'Automation Systems', 'Computer Vision', 'Motion Control'],
    ai: ['Machine Learning', 'Deep Learning', 'Neural Networks', 'Data Science'],
    mining: ['Mining Operations', 'Geological Analysis', 'Equipment Management', 'Safety Protocols'],
    venture: ['Investment Analysis', 'Due Diligence', 'Portfolio Management', 'Startup Evaluation'],
    bio: ['Biotechnology', 'Molecular Biology', 'Clinical Research', 'Regulatory Affairs']
  };

  for (const [key, skills] of Object.entries(expertiseMap)) {
    if (lowercaseQuery.includes(key)) {
      return skills;
    }
  }

  return ['Strategic Consulting', 'Technical Analysis', 'Project Management', 'Innovation Strategy'];
};
