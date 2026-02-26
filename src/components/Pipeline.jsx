import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Zap, Award, Brain, CheckCircle, XCircle, AlertCircle, RefreshCw, Play, RotateCcw } from 'lucide-react';
import { getPipelineStatus, getAnalytics } from '../services/contactsService';
import { ingestExcel, enrichContacts, scoreContacts, embedContacts, retryErrors } from '../services/pipelineService';
import { testConnection as testEnrichLayer, getBalance } from '../services/enrichLayerService';
import { testGroqConnection } from '../services/groqExpertScorer';
import { testEmbeddingsAPI } from '../services/openaiEmbeddings';

const STEPS = [
  { key: 'upload', label: 'Upload', icon: Upload, color: 'blue' },
  { key: 'enrich', label: 'Enrich', icon: Zap, color: 'purple' },
  { key: 'score', label: 'Score', icon: Award, color: 'yellow' },
  { key: 'embed', label: 'Embed', icon: Brain, color: 'green' },
];

const Pipeline = () => {
  const [activeStep, setActiveStep] = useState('upload');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [apiStatus, setApiStatus] = useState({ enrichlayer: null, groq: null, openai: null });
  const [enrichBalance, setEnrichBalance] = useState(null);
  const [stepResults, setStepResults] = useState({});

  // File upload state
  const [file, setFile] = useState(null);
  const [innoveraContact, setInnoveraContact] = useState('');

  const refreshStatus = useCallback(async () => {
    try {
      const [status, stats] = await Promise.all([
        getPipelineStatus().catch(() => []),
        getAnalytics().catch(() => null),
      ]);
      setPipelineStatus(status);
      setAnalytics(stats);
    } catch {}
  }, []);

  useEffect(() => {
    refreshStatus();
    checkAPIs();
  }, [refreshStatus]);

  const checkAPIs = async () => {
    const [el, groq, openai] = await Promise.all([
      testEnrichLayer().catch(() => ({ success: false, message: 'Failed' })),
      testGroqConnection().catch(() => ({ success: false, message: 'Failed' })),
      testEmbeddingsAPI().catch(() => ({ success: false, message: 'Failed' })),
    ]);
    setApiStatus({ enrichlayer: el, groq, openai });
    if (el.success) {
      getBalance().then(b => setEnrichBalance(b.credits)).catch(() => {});
    }
  };

  const onProgress = (p) => setProgress(p);

  const runStep = async (step, fn) => {
    setRunning(true);
    setActiveStep(step);
    setProgress(null);
    setStepResults(prev => ({ ...prev, [step]: null }));

    try {
      const result = await fn(onProgress);
      setStepResults(prev => ({ ...prev, [step]: { success: true, ...result } }));
    } catch (err) {
      setStepResults(prev => ({ ...prev, [step]: { success: false, error: err.message } }));
    } finally {
      setRunning(false);
      setProgress(null);
      refreshStatus();
    }
  };

  const handleUpload = () => {
    if (!file) return;
    runStep('upload', (cb) => ingestExcel(file, innoveraContact, cb));
  };

  const getStatusCount = (status) => {
    const found = pipelineStatus.find(s => s.status === status);
    return found ? Number(found.count) : 0;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Processing Pipeline</h1>
        <p className="text-gray-600 mt-1">Upload, enrich, score, and embed your contacts</p>
      </div>

      {/* API Status */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <APICard label="EnrichLayer" status={apiStatus.enrichlayer} extra={enrichBalance != null ? `${enrichBalance} credits` : null} />
        <APICard label="Groq AI" status={apiStatus.groq} />
        <APICard label="OpenAI" status={apiStatus.openai} />
      </div>

      {/* Pipeline Status Summary */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <MiniStat label="Total" value={analytics.total} />
          <MiniStat label="Pending Enrichment" value={getStatusCount('uploaded')} color="blue" />
          <MiniStat label="Pending Scoring" value={getStatusCount('enriched')} color="purple" />
          <MiniStat label="Pending Embedding" value={getStatusCount('scored')} color="yellow" />
          <MiniStat label="Ready" value={analytics.searchable} color="green" />
          {analytics.errors > 0 && <MiniStat label="Errors" value={analytics.errors} color="red" />}
        </div>
      )}

      {/* Step Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        {STEPS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => !running && setActiveStep(key)}
            className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeStep === key
                ? 'border-frank-blue text-frank-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            } ${running ? 'cursor-not-allowed' : ''}`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            {stepResults[key]?.success === true && <CheckCircle className="h-4 w-4 text-green-500" />}
            {stepResults[key]?.success === false && <XCircle className="h-4 w-4 text-red-500" />}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-md p-8">
        {activeStep === 'upload' && (
          <UploadStep
            file={file}
            setFile={setFile}
            innoveraContact={innoveraContact}
            setInnoveraContact={setInnoveraContact}
            onUpload={handleUpload}
            running={running}
            progress={progress}
            result={stepResults.upload}
          />
        )}

        {activeStep === 'enrich' && (
          <ActionStep
            title="Enrich with EnrichLayer"
            description={`${getStatusCount('uploaded')} contacts ready for enrichment. Each contact's LinkedIn profile will be fetched and enriched with detailed professional data.`}
            buttonLabel="Start Enrichment"
            buttonIcon={Zap}
            onRun={() => runStep('enrich', enrichContacts)}
            onRetry={() => runStep('enrich', (cb) => retryErrors('enrichment', cb))}
            running={running}
            progress={progress}
            result={stepResults.enrich}
            readyCount={getStatusCount('uploaded')}
            errorCount={getStatusCount('error')}
            apiReady={apiStatus.enrichlayer?.success}
            apiName="EnrichLayer"
            balanceInfo={enrichBalance != null ? `${enrichBalance} credits remaining` : null}
          />
        )}

        {activeStep === 'score' && (
          <ActionStep
            title="Score with AI (Groq)"
            description={`${getStatusCount('enriched')} contacts ready for scoring. Each contact will be evaluated 1-5 on their suitability as an innovation consulting expert.`}
            buttonLabel="Start Scoring"
            buttonIcon={Award}
            onRun={() => runStep('score', scoreContacts)}
            onRetry={() => runStep('score', (cb) => retryErrors('scoring', cb))}
            running={running}
            progress={progress}
            result={stepResults.score}
            readyCount={getStatusCount('enriched')}
            errorCount={getStatusCount('error')}
            apiReady={apiStatus.groq?.success}
            apiName="Groq"
          />
        )}

        {activeStep === 'embed' && (
          <ActionStep
            title="Generate Embeddings (OpenAI)"
            description={`${getStatusCount('scored')} contacts ready for embedding. Vector embeddings enable semantic search across your contact database.`}
            buttonLabel="Start Embedding"
            buttonIcon={Brain}
            onRun={() => runStep('embed', embedContacts)}
            onRetry={() => runStep('embed', (cb) => retryErrors('embedding', cb))}
            running={running}
            progress={progress}
            result={stepResults.embed}
            readyCount={getStatusCount('scored')}
            errorCount={getStatusCount('error')}
            apiReady={apiStatus.openai?.success}
            apiName="OpenAI"
          />
        )}
      </div>

      {/* Refresh */}
      <div className="mt-4 text-center">
        <button onClick={refreshStatus} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto">
          <RefreshCw className="h-3 w-3" /> Refresh status
        </button>
      </div>
    </div>
  );
};

// ---- Sub-components ----

function APICard({ label, status, extra }) {
  const ok = status?.success;
  return (
    <div className={`rounded-lg border p-4 ${ok ? 'border-green-200 bg-green-50' : ok === false ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-center space-x-2">
        {ok ? <CheckCircle className="h-5 w-5 text-green-600" /> : ok === false ? <XCircle className="h-5 w-5 text-red-600" /> : <AlertCircle className="h-5 w-5 text-gray-400" />}
        <span className="font-medium text-sm">{label}</span>
      </div>
      {extra && <p className="text-xs text-gray-600 mt-1 ml-7">{extra}</p>}
      {status?.message && !ok && <p className="text-xs text-red-600 mt-1 ml-7 truncate">{status.message}</p>}
    </div>
  );
}

function MiniStat({ label, value, color = 'gray' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
  };
  return (
    <div className={`rounded-lg p-3 text-center ${colors[color]}`}>
      <div className="text-2xl font-bold">{value ?? 0}</div>
      <div className="text-xs">{label}</div>
    </div>
  );
}

function UploadStep({ file, setFile, innoveraContact, setInnoveraContact, onUpload, running, progress, result }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Upload Excel File</h2>
      <p className="text-gray-600 mb-6">
        Upload an Excel file containing LinkedIn contacts. Each row must have a LinkedIn URL.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Innovera Contact (who is uploading)</label>
          <input
            type="text"
            value={innoveraContact}
            onChange={(e) => setInnoveraContact(e.target.value)}
            placeholder="e.g., Daniel, Bobby, Kamran"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-frank-blue focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Excel File (.xlsx)</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-frank-blue transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
              id="excel-upload"
            />
            <label htmlFor="excel-upload" className="cursor-pointer">
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
              {file ? (
                <p className="text-gray-900 font-medium">{file.name}</p>
              ) : (
                <p className="text-gray-600">Click to select or drag and drop</p>
              )}
            </label>
          </div>
        </div>

        <button
          onClick={onUpload}
          disabled={!file || running}
          className="w-full py-3 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
        >
          <Upload className="h-5 w-5" />
          <span>{running ? 'Uploading...' : 'Upload & Clean'}</span>
        </button>
      </div>

      {progress && <ProgressBar progress={progress} />}
      {result && <ResultBanner result={result} />}
    </div>
  );
}

function ActionStep({ title, description, buttonLabel, buttonIcon: Icon, onRun, onRetry, running, progress, result, readyCount, errorCount, apiReady, apiName, balanceInfo }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 mb-6">{description}</p>

      {!apiReady && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">{apiName} API is not connected. Check your .env file and Settings page.</span>
          </div>
        </div>
      )}

      {balanceInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
          {balanceInfo}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onRun}
          disabled={running || readyCount === 0 || !apiReady}
          className="flex-1 py-3 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
        >
          {running ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              <span>{buttonLabel} ({readyCount})</span>
            </>
          )}
        </button>

        {errorCount > 0 && (
          <button
            onClick={onRetry}
            disabled={running}
            className="px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 flex items-center space-x-2"
          >
            <RotateCcw className="h-5 w-5" />
            <span>Retry Errors</span>
          </button>
        )}
      </div>

      {progress && <ProgressBar progress={progress} />}
      {result && <ResultBanner result={result} />}
    </div>
  );
}

function ProgressBar({ progress }) {
  return (
    <div className="mt-6">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>{progress.message}</span>
        <span>{progress.pct}%</span>
      </div>
      <div className="bg-gray-200 rounded-full h-3">
        <div
          className="bg-gradient-to-r from-frank-blue to-frank-light-blue h-3 rounded-full transition-all duration-300"
          style={{ width: `${progress.pct}%` }}
        />
      </div>
    </div>
  );
}

function ResultBanner({ result }) {
  if (result.success) {
    return (
      <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          <span className="font-medium">Complete!</span>
        </div>
        <div className="mt-2 text-sm text-green-700">
          {result.inserted != null && <span>Inserted: {result.inserted}. Skipped: {result.skipped}. </span>}
          {result.enriched != null && <span>Enriched: {result.enriched}. </span>}
          {result.scored != null && <span>Scored: {result.scored}. </span>}
          {result.embedded != null && <span>Embedded: {result.embedded}. </span>}
          {result.errors?.length > 0 && <span className="text-red-600">Errors: {result.errors.length}. </span>}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-center space-x-2 text-red-800">
        <XCircle className="h-5 w-5" />
        <span className="font-medium">Failed</span>
      </div>
      <p className="mt-1 text-sm text-red-700">{result.error}</p>
    </div>
  );
}

export default Pipeline;
