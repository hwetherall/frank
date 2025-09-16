import React, { useState, useEffect } from 'react';
import { testEmbeddingsAPI, validateOpenAIKey } from '../services/expertEmbeddings';
import { testFallbackEnhancement, testSmartQuery } from '../services/smartQueryService';

const APIKeyValidator = () => {
  const [openaiStatus, setOpenaiStatus] = useState({ status: 'checking', message: 'Checking...' });
  const [groqStatus, setGroqStatus] = useState({ status: 'checking', message: 'Checking...' });

  useEffect(() => {
    checkAPIKeys();
  }, []);

  const checkAPIKeys = async () => {
    // Check OpenAI API
    try {
      const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;
      const validation = validateOpenAIKey(openaiKey);
      
      if (!validation.valid) {
        setOpenaiStatus({ status: 'error', message: validation.message });
      } else {
        const testResult = await testEmbeddingsAPI();
        setOpenaiStatus({ 
          status: testResult.success ? 'success' : 'error', 
          message: testResult.message 
        });
      }
    } catch (error) {
      setOpenaiStatus({ status: 'error', message: error.message });
    }

    // Check Groq API
    try {
      const groqKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!groqKey) {
        setGroqStatus({ status: 'error', message: 'Groq API key not configured' });
      } else {
        // Test Groq API with a simple request
        const response = await fetch('/api/groq/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: 'Hello' }],
            model: 'openai/gpt-oss-120b',
            max_tokens: 10,
          })
        });

        if (response.ok) {
          setGroqStatus({ status: 'success', message: 'Groq API connection successful' });
        } else {
          setGroqStatus({ status: 'error', message: `Groq API error: ${response.status}` });
        }
      }
    } catch (error) {
      setGroqStatus({ status: 'error', message: error.message });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '🔄';
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">API Key Status</h3>
      
      <div className="space-y-3">
        <div className={`p-3 rounded-md ${getStatusColor(openaiStatus.status)}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">OpenAI API</span>
            <span>{getStatusIcon(openaiStatus.status)}</span>
          </div>
          <p className="text-sm mt-1">{openaiStatus.message}</p>
        </div>

        <div className={`p-3 rounded-md ${getStatusColor(groqStatus.status)}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">Groq API</span>
            <span>{getStatusIcon(groqStatus.status)}</span>
          </div>
          <p className="text-sm mt-1">{groqStatus.message}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <button
          onClick={checkAPIKeys}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
        >
          Recheck APIs
        </button>
        
        <button
          onClick={() => {
            console.log('Testing fallback enhancement...');
            testFallbackEnhancement('Need help raising money for my startup');
            testSmartQuery('Healthcare experts');
          }}
          className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors"
        >
          Test Query Enhancement
        </button>
      </div>
    </div>
  );
};

export default APIKeyValidator;
