/**
 * Expert Data Processing Service
 * Handles extraction and processing of relevant columns from full LinkedIn data CSV
 * Calculates activity counts and prepares data for expert scoring
 */

/**
 * Extract relevant columns from full LinkedIn CSV data
 * @param {Object} rawData - Raw row data from CSV
 * @returns {Object} - Processed expert profile data
 */
export function extractExpertProfileData(rawData) {
  try {
    // Helper function to safely parse JSON strings
    const safeJSONParse = (jsonString) => {
      if (!jsonString || jsonString === '' || jsonString === 'null') return null;
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        // If it's not valid JSON, return as string or null
        return typeof jsonString === 'string' && jsonString.trim() !== '' ? jsonString : null;
      }
    };

    // Helper function to count array items
    const countArrayItems = (data) => {
      if (!data) return 0;
      if (Array.isArray(data)) return data.length;
      if (typeof data === 'string') {
        const parsed = safeJSONParse(data);
        return Array.isArray(parsed) ? parsed.length : 0;
      }
      return 0;
    };

    // Extract core identity information
    const name = rawData.name || '';
    const position = rawData.position || '';
    const location = rawData.location || rawData.city || '';
    const avatar = rawData.avatar || '';
    const about = rawData.about || '';

    // Extract missing scraped data from CSV columns 2, 3, 4
    // Note: CSV now uses underscores (ld_company, ld_position)
    const ld_company = rawData.ld_company || rawData.current_company_name || '';
    const ld_position = rawData.ld_position || rawData.position || '';
    
    // Process industry array - expecting format like ["AI","Technology"]
    let industry = null;
    if (rawData.industry) {
      industry = safeJSONParse(rawData.industry);
      // Ensure it's an array
      if (industry && !Array.isArray(industry)) {
        industry = [industry];
      }
    }

    // Process current company information
    let current_company = null;
    if (rawData.current_company) {
      current_company = safeJSONParse(rawData.current_company);
    } else if (rawData.current_company_name) {
      current_company = {
        name: rawData.current_company_name,
        company_id: rawData.current_company_company_id || null
      };
    }

    // Process experience data
    const experience = safeJSONParse(rawData.experience);

    // Process education data
    const educations_details = safeJSONParse(rawData.educations_details);

    // Process certifications
    const certifications = safeJSONParse(rawData.certifications);

    // Process thought leadership indicators
    const publications = safeJSONParse(rawData.publications);
    const patents = safeJSONParse(rawData.patents);
    const honors_and_awards = safeJSONParse(rawData.honors_and_awards);
    const recommendations = safeJSONParse(rawData.recommendations);

    // Process social proof metrics
    const followers = parseInt(rawData.followers) || 0;
    const connections = parseInt(rawData.connections) || 0;
    const recommendations_count = parseInt(rawData.recommendations_count) || 0;

    // Calculate activity counts
    const posts_count = countArrayItems(rawData.posts);
    const activity_count = countArrayItems(rawData.activity);

    // Process additional context
    const volunteer_experience = safeJSONParse(rawData.volunteer_experience);
    const organizations = safeJSONParse(rawData.organizations);
    const projects = safeJSONParse(rawData.projects);
    const languages = safeJSONParse(rawData.languages);

    // Create the processed profile object
    const processedProfile = {
      // Core Identity
      name,
      position,
      current_company,
      location,
      avatar,
      
      // Missing scraped data
      ld_company,
      ld_position,
      industry,
      
      // Experience & Background
      experience,
      educations_details,
      certifications,
      
      // Thought Leadership
      publications,
      patents,
      honors_and_awards,
      recommendations,
      
      // Professional Network
      followers,
      connections,
      recommendations_count,
      
      // LinkedIn Activity Metrics
      posts_count,
      activity_count,
      
      // Additional Context
      about,
      volunteer_experience,
      organizations,
      projects,
      languages,
      
      // Metadata for tracking
      original_linkedin_id: rawData.linkedin_id || rawData.id || null,
      source_file: null // Will be set when uploading
    };

    return processedProfile;

  } catch (error) {
    console.error('Error extracting expert profile data:', error);
    throw new Error(`Failed to process profile data: ${error.message}`);
  }
}

/**
 * Process multiple CSV rows into expert profile format
 * @param {Array} csvData - Array of raw CSV row objects
 * @param {string} sourceFileName - Name of the source file for tracking
 * @returns {Array} - Array of processed expert profiles
 */
export function processCSVToExpertProfiles(csvData, sourceFileName = null) {
  const processedProfiles = [];
  const errors = [];

  csvData.forEach((row, index) => {
    try {
      const profile = extractExpertProfileData(row);
      profile.source_file = sourceFileName;
      processedProfiles.push(profile);
    } catch (error) {
      errors.push({
        row: index + 1,
        error: error.message,
        data: row
      });
    }
  });

  return {
    profiles: processedProfiles,
    errors,
    totalProcessed: processedProfiles.length,
    totalErrors: errors.length
  };
}

/**
 * Validate expert profile data before saving to database
 * @param {Object} profile - Expert profile to validate
 * @returns {Object} - Validation result
 */
export function validateExpertProfile(profile) {
  const errors = [];
  const warnings = [];

  // Required fields validation
  if (!profile.name || profile.name.trim() === '') {
    errors.push('Name is required');
  }

  // Data quality checks
  if (!profile.position || profile.position.trim() === '') {
    warnings.push('Position/title is missing');
  }

  if (!profile.current_company && !profile.experience) {
    warnings.push('No current company or experience data available');
  }

  if (profile.followers < 0 || profile.connections < 0) {
    errors.push('Followers and connections cannot be negative');
  }

  if (profile.posts_count < 0 || profile.activity_count < 0) {
    errors.push('Activity counts cannot be negative');
  }

  // Check for reasonable data ranges
  if (profile.followers > 10000000) { // 10M followers seems excessive
    warnings.push('Follower count seems unusually high');
  }

  if (profile.connections > 100000) { // 100K connections is LinkedIn max
    warnings.push('Connection count exceeds LinkedIn limits');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate summary statistics for a batch of expert profiles
 * @param {Array} profiles - Array of expert profiles
 * @returns {Object} - Summary statistics
 */
export function calculateProfileStatistics(profiles) {
  if (!profiles || profiles.length === 0) {
    return {
      total: 0,
      withPosition: 0,
      withCompany: 0,
      withExperience: 0,
      withEducation: 0,
      withPublications: 0,
      withPatents: 0,
      withAwards: 0,
      averageFollowers: 0,
      averageConnections: 0,
      averagePostsCount: 0,
      averageActivityCount: 0
    };
  }

  const stats = {
    total: profiles.length,
    // Count as "With Position" if they have EITHER position OR ld_position
    withPosition: profiles.filter(p => 
      (p.position && p.position.trim()) || 
      (p.ld_position && p.ld_position.trim())
    ).length,
    // Count as "With Company" if they have EITHER current_company OR ld_company
    withCompany: profiles.filter(p => 
      p.current_company || 
      (p.ld_company && p.ld_company.trim())
    ).length,
    withExperience: profiles.filter(p => p.experience && Array.isArray(p.experience) && p.experience.length > 0).length,
    withEducation: profiles.filter(p => p.educations_details && Array.isArray(p.educations_details) && p.educations_details.length > 0).length,
    withPublications: profiles.filter(p => p.publications && Array.isArray(p.publications) && p.publications.length > 0).length,
    withPatents: profiles.filter(p => p.patents && Array.isArray(p.patents) && p.patents.length > 0).length,
    withAwards: profiles.filter(p => p.honors_and_awards && Array.isArray(p.honors_and_awards) && p.honors_and_awards.length > 0).length,
    averageFollowers: Math.round(profiles.reduce((sum, p) => sum + (p.followers || 0), 0) / profiles.length),
    averageConnections: Math.round(profiles.reduce((sum, p) => sum + (p.connections || 0), 0) / profiles.length),
    averagePostsCount: Math.round(profiles.reduce((sum, p) => sum + (p.posts_count || 0), 0) / profiles.length),
    averageActivityCount: Math.round(profiles.reduce((sum, p) => sum + (p.activity_count || 0), 0) / profiles.length)
  };

  return stats;
}

/**
 * Filter profiles based on minimum criteria for expert scoring
 * @param {Array} profiles - Array of expert profiles
 * @param {Object} criteria - Filtering criteria
 * @returns {Array} - Filtered profiles suitable for expert scoring
 */
export function filterProfilesForScoring(profiles, criteria = {}) {
  const defaultCriteria = {
    minConnections: 10, // Reduced minimum professional network (was 50)
    requirePosition: false, // Allow profiles without position (was true)
    requireExperienceOrCompany: false, // Allow profiles without experience/company (was true)
    ...criteria
  };

  return profiles.filter(profile => {
    // Check minimum connections
    if (profile.connections < defaultCriteria.minConnections) {
      return false;
    }

    // Check position requirement
    if (defaultCriteria.requirePosition && (!profile.position || profile.position.trim() === '')) {
      return false;
    }

    // Check experience or company requirement
    if (defaultCriteria.requireExperienceOrCompany) {
      const hasExperience = profile.experience && Array.isArray(profile.experience) && profile.experience.length > 0;
      const hasCompany = profile.current_company && profile.current_company.name;
      if (!hasExperience && !hasCompany) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Prepare profile data for expert scoring by cleaning and formatting
 * @param {Object} profile - Expert profile to prepare
 * @returns {Object} - Cleaned and formatted profile for scoring
 */
export function prepareProfileForScoring(profile) {
  const cleanedProfile = { ...profile };

  // Clean text fields
  if (cleanedProfile.about) {
    cleanedProfile.about = cleanedProfile.about.replace(/\s+/g, ' ').trim();
  }

  if (cleanedProfile.position) {
    cleanedProfile.position = cleanedProfile.position.replace(/\s+/g, ' ').trim();
  }

  // Ensure numeric fields are properly typed
  cleanedProfile.followers = parseInt(cleanedProfile.followers) || 0;
  cleanedProfile.connections = parseInt(cleanedProfile.connections) || 0;
  cleanedProfile.recommendations_count = parseInt(cleanedProfile.recommendations_count) || 0;
  cleanedProfile.posts_count = parseInt(cleanedProfile.posts_count) || 0;
  cleanedProfile.activity_count = parseInt(cleanedProfile.activity_count) || 0;

  return cleanedProfile;
}
