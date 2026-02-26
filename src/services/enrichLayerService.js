const ENRICHLAYER_API_KEY = import.meta.env.VITE_ENRICHLAYER_API_KEY;

/**
 * EnrichLayer (formerly ProxyCurl) integration.
 * Uses Vite dev proxy: /api/enrichlayer → https://enrichlayer.com
 */

/**
 * Enrich a single LinkedIn profile via EnrichLayer.
 * @param {string} linkedinUrl - Full LinkedIn profile URL
 * @returns {Promise<Object>} - Enriched profile data mapped to our schema
 */
export async function enrichProfile(linkedinUrl) {
  if (!ENRICHLAYER_API_KEY) {
    throw new Error('EnrichLayer API key not configured. Set VITE_ENRICHLAYER_API_KEY in .env');
  }

  const params = new URLSearchParams({
    profile_url: linkedinUrl,
    use_cache: 'if-present',
    fallback_to_cache: 'on-error',
    skills: 'include',
  });

  const response = await fetch(`/api/enrichlayer/api/v2/profile?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ENRICHLAYER_API_KEY}`,
    },
  });

  if (response.status === 429) {
    throw new Error('RATE_LIMITED');
  }

  if (response.status === 404) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`EnrichLayer API error ${response.status}: ${body}`);
  }

  const raw = await response.json();
  return mapEnrichLayerResponse(raw);
}

/**
 * Map EnrichLayer API response to our contacts table schema.
 */
function mapEnrichLayerResponse(raw) {
  const currentExp = raw.experiences?.[0];

  return {
    linkedin_id: raw.public_identifier || null,
    first_name: raw.first_name || null,
    last_name: raw.last_name || null,
    headline: raw.headline || raw.occupation || null,
    summary: raw.summary || null,
    location: [raw.city, raw.state, raw.country_full_name].filter(Boolean).join(', ') || null,
    country: raw.country || null,
    country_full: raw.country_full_name || null,
    city: raw.city || null,
    state: raw.state || null,
    profile_pic_url: raw.profile_pic_url || null,

    experiences: (raw.experiences || []).map(exp => ({
      title: exp.title || null,
      company: exp.company || null,
      location: exp.location || null,
      starts_at: exp.starts_at || null,
      ends_at: exp.ends_at || null,
      description: exp.description || null,
      logo_url: exp.logo_url || null,
    })),

    education: (raw.education || []).map(edu => ({
      school: edu.school || null,
      degree: edu.degree_name || null,
      field_of_study: edu.field_of_study || null,
      starts_at: edu.starts_at || null,
      ends_at: edu.ends_at || null,
      description: edu.description || null,
      activities: edu.activities_and_societies || null,
      logo_url: edu.logo_url || null,
    })),

    certifications: (raw.certifications || []).map(c => ({
      name: c.name || null,
      authority: c.authority || null,
      starts_at: c.starts_at || null,
      ends_at: c.ends_at || null,
      url: c.url || null,
    })),

    skills: (raw.skills || []).map(s => (typeof s === 'string' ? s : s.name || s)),

    languages: (raw.languages || []).map(l => (typeof l === 'string' ? l : l.name || l)),

    volunteer_work: (raw.volunteer_work || []).map(v => ({
      title: v.title || null,
      company: v.company || null,
      cause: v.cause || null,
      starts_at: v.starts_at || null,
      ends_at: v.ends_at || null,
      description: v.description || null,
    })),

    publications: raw.accomplishment_publications || [],
    patents: raw.accomplishment_patents || [],
    honors_awards: raw.accomplishment_honors_awards || [],
    organizations: raw.accomplishment_organisations || [],
    projects: raw.accomplishment_projects || [],
    articles: raw.articles || [],

    follower_count: raw.follower_count || 0,
    connection_count: raw.connections || 0,

    current_company: currentExp?.company || null,
    current_position: currentExp?.title || null,

    industry: extractIndustries(raw),
  };
}

/**
 * Extract industry tags from profile data.
 * EnrichLayer doesn't return a clean "industry" field, so we derive it
 * from headline, experiences, and the industry field if present.
 */
function extractIndustries(raw) {
  const industries = new Set();

  if (raw.industry) {
    industries.add(raw.industry);
  }

  if (raw.industries) {
    (Array.isArray(raw.industries) ? raw.industries : [raw.industries])
      .forEach(i => industries.add(i));
  }

  return [...industries];
}

/**
 * Check remaining EnrichLayer credit balance.
 */
export async function getBalance() {
  if (!ENRICHLAYER_API_KEY) {
    return { success: false, credits: null, error: 'API key not configured' };
  }

  try {
    const response = await fetch('/api/enrichlayer/api/v2/credit-balance', {
      headers: { 'Authorization': `Bearer ${ENRICHLAYER_API_KEY}` },
    });

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    const data = await response.json();
    return { success: true, credits: data.credit_balance ?? data.credits ?? null };
  } catch (error) {
    return { success: false, credits: null, error: error.message };
  }
}

/**
 * Enrich a batch of contacts sequentially with rate-limit handling.
 * @param {Array} contacts - Array of { id, linkedin_url }
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{ enriched: number, errors: Array }>}
 */
export async function enrichBatch(contacts, onProgress) {
  let enriched = 0;
  const errors = [];
  const total = contacts.length;

  for (let i = 0; i < total; i++) {
    const contact = contacts[i];

    if (onProgress) {
      onProgress({ current: i + 1, total, enriched, errors: errors.length, name: contact.name });
    }

    try {
      const data = await enrichProfile(contact.linkedin_url);
      enriched++;

      // Return the enriched data with the contact id so the caller can update the DB
      if (onProgress) {
        onProgress({
          current: i + 1,
          total,
          enriched,
          errors: errors.length,
          name: contact.name,
          result: { id: contact.id, data },
        });
      }
    } catch (error) {
      if (error.message === 'RATE_LIMITED') {
        // Wait 10 seconds and retry once
        await delay(10000);
        try {
          const data = await enrichProfile(contact.linkedin_url);
          enriched++;
          if (onProgress) {
            onProgress({
              current: i + 1, total, enriched, errors: errors.length, name: contact.name,
              result: { id: contact.id, data },
            });
          }
        } catch (retryError) {
          errors.push({ id: contact.id, name: contact.name, error: retryError.message });
        }
      } else {
        errors.push({ id: contact.id, name: contact.name, error: error.message });
      }
    }

    // 200ms between requests (stays well within 300 req/min)
    if (i < total - 1) {
      await delay(200);
    }
  }

  return { enriched, errors };
}

/**
 * Test the EnrichLayer API connection.
 */
export async function testConnection() {
  if (!ENRICHLAYER_API_KEY) {
    return { success: false, message: 'VITE_ENRICHLAYER_API_KEY not set in .env' };
  }

  const balance = await getBalance();
  if (balance.success) {
    return { success: true, message: `Connected. ${balance.credits} credits remaining.` };
  }
  return { success: false, message: `Connection failed: ${balance.error}` };
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
