import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * Enhanced searchable text creation with AI-powered context enrichment
 * This makes semantic search much more intelligent by adding contextual information
 */
export const createEnhancedSearchableText = async (contact) => {
  try {
    // Start with basic information
    const basicInfo = createBasicSearchableText(contact);
    
    // Use AI to enrich the context
    const enrichedContext = await enrichContactContext(contact);
    
    // Combine both for maximum searchability
    return `${basicInfo}\n\nEnriched Context: ${enrichedContext}`;
    
  } catch (error) {
    console.warn('AI enrichment failed, using basic text:', error);
    // Fallback to enhanced basic text if AI fails
    return createEnhancedBasicText(contact);
  }
};

/**
 * Create basic searchable text (original functionality)
 */
const createBasicSearchableText = (contact) => {
  const parts = [];

  if (contact.name) {
    parts.push(`Name: ${contact.name}`);
  }

  if (contact.title) {
    parts.push(`Title: ${contact.title}`);
  }

  if (contact.company) {
    parts.push(`Company: ${contact.company}`);
  }

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

  return `Professional profile: ${parts.join('. ')}`;
};

/**
 * Create enhanced basic text with manual intelligence
 */
const createEnhancedBasicText = (contact) => {
  const parts = [];
  const contextParts = [];

  // Basic info
  if (contact.name) parts.push(`Name: ${contact.name}`);
  if (contact.title) parts.push(`Title: ${contact.title}`);
  if (contact.company) parts.push(`Company: ${contact.company}`);

  // Industry processing
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

  // Add geographic intelligence
  if (contact.company) {
    const geoContext = extractGeographicContext(contact.company);
    if (geoContext.length > 0) {
      contextParts.push(`Geographic context: ${geoContext.join(', ')}`);
    }
  }

  // Add institutional intelligence
  if (contact.company) {
    const institutionalContext = extractInstitutionalContext(contact.company, contact.title);
    if (institutionalContext.length > 0) {
      contextParts.push(`Institutional context: ${institutionalContext.join(', ')}`);
    }
  }

  // Add title-based expertise inference
  if (contact.title) {
    const expertiseContext = inferExpertiseFromTitle(contact.title);
    if (expertiseContext.length > 0) {
      contextParts.push(`Expertise areas: ${expertiseContext.join(', ')}`);
    }
  }

  const basicText = `Professional profile: ${parts.join('. ')}`;
  const enhancedContext = contextParts.length > 0 ? `\n\nEnhanced Context: ${contextParts.join('. ')}` : '';
  
  return basicText + enhancedContext;
};

/**
 * Use AI to enrich contact context for better semantic search
 */
const enrichContactContext = async (contact) => {
  const prompt = `You are an expert at understanding professional contexts and relationships. Given this professional profile, provide additional context that would help in semantic search for finding the right experts.

Contact Information:
- Name: ${contact.name || 'Unknown'}
- Title: ${contact.title || 'Unknown'}
- Company: ${contact.company || 'Unknown'}
- Industries: ${Array.isArray(contact.industry) ? contact.industry.join(', ') : contact.industry || 'Unknown'}

Please provide enriched context that includes:
1. Professional expertise and specializations (be very specific about what they can help with)
2. Industry knowledge and related fields they would understand
3. Skills, competencies, and areas of authority based on title/company
4. Types of projects, consulting, or advice they would be suitable for
5. Related professional domains and cross-industry applications
6. Geographic/location context if relevant

IMPORTANT: If this person has legal, law, attorney, counsel, or legal-related experience, emphasize legal expertise, legal specializations, regulatory knowledge, compliance, legal consulting, legal advice, law practice areas, and related legal services.

If this person works in technology, emphasize technical skills, programming, software development, AI, data science, engineering, and tech consulting.

If this person works in finance, emphasize financial expertise, investment, banking, financial analysis, and financial consulting.

Respond with a focused paragraph (max 150 words) that emphasizes their core professional value and makes them highly discoverable for relevant searches.

Example for a legal professional: "Legal expertise in corporate law, regulatory compliance, and business transactions. Specializes in legal consulting, contract negotiation, and legal advisory services. Authority in legal matters, regulatory frameworks, and compliance strategies. Suitable for legal counsel, legal research, regulatory guidance, and legal consulting projects. Cross-industry legal applications in business, technology, and finance sectors."

Example for a tech professional: "Technology expertise in software engineering, artificial intelligence, and data science. Specializes in technical consulting, system architecture, and innovation strategy. Authority in technical solutions, programming, and technology implementation. Suitable for technical advisory, software development projects, AI consulting, and technology strategy initiatives."`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.3,
      max_tokens: 200,
    });

    const enrichedText = completion.choices[0]?.message?.content;
    
    if (!enrichedText) {
      throw new Error('No response from AI service');
    }

    return enrichedText.trim();

  } catch (error) {
    console.error('Error enriching contact context:', error);
    // Fallback to manual enrichment
    return createManualEnrichment(contact);
  }
};

/**
 * Manual enrichment as fallback when AI fails
 */
const createManualEnrichment = (contact) => {
  const enrichments = [];
  
  // Geographic context
  const geoContext = extractGeographicContext(contact.company || '');
  if (geoContext.length > 0) {
    enrichments.push(`Geographic context: ${geoContext.join(', ')}`);
  }
  
  // Institutional context
  const instContext = extractInstitutionalContext(contact.company || '', contact.title || '');
  if (instContext.length > 0) {
    enrichments.push(`Institutional context: ${instContext.join(', ')}`);
  }
  
  // Expertise inference
  const expertise = inferExpertiseFromTitle(contact.title || '');
  if (expertise.length > 0) {
    enrichments.push(`Likely expertise: ${expertise.join(', ')}`);
  }
  
  return enrichments.join('. ');
};

/**
 * Extract geographic context from company names
 */
const extractGeographicContext = (company) => {
  const contexts = [];
  const companyLower = company.toLowerCase();
  
  // US States and major cities
  const locations = {
    'california': ['California', 'West Coast', 'Silicon Valley ecosystem'],
    'san francisco': ['San Francisco', 'Bay Area', 'Silicon Valley', 'Northern California'],
    'san diego': ['San Diego', 'Southern California', 'California'],
    'los angeles': ['Los Angeles', 'Southern California', 'California'],
    'new york': ['New York', 'East Coast', 'Financial district'],
    'boston': ['Boston', 'East Coast', 'Academic hub'],
    'chicago': ['Chicago', 'Midwest', 'Industrial hub'],
    'seattle': ['Seattle', 'Pacific Northwest', 'Tech hub'],
    'austin': ['Austin', 'Texas', 'Tech corridor'],
    'university': ['Academic institution', 'Research environment', 'Higher education'],
    'institute': ['Research institute', 'Academic research', 'Scientific community'],
    'college': ['Academic institution', 'Higher education', 'Educational sector']
  };
  
  for (const [key, values] of Object.entries(locations)) {
    if (companyLower.includes(key)) {
      contexts.push(...values);
    }
  }
  
  return [...new Set(contexts)]; // Remove duplicates
};

/**
 * Extract institutional context
 */
const extractInstitutionalContext = (company, title) => {
  const contexts = [];
  const companyLower = company.toLowerCase();
  const titleLower = title.toLowerCase();
  
  // Institutional types
  if (companyLower.includes('university') || companyLower.includes('college')) {
    contexts.push('Academic institution', 'Research community', 'Higher education sector');
    
    if (titleLower.includes('professor') || titleLower.includes('researcher')) {
      contexts.push('Academic researcher', 'Subject matter expert', 'Thought leader');
    }
  }
  
  if (companyLower.includes('institute') || companyLower.includes('research')) {
    contexts.push('Research institute', 'Scientific community', 'Innovation hub');
  }
  
  if (companyLower.includes('lab') || companyLower.includes('laboratory')) {
    contexts.push('Research laboratory', 'Experimental research', 'Technical expertise');
  }
  
  if (companyLower.includes('hospital') || companyLower.includes('medical')) {
    contexts.push('Healthcare sector', 'Medical expertise', 'Clinical experience');
  }
  
  if (companyLower.includes('government') || companyLower.includes('federal')) {
    contexts.push('Government sector', 'Policy expertise', 'Public sector');
  }
  
  return [...new Set(contexts)];
};

/**
 * Infer expertise from job titles with enhanced professional recognition
 */
const inferExpertiseFromTitle = (title) => {
  const expertise = [];
  const titleLower = title.toLowerCase();
  
  // Legal expertise (HIGH PRIORITY)
  if (titleLower.includes('legal') || titleLower.includes('law') || titleLower.includes('attorney') || 
      titleLower.includes('lawyer') || titleLower.includes('counsel') || titleLower.includes('paralegal') ||
      titleLower.includes('solicitor') || titleLower.includes('barrister') || titleLower.includes('advocate')) {
    expertise.push('Legal expert', 'Legal consulting', 'Legal advisory', 'Regulatory compliance', 
                  'Legal analysis', 'Contract law', 'Legal research', 'Legal strategy', 'Legal counsel');
  }
  
  // Medical/Healthcare expertise
  if (titleLower.includes('doctor') || titleLower.includes('physician') || titleLower.includes('medical') ||
      titleLower.includes('nurse') || titleLower.includes('health') || titleLower.includes('clinical')) {
    expertise.push('Medical expert', 'Healthcare consulting', 'Medical advisory', 'Clinical expertise', 'Health strategy');
  }
  
  // Financial expertise
  if (titleLower.includes('finance') || titleLower.includes('financial') || titleLower.includes('investment') ||
      titleLower.includes('banking') || titleLower.includes('accounting') || titleLower.includes('audit')) {
    expertise.push('Financial expert', 'Financial analysis', 'Investment strategy', 'Financial consulting', 'Financial planning');
  }
  
  // Technical roles
  if (titleLower.includes('engineer') || titleLower.includes('developer')) {
    expertise.push('Technical expert', 'Engineering solutions', 'Technical consulting', 'System design', 'Technology strategy');
  }
  
  if (titleLower.includes('data') || titleLower.includes('analytics')) {
    expertise.push('Data science expert', 'Data analysis', 'Statistical modeling', 'Business intelligence', 'Analytics strategy');
  }
  
  if (titleLower.includes('ai') || titleLower.includes('machine learning') || titleLower.includes('ml')) {
    expertise.push('AI expert', 'Machine learning specialist', 'Artificial intelligence', 'Predictive modeling', 'AI consulting');
  }
  
  // Leadership roles
  if (titleLower.includes('director') || titleLower.includes('manager') || titleLower.includes('lead')) {
    expertise.push('Leadership expert', 'Management consulting', 'Team management', 'Strategic planning', 'Executive advisory');
  }
  
  if (titleLower.includes('cto') || titleLower.includes('ceo') || titleLower.includes('chief')) {
    expertise.push('Executive leader', 'C-level executive', 'Strategic vision', 'Organizational management', 'Business strategy');
  }
  
  // Research roles
  if (titleLower.includes('researcher') || titleLower.includes('scientist')) {
    expertise.push('Research specialist', 'Scientific analysis', 'Research methodology', 'Innovation development', 'Subject matter expert');
  }
  
  if (titleLower.includes('professor') || titleLower.includes('faculty')) {
    expertise.push('Academic expert', 'Academic consulting', 'Teaching expertise', 'Subject matter authority', 'Research advisory');
  }
  
  // Consulting roles
  if (titleLower.includes('consultant') || titleLower.includes('advisor')) {
    expertise.push('Professional consultant', 'Strategic consulting', 'Advisory services', 'Expert consulting', 'Business advisory');
  }
  
  return [...new Set(expertise)];
};

/**
 * Process multiple contacts with AI enrichment (with rate limiting)
 */
export const processContactsWithEnrichment = async (contacts, onProgress = null) => {
  const enrichedContacts = [];
  const batchSize = 5; // Process in smaller batches to avoid rate limits
  const delayBetweenBatches = 1000; // 1 second delay between batches
  
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchPromises = batch.map(async (contact) => {
      try {
        const enhancedText = await createEnhancedSearchableText(contact);
        return {
          ...contact,
          searchable_text: enhancedText
        };
      } catch (error) {
        console.warn(`Failed to enrich contact ${contact.name}:`, error);
        return {
          ...contact,
          searchable_text: createEnhancedBasicText(contact)
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    enrichedContacts.push(...batchResults);
    
    // Report progress
    if (onProgress) {
      onProgress({
        step: 'enriching',
        message: `AI enriching contact profiles: ${Math.min(i + batchSize, contacts.length)}/${contacts.length}`,
        processed: Math.min(i + batchSize, contacts.length),
        total: contacts.length
      });
    }
    
    // Add delay between batches (except for the last batch)
    if (i + batchSize < contacts.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return enrichedContacts;
};
