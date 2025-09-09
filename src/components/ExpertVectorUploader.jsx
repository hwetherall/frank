import React, { useState, useEffect } from 'react';
import { Database, Zap, CheckCircle, AlertCircle, Loader, Search, Brain, Users, Award } from 'lucide-react';
import { supabase } from '../services/supabaseClient.js';
import { 
  expertVectorTableExists, 
  checkExpertPgVectorExtension, 
  vectorizeAndUploadExperts, 
  getExpertVectorTableStats,
  clearExpertVectorTable,
  searchExpertsSemanticly
} from '../services/expertVectorUploader.js';
import { testEmbeddingsAPI } from '../services/expertEmbeddings.js';

const ExpertVectorUploader = () => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [step, setStep] = useState('check'); // check, ready, upload, complete
  const [extensionStatus, setExtensionStatus] = useState(null);
  const [tableStatus, setTableStatus] = useState(null);
  const [vectorStats, setVectorStats] = useState(null);
  const [expertData, setExpertData] = useState([]);
  const [apiStatus, setApiStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Check prerequisites on component mount
  useEffect(() => {
    checkPrerequisites();
  }, []);

  const checkPrerequisites = async () => {
    setLoading(true);
    
    try {
      // Check OpenAI API
      const apiTest = await testEmbeddingsAPI();
      setApiStatus(apiTest);
      
      // Check pgvector extension
      const extStatus = await checkExpertPgVectorExtension();
      setExtensionStatus(extStatus);
      
      // Check if expert vector table exists
      const tableExists = await expertVectorTableExists();
      setTableStatus({ exists: tableExists });
      
      // Load expert profiles from regular table
      const { data: experts, error } = await supabase
        .from('expert_profiles')
        .select('*')
        .order('expert_score', { ascending: false, nullsLast: true });
      
      if (error) {
        throw new Error(`Failed to load expert profiles: ${error.message}`);
      }
      
      setExpertData(experts || []);
      
      // Get vector table stats if it exists
      if (tableExists) {
        const stats = await getExpertVectorTableStats();
        setVectorStats(stats);
      }
      
      // Determine next step
      if (apiTest.success && extStatus.enabled && tableExists) {
        setStep('ready');
      } else {
        setStep('setup');
      }
      
    } catch (error) {
      console.error('Error checking prerequisites:', error);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleVectorizeExperts = async () => {
    setLoading(true);
    setUploadProgress(null);
    setUploadResult(null);
    setStep('upload');
    
    try {
      const result = await vectorizeAndUploadExperts((progress) => {
        setUploadProgress(progress);
      });
      
      setUploadResult(result);
      
      if (result.success) {
        setStep('complete');
        // Refresh stats
        const stats = await getExpertVectorTableStats();
        setVectorStats(stats);
      } else {
        setStep('error');
      }
    } catch (error) {
      console.error('Error vectorizing experts:', error);
      setUploadResult({
        success: false,
        error: error.message
      });
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearVectorData = async () => {
    if (!confirm('Are you sure you want to clear all expert vector data? This cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await clearExpertVectorTable();
      
      if (result.success) {
        setVectorStats(null);
        setUploadResult(null);
        setSearchResults([]);
        setStep('ready');
        alert('Expert vector data cleared successfully');
      } else {
        alert(`Failed to clear data: ${result.error}`);
      }
    } catch (error) {
      console.error('Error clearing vector data:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a search query');
      return;
    }
    
    setSearchLoading(true);
    setSearchResults([]);
    
    try {
      const results = await searchExpertsSemanticly(searchQuery, {
        similarityThreshold: 0.6,
        maxResults: 10,
        minExpertScore: 1
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error performing semantic search:', error);
      alert(`Search failed: ${error.message}`);
    } finally {
      setSearchLoading(false);
    }
  };

  const renderStatusCard = (title, status, icon) => {
    const IconComponent = icon;
    const isSuccess = status?.success || status?.enabled;
    const isError = status?.success === false || status?.enabled === false;
    
    return (
      <div className={`p-4 rounded-lg border ${
        isSuccess ? 'bg-green-50 border-green-200' : 
        isError ? 'bg-red-50 border-red-200' : 
        'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center space-x-3">
          <IconComponent className={`h-5 w-5 ${
            isSuccess ? 'text-green-600' : 
            isError ? 'text-red-600' : 
            'text-gray-400'
          }`} />
          <div>
            <h3 className="font-medium text-gray-900">{title}</h3>
            <p className={`text-sm ${
              isSuccess ? 'text-green-600' : 
              isError ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {status?.message || 'Checking...'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderStatsCard = () => {
    if (!vectorStats) return null;
    
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-3 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Expert Vector Database Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-blue-600 font-medium">Total Experts</p>
            <p className="text-blue-900 text-lg">{vectorStats.total_experts?.toLocaleString() || 0}</p>
          </div>
          <div>
            <p className="text-blue-600 font-medium">High Score (4-5)</p>
            <p className="text-blue-900 text-lg">{vectorStats.high_score_experts?.toLocaleString() || 0}</p>
          </div>
          <div>
            <p className="text-blue-600 font-medium">Avg Score</p>
            <p className="text-blue-900 text-lg">{vectorStats.avg_expert_score ? Number(vectorStats.avg_expert_score).toFixed(1) : 'N/A'}</p>
          </div>
          <div>
            <p className="text-blue-600 font-medium">Companies</p>
            <p className="text-blue-900 text-lg">{vectorStats.unique_companies?.toLocaleString() || 0}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderSearchInterface = () => {
    if (!vectorStats || vectorStats.total_experts === 0) return null;
    
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-900 mb-3 flex items-center">
          <Search className="h-5 w-5 mr-2" />
          Test Semantic Expert Search
        </h3>
        <div className="flex space-x-3 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for experts... e.g., 'AI startup founder with healthcare experience'"
            className="flex-1 px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <button
            onClick={handleSemanticSearch}
            disabled={searchLoading || !searchQuery.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {searchLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span>Search</span>
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-green-700 font-medium">
              Found {searchResults.length} matching experts:
            </p>
            {searchResults.map((expert, index) => (
              <div key={expert.id} className="bg-white p-3 rounded border border-green-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{expert.name}</h4>
                    <p className="text-sm text-gray-600">
                      {expert.ld_position || expert.position} 
                      {(expert.ld_company || expert.current_company?.name) && (
                        <span> at {expert.ld_company || expert.current_company?.name}</span>
                      )}
                    </p>
                    {expert.industry && (
                      <p className="text-xs text-blue-600 mt-1">
                        {Array.isArray(expert.industry) ? expert.industry.join(', ') : expert.industry}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm">
                    {expert.expert_score && (
                      <div className="flex items-center space-x-1">
                        <Award className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{expert.expert_score}/5</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500">
                      {Math.round(expert.similarity * 100)}% match
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center space-x-3">
          <Brain className="h-8 w-8 text-purple-600" />
          <span>Expert Vector Database</span>
        </h1>
        <p className="text-gray-600">
          Convert expert profiles into searchable vectors using AI embeddings for semantic search
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {renderStatusCard('OpenAI API', apiStatus, Zap)}
        {renderStatusCard('pgvector Extension', extensionStatus, Database)}
        {renderStatusCard('Vector Table', tableStatus, CheckCircle)}
      </div>

      {/* Expert Data Summary */}
      {expertData.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Expert Profiles Available
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Total Experts</p>
              <p className="text-gray-900 text-lg font-medium">{expertData.length}</p>
            </div>
            <div>
              <p className="text-gray-600">With Scores</p>
              <p className="text-gray-900 text-lg font-medium">
                {expertData.filter(e => e.expert_score).length}
              </p>
            </div>
            <div>
              <p className="text-gray-600">High Score (4-5)</p>
              <p className="text-gray-900 text-lg font-medium">
                {expertData.filter(e => e.expert_score >= 4).length}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Avg Score</p>
              <p className="text-gray-900 text-lg font-medium">
                {expertData.filter(e => e.expert_score).length > 0 
                  ? (expertData.filter(e => e.expert_score).reduce((sum, e) => sum + e.expert_score, 0) / expertData.filter(e => e.expert_score).length).toFixed(1)
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Vector Stats */}
      {renderStatsCard()}

      {/* Main Action Area */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {step === 'check' && loading && (
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Checking system prerequisites...</p>
          </div>
        )}

        {step === 'setup' && (
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Setup Required</h2>
            <p className="text-gray-600 mb-4">
              Some prerequisites need to be configured before vectorization can begin.
            </p>
            <div className="space-y-2 text-left max-w-md mx-auto">
              {!apiStatus?.success && (
                <p className="text-sm text-red-600">• Configure OpenAI API key</p>
              )}
              {!extensionStatus?.enabled && (
                <p className="text-sm text-red-600">• Enable pgvector extension or create vector table</p>
              )}
            </div>
            <button
              onClick={checkPrerequisites}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Recheck Prerequisites
            </button>
          </div>
        )}

        {step === 'ready' && (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ready to Vectorize</h2>
            <p className="text-gray-600 mb-6">
              {expertData.length} expert profiles are ready to be converted to searchable vectors.
              This will enable semantic search across all expert data.
            </p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleVectorizeExperts}
                disabled={loading || expertData.length === 0}
                className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Brain className="h-5 w-5" />
                <span>Start Vectorization</span>
              </button>
              
              {vectorStats && vectorStats.total_experts > 0 && (
                <button
                  onClick={handleClearVectorData}
                  disabled={loading}
                  className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Vector Data
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-purple-600 animate-pulse" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Vectorizing Experts</h2>
            
            {uploadProgress && (
              <div className="space-y-4">
                <p className="text-gray-600">{uploadProgress.message}</p>
                
                {uploadProgress.step === 'embedding' && (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.percentage || 0}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {uploadProgress.completed}/{uploadProgress.total} experts processed
                    </p>
                  </div>
                )}
                
                {uploadProgress.step === 'uploading' && (
                  <div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.percentage || 0}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Batch {uploadProgress.currentBatch}/{uploadProgress.totalBatches}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'complete' && uploadResult?.success && (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Vectorization Complete!</h2>
            <p className="text-gray-600 mb-4">
              Successfully vectorized {uploadResult.totalUploaded} expert profiles.
              Your expert database is now searchable using natural language.
            </p>
            
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6 text-sm">
              <div className="bg-green-100 p-3 rounded">
                <p className="text-green-700 font-medium">Uploaded</p>
                <p className="text-green-900 text-lg">{uploadResult.totalUploaded}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded">
                <p className="text-blue-700 font-medium">Success Rate</p>
                <p className="text-blue-900 text-lg">{uploadResult.successRate}%</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setStep('ready');
                setUploadResult(null);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-red-600 mb-4">
              {uploadResult?.error || 'An error occurred during vectorization'}
            </p>
            <button
              onClick={() => setStep('ready')}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Search Interface */}
      {step === 'ready' && vectorStats && vectorStats.total_experts > 0 && renderSearchInterface()}
    </div>
  );
};

export default ExpertVectorUploader;