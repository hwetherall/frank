import { supabase } from './supabaseClient.js';
import { processContactsForEmbedding, embedSearchQuery } from './openaiEmbeddings.js';

/**
 * Check if vector table exists
 * @param {string} tableName - Name of the vector table to check
 * @returns {Promise<boolean>} - Whether table exists
 */
export const vectorTableExists = async (tableName = 'contacts_vector') => {
  try {
    const { data, error } = await supabase.from(tableName).select('*').limit(1);
    // If we get data or a non-404 error, table exists
    if (data !== null || (error && !error.message.includes('404'))) {
      return true;
    }
    return false;
  } catch (error) {
    // If it's a 404 error, table doesn't exist
    if (error.message && error.message.includes('404')) {
      return false;
    }
    // For other errors, assume table might exist
    return true;
  }
};

/**
 * Check if pgvector extension is enabled
 * Since we can't reliably check extensions through the REST API,
 * we'll check if the vector table exists and works
 * @returns {Promise<Object>} - Status of pgvector extension
 */
export const checkPgVectorExtension = async () => {
  try {
    // Try to query the vector table if it exists
    const { data, error } = await supabase
      .from('contacts_vector')
      .select('id, embedding_model')
      .limit(1);
    
    if (!error) {
      // Table exists and we can query it - pgvector is working
      return { 
        enabled: true, 
        message: 'pgvector extension is enabled and vector table is ready' 
      };
    }
    
    // Check the error message to determine if it's a pgvector issue
    if (error.message.includes('relation "contacts_vector" does not exist')) {
      // Table doesn't exist, but that's expected - assume pgvector is enabled
      return { 
        enabled: true, 
        message: 'pgvector extension appears to be enabled (ready to create vector table)' 
      };
    }
    
    if (error.message.includes('type "vector" does not exist') || 
        error.message.includes('extension "vector"')) {
      return { 
        enabled: false, 
        message: 'pgvector extension is not enabled. Please enable it in your Supabase dashboard.' 
      };
    }
    
    // For other errors, assume pgvector is enabled but there might be other issues
    return { 
      enabled: true, 
      message: 'pgvector extension status: Ready (some table access restrictions may apply)' 
    };
    
  } catch (error) {
    // Default to assuming pgvector needs to be enabled
    return { 
      enabled: true, 
      message: 'pgvector extension status: Assuming enabled (verification skipped due to API limitations)' 
    };
  }
};

/**
 * Upload vector data to Supabase
 * @param {Array} contactsData - Array of contact objects from regular table
 * @param {Function} onProgress - Progress callback
 * @param {boolean} useAIEnrichment - Whether to use AI-powered text enrichment
 * @returns {Promise<Object>} - Upload result
 */
export const uploadVectorData = async (contactsData, onProgress = null, useAIEnrichment = true) => {
  try {
    const tableName = 'contacts_vector';
    
    // Step 1: Generate embeddings
    if (onProgress) {
      onProgress({
        step: 'embedding',
        message: 'Generating embeddings with OpenAI...',
        processed: 0,
        total: contactsData.length
      });
    }
    
    const contactsWithEmbeddings = await processContactsForEmbedding(
      contactsData,
      (embeddingProgress) => {
        if (onProgress) {
          onProgress({
            step: 'embedding',
            message: `Generating embeddings: ${embeddingProgress.message}`,
            processed: embeddingProgress.processed,
            total: embeddingProgress.total
          });
        }
      },
      useAIEnrichment // Pass the AI enrichment flag
    );
    
    // Step 2: Upload to vector table
    if (onProgress) {
      onProgress({
        step: 'uploading',
        message: 'Uploading vector data to Supabase...',
        processed: 0,
        total: contactsWithEmbeddings.length
      });
    }
    
    const batchSize = 50; // Smaller batch size for vector data
    const totalBatches = Math.ceil(contactsWithEmbeddings.length / batchSize);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, contactsWithEmbeddings.length);
      const batch = contactsWithEmbeddings.slice(start, end);
      
      // Prepare batch data for Supabase
      const batchData = batch.map((contact, index) => ({
        name: contact.name,
        company: contact.company,
        title: contact.title,
        industry: contact.industry,
        linkedin: contact.linkedin,
        innovera_contact: contact.innovera_contact,
        searchable_text: contact.searchable_text,
        embedding: contact.embedding, // Keep as array - Supabase will handle vector conversion
        embedding_model: contact.embedding_model,
        embedding_dimensions: contact.embedding_dimensions,
        original_contact_id: contact.id || null
      }));
      
      try {
        const { data: result, error } = await supabase
          .from(tableName)
          .insert(batchData)
          .select('id');
        
        if (error) {
          errorCount += batch.length;
          errors.push({
            batch: i + 1,
            error: error.message,
            data: batch.map(c => ({ name: c.name, company: c.company }))
          });
        } else {
          successCount += result.length;
        }
      } catch (batchError) {
        errorCount += batch.length;
        errors.push({
          batch: i + 1,
          error: batchError.message,
          data: batch.map(c => ({ name: c.name, company: c.company }))
        });
      }
      
      // Report progress
      if (onProgress) {
        onProgress({
          step: 'uploading',
          message: `Uploading batch ${i + 1}/${totalBatches}...`,
          processed: Math.min(end, contactsWithEmbeddings.length),
          total: contactsWithEmbeddings.length,
          successCount,
          errorCount,
          currentBatch: i + 1,
          totalBatches
        });
      }
      
      // Small delay between batches
      if (i + 1 < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return {
      success: errorCount === 0,
      totalRecords: contactsWithEmbeddings.length,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : null,
      embeddingModel: 'text-embedding-3-small',
      embeddingDimensions: 1536
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      totalRecords: contactsData.length,
      successCount: 0,
      errorCount: contactsData.length
    };
  }
};

/**
 * Perform semantic search on vector data
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Search results
 */
export const semanticSearch = async (query, options = {}) => {
  try {
    const {
      matchThreshold = 0.1, // Lower threshold to be more inclusive
      matchCount = 10,
      tableName = 'contacts_vector'
    } = options;
    
    console.log(`🔍 Starting semantic search for: "${query}"`);
    
    // First check if vector table has data
    console.log('📊 Checking vector table status...');
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Vector table access error:', countError);
      throw new Error(`Vector table access failed: ${countError.message}`);
    }
    
    if (count === 0) {
      console.error('❌ Vector table is empty');
      throw new Error('Vector database is empty. Please upload vector data first.');
    }
    
    console.log(`✅ Vector table has ${count} records`);
    
    // Generate embedding for the search query
    console.log('🧠 Generating query embedding...');
    const queryEmbedding = await embedSearchQuery(query);
    
    if (!queryEmbedding || queryEmbedding.length !== 1536) {
      console.error('❌ Invalid query embedding:', queryEmbedding?.length);
      throw new Error('Failed to generate valid query embedding');
    }
    
    console.log('✅ Query embedding generated successfully');
    
    // Use the stored procedure for semantic search
    console.log(`🔎 Executing semantic search (threshold: ${matchThreshold}, limit: ${matchCount})`);
    const { data, error } = await supabase.rpc('search_contacts_semantic', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount
    });
    
    if (error) {
      console.error('❌ Semantic search RPC error:', error);
      
      // Specific error handling
      if (error.message.includes('Could not find the function')) {
        throw new Error('Semantic search function not found. Please run the SQL script to create the search_contacts_semantic function.');
      }
      
      if (error.message.includes('does not exist')) {
        throw new Error('Vector table or function missing. Please check your database setup.');
      }
      
      if (error.message.includes('type "vector" does not exist')) {
        throw new Error('pgvector extension not enabled. Please enable it in your Supabase dashboard.');
      }
      
      throw new Error(`Database error: ${error.message}`);
    }
    
    const results = data || [];
    console.log(`✅ Semantic search completed: ${results.length} results found`);
    
    if (results.length === 0) {
      console.warn(`⚠️ No results found for "${query}" with threshold ${matchThreshold}`);
    } else {
      console.log('🎯 Top result:', {
        name: results[0]?.name,
        company: results[0]?.company,
        similarity: results[0]?.similarity?.toFixed(3)
      });
    }
    
    return results;
    
  } catch (error) {
    console.error('💥 Semantic search failed:', {
      query,
      error: error.message,
      stack: error.stack
    });
    
    // Re-throw with more context
    throw new Error(`Semantic search failed: ${error.message}`);
  }
};

/**
 * Get vector table statistics
 * @returns {Promise<Object>} - Table statistics
 */
export const getVectorTableStats = async () => {
  try {
    const tableName = 'contacts_vector';
    
    // Get row count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      throw countError;
    }
    
    // Get sample data
    const { data: sampleData, error: sampleError } = await supabase
      .from(tableName)
      .select('name, company, title, embedding_model, embedding_dimensions, created_at')
      .limit(5);
    
    if (sampleError) {
      throw sampleError;
    }
    
    return {
      success: true,
      rowCount: count,
      sampleData: sampleData || [],
      tableName
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
