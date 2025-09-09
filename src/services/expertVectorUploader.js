import { supabase } from './supabaseClient.js';
import { processExpertsForEmbedding, embedSearchQuery } from './expertEmbeddings.js';

/**
 * Check if expert vector table exists
 * @param {string} tableName - Name of the vector table to check
 * @returns {Promise<boolean>} - Whether table exists
 */
export const expertVectorTableExists = async (tableName = 'expert_profiles_vector') => {
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
 * Check if pgvector extension is enabled for experts
 * @returns {Promise<Object>} - Status of pgvector extension
 */
export const checkExpertPgVectorExtension = async () => {
  try {
    // Try to query the expert vector table if it exists
    const { data, error } = await supabase
      .from('expert_profiles_vector')
      .select('id, embedding_model')
      .limit(1);
    
    if (!error) {
      // Table exists and we can query it - pgvector is working
      return { 
        enabled: true, 
        message: 'pgvector extension is enabled and expert vector table is ready' 
      };
    }
    
    // Check the error message to determine if it's a pgvector issue
    if (error.message.includes('relation "expert_profiles_vector" does not exist')) {
      return {
        enabled: false,
        message: 'Expert vector table does not exist. Please run the SQL script to create it.',
        requiresSetup: true
      };
    }
    
    if (error.message.includes('type "vector" does not exist')) {
      return {
        enabled: false,
        message: 'pgvector extension is not enabled. Please enable it in your Supabase dashboard.',
        requiresExtension: true
      };
    }
    
    return {
      enabled: false,
      message: `Database error: ${error.message}`,
      error: error
    };
    
  } catch (error) {
    return {
      enabled: false,
      message: `Failed to check pgvector status: ${error.message}`,
      error: error
    };
  }
};

/**
 * Get statistics about the expert vector table
 * @returns {Promise<Object>} - Vector table statistics
 */
export const getExpertVectorTableStats = async () => {
  try {
    const { data, error } = await supabase
      .from('expert_vector_analytics')
      .select('*')
      .single();
    
    if (error) {
      throw new Error(`Failed to get vector stats: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error getting expert vector table stats:', error);
    return {
      total_experts: 0,
      high_score_experts: 0,
      good_experts: 0,
      avg_expert_score: 0,
      avg_followers: 0,
      avg_connections: 0,
      unique_companies: 0,
      experts_with_industry: 0
    };
  }
};

/**
 * Upload expert vector data to Supabase in batches
 * @param {Array} processedExperts - Array of experts with embeddings
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} - Upload result
 */
export const uploadExpertVectorData = async (processedExperts, progressCallback = null) => {
  const batchSize = 50; // Smaller batches for vector data
  const batches = [];
  
  // Filter out experts that failed to get embeddings
  const validExperts = processedExperts.filter(expert => 
    expert.embedding && expert.searchable_text
  );
  
  if (validExperts.length === 0) {
    throw new Error('No valid experts with embeddings to upload');
  }
  
  // Create batches
  for (let i = 0; i < validExperts.length; i += batchSize) {
    batches.push(validExperts.slice(i, i + batchSize));
  }
  
  let totalUploaded = 0;
  const errors = [];
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    
    try {
      // Prepare batch data for insertion
      const batchData = batch.map((expert, index) => ({
        name: expert.name,
        position: expert.position,
        current_company: expert.current_company,
        location: expert.location,
        avatar: expert.avatar,
        ld_company: expert.ld_company || null,
        ld_position: expert.ld_position || null,
        industry: expert.industry || null,
        followers: expert.followers || 0,
        connections: expert.connections || 0,
        posts_count: expert.posts_count || 0,
        activity_count: expert.activity_count || 0,
        expert_score: expert.expert_score || null,
        scoring_rationale: expert.scoring_rationale || null,
        searchable_text: expert.searchable_text,
        embedding: expert.embedding,
        embedding_model: expert.embedding_model,
        embedding_dimensions: expert.embedding_dimensions,
        original_expert_id: expert.id || null
      }));
      
      const { data, error } = await supabase
        .from('expert_profiles_vector')
        .insert(batchData)
        .select('id');
      
      if (error) {
        console.error(`Batch ${batchIndex + 1} error:`, error);
        errors.push({
          batch: batchIndex + 1,
          error: error.message,
          expertCount: batch.length
        });
      } else {
        totalUploaded += batch.length;
      }
      
      // Call progress callback if provided
      if (progressCallback) {
        progressCallback({
          completed: Math.min(totalUploaded, validExperts.length),
          total: validExperts.length,
          percentage: Math.round((totalUploaded / validExperts.length) * 100),
          currentBatch: batchIndex + 1,
          totalBatches: batches.length,
          errors: errors.length
        });
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Error uploading batch ${batchIndex + 1}:`, error);
      errors.push({
        batch: batchIndex + 1,
        error: error.message,
        expertCount: batch.length
      });
    }
  }
  
  return {
    success: totalUploaded > 0,
    totalUploaded,
    totalProcessed: validExperts.length,
    totalOriginal: processedExperts.length,
    errors,
    errorCount: errors.length,
    successRate: Math.round((totalUploaded / validExperts.length) * 100)
  };
};

/**
 * Main function to vectorize and upload expert profiles
 * @param {Function} progressCallback - Callback for progress updates
 * @returns {Promise<Object>} - Complete process result
 */
export const vectorizeAndUploadExperts = async (progressCallback = null) => {
  try {
    // Step 1: Load expert profiles from database
    if (progressCallback) {
      progressCallback({ step: 'loading', message: 'Loading expert profiles from database...' });
    }
    
    const { data: experts, error: loadError } = await supabase
      .from('expert_profiles')
      .select('*')
      .order('expert_score', { ascending: false, nullsLast: true });
    
    if (loadError) {
      throw new Error(`Failed to load expert profiles: ${loadError.message}`);
    }
    
    if (!experts || experts.length === 0) {
      throw new Error('No expert profiles found. Please upload expert data first.');
    }
    
    console.log(`Loaded ${experts.length} expert profiles for vectorization`);
    
    // Step 2: Generate embeddings
    if (progressCallback) {
      progressCallback({ 
        step: 'embedding', 
        message: `Generating embeddings for ${experts.length} expert profiles...`,
        total: experts.length,
        completed: 0
      });
    }
    
    const processedExperts = await processExpertsForEmbedding(experts, (embeddingProgress) => {
      if (progressCallback) {
        progressCallback({
          step: 'embedding',
          message: `Generating embeddings... ${embeddingProgress.currentExpert}`,
          ...embeddingProgress
        });
      }
    });
    
    // Step 3: Upload to vector table
    if (progressCallback) {
      progressCallback({ 
        step: 'uploading', 
        message: 'Uploading expert vectors to database...',
        total: processedExperts.length,
        completed: 0
      });
    }
    
    const uploadResult = await uploadExpertVectorData(processedExperts, (uploadProgress) => {
      if (progressCallback) {
        progressCallback({
          step: 'uploading',
          message: `Uploading batch ${uploadProgress.currentBatch}/${uploadProgress.totalBatches}...`,
          ...uploadProgress
        });
      }
    });
    
    // Step 4: Complete
    if (progressCallback) {
      progressCallback({ 
        step: 'complete', 
        message: `Successfully vectorized ${uploadResult.totalUploaded} expert profiles!`,
        ...uploadResult
      });
    }
    
    return {
      success: true,
      message: `Successfully vectorized and uploaded ${uploadResult.totalUploaded} expert profiles`,
      totalExperts: experts.length,
      ...uploadResult
    };
    
  } catch (error) {
    console.error('Error in vectorization process:', error);
    
    if (progressCallback) {
      progressCallback({ 
        step: 'error', 
        message: `Error: ${error.message}`,
        error: error
      });
    }
    
    return {
      success: false,
      error: error.message,
      message: `Vectorization failed: ${error.message}`
    };
  }
};

/**
 * Search experts using semantic similarity
 * @param {string} query - Natural language search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Array of matching experts
 */
export const searchExpertsSemanticly = async (query, options = {}) => {
  try {
    const {
      similarityThreshold = 0.7,
      maxResults = 20,
      minExpertScore = 1
    } = options;
    
    // Generate embedding for the search query
    const queryEmbedding = await embedSearchQuery(query);
    
    if (!queryEmbedding) {
      throw new Error('Failed to generate embedding for search query');
    }
    
    // Perform semantic search using the SQL function
    const { data, error } = await supabase.rpc('search_experts_semantic', {
      query_embedding: queryEmbedding,
      match_threshold: similarityThreshold,
      match_count: maxResults,
      min_expert_score: minExpertScore
    });
    
    if (error) {
      throw new Error(`Semantic search failed: ${error.message}`);
    }
    
    // Filter by expert score if specified
    const filteredResults = data.filter(expert => 
      !minExpertScore || (expert.expert_score && expert.expert_score >= minExpertScore)
    );
    
    return filteredResults;
    
  } catch (error) {
    console.error('Error in semantic expert search:', error);
    throw error;
  }
};

/**
 * Get expert by ID from expert vector table
 * @param {number} id - Expert ID
 * @returns {Promise<Object>} - Expert object
 */
export const getExpertById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('expert_profiles_vector')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching expert:', error);
    throw new Error(`Failed to fetch expert: ${error.message}`);
  }
};

/**
 * Clear all data from expert vector table
 * @returns {Promise<Object>} - Clear result
 */
export const clearExpertVectorTable = async () => {
  try {
    const { error } = await supabase
      .from('expert_profiles_vector')
      .delete()
      .neq('id', 0); // Delete all rows
    
    if (error) {
      throw new Error(`Failed to clear expert vector table: ${error.message}`);
    }
    
    return {
      success: true,
      message: 'Expert vector table cleared successfully'
    };
  } catch (error) {
    console.error('Error clearing expert vector table:', error);
    return {
      success: false,
      error: error.message
    };
  }
};