// Diagnostic service to help troubleshoot Expert Vector Database issues
import { supabase } from './supabaseClient.js';

/**
 * Run comprehensive diagnostics on the Expert Vector Database system
 * @returns {Promise<Object>} Diagnostic results
 */
export const runExpertVectorDiagnostics = async () => {
  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      passed: 0,
      failed: 0,
      warnings: 0
    }
  };

  // Test 1: Check Supabase connection
  try {
    const { data, error } = await supabase.from('expert_profiles').select('id').limit(1);
    if (error) {
      results.tests.push({
        name: 'Supabase Connection',
        status: 'FAIL',
        message: `Cannot connect to Supabase: ${error.message}`,
        details: error
      });
      results.summary.failed++;
    } else {
      results.tests.push({
        name: 'Supabase Connection',
        status: 'PASS',
        message: 'Successfully connected to Supabase',
        details: { recordCount: data?.length || 0 }
      });
      results.summary.passed++;
    }
  } catch (error) {
    results.tests.push({
      name: 'Supabase Connection',
      status: 'FAIL',
      message: `Connection error: ${error.message}`,
      details: error
    });
    results.summary.failed++;
  }

  // Test 2: Check expert_profiles table
  try {
    const { data, error } = await supabase
      .from('expert_profiles')
      .select('id, name, expert_score')
      .limit(5);
    
    if (error) {
      results.tests.push({
        name: 'Expert Profiles Table',
        status: 'FAIL',
        message: `Cannot access expert_profiles table: ${error.message}`,
        details: error
      });
      results.summary.failed++;
    } else {
      results.tests.push({
        name: 'Expert Profiles Table',
        status: 'PASS',
        message: `Found ${data?.length || 0} expert profiles`,
        details: { 
          recordCount: data?.length || 0,
          sample: data?.slice(0, 2) || []
        }
      });
      results.summary.passed++;
    }
  } catch (error) {
    results.tests.push({
      name: 'Expert Profiles Table',
      status: 'FAIL',
      message: `Error accessing expert_profiles: ${error.message}`,
      details: error
    });
    results.summary.failed++;
  }

  // Test 3: Check expert_profiles_vector table
  try {
    const { data, error } = await supabase
      .from('expert_profiles_vector')
      .select('id, name, embedding_model')
      .limit(5);
    
    if (error) {
      if (error.message.includes('relation "expert_profiles_vector" does not exist')) {
        results.tests.push({
          name: 'Expert Vector Table',
          status: 'FAIL',
          message: 'expert_profiles_vector table does not exist',
          details: { 
            solution: 'Run the SQL script: sql/fix_expert_vector_database.sql',
            error 
          }
        });
      } else {
        results.tests.push({
          name: 'Expert Vector Table',
          status: 'FAIL',
          message: `Cannot access expert_profiles_vector table: ${error.message}`,
          details: error
        });
      }
      results.summary.failed++;
    } else {
      results.tests.push({
        name: 'Expert Vector Table',
        status: 'PASS',
        message: `Found ${data?.length || 0} vectorized experts`,
        details: { 
          recordCount: data?.length || 0,
          sample: data?.slice(0, 2) || []
        }
      });
      results.summary.passed++;
    }
  } catch (error) {
    results.tests.push({
      name: 'Expert Vector Table',
      status: 'FAIL',
      message: `Error accessing expert_profiles_vector: ${error.message}`,
      details: error
    });
    results.summary.failed++;
  }

  // Test 4: Check expert_vector_analytics view
  try {
    const { data, error } = await supabase
      .from('expert_vector_analytics')
      .select('*')
      .single();
    
    if (error) {
      if (error.message.includes('relation "expert_vector_analytics" does not exist')) {
        results.tests.push({
          name: 'Vector Analytics View',
          status: 'FAIL',
          message: 'expert_vector_analytics view does not exist',
          details: { 
            solution: 'Run the SQL script: sql/fix_expert_vector_database.sql',
            error 
          }
        });
      } else {
        results.tests.push({
          name: 'Vector Analytics View',
          status: 'FAIL',
          message: `Cannot access expert_vector_analytics view: ${error.message}`,
          details: error
        });
      }
      results.summary.failed++;
    } else {
      results.tests.push({
        name: 'Vector Analytics View',
        status: 'PASS',
        message: 'Analytics view is working',
        details: data
      });
      results.summary.passed++;
    }
  } catch (error) {
    results.tests.push({
      name: 'Vector Analytics View',
      status: 'FAIL',
      message: `Error accessing analytics view: ${error.message}`,
      details: error
    });
    results.summary.failed++;
  }

  // Test 5: Check search function
  try {
    // Create a dummy embedding vector (all zeros)
    const dummyEmbedding = new Array(1536).fill(0);
    
    const { data, error } = await supabase.rpc('search_experts_semantic', {
      query_embedding: dummyEmbedding,
      match_threshold: 0.1,
      match_count: 1,
      min_expert_score: 1
    });
    
    if (error) {
      if (error.message.includes('function search_experts_semantic') && error.message.includes('does not exist')) {
        results.tests.push({
          name: 'Search Function',
          status: 'FAIL',
          message: 'search_experts_semantic function does not exist',
          details: { 
            solution: 'Run the SQL script: sql/fix_expert_vector_database.sql',
            error 
          }
        });
      } else {
        results.tests.push({
          name: 'Search Function',
          status: 'FAIL',
          message: `Cannot call search_experts_semantic: ${error.message}`,
          details: error
        });
      }
      results.summary.failed++;
    } else {
      results.tests.push({
        name: 'Search Function',
        status: 'PASS',
        message: 'Semantic search function is working',
        details: { 
          resultCount: data?.length || 0,
          sample: data?.slice(0, 1) || []
        }
      });
      results.summary.passed++;
    }
  } catch (error) {
    results.tests.push({
      name: 'Search Function',
      status: 'FAIL',
      message: `Error calling search function: ${error.message}`,
      details: error
    });
    results.summary.failed++;
  }

  // Test 6: Check OpenAI API configuration
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!openaiApiKey) {
    results.tests.push({
      name: 'OpenAI API Configuration',
      status: 'FAIL',
      message: 'VITE_OPENAI_API_KEY environment variable is not set',
      details: { 
        solution: 'Add VITE_OPENAI_API_KEY to your .env file'
      }
    });
    results.summary.failed++;
  } else if (openaiApiKey.startsWith('sk-')) {
    results.tests.push({
      name: 'OpenAI API Configuration',
      status: 'PASS',
      message: 'OpenAI API key is configured',
      details: { 
        keyPrefix: openaiApiKey.substring(0, 10) + '...',
        keyLength: openaiApiKey.length
      }
    });
    results.summary.passed++;
  } else {
    results.tests.push({
      name: 'OpenAI API Configuration',
      status: 'WARNING',
      message: 'OpenAI API key format looks incorrect',
      details: { 
        keyPrefix: openaiApiKey.substring(0, 10) + '...',
        expected: 'Key should start with "sk-"'
      }
    });
    results.summary.warnings++;
  }

  // Test 7: Check pgvector extension (via RPC call)
  try {
    const { data, error } = await supabase.rpc('check_expert_vector_setup');
    
    if (error) {
      results.tests.push({
        name: 'Database Setup Check',
        status: 'WARNING',
        message: 'Cannot run setup check function (this is expected if SQL script not run yet)',
        details: { 
          solution: 'Run the SQL script: sql/fix_expert_vector_database.sql',
          error 
        }
      });
      results.summary.warnings++;
    } else {
      const setupStatus = data.reduce((acc, item) => {
        acc[item.component] = item;
        return acc;
      }, {});
      
      results.tests.push({
        name: 'Database Setup Check',
        status: 'PASS',
        message: 'Database setup check completed',
        details: setupStatus
      });
      results.summary.passed++;
    }
  } catch (error) {
    results.tests.push({
      name: 'Database Setup Check',
      status: 'WARNING',
      message: 'Cannot run database setup check',
      details: { 
        solution: 'Run the SQL script: sql/fix_expert_vector_database.sql',
        error: error.message
      }
    });
    results.summary.warnings++;
  }

  return results;
};

/**
 * Format diagnostic results for display
 * @param {Object} results - Results from runExpertVectorDiagnostics
 * @returns {string} Formatted report
 */
export const formatDiagnosticReport = (results) => {
  let report = `Expert Vector Database Diagnostic Report\n`;
  report += `Generated: ${results.timestamp}\n`;
  report += `Summary: ${results.summary.passed} passed, ${results.summary.failed} failed, ${results.summary.warnings} warnings\n\n`;

  results.tests.forEach((test, index) => {
    report += `${index + 1}. ${test.name}: ${test.status}\n`;
    report += `   ${test.message}\n`;
    if (test.details?.solution) {
      report += `   Solution: ${test.details.solution}\n`;
    }
    report += `\n`;
  });

  return report;
};

/**
 * Get quick status of the Expert Vector Database system
 * @returns {Promise<Object>} Quick status check
 */
export const getQuickStatus = async () => {
  try {
    // Quick check: Can we access the analytics view?
    const { data, error } = await supabase
      .from('expert_vector_analytics')
      .select('total_experts')
      .single();
    
    if (error) {
      return {
        status: 'error',
        message: 'Expert Vector Database is not set up correctly',
        details: error.message,
        solution: 'Run the SQL script: sql/fix_expert_vector_database.sql'
      };
    }

    return {
      status: 'ok',
      message: `Expert Vector Database is working (${data.total_experts || 0} experts vectorized)`,
      expertCount: data.total_experts || 0
    };
  } catch (error) {
    return {
      status: 'error',
      message: 'Cannot connect to Expert Vector Database',
      details: error.message
    };
  }
};
