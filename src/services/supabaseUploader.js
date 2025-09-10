import { supabase } from './supabaseClient.js';

/**
 * Create a table in Supabase based on schema
 * @param {Object} schema - Table schema with columns
 * @returns {Promise<Object>} - Result of table creation
 */
export const createTable = async (schema) => {
  try {
    // Generate SQL for table creation
    const columnDefinitions = schema.columns.map(col => {
      let definition = `"${col.name}" ${col.type}`;
      if (!col.nullable) {
        definition += ' NOT NULL';
      }
      return definition;
    }).join(', ');
    
    const sql = `
      CREATE TABLE IF NOT EXISTS "${schema.tableName}" (
        id SERIAL PRIMARY KEY,
        ${columnDefinitions},
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If RPC doesn't exist, we'll need to create the table via SQL editor
      console.warn('Direct SQL execution not available. You\'ll need to create the table manually.');
      return {
        success: false,
        error: error.message,
        sql: sql,
        message: 'Please execute this SQL in your Supabase SQL editor'
      };
    }
    
    return { success: true, data, sql };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Check if table exists
 * @param {string} tableName - Name of the table to check
 * @returns {Promise<boolean>} - Whether table exists
 */
export const tableExists = async (tableName) => {
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
 * Upload data to Supabase table
 * @param {string} tableName - Name of the target table
 * @param {Array} data - Array of objects to insert
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Upload result
 */
export const uploadToSupabase = async (tableName, data, onProgress = null) => {
  try {
    const batchSize = 1000; // Supabase has a limit on batch size
    const totalBatches = Math.ceil(data.length / batchSize);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, data.length);
      const batch = data.slice(start, end);
      
      try {
        const { data: result, error } = await supabase
          .from(tableName)
          .insert(batch)
          .select('id');
        
        if (error) {
          errorCount += batch.length;
          errors.push({
            batch: i + 1,
            error: error.message,
            data: batch
          });
        } else {
          successCount += result.length;
        }
      } catch (batchError) {
        errorCount += batch.length;
        errors.push({
          batch: i + 1,
          error: batchError.message,
          data: batch
        });
      }
      
      // Report progress
      if (onProgress) {
        onProgress({
          processed: Math.min(end, data.length),
          total: data.length,
          successCount,
          errorCount,
          currentBatch: i + 1,
          totalBatches
        });
      }
    }
    
    return {
      success: errorCount === 0,
      totalRecords: data.length,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : null
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      totalRecords: data.length,
      successCount: 0,
      errorCount: data.length
    };
  }
};

/**
 * Get table info from Supabase
 * @param {string} tableName - Name of the table
 * @returns {Promise<Object>} - Table information
 */
export const getTableInfo = async (tableName) => {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Get row count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    return {
      success: true,
      exists: true,
      rowCount: countError ? 0 : count,
      sampleData: data
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
