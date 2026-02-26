import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, CheckCircle, XCircle, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { testConnection as testSupabase } from '../services/supabaseClient';
import { testConnection as testEnrichLayer, getBalance } from '../services/enrichLayerService';
import { testGroqConnection } from '../services/groqExpertScorer';
import { testEmbeddingsAPI, validateOpenAIKey } from '../services/openaiEmbeddings';
import { getAnalytics, clearAllContacts, getPipelineStatus } from '../services/contactsService';

const Settings = () => {
  const [checks, setChecks] = useState({});
  const [checking, setChecking] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState([]);
  const [balance, setBalance] = useState(null);

  const runChecks = async () => {
    setChecking(true);
    const results = {};

    const tests = [
      ['supabase', testSupabase],
      ['enrichlayer', testEnrichLayer],
      ['groq', testGroqConnection],
      ['openai', testEmbeddingsAPI],
    ];

    await Promise.all(tests.map(async ([key, fn]) => {
      try {
        results[key] = await fn();
      } catch (err) {
        results[key] = { success: false, message: err.message };
      }
    }));

    setChecks(results);
    setChecking(false);

    // Fetch balance
    getBalance().then(b => setBalance(b.credits)).catch(() => {});
    // Fetch analytics
    getAnalytics().then(setAnalytics).catch(() => {});
    getPipelineStatus().then(setPipelineStatus).catch(() => {});
  };

  useEffect(() => { runChecks(); }, []);

  const handleReset = async () => {
    if (!window.confirm('Delete ALL contacts from the database? This cannot be undone.')) return;
    if (!window.confirm('Are you REALLY sure? This deletes everything.')) return;
    try {
      await clearAllContacts();
      alert('Database cleared.');
      runChecks();
    } catch (err) {
      alert(`Failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-frank-blue" /> Settings
          </h1>
          <p className="text-gray-600 mt-1">API connections, database health, and diagnostics</p>
        </div>
        <button
          onClick={runChecks}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          Recheck All
        </button>
      </div>

      {/* API Status */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">API Connections</h2>
        <div className="space-y-3">
          <StatusRow label="Supabase" check={checks.supabase} />
          <StatusRow label="EnrichLayer (LinkedIn)" check={checks.enrichlayer} extra={balance != null ? `${balance} credits remaining` : null} />
          <StatusRow label="Groq (AI Scoring)" check={checks.groq} />
          <StatusRow label="OpenAI (Embeddings)" check={checks.openai} />
        </div>
      </div>

      {/* Database Stats */}
      {analytics && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Database Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Total" value={analytics.total} />
            <Stat label="Searchable" value={analytics.searchable} />
            <Stat label="Scored" value={analytics.scored} />
            <Stat label="Errors" value={analytics.errors} color={analytics.errors > 0 ? 'red' : null} />
            <Stat label="Pending Enrichment" value={analytics.pending_enrichment} />
            <Stat label="Pending Scoring" value={analytics.pending_scoring} />
            <Stat label="Pending Embedding" value={analytics.pending_embedding} />
            <Stat label="Avg Score" value={analytics.avg_score ? Number(analytics.avg_score).toFixed(1) : '—'} />
          </div>
        </div>
      )}

      {/* Pipeline Status */}
      {pipelineStatus.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Pipeline Status Breakdown</h2>
          <div className="space-y-2">
            {pipelineStatus.map(({ status, count }) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span className="capitalize">{status}</span>
                <span className="font-medium">{Number(count).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Environment */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Environment Variables</h2>
        <div className="space-y-2 text-sm font-mono">
          <EnvRow name="VITE_SUPABASE_URL" set={!!import.meta.env.VITE_SUPABASE_URL} />
          <EnvRow name="VITE_SUPABASE_ANON_KEY" set={!!import.meta.env.VITE_SUPABASE_ANON_KEY} />
          <EnvRow name="VITE_OPENAI_API_KEY" set={validateOpenAIKey(import.meta.env.VITE_OPENAI_API_KEY)} />
          <EnvRow name="VITE_GROQ_API_KEY" set={!!import.meta.env.VITE_GROQ_API_KEY} />
          <EnvRow name="VITE_ENRICHLAYER_API_KEY" set={!!import.meta.env.VITE_ENRICHLAYER_API_KEY} />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg shadow-md p-6 border-2 border-red-200">
        <h2 className="text-lg font-bold text-red-900 mb-2">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">Permanently delete all contacts from the database. This cannot be undone.</p>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <Trash2 className="h-4 w-4" /> Clear Database
        </button>
      </div>
    </div>
  );
};

function StatusRow({ label, check, extra }) {
  const ok = check?.success;
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        {ok === true && <CheckCircle className="h-5 w-5 text-green-500" />}
        {ok === false && <XCircle className="h-5 w-5 text-red-500" />}
        {ok == null && <AlertCircle className="h-5 w-5 text-gray-300" />}
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <div className="text-sm text-right">
        {check?.message && <span className={ok ? 'text-green-600' : 'text-red-600'}>{check.message}</span>}
        {extra && <span className="text-gray-500 ml-2">({extra})</span>}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className={`text-center p-3 rounded-lg ${color === 'red' ? 'bg-red-50' : 'bg-gray-50'}`}>
      <div className={`text-2xl font-bold ${color === 'red' ? 'text-red-600' : 'text-gray-900'}`}>{value ?? 0}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function EnvRow({ name, set }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-700">{name}</span>
      {set ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
    </div>
  );
}

export default Settings;
