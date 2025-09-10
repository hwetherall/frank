import React, { useState, useEffect } from 'react';
import { Database, Zap, CheckCircle, AlertCircle, Loader, Search, Brain } from 'lucide-react';
import { supabase } from '../services/supabaseClient.js';
import { vectorTableExists, checkPgVectorExtension, uploadVectorData, getVectorTableStats } from '../services/vectorUploader.js';

const VectorUploader = () => {
  const [contactsData, setContactsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [step, setStep] = useState('check'); // check, ready, upload, complete
  const [extensionStatus, setExtensionStatus] = useState(null);
  const [tableStatus, setTableStatus] = useState(null);
  const [vectorStats, setVectorStats] = useState(null);
  const [useAIEnrichment, setUseAIEnrichment] = useState(true);

  // Check prerequisites on component mount
  useEffect(() => {
    checkPrerequisites();
  }, []);

  const checkPrerequisites = async () => {
    setLoading(true);
    
    try {
      // Check pgvector extension
      const extStatus = await checkPgVectorExtension();
      setExtensionStatus(extStatus);
      
      // Check if vector table exists
      const tableExists = await vectorTableExists();
      setTableStatus({ exists: tableExists });
      
      // Load contacts from vector table
      const { data: contacts, error } = await supabase
        .from('contacts_vector')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to load contacts: ${error.message}`);
      }
      
      setContactsData(contacts || []);
      
      // Get vector table stats if it exists
      if (tableExists) {
        const stats = await getVectorTableStats();
        setVectorStats(stats);
      }
      
      // Determine if we're ready to proceed
      if (extStatus.enabled && contacts && contacts.length > 0) {
        setStep('ready');
      } else {
        setStep('check');
      }
      
    } catch (error) {
      console.error('Error checking prerequisites:', error);
      setStep('check');
    } finally {
      setLoading(false);
    }
  };

  const handleVectorUpload = async () => {
    if (!contactsData || contactsData.length === 0) {
      alert('No contacts data found. Please upload contacts first.');
      return;
    }

    setLoading(true);
    setStep('upload');
    
    try {
      const result = await uploadVectorData(
        contactsData,
        (progress) => setUploadProgress(progress),
        useAIEnrichment // Pass the AI enrichment flag
      );
      
      setUploadResult(result);
      setStep('complete');
      
      // Refresh stats
      if (result.success) {
        const stats = await getVectorTableStats();
        setVectorStats(stats);
      }
      
    } catch (error) {
      setUploadResult({
        success: false,
        error: error.message,
        totalRecords: contactsData.length,
        successCount: 0,
        errorCount: contactsData.length
      });
      setStep('complete');
    } finally {
      setLoading(false);
    }
  };

  const renderPrerequisiteCheck = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <Brain className="mx-auto h-12 w-12 text-purple-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Vector Database Setup</h3>
        <p className="text-gray-600">Checking prerequisites for semantic search...</p>
      </div>

      {/* pgvector Extension Status */}
      <div className={`p-4 rounded-lg border ${
        extensionStatus?.enabled 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          {extensionStatus?.enabled ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <h4 className="font-medium">pgvector Extension</h4>
            <p className="text-sm text-gray-600">{extensionStatus?.message}</p>
          </div>
        </div>
      </div>

      {/* Vector Table Status */}
      <div className={`p-4 rounded-lg border ${
        tableStatus?.exists 
          ? 'bg-green-50 border-green-200' 
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-3">
          {tableStatus?.exists ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-600" />
          )}
          <div>
            <h4 className="font-medium">Vector Table</h4>
            <p className="text-sm text-gray-600">
              {tableStatus?.exists 
                ? 'contacts_vector table exists' 
                : 'contacts_vector table needs to be created'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Contacts Data Status */}
      <div className={`p-4 rounded-lg border ${
        contactsData.length > 0 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-center gap-3">
          {contactsData.length > 0 ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <h4 className="font-medium">Source Data</h4>
            <p className="text-sm text-gray-600">
              {contactsData.length > 0 
                ? `${contactsData.length} contacts ready for vectorization`
                : 'No contacts found. Please upload contacts first.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Vector Table Stats */}
      {vectorStats && (
        <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <Database className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="font-medium">Current Vector Data</h4>
              <p className="text-sm text-gray-600">
                {vectorStats.success 
                  ? `${vectorStats.rowCount} vectors already in database`
                  : 'Could not load vector statistics'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {!extensionStatus?.enabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">Action Required</h4>
          <p className="text-sm text-yellow-700 mb-3">
            You need to enable the pgvector extension in your Supabase database:
          </p>
          <ol className="list-decimal list-inside text-sm text-yellow-700 space-y-1">
            <li>Go to your Supabase Dashboard</li>
            <li>Navigate to Database → Extensions</li>
            <li>Search for "vector" and enable it</li>
            <li>Or run: <code className="bg-yellow-100 px-1 rounded">CREATE EXTENSION vector;</code> in SQL Editor</li>
          </ol>
        </div>
      )}

      {!tableStatus?.exists && extensionStatus?.enabled && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Create Vector Table</h4>
          <p className="text-sm text-blue-700 mb-3">
            Run the SQL script to create the vector table:
          </p>
          <code className="text-xs bg-blue-100 p-2 rounded block">
            See sql/create_vector_contacts_table.sql
          </code>
        </div>
      )}

      <div className="flex gap-4 justify-center">
        <button
          onClick={checkPrerequisites}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Recheck Status'}
        </button>
      </div>
    </div>
  );

  const renderReady = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Zap className="mx-auto h-12 w-12 text-purple-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Ready for Vectorization</h3>
        <p className="text-gray-600">Transform your contacts into searchable embeddings</p>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h4 className="font-semibold text-purple-900 mb-3">What will happen:</h4>
        <ul className="space-y-2 text-sm text-purple-800">
          <li>• Generate embeddings for {contactsData.length} contacts using OpenAI</li>
          <li>• {useAIEnrichment ? 'AI-enhance contact profiles with contextual intelligence' : 'Create searchable text combining name, title, company, and industries'}</li>
          <li>• Store 1536-dimensional vectors in Supabase with pgvector</li>
          <li>• Enable {useAIEnrichment ? 'smart' : 'basic'} semantic search capabilities</li>
        </ul>
      </div>

      {/* AI Enrichment Toggle */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <Brain className="w-6 h-6 text-blue-600 mt-1" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-blue-900">AI-Enhanced Search Intelligence</h4>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAIEnrichment}
                  onChange={(e) => setUseAIEnrichment(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="space-y-2 text-sm text-blue-800">
              {useAIEnrichment ? (
                <>
                  <p className="font-medium text-green-700">✨ AI Enhancement Enabled</p>
                  <ul className="space-y-1 text-blue-700">
                    <li>• Geographic intelligence (e.g., "San Diego University" → California expert)</li>
                    <li>• Institutional context (e.g., university = research expertise)</li>
                    <li>• Skills inference from titles and companies</li>
                    <li>• Related domain connections</li>
                    <li>• Much smarter semantic matching</li>
                  </ul>
                  <p className="text-xs text-blue-600 mt-2">⏱️ Takes longer but creates much more intelligent search</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-600">Basic Text Processing</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Simple combination of name, title, company</li>
                    <li>• Basic industry tags</li>
                    <li>• Faster processing</li>
                  </ul>
                  <p className="text-xs text-gray-500 mt-2">⚡ Faster but less intelligent matching</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="font-medium text-gray-900">Source Records</div>
          <div className="text-2xl font-bold text-blue-600">{contactsData.length}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="font-medium text-gray-900">Embedding Model</div>
          <div className="text-sm text-gray-600">text-embedding-3-small</div>
        </div>
      </div>

      {vectorStats?.success && vectorStats.rowCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Existing Data</span>
          </div>
          <p className="text-sm text-yellow-700">
            There are already {vectorStats.rowCount} vectors in the database. 
            This upload will add {contactsData.length} more vectors.
          </p>
        </div>
      )}

      <button
        onClick={handleVectorUpload}
        disabled={loading}
        className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Brain className="w-5 h-5" />
        Generate Vector Embeddings
      </button>
    </div>
  );

  const renderUpload = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
      </div>
      
      <h3 className="text-lg font-semibold">Processing Vector Data...</h3>
      
      {uploadProgress && (
        <div className="space-y-4">
          <div className="text-left">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{uploadProgress.message}</span>
              <span>{uploadProgress.processed} / {uploadProgress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(uploadProgress.processed / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
          
          {uploadProgress.step === 'uploading' && (
            <div className="text-sm text-gray-600 space-y-1">
              <div>Batch: {uploadProgress.currentBatch} / {uploadProgress.totalBatches}</div>
              <div>Success: {uploadProgress.successCount} | Errors: {uploadProgress.errorCount}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderComplete = () => (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center">
        {uploadResult?.success ? (
          <CheckCircle className="w-12 h-12 text-green-600" />
        ) : (
          <AlertCircle className="w-12 h-12 text-red-600" />
        )}
      </div>
      
      <h3 className={`text-lg font-semibold ${uploadResult?.success ? 'text-green-800' : 'text-red-800'}`}>
        {uploadResult?.success ? 'Vector Upload Completed!' : 'Vector Upload Failed'}
      </h3>
      
      {uploadResult && (
        <div className={`p-4 rounded-lg ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="text-sm space-y-2">
            <div>Total Records: {uploadResult.totalRecords}</div>
            <div>Successful: {uploadResult.successCount}</div>
            <div>Errors: {uploadResult.errorCount}</div>
            {uploadResult.embeddingModel && (
              <div>Model: {uploadResult.embeddingModel} ({uploadResult.embeddingDimensions}D)</div>
            )}
            {uploadResult.error && (
              <div className="text-red-700 mt-2">
                <strong>Error:</strong> {uploadResult.error}
              </div>
            )}
          </div>
        </div>
      )}
      
      {uploadResult?.success && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-800">Semantic Search Ready!</span>
          </div>
          <p className="text-sm text-blue-700">
            Your contacts are now vectorized and ready for semantic search. 
            You can search for concepts, skills, industries, and more!
          </p>
        </div>
      )}
      
      <button
        onClick={checkPrerequisites}
        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        Check Status Again
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Vector Database Setup</h1>
          <p className="text-gray-600">Create embeddings for semantic search using OpenAI and pgvector</p>
        </div>

        {loading && step === 'check' && (
          <div className="flex items-center justify-center py-8">
            <Loader className="w-6 h-6 text-purple-600 animate-spin mr-2" />
            <span>Checking prerequisites...</span>
          </div>
        )}

        {!loading && step === 'check' && renderPrerequisiteCheck()}
        {step === 'ready' && renderReady()}
        {step === 'upload' && renderUpload()}
        {step === 'complete' && renderComplete()}
      </div>
    </div>
  );
};

export default VectorUploader;
