import { supabase } from './supabaseClient.js';

// ============================================================
// CRUD Operations
// ============================================================

/**
 * Get all contacts with pagination and optional status filter.
 */
export async function getAllContacts({ limit = 50, offset = 0, status = null } = {}) {
  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}

/**
 * Get a single contact by ID.
 */
export async function getContactById(id) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a contact (partial update).
 */
export async function updateContact(id, updates) {
  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a contact.
 */
export async function deleteContact(id) {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

/**
 * Bulk insert contacts (for Excel upload). Skips duplicates by linkedin_url.
 * @returns {{ inserted: number, skipped: number, errors: Array }}
 */
export async function bulkInsert(contacts) {
  let inserted = 0;
  let skipped = 0;
  const errors = [];
  const batchSize = 100;

  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('contacts')
      .upsert(batch, { onConflict: 'linkedin_url', ignoreDuplicates: true })
      .select('id');

    if (error) {
      errors.push({ batch: Math.floor(i / batchSize), error: error.message });
    } else {
      inserted += data?.length || 0;
      skipped += batch.length - (data?.length || 0);
    }
  }

  return { inserted, skipped, errors };
}

// ============================================================
// Search
// ============================================================

/**
 * Semantic vector search via the search_contacts_semantic RPC.
 */
export async function searchSemantic(queryEmbedding, options = {}) {
  const {
    matchThreshold = 0.3,
    maxResults = 20,
    minExpertScore = 0,
  } = options;

  const { data, error } = await supabase.rpc('search_contacts_semantic', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: maxResults,
    min_expert_score: minExpertScore,
  });

  if (error) throw error;
  return data || [];
}

/**
 * Text-based search fallback (ilike on key fields).
 */
export async function searchText(query, { limit = 50 } = {}) {
  const pattern = `%${query}%`;

  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .or(`name.ilike.${pattern},company.ilike.${pattern},title.ilike.${pattern},headline.ilike.${pattern},current_company.ilike.${pattern},current_position.ilike.${pattern},innovera_contact.ilike.${pattern}`)
    .eq('status', 'ready')
    .order('expert_score', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

// ============================================================
// Stats & Analytics
// ============================================================

/**
 * Get overall contact analytics (from the view).
 */
export async function getAnalytics() {
  const { data, error } = await supabase
    .from('contact_analytics')
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get pipeline status breakdown.
 */
export async function getPipelineStatus() {
  const { data, error } = await supabase.rpc('get_pipeline_status');
  if (error) throw error;
  return data || [];
}

/**
 * Get industry analytics.
 */
export async function getIndustryAnalytics() {
  const { data, error } = await supabase.rpc('get_industry_analytics');
  if (error) throw error;
  return data || [];
}

// ============================================================
// Pipeline helpers
// ============================================================

/**
 * Get contacts at a specific pipeline status.
 */
export async function getContactsByStatus(status, { limit = 1000 } = {}) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Batch update contact status.
 */
export async function updateContactStatus(id, status, extra = {}) {
  return updateContact(id, { status, ...extra });
}

/**
 * Clear all contacts (with confirmation — used in Settings).
 */
export async function clearAllContacts() {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .neq('id', 0);

  if (error) throw error;
}
