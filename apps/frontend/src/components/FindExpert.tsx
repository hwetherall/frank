import React, { useState } from 'react';
import { Search, Sparkles, Users, Globe, TrendingUp, Award, Brain, Lightbulb, Zap } from 'lucide-react';
import { getAllExperts, addAIGeneratedExperts, searchExperts as searchAllExperts } from '../data/mockExperts';
import { generateExpertsForQuery } from '../services/aiExpertService';
import { semanticSearchExperts, analyzeSearchQuery } from '../services/aiSearchService';
import ExpertCard from './ExpertCard';

const FindExpert = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults]: any = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFindingExperts, setIsFindingExperts] = useState(false);
  const [searchMode, setSearchMode] = useState('ai'); // 'ai' or 'keyword'
  const [queryAnalysis, setQueryAnalysis]: any = useState(null);

  const popularSearches = [
    'I need someone who understands nuclear safety regulations',
    'Looking for an expert in AI applications for healthcare',
    'Need help with venture capital funding for a robotics startup',
    'Require mining operations consultant for cost reduction',
    'Seeking expert in sustainable energy solutions'
  ];

  // Enhanced search function with AI
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setQueryAnalysis(null);

    try {
      const allExperts = getAllExperts();
      
      if (searchMode === 'ai') {
        // AI-powered semantic search
        const [aiResults, analysis] = await Promise.all([
          semanticSearchExperts(searchQuery, allExperts),
          analyzeSearchQuery(searchQuery)
        ]);
        
        setSearchResults(aiResults);
        setQueryAnalysis(analysis);
      } else {
        // Basic keyword search (existing functionality)
        const results = searchAllExperts(searchQuery);
        setSearchResults(results);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to basic search
      const results = searchAllExperts(searchQuery);
      setSearchResults(results);
    }

    setIsSearching(false);
  };

  const handleQuickSearch = async (term) => {
    setSearchQuery(term);
    setIsSearching(true);
    setHasSearched(true);
    setQueryAnalysis(null);

    try {
      const allExperts = getAllExperts();
      const [aiResults, analysis] = await Promise.all([
        semanticSearchExperts(term, allExperts),
        analyzeSearchQuery(term)
      ]);
      
      setSearchResults(aiResults);
      setQueryAnalysis(analysis);
    } catch (error) {
      console.error('Quick search error:', error);
      const results = searchAllExperts(term);
      setSearchResults(results);
    }

    setIsSearching(false);
  };

  // External expert discovery (existing functionality)
  const handleFindExpert = async () => {
    setIsFindingExperts(true);

    try {
      const aiExperts = await generateExpertsForQuery(searchQuery);
      addAIGeneratedExperts(aiExperts);
      
      const allExperts = getAllExperts();
      const allResults = await semanticSearchExperts(searchQuery, allExperts);
      setSearchResults(allResults);
    } catch (error) {
      console.error('Error finding experts:', error);
      setSearchResults([]);
    }

    setIsFindingExperts(false);
  };

  const internalExperts = searchResults.filter(e => e.type === 'Internal');
  const externalExperts = searchResults.filter(e => e.type === 'External');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-frank-blue to-frank-light-blue text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Brain className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">Find Your Perfect Expert</h1>
            <p className="text-xl text-blue-100 mb-8">
              Describe what you need in natural language - our AI will find the perfect match
            </p>
          </div>

          {/* Search Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-1 flex">
              <button
                onClick={() => setSearchMode('ai')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  searchMode === 'ai' 
                    ? 'bg-white text-frank-blue' 
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Brain className="h-4 w-4" />
                <span>AI Search</span>
              </button>
              <button
                onClick={() => setSearchMode('keyword')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                  searchMode === 'keyword' 
                    ? 'bg-white text-frank-blue' 
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <Search className="h-4 w-4" />
                <span>Keyword</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  searchMode === 'ai' 
                    ? "Describe what kind of expert you need..." 
                    : "Enter keywords to search..."
                }
                className="w-full px-6 py-4 pr-32 text-gray-900 bg-white rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30 text-lg"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-2 bg-frank-blue text-white px-6 py-2 rounded-lg hover:bg-frank-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSearching ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    {searchMode === 'ai' ? <Brain className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* AI Search Mode Examples */}
          {searchMode === 'ai' && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <div className="flex items-center space-x-2 mb-2">
                <Lightbulb className="h-4 w-4 text-blue-200" />
                <span className="text-sm text-blue-100">Try natural language:</span>
              </div>
              {popularSearches.slice(0, 3).map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSearch(term)}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs text-white transition-colors max-w-xs truncate"
                  title={term}
                >
                  {term.length > 50 ? term.substring(0, 47) + '...' : term}
                </button>
              ))}
            </div>
          )}

          {/* Keyword Mode Examples */}
          {searchMode === 'keyword' && (
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="text-sm text-blue-100">Popular searches:</span>
              {['nuclear safety', 'venture capital', 'AI machine learning', 'robotics', 'mining'].map((term, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickSearch(term)}
                  className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-sm text-white transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Query Analysis Results */}
      {queryAnalysis && searchMode === 'ai' && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">AI understood your query as:</p>
                <p className="text-sm text-blue-700 mt-1">{queryAnalysis.intent}</p>
                {queryAnalysis.suggestions?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-blue-800 mb-1">Related searches:</p>
                    <div className="flex flex-wrap gap-1">
                      {queryAnalysis.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickSearch(suggestion)}
                          className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-xs text-blue-800 rounded transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && !isSearching && !isFindingExperts && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {searchResults.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="max-w-md mx-auto">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No experts found in our database</h3>
                <p className="text-gray-600 mb-6">
                  {searchMode === 'ai' 
                    ? "Our AI couldn't find experts matching your description. Try Frank's external search to discover new experts." 
                    : "No keyword matches found. Try switching to AI search for better results."}
                </p>
                <div className="space-y-3">
                  {searchMode === 'keyword' && (
                    <button
                      onClick={() => {
                        setSearchMode('ai');
                        handleSearch({ preventDefault: () => {} });
                      }}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 font-semibold"
                    >
                      <Brain className="h-5 w-5" />
                      <span>Try AI Search</span>
                    </button>
                  )}
                  <button
                    onClick={handleFindExpert}
                    className="w-full px-6 py-3 bg-gradient-to-r from-frank-blue to-frank-light-blue text-white rounded-lg hover:from-frank-blue/90 hover:to-frank-light-blue/90 transition-all transform hover:scale-105 flex items-center justify-center space-x-2 font-semibold"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>Find External Experts</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Found {searchResults.length} expert{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </h2>
                  {searchMode === 'ai' && (
                    <p className="text-sm text-gray-600 mt-1">Results ranked by AI relevance score</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setHasSearched(false);
                    setQueryAnalysis(null);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Clear search
                </button>
              </div>

              {/* Internal Experts Section */}
              {internalExperts.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="bg-internal-green/10 p-2 rounded-lg">
                      <Users className="h-5 w-5 text-internal-green" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">Internal Experts</h3>
                    <span className="px-2 py-1 bg-internal-green/10 text-internal-green text-sm rounded-full">
                      Existing Relationships
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {internalExperts.map((expert) => (
                      <ExpertCard 
                        key={expert.id} 
                        expert={expert} 
                        variant="compact"
                        showAIScore={searchMode === 'ai'}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* External Experts Section */}
              {externalExperts.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="bg-external-blue/10 p-2 rounded-lg">
                      <Globe className="h-5 w-5 text-external-blue" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">External Experts</h3>
                    <span className="px-2 py-1 bg-external-blue/10 text-external-blue text-sm rounded-full">
                      New Connections
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {externalExperts.map((expert) => (
                      <ExpertCard 
                        key={expert.id} 
                        expert={expert} 
                        variant="compact"
                        showAIScore={searchMode === 'ai'}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-md p-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-frank-blue mb-4"></div>
              <p className="text-gray-600">
                {searchMode === 'ai' 
                  ? 'AI is analyzing your request and finding the best experts...' 
                  : 'Searching through our expert database...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* External Search Loading (existing) */}
      {isFindingExperts && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-md p-12">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-frank-blue/20 border-t-frank-blue"></div>
                  <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-frank-blue animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Frank is finding external experts for you...</h3>
              <p className="text-gray-600">Searching through professional networks and databases</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindExpert;