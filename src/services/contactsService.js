import { supabase } from './supabaseClient.js';
import { semanticSearch } from './vectorUploader.js';

/**
 * Get all contacts from Supabase
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of contacts
 */
export const getAllContacts = async (options = {}) => {
  try {
    const {
      limit = null,
      offset = 0,
      orderBy = 'created_at',
      ascending = false
    } = options;

    let query = supabase
      .from('contacts_vector')
      .select('*')
      .order(orderBy, { ascending });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset > 0) {
      query = query.range(offset, offset + (limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw new Error(`Failed to fetch contacts: ${error.message}`);
  }
};

/**
 * Get contact by ID
 * @param {number} id - Contact ID
 * @returns {Promise<Object>} - Contact object
 */
export const getContactById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('contacts_vector')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching contact:', error);
    throw new Error(`Failed to fetch contact: ${error.message}`);
  }
};

/**
 * Search contacts using text search
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Array of matching contacts
 */
export const searchContacts = async (query, options = {}) => {
  try {
    const {
      limit = 50,
      useSemanticSearch = false
    } = options;

    if (useSemanticSearch) {
      // Use vector search if available
      try {
        return await semanticSearch(query, { matchCount: limit });
      } catch (error) {
        console.warn('Semantic search failed, falling back to text search:', error);
        // Fall through to text search
      }
    }

    // Text-based search using PostgreSQL's text search
    const { data, error } = await supabase
      .from('contacts_vector')
      .select('*')
      .or(`name.ilike.%${query}%,company.ilike.%${query}%,title.ilike.%${query}%,innovera_contact.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error searching contacts:', error);
    throw new Error(`Failed to search contacts: ${error.message}`);
  }
};

/**
 * Search contacts by industry
 * @param {string|Array} industries - Industry or array of industries
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Array of matching contacts
 */
export const searchContactsByIndustry = async (industries, options = {}) => {
  try {
    const { limit = 50 } = options;
    
    const industriesArray = Array.isArray(industries) ? industries : [industries];
    
    // Use PostgreSQL JSONB operators to search within industry arrays
    const { data, error } = await supabase
      .from('contacts_vector')
      .select('*')
      .overlaps('industry', industriesArray)
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error searching contacts by industry:', error);
    throw new Error(`Failed to search contacts by industry: ${error.message}`);
  }
};

/**
 * Update contact
 * @param {number} id - Contact ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated contact
 */
export const updateContact = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('contacts_vector')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating contact:', error);
    throw new Error(`Failed to update contact: ${error.message}`);
  }
};

/**
 * Delete contact
 * @param {number} id - Contact ID
 * @returns {Promise<boolean>} - Success status
 */
export const deleteContact = async (id) => {
  try {
    const { error } = await supabase
      .from('contacts_vector')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error deleting contact:', error);
    throw new Error(`Failed to delete contact: ${error.message}`);
  }
};

/**
 * Get contact statistics
 * @returns {Promise<Object>} - Statistics object
 */
export const getContactStats = async () => {
  try {
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('contacts_vector')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    // Get industry distribution
    const { data: industryData, error: industryError } = await supabase
      .from('contacts_vector')
      .select('industry');

    if (industryError) {
      throw industryError;
    }

    // Process industry data to get unique industries
    const industryCount = {};
    industryData.forEach(contact => {
      if (contact.industry && Array.isArray(contact.industry)) {
        contact.industry.forEach(industry => {
          industryCount[industry] = (industryCount[industry] || 0) + 1;
        });
      }
    });

    // Get company distribution
    const { data: companyData, error: companyError } = await supabase
      .from('contacts_vector')
      .select('company')
      .not('company', 'is', null);

    if (companyError) {
      throw companyError;
    }

    const companyCount = {};
    companyData.forEach(contact => {
      if (contact.company) {
        companyCount[contact.company] = (companyCount[contact.company] || 0) + 1;
      }
    });

    return {
      totalContacts: totalCount,
      uniqueIndustries: Object.keys(industryCount).length,
      uniqueCompanies: Object.keys(companyCount).length,
      industryDistribution: industryCount,
      topCompanies: Object.entries(companyCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((obj, [company, count]) => ({ ...obj, [company]: count }), {})
    };
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    throw new Error(`Failed to fetch contact statistics: ${error.message}`);
  }
};

/**
 * Transform Supabase contact to match the expert format with enhanced data
 * @param {Object} contact - Supabase contact object
 * @returns {Object} - Expert-formatted object with rich profile data
 */
export const transformContactToExpert = (contact) => {
  if (!contact) return null;

  // Extract and process industries
  let industries = [];
  let industryText = 'Unknown';
  
  if (contact.industry) {
    if (Array.isArray(contact.industry)) {
      industries = contact.industry;
      industryText = contact.industry.join(', ');
    } else if (typeof contact.industry === 'string') {
      try {
        // Try to parse as JSON array
        const parsed = JSON.parse(contact.industry);
        if (Array.isArray(parsed)) {
          industries = parsed;
          industryText = parsed.join(', ');
        } else {
          industries = [contact.industry];
          industryText = contact.industry;
        }
      } catch (e) {
        industries = [contact.industry];
        industryText = contact.industry;
      }
    }
  }

  // Generate expertise areas based on title and industries
  const expertise = generateExpertiseFromProfile(contact.title, industries);
  
  // Create a more detailed bio
  const bio = createEnhancedBio(contact);
  
  // Determine professional function from title
  const professionalFunction = inferFunctionFromTitle(contact.title);
  
  // Extract contact information from available fields
  const contactInfo = extractContactInfo(contact);
  
  // Determine experience level from title
  const experienceLevel = inferExperienceFromTitle(contact.title);

  return {
    id: contact.id,
    name: contact.name || 'Unknown',
    company: contact.company || 'Unknown Company',
    title: contact.title || 'Unknown Title',
    industry: industryText,
    industries: industries,
    linkedin: contact.linkedin || null,
    email: contactInfo.email,
    phone: contactInfo.phone,
    location: contactInfo.location,
    type: 'Real Contact',
    lead: contact.innovera_contact || 'Unknown',
    expertise: expertise,
    function: professionalFunction,
    notes: createDetailedNotes(contact),
    lastContact: contact.created_at ? new Date(contact.created_at).toISOString().split('T')[0] : null,
    availability: 'Unknown',
    yearsExperience: experienceLevel,
    certifications: inferCertifications(contact.title, industries),
    bio: bio,
    rating: null,
    reviewCount: 0,
    photo: generateAvatarUrl(contact.name),
    created_at: contact.created_at,
    updated_at: contact.updated_at,
    similarity: contact.similarity || null // For semantic search results
  };
};

/**
 * Generate expertise areas from title and industries
 */
const generateExpertiseFromProfile = (title, industries) => {
  const expertise = new Set();
  
  // Add industries as expertise
  industries.forEach(industry => {
    if (industry && industry !== 'Unknown') {
      expertise.add(industry);
    }
  });
  
  // Extract expertise from title
  if (title) {
    const titleLower = title.toLowerCase();
    
    // Technical roles
    if (titleLower.includes('engineer')) expertise.add('Engineering');
    if (titleLower.includes('manager')) expertise.add('Management');
    if (titleLower.includes('director')) expertise.add('Leadership');
    if (titleLower.includes('analyst')) expertise.add('Analysis');
    if (titleLower.includes('consultant')) expertise.add('Consulting');
    if (titleLower.includes('researcher')) expertise.add('Research');
    if (titleLower.includes('developer')) expertise.add('Development');
    if (titleLower.includes('architect')) expertise.add('Architecture');
    if (titleLower.includes('specialist')) expertise.add('Specialization');
    if (titleLower.includes('coordinator')) expertise.add('Coordination');
    if (titleLower.includes('supervisor')) expertise.add('Supervision');
    
    // Innovation and strategy
    if (titleLower.includes('innovation')) expertise.add('Innovation');
    if (titleLower.includes('strategy')) expertise.add('Strategy');
    if (titleLower.includes('planning')) expertise.add('Strategic Planning');
    if (titleLower.includes('business')) expertise.add('Business Development');
    
    // Project management
    if (titleLower.includes('project')) expertise.add('Project Management');
    if (titleLower.includes('program')) expertise.add('Program Management');
  }
  
  return Array.from(expertise).slice(0, 6); // Limit to 6 expertise areas
};

/**
 * Create an enhanced biography
 */
const createEnhancedBio = (contact) => {
  const parts = [];
  
  if (contact.title && contact.company) {
    parts.push(`${contact.title} at ${contact.company}`);
  }
  
  // Add industry context
  if (contact.industry) {
    let industries = contact.industry;
    if (Array.isArray(industries)) {
      parts.push(`Specializes in ${industries.join(', ')}`);
    } else if (typeof industries === 'string' && industries !== 'Unknown') {
      parts.push(`Specializes in ${industries}`);
    }
  }
  
  // Add professional context based on title
  if (contact.title) {
    const titleLower = contact.title.toLowerCase();
    if (titleLower.includes('innovation')) {
      parts.push('Focused on driving innovation and technological advancement');
    } else if (titleLower.includes('manager') || titleLower.includes('director')) {
      parts.push('Experienced in team leadership and strategic planning');
    } else if (titleLower.includes('engineer')) {
      parts.push('Technical expertise in engineering solutions and system design');
    } else if (titleLower.includes('consultant')) {
      parts.push('Provides strategic consulting and advisory services');
    }
  }
  
  return parts.join('. ') + '.';
};

/**
 * Infer professional function from title
 */
const inferFunctionFromTitle = (title) => {
  if (!title) return 'Unknown';
  
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('engineer') || titleLower.includes('developer')) return 'Engineering';
  if (titleLower.includes('manager') || titleLower.includes('director')) return 'Management';
  if (titleLower.includes('analyst') || titleLower.includes('research')) return 'Research';
  if (titleLower.includes('consultant') || titleLower.includes('advisor')) return 'Consulting';
  if (titleLower.includes('finance') || titleLower.includes('accounting')) return 'Finance';
  if (titleLower.includes('marketing') || titleLower.includes('sales')) return 'Marketing';
  if (titleLower.includes('operations') || titleLower.includes('coordinator')) return 'Operations';
  if (titleLower.includes('strategy') || titleLower.includes('planning')) return 'Strategy';
  if (titleLower.includes('innovation')) return 'Innovation';
  
  return 'General';
};

/**
 * Extract contact information from available fields
 */
const extractContactInfo = (contact) => {
  return {
    email: contact.email || null,
    phone: contact.phone || null,
    location: contact.location || contact.city || contact.country || null
  };
};

/**
 * Infer experience level from title
 */
const inferExperienceFromTitle = (title) => {
  if (!title) return null;
  
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('senior') || titleLower.includes('lead')) return 8;
  if (titleLower.includes('principal') || titleLower.includes('chief')) return 12;
  if (titleLower.includes('director') || titleLower.includes('head')) return 10;
  if (titleLower.includes('manager')) return 6;
  if (titleLower.includes('coordinator') || titleLower.includes('specialist')) return 4;
  if (titleLower.includes('junior') || titleLower.includes('associate')) return 2;
  
  return null; // Unknown experience level
};

/**
 * Infer potential certifications from title and industries
 */
const inferCertifications = (title, industries) => {
  const certs = [];
  
  if (!title) return certs;
  
  const titleLower = title.toLowerCase();
  
  // Engineering certifications
  if (titleLower.includes('engineer')) {
    certs.push('Professional Engineer');
  }
  
  // Management certifications
  if (titleLower.includes('project') && titleLower.includes('manager')) {
    certs.push('Project Management Professional (PMP)');
  }
  
  // Industry-specific certifications
  industries.forEach(industry => {
    if (!industry) return;
    const industryLower = industry.toLowerCase();
    
    if (industryLower.includes('construction')) {
      certs.push('Construction Management');
    }
    if (industryLower.includes('technology') || industryLower.includes('it')) {
      certs.push('Technology Certification');
    }
  });
  
  return certs.slice(0, 3); // Limit to 3 certifications
};

/**
 * Create detailed notes
 */
const createDetailedNotes = (contact) => {
  const notes = [];
  
  if (contact.linkedin) {
    notes.push(`LinkedIn: ${contact.linkedin}`);
  }
  
  if (contact.innovera_contact) {
    notes.push(`Innovera Contact: ${contact.innovera_contact}`);
  }
  
  // Add any additional context
  if (contact.title && contact.title.includes('Innovation')) {
    notes.push('Specializes in innovation management and technology advancement');
  }
  
  return notes.join('. ') || 'Professional contact in our network';
};

/**
 * Get all experts from expert_profiles table
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of experts
 */
export const getAllExperts = async (options = {}) => {
  try {
    const {
      limit = null,
      offset = 0,
      orderBy = 'expert_score',
      ascending = false
    } = options;

    let query = supabase
      .from('expert_profiles')
      .select('*')
      .order(orderBy, { ascending, nullsLast: true });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset > 0) {
      query = query.range(offset, offset + (limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
      // If expert_profiles doesn't exist, try expert_profiles_vector
      if (error.message.includes('relation "expert_profiles" does not exist')) {
        return await getAllExpertsFromVector(options);
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching experts:', error);
    // Try fallback to vector table
    try {
      return await getAllExpertsFromVector(options);
    } catch (fallbackError) {
      console.error('Error fetching experts from vector table:', fallbackError);
      throw new Error(`Failed to fetch experts: ${error.message}`);
    }
  }
};

/**
 * Get all experts from expert_profiles_vector table
 * @param {Object} options - Query options
 * @returns {Promise<Array>} - Array of experts
 */
export const getAllExpertsFromVector = async (options = {}) => {
  try {
    const {
      limit = null,
      offset = 0,
      orderBy = 'expert_score',
      ascending = false
    } = options;

    let query = supabase
      .from('expert_profiles_vector')
      .select('*')
      .order(orderBy, { ascending, nullsLast: true });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset > 0) {
      query = query.range(offset, offset + (limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching experts from vector table:', error);
    throw new Error(`Failed to fetch experts from vector table: ${error.message}`);
  }
};

/**
 * Get expert statistics
 * @returns {Promise<Object>} - Statistics object
 */
export const getExpertStats = async () => {
  try {
    // Try expert_profiles first
    let tableName = 'expert_profiles';
    let { count: totalCount, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    // If expert_profiles doesn't exist, try expert_profiles_vector
    if (countError && countError.message.includes('relation "expert_profiles" does not exist')) {
      tableName = 'expert_profiles_vector';
      const result = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });
      totalCount = result.count;
      countError = result.error;
    }

    if (countError) {
      throw countError;
    }

    // Get industry distribution
    const { data: industryData, error: industryError } = await supabase
      .from(tableName)
      .select('industry');

    if (industryError) {
      throw industryError;
    }

    // Process industry data
    const industryCount = {};
    industryData.forEach(expert => {
      if (expert.industry) {
        let industries;
        if (Array.isArray(expert.industry)) {
          industries = expert.industry;
        } else if (typeof expert.industry === 'string') {
          industries = [expert.industry];
        } else if (typeof expert.industry === 'object' && expert.industry !== null) {
          // Handle case where industry might be an object
          industries = [expert.industry.name || expert.industry.title || String(expert.industry)];
        } else {
          industries = [String(expert.industry)];
        }
        
        industries.forEach(industry => {
          if (industry && typeof industry === 'string' && industry.trim()) {
            industryCount[industry] = (industryCount[industry] || 0) + 1;
          }
        });
      }
    });

    // Get company distribution (using correct field names for each table)
    const companyField = tableName === 'expert_profiles_vector' ? 'current_company' : 'ld_company';
    const { data: companyData, error: companyError } = await supabase
      .from(tableName)
      .select(companyField)
      .not(companyField, 'is', null);

    if (companyError) {
      throw companyError;
    }

    const companyCount = {};
    companyData.forEach(expert => {
      let company = expert[companyField] || expert.company;
      
      // Handle case where company might be an object
      if (typeof company === 'object' && company !== null) {
        company = company.name || company.title || String(company);
      }
      
      if (company && typeof company === 'string' && company.trim()) {
        companyCount[company] = (companyCount[company] || 0) + 1;
      }
    });

    return {
      totalExperts: totalCount,
      uniqueIndustries: Object.keys(industryCount).length,
      uniqueCompanies: Object.keys(companyCount).length,
      industryDistribution: industryCount,
      topCompanies: Object.entries(companyCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((obj, [company, count]) => ({ ...obj, [company]: count }), {}),
      tableName: tableName
    };
  } catch (error) {
    console.error('Error fetching expert stats:', error);
    throw new Error(`Failed to fetch expert statistics: ${error.message}`);
  }
};

/**
 * Transform expert data to match the expected format for ViewDatabase
 * @param {Object} expert - Expert object from database
 * @returns {Object} - Transformed expert object
 */
export const transformExpertForDisplay = (expert) => {
  if (!expert) return null;

  // Handle different field names between expert_profiles and expert_profiles_vector
  // Ensure all fields are strings, not objects
  const name = typeof expert.name === 'string' ? expert.name : (expert.name?.name || 'Unknown');
  const company = typeof expert.current_company === 'string' ? expert.current_company : 
                  typeof expert.ld_company === 'string' ? expert.ld_company :
                  (expert.current_company?.name || expert.ld_company?.name || expert.company?.name || expert.company || 'Unknown Company');
  const title = typeof expert.position === 'string' ? expert.position : 
                typeof expert.ld_position === 'string' ? expert.ld_position :
                (expert.position?.title || expert.ld_position?.title || expert.title || 'Unknown Title');
  
  // Handle industry field more carefully
  let industry = 'Unknown';
  if (expert.industry) {
    if (typeof expert.industry === 'string') {
      industry = expert.industry;
    } else if (Array.isArray(expert.industry)) {
      // Filter out any non-string items and join
      const validIndustries = expert.industry
        .map(ind => typeof ind === 'string' ? ind : (ind?.name || ind?.title || ''))
        .filter(ind => ind && ind.trim());
      industry = validIndustries.length > 0 ? validIndustries.join(', ') : 'Unknown';
    } else if (typeof expert.industry === 'object' && expert.industry !== null) {
      industry = expert.industry.name || expert.industry.title || 'Unknown';
    }
  }
  
  const location = typeof expert.location === 'string' ? expert.location : 
                   (expert.location?.name || expert.location || null);

  // Process industries for the industries array
  let industries = [];
  let industryText = industry; // Use the cleaned industry value
  
  if (industry && industry !== 'Unknown') {
    if (industry.includes(', ')) {
      // Split comma-separated industries
      industries = industry.split(', ').map(ind => ind.trim()).filter(ind => ind);
    } else {
      industries = [industry];
    }
  }

  return {
    id: expert.id,
    name: name,
    company: company,
    title: title,
    industry: industryText,
    industries: industries,
    linkedin: expert.linkedin || null,
    email: expert.email || null,
    phone: expert.phone || null,
    location: location,
    type: 'Expert Profile',
    lead: expert.innovera_contact || expert.lead || 'Unknown',
    expertise: industries,
    function: inferFunctionFromTitle(title),
    notes: `Expert Score: ${expert.expert_score || 'N/A'}${expert.scoring_rationale ? ` - ${expert.scoring_rationale}` : ''}`,
    lastContact: expert.created_at ? new Date(expert.created_at).toISOString().split('T')[0] : null,
    availability: 'Unknown',
    yearsExperience: null,
    certifications: [],
    bio: `${title} at ${company}. ${expert.scoring_rationale || 'Professional expert in our network.'}`,
    rating: expert.expert_score || null,
    reviewCount: 0,
    photo: generateAvatarUrl(name),
    created_at: expert.created_at,
    updated_at: expert.updated_at,
    // Expert-specific fields
    followers: expert.followers || 0,
    connections: expert.connections || 0,
    posts_count: expert.posts_count || 0,
    activity_count: expert.activity_count || 0,
    expert_score: expert.expert_score || null,
    scoring_rationale: expert.scoring_rationale || null
  };
};

/**
 * Generate avatar URL
 */
const generateAvatarUrl = (name) => {
  if (!name) return null;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366F1&color=fff&size=200`;
};
