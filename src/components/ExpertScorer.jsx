import React, { useState, useRef } from 'react';
import { Upload, Download, Users, Brain, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../services/supabaseClient';
import { processCSVToExpertProfiles, validateExpertProfile, calculateProfileStatistics, filterProfilesForScoring, prepareProfileForScoring } from '../services/expertDataProcessor';
import { scoreExpertProfilesBatch, testGroqConnection } from '../services/groqExpertScorer';

const ExpertScorer = () => {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, processing, scoring, completed, error
  const [enableScoring, setEnableScoring] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [scoringProgress, setScoringProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [errors, setErrors] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [groqStatus, setGroqStatus] = useState(null);
  const fileInputRef = useRef(null);

  // Test Groq connection when component mounts
  React.useEffect(() => {
    const testConnection = async () => {
      const result = await testGroqConnection();
      setGroqStatus(result);
    };
    testConnection();
  }, []);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.toLowerCase().endsWith('.csv')) {
        setErrors(['Please select a CSV file']);
        return;
      }
      setFile(selectedFile);
      setErrors([]);
      setResults(null);
      setStatistics(null);
    }
  };

  const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  const uploadToSupabase = async (profiles) => {
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < profiles.length; i += batchSize) {
      batches.push(profiles.slice(i, i + batchSize));
    }

    let totalUploaded = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      const { data, error } = await supabase
        .from('expert_profiles')
        .insert(batch)
        .select('id');

      if (error) {
        throw new Error(`Database upload error: ${error.message}`);
      }

      totalUploaded += batch.length;
      setUploadProgress(Math.round((totalUploaded / profiles.length) * 100));
    }

    return totalUploaded;
  };

  const handleUploadAndProcess = async () => {
    if (!file) {
      setErrors(['Please select a file first']);
      return;
    }

    try {
      setUploadStatus('uploading');
      setErrors([]);
      setUploadProgress(0);
      setScoringProgress(0);

      // Parse CSV file
      console.log('Parsing CSV file...');
      const csvData = await parseCSVFile(file);
      console.log(`Parsed ${csvData.length} rows from CSV`);

      setUploadStatus('processing');

      // Process CSV data to expert profiles
      const processResult = processCSVToExpertProfiles(csvData, file.name);
      console.log(`Processed ${processResult.totalProcessed} profiles with ${processResult.totalErrors} errors`);

      if (processResult.totalErrors > 0) {
        console.warn('Processing errors:', processResult.errors);
      }

      // Validate profiles
      const validProfiles = [];
      const validationErrors = [];

      processResult.profiles.forEach((profile, index) => {
        const validation = validateExpertProfile(profile);
        if (validation.isValid) {
          validProfiles.push(profile);
        } else {
          validationErrors.push({
            profile: profile.name || `Row ${index + 1}`,
            errors: validation.errors
          });
        }
      });

      console.log(`${validProfiles.length} valid profiles ready for upload`);

      // Calculate statistics
      const stats = calculateProfileStatistics(validProfiles);
      setStatistics(stats);

      // Upload to Supabase
      console.log('Uploading to Supabase...');
      const uploadedCount = await uploadToSupabase(validProfiles);
      console.log(`Uploaded ${uploadedCount} profiles to database`);

      let scoringResults = null;

      // Perform expert scoring if enabled
      if (enableScoring && groqStatus?.success) {
        setUploadStatus('scoring');
        console.log('Starting expert scoring...');

        // Filter profiles suitable for scoring
        const scorableProfiles = filterProfilesForScoring(validProfiles);
        console.log(`${scorableProfiles.length} profiles suitable for scoring`);

        if (scorableProfiles.length > 0) {
          // Prepare profiles for scoring
          const preparedProfiles = scorableProfiles.map(prepareProfileForScoring);

          // Score profiles in batches
          scoringResults = await scoreExpertProfilesBatch(
            preparedProfiles,
            (progress) => {
              setScoringProgress(progress.percentage);
              console.log(`Scoring progress: ${progress.percentage}% (${progress.completed}/${progress.total})`);
            },
            3 // Batch size
          );

          // Update database with scores
          console.log('Updating database with expert scores...');
          const scoreUpdates = scoringResults
            .filter(result => result.success && result.profile.original_linkedin_id)
            .map(result => ({
              original_linkedin_id: result.profile.original_linkedin_id,
              expert_score: result.score,
              scoring_rationale: result.rationale,
              scored_at: result.scored_at,
              scoring_model: result.model
            }));

          // Update scores in batches
          for (const update of scoreUpdates) {
            const { error } = await supabase
              .from('expert_profiles')
              .update({
                expert_score: update.expert_score,
                scoring_rationale: update.scoring_rationale,
                scored_at: update.scored_at,
                scoring_model: update.scoring_model
              })
              .eq('original_linkedin_id', update.original_linkedin_id);

            if (error) {
              console.error('Error updating score:', error);
            }
          }

          console.log(`Updated ${scoreUpdates.length} profiles with expert scores`);
        }
      }

      setUploadStatus('completed');
      setResults({
        totalProcessed: processResult.totalProcessed,
        totalUploaded: uploadedCount,
        totalErrors: processResult.totalErrors + validationErrors.length,
        scoringEnabled: enableScoring,
        scoringResults: scoringResults,
        validationErrors: validationErrors
      });

    } catch (error) {
      console.error('Upload and processing error:', error);
      setUploadStatus('error');
      setErrors([error.message]);
    }
  };

  const handleDownloadDatabase = async () => {
    try {
      console.log('Downloading expert database...');
      
      // Load all expert profiles using pagination to bypass Supabase's 1000 row limit
      let allExperts = [];
      let hasMore = true;
      let offset = 0;
      const batchSize = 1000;
      
      while (hasMore) {
        const { data: expertBatch, error } = await supabase
          .from('expert_profiles')
          .select('*')
          .range(offset, offset + batchSize - 1)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw new Error(`Database query error: ${error.message}`);
        }
        
        if (expertBatch && expertBatch.length > 0) {
          allExperts = [...allExperts, ...expertBatch];
          offset += batchSize;
          hasMore = expertBatch.length === batchSize;
        } else {
          hasMore = false;
        }
      }
      
      const data = allExperts;

      if (!data || data.length === 0) {
        setErrors(['No expert profiles found in database']);
        return;
      }

      // Convert to CSV
      const csvData = Papa.unparse(data, {
        header: true
      });

      // Create and download file
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `expert_database_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`Downloaded ${data.length} expert profiles`);

    } catch (error) {
      console.error('Download error:', error);
      setErrors([error.message]);
    }
  };

  const resetForm = () => {
    setFile(null);
    setUploadStatus('idle');
    setEnableScoring(false);
    setUploadProgress(0);
    setScoringProgress(0);
    setResults(null);
    setErrors([]);
    setStatistics(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'uploading':
      case 'processing':
      case 'scoring': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <AlertCircle className="w-5 h-5" />;
      case 'uploading':
      case 'processing':
      case 'scoring': return <Clock className="w-5 h-5 animate-spin" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Expert-Scorer</h1>
          </div>
          <p className="text-gray-600">
            Upload LinkedIn data CSV files and automatically score professionals as experts for innovation consulting.
          </p>
        </div>

        <div className="p-6">
          {/* Groq API Status */}
          <div className="mb-6 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-5 h-5" />
              <span className="font-medium">AI Scoring Service Status</span>
            </div>
            <div className={`flex items-center gap-2 ${groqStatus?.success ? 'text-green-600' : 'text-red-600'}`}>
              {groqStatus?.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span className="text-sm">{groqStatus?.message || 'Checking connection...'}</span>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload LinkedIn Data CSV
            </label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={uploadStatus === 'uploading' || uploadStatus === 'processing' || uploadStatus === 'scoring'}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {file && (
                <span className="text-sm text-gray-600">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Expected format: full-data-BD.csv structure with LinkedIn profile data
            </p>
          </div>

          {/* Expert Scoring Toggle */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <label className="text-sm font-medium text-gray-700">
                    Enable Expert Scoring
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Automatically score each profile from 1-5 using AI analysis
                  {!groqStatus?.success && ' (AI service not available)'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={enableScoring}
                onChange={(e) => setEnableScoring(e.target.checked)}
                disabled={!groqStatus?.success || uploadStatus === 'uploading' || uploadStatus === 'processing' || uploadStatus === 'scoring'}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
            </div>
          </div>

          {/* Upload Button */}
          <div className="mb-6">
            <button
              onClick={handleUploadAndProcess}
              disabled={!file || uploadStatus === 'uploading' || uploadStatus === 'processing' || uploadStatus === 'scoring'}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="w-5 h-5" />
              {uploadStatus === 'idle' ? 'Upload & Process' : 
               uploadStatus === 'uploading' ? 'Uploading...' :
               uploadStatus === 'processing' ? 'Processing...' :
               uploadStatus === 'scoring' ? 'Scoring...' : 'Upload & Process'}
            </button>
          </div>

          {/* Progress Indicators */}
          {(uploadStatus === 'uploading' || uploadStatus === 'processing' || uploadStatus === 'scoring') && (
            <div className="mb-6 space-y-4">
              {uploadStatus === 'uploading' && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Uploading to database</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {uploadStatus === 'scoring' && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>AI Expert Scoring</span>
                    <span>{scoringProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${scoringProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Display */}
          <div className={`flex items-center gap-2 mb-4 ${getStatusColor(uploadStatus)}`}>
            {getStatusIcon(uploadStatus)}
            <span className="font-medium">
              {uploadStatus === 'idle' && 'Ready to upload'}
              {uploadStatus === 'uploading' && 'Uploading data to database...'}
              {uploadStatus === 'processing' && 'Processing profile data...'}
              {uploadStatus === 'scoring' && 'Running AI expert scoring...'}
              {uploadStatus === 'completed' && 'Upload and processing completed successfully!'}
              {uploadStatus === 'error' && 'An error occurred during processing'}
            </span>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-800">Errors</span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Results Summary */}
          {results && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Processing Results</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700">Processed</div>
                  <div className="text-xl font-bold text-green-600">{results.totalProcessed}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Uploaded</div>
                  <div className="text-xl font-bold text-blue-600">{results.totalUploaded}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Errors</div>
                  <div className="text-xl font-bold text-red-600">{results.totalErrors}</div>
                </div>
                {results.scoringEnabled && results.scoringResults && (
                  <div>
                    <div className="font-medium text-gray-700">Scored</div>
                    <div className="text-xl font-bold text-purple-600">
                      {results.scoringResults.filter(r => r.success).length}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statistics */}
          {statistics && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">Data Statistics</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700">With Position</div>
                  <div className="text-lg font-bold text-blue-600">
                    {Math.round((statistics.withPosition / statistics.total) * 100)}%
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">With Experience</div>
                  <div className="text-lg font-bold text-blue-600">
                    {Math.round((statistics.withExperience / statistics.total) * 100)}%
                  </div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Avg Followers</div>
                  <div className="text-lg font-bold text-blue-600">{statistics.averageFollowers.toLocaleString()}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Avg Connections</div>
                  <div className="text-lg font-bold text-blue-600">{statistics.averageConnections.toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleDownloadDatabase}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              Download Database
            </button>
            
            {uploadStatus !== 'idle' && (
              <button
                onClick={resetForm}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpertScorer;
