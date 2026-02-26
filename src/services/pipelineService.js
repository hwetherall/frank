import { parseExcelFile } from './excelParser.js';
import * as contacts from './contactsService.js';
import { supabase } from './supabaseClient.js';
import { enrichBatch } from './enrichLayerService.js';
import { scoreExpertProfile } from './groqExpertScorer.js';
import { generateEmbeddings } from './openaiEmbeddings.js';

// ============================================================
// Step 1: Upload & Clean Excel
// ============================================================

/**
 * Parse an Excel file, clean the data, and insert into the contacts table.
 * @param {File} file - The uploaded Excel file
 * @param {string} innoveraContact - Who at Innovera uploaded this
 * @param {Function} onProgress - Progress callback
 * @returns {{ inserted: number, skipped: number, errors: Array }}
 */
export async function ingestExcel(file, innoveraContact, onProgress) {
  onProgress?.({ step: 'upload', message: 'Parsing Excel file...', pct: 0 });

  const parsed = await parseExcelFile(file);
  const firstSheet = Object.keys(parsed)[0];
  if (!firstSheet) throw new Error('Excel file has no sheets');

  const rows = parsed[firstSheet].data;
  if (!rows.length) throw new Error('Excel sheet is empty');

  onProgress?.({ step: 'upload', message: `Found ${rows.length} rows. Cleaning...`, pct: 20 });

  // Map rows to our contacts schema
  const cleaned = [];
  const seen = new Set();

  for (const row of rows) {
    const linkedinUrl = extractLinkedInUrl(row);
    if (!linkedinUrl) continue; // Skip rows without a LinkedIn URL

    // Dedup within the batch
    const normalizedUrl = normalizeLinkedInUrl(linkedinUrl);
    if (seen.has(normalizedUrl)) continue;
    seen.add(normalizedUrl);

    cleaned.push({
      linkedin_url: normalizedUrl,
      name: row.Name || row.name || row['Full Name'] || row['full_name'] || 'Unknown',
      email: row.Email || row.email || row['Email Address'] || null,
      phone: row.Phone || row.phone || row['Phone Number'] || null,
      company: row.Company || row.company || row['Company Name'] || null,
      title: row.Title || row.title || row.Position || row.position || null,
      innovera_contact: innoveraContact || row['Innovera Contact'] || row.innovera_contact || row.Contact || row.Lead || null,
      status: 'uploaded',
      source_file: file.name,
    });
  }

  onProgress?.({ step: 'upload', message: `${cleaned.length} valid contacts (${rows.length - cleaned.length} skipped). Uploading...`, pct: 50 });

  const result = await contacts.bulkInsert(cleaned);

  onProgress?.({ step: 'upload', message: `Done. ${result.inserted} inserted, ${result.skipped} duplicates.`, pct: 100 });

  return result;
}

// ============================================================
// Step 2: Enrich with EnrichLayer
// ============================================================

/**
 * Enrich all contacts with status 'uploaded' via EnrichLayer.
 */
export async function enrichContacts(onProgress) {
  const toEnrich = await contacts.getContactsByStatus('uploaded');
  if (!toEnrich.length) {
    onProgress?.({ step: 'enrich', message: 'No contacts to enrich.', pct: 100 });
    return { enriched: 0, errors: [] };
  }

  onProgress?.({ step: 'enrich', message: `Enriching ${toEnrich.length} contacts...`, pct: 0 });

  let enriched = 0;
  const errors = [];

  const result = await enrichBatch(toEnrich, async (progress) => {
    const pct = Math.round((progress.current / progress.total) * 100);
    onProgress?.({
      step: 'enrich',
      message: `Enriching ${progress.name} (${progress.current}/${progress.total})`,
      pct,
      enriched: progress.enriched,
      errors: progress.errors,
    });

    // If we got a result, update the DB immediately
    if (progress.result) {
      try {
        await contacts.updateContact(progress.result.id, {
          ...progress.result.data,
          status: 'enriched',
          enriched_at: new Date().toISOString(),
          status_error: null,
          status_step: null,
        });
      } catch (err) {
        console.error(`Failed to save enrichment for ${progress.result.id}:`, err);
      }
    }
  });

  // Mark failures
  for (const err of result.errors) {
    try {
      await contacts.updateContact(err.id, {
        status: 'error',
        status_error: err.error,
        status_step: 'enrichment',
      });
    } catch (e) {
      console.error(`Failed to mark error for ${err.id}:`, e);
    }
  }

  onProgress?.({ step: 'enrich', message: `Done. ${result.enriched} enriched, ${result.errors.length} errors.`, pct: 100 });

  return result;
}

// ============================================================
// Step 3: Score with Groq
// ============================================================

/**
 * Score all contacts with status 'enriched' using Groq AI.
 */
export async function scoreContacts(onProgress) {
  const toScore = await contacts.getContactsByStatus('enriched');
  if (!toScore.length) {
    onProgress?.({ step: 'score', message: 'No contacts to score.', pct: 100 });
    return { scored: 0, errors: [] };
  }

  onProgress?.({ step: 'score', message: `Scoring ${toScore.length} contacts...`, pct: 0 });

  let scored = 0;
  const errors = [];
  const batchSize = 3;

  for (let i = 0; i < toScore.length; i += batchSize) {
    const batch = toScore.slice(i, i + batchSize);

    // Score batch in parallel
    const batchPromises = batch.map(async (contact, idx) => {
      await delay(idx * 200); // Stagger within batch

      // Map contact fields to what the scorer expects
      const profile = mapContactToScorerProfile(contact);

      try {
        await contacts.updateContact(contact.id, { status: 'scoring' });
        const result = await scoreExpertProfile(profile);

        if (result.success) {
          await contacts.updateContact(contact.id, {
            expert_score: result.score,
            scoring_rationale: result.rationale,
            scored_at: result.scored_at,
            status: 'scored',
            status_error: null,
            status_step: null,
          });
          scored++;
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        errors.push({ id: contact.id, name: contact.name, error: err.message });
        await contacts.updateContact(contact.id, {
          status: 'error',
          status_error: err.message,
          status_step: 'scoring',
        }).catch(() => {});
      }
    });

    await Promise.all(batchPromises);

    const pct = Math.round(((i + batch.length) / toScore.length) * 100);
    onProgress?.({
      step: 'score',
      message: `Scored ${scored} of ${toScore.length}...`,
      pct,
      scored,
      errors: errors.length,
    });

    // Delay between batches
    if (i + batchSize < toScore.length) {
      await delay(1000);
    }
  }

  onProgress?.({ step: 'score', message: `Done. ${scored} scored, ${errors.length} errors.`, pct: 100 });
  return { scored, errors };
}

// ============================================================
// Step 4: Embed with OpenAI
// ============================================================

/**
 * Generate embeddings for all contacts with status 'scored'.
 */
export async function embedContacts(onProgress) {
  const toEmbed = await contacts.getContactsByStatus('scored');
  if (!toEmbed.length) {
    onProgress?.({ step: 'embed', message: 'No contacts to embed.', pct: 100 });
    return { embedded: 0, errors: [] };
  }

  onProgress?.({ step: 'embed', message: `Generating embeddings for ${toEmbed.length} contacts...`, pct: 0 });

  let embedded = 0;
  const errors = [];
  const batchSize = 50; // OpenAI can handle large batches

  for (let i = 0; i < toEmbed.length; i += batchSize) {
    const batch = toEmbed.slice(i, i + batchSize);

    try {
      // Build searchable text for each contact
      const texts = batch.map(c => buildSearchableText(c));

      // Generate embeddings for the whole batch
      const embeddings = await generateEmbeddings(texts);

      // Update each contact with its embedding
      for (let j = 0; j < batch.length; j++) {
        try {
          await contacts.updateContact(batch[j].id, {
            searchable_text: texts[j],
            embedding: embeddings[j],
            embedded_at: new Date().toISOString(),
            status: 'ready',
            status_error: null,
            status_step: null,
          });
          embedded++;
        } catch (err) {
          errors.push({ id: batch[j].id, name: batch[j].name, error: err.message });
          await contacts.updateContact(batch[j].id, {
            status: 'error',
            status_error: err.message,
            status_step: 'embedding',
          }).catch(() => {});
        }
      }
    } catch (err) {
      // Entire batch failed — mark all as errors
      for (const c of batch) {
        errors.push({ id: c.id, name: c.name, error: err.message });
        await contacts.updateContact(c.id, {
          status: 'error',
          status_error: err.message,
          status_step: 'embedding',
        }).catch(() => {});
      }
    }

    const pct = Math.round(((i + batch.length) / toEmbed.length) * 100);
    onProgress?.({
      step: 'embed',
      message: `Embedded ${embedded} of ${toEmbed.length}...`,
      pct,
      embedded,
      errors: errors.length,
    });
  }

  onProgress?.({ step: 'embed', message: `Done. ${embedded} embedded, ${errors.length} errors.`, pct: 100 });
  return { embedded, errors };
}

// ============================================================
// Full Pipeline
// ============================================================

/**
 * Run the full pipeline: upload → enrich → score → embed.
 */
export async function runFullPipeline(file, innoveraContact, onProgress) {
  const uploadResult = await ingestExcel(file, innoveraContact, onProgress);
  const enrichResult = await enrichContacts(onProgress);
  const scoreResult = await scoreContacts(onProgress);
  const embedResult = await embedContacts(onProgress);

  return { uploadResult, enrichResult, scoreResult, embedResult };
}

/**
 * Retry all contacts that errored at a specific step.
 */
export async function retryErrors(step, onProgress) {
  // Fetch errored contacts for this step
  const { data: errored, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('status', 'error')
    .eq('status_step', step)
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!errored?.length) {
    onProgress?.({ step, message: 'No errors to retry.', pct: 100 });
    return;
  }

  // Reset their status to the pre-step status
  const preStatus = { enrichment: 'uploaded', scoring: 'enriched', embedding: 'scored' }[step];
  for (const c of errored) {
    await contacts.updateContact(c.id, { status: preStatus, status_error: null, status_step: null });
  }

  // Re-run the step
  if (step === 'enrichment') return enrichContacts(onProgress);
  if (step === 'scoring') return scoreContacts(onProgress);
  if (step === 'embedding') return embedContacts(onProgress);
}

// ============================================================
// Helpers
// ============================================================

/**
 * Build a rich searchable text string for embedding.
 */
function buildSearchableText(contact) {
  const parts = [];

  if (contact.name) parts.push(`Name: ${contact.name}`);
  if (contact.headline) parts.push(`Headline: ${contact.headline}`);
  if (contact.current_position) parts.push(`Position: ${contact.current_position}`);
  else if (contact.title) parts.push(`Position: ${contact.title}`);
  if (contact.current_company) parts.push(`Company: ${contact.current_company}`);
  else if (contact.company) parts.push(`Company: ${contact.company}`);
  if (contact.location) parts.push(`Location: ${contact.location}`);

  // Summary (truncated)
  if (contact.summary) {
    parts.push(`About: ${contact.summary.slice(0, 500)}`);
  }

  // Industries
  if (contact.industry && Array.isArray(contact.industry) && contact.industry.length) {
    parts.push(`Industries: ${contact.industry.join(', ')}`);
  }

  // Skills
  if (contact.skills && Array.isArray(contact.skills) && contact.skills.length) {
    parts.push(`Skills: ${contact.skills.slice(0, 20).join(', ')}`);
  }

  // Experience (top 3)
  if (contact.experiences && Array.isArray(contact.experiences)) {
    const expText = contact.experiences.slice(0, 3).map(exp =>
      `${exp.title || ''} at ${exp.company || ''}`.trim()
    ).filter(Boolean).join('; ');
    if (expText) parts.push(`Experience: ${expText}`);
  }

  // Education (top 2)
  if (contact.education && Array.isArray(contact.education)) {
    const eduText = contact.education.slice(0, 2).map(edu =>
      `${edu.degree || ''} ${edu.field_of_study || ''} at ${edu.school || ''}`.trim()
    ).filter(Boolean).join('; ');
    if (eduText) parts.push(`Education: ${eduText}`);
  }

  // Certifications
  if (contact.certifications && Array.isArray(contact.certifications) && contact.certifications.length) {
    const certText = contact.certifications.slice(0, 5).map(c => c.name || c).join(', ');
    if (certText) parts.push(`Certifications: ${certText}`);
  }

  // Languages
  if (contact.languages && Array.isArray(contact.languages) && contact.languages.length) {
    parts.push(`Languages: ${contact.languages.join(', ')}`);
  }

  // Network metrics
  const metrics = [];
  if (contact.follower_count) metrics.push(`${contact.follower_count} followers`);
  if (contact.connection_count) metrics.push(`${contact.connection_count} connections`);
  if (metrics.length) parts.push(`Network: ${metrics.join(', ')}`);

  // Expert score
  if (contact.expert_score) {
    parts.push(`Expert Score: ${contact.expert_score}/5`);
  }

  return `Professional profile: ${parts.join('. ')}`;
}

/**
 * Map a contact record to the shape the groqExpertScorer expects.
 */
function mapContactToScorerProfile(contact) {
  return {
    name: contact.name,
    position: contact.current_position || contact.title,
    ld_position: contact.headline,
    ld_company: contact.current_company || contact.company,
    current_company: contact.current_company,
    industry: contact.industry || [],
    location: contact.location,
    about: contact.summary || '',
    experience: (contact.experiences || []).map(exp => ({
      title: exp.title,
      company: exp.company,
      start_date: exp.starts_at ? `${exp.starts_at.year || ''}` : null,
      end_date: exp.ends_at ? `${exp.ends_at.year || ''}` : 'Present',
      duration: null,
    })),
    educations_details: (contact.education || []).map(edu => ({
      title: edu.school,
      school: edu.school,
      degree: edu.degree,
      field: edu.field_of_study,
    })),
    certifications: (contact.certifications || []).map(c => ({
      title: c.name || c,
      name: c.name || c,
    })),
    volunteer_experience: contact.volunteer_work || [],
    followers: contact.follower_count || 0,
    connections: contact.connection_count || 0,
    posts_count: 0,
    activity_count: 0,
    recommendations_count: 0,
    publications: contact.publications || [],
    patents: contact.patents || [],
    honors_and_awards: contact.honors_awards || [],
  };
}

/**
 * Extract a LinkedIn URL from a row, checking common column name patterns.
 */
function extractLinkedInUrl(row) {
  const candidates = [
    row.LinkedIn, row.linkedin, row['LinkedIn URL'], row['linkedin_url'],
    row['LinkedIn Profile'], row['linkedin_profile'], row.Linkedin,
    row['LinkedIn_URL_Cleaned'], row.linkedin_url_cleaned,
    row.URL, row.url, row.Link, row.link,
  ];

  for (const val of candidates) {
    if (val && typeof val === 'string' && val.includes('linkedin.com')) {
      return val.trim();
    }
  }
  return null;
}

/**
 * Normalize a LinkedIn URL to a canonical form.
 */
function normalizeLinkedInUrl(url) {
  try {
    const u = new URL(url);
    let path = u.pathname.replace(/\/+$/, ''); // remove trailing slashes
    // Ensure it starts with /in/
    if (!path.startsWith('/in/')) {
      // Try to extract the /in/username part
      const match = path.match(/\/in\/([^/]+)/);
      if (match) {
        path = `/in/${match[1]}`;
      }
    }
    return `https://www.linkedin.com${path}`;
  } catch {
    return url.trim().replace(/\/+$/, '');
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
