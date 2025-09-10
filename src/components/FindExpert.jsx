import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Users, Globe, TrendingUp, Award, Filter, Linkedin, Twitter, FileText, Building2, UserCheck, Brain, Database } from 'lucide-react';
import { searchContacts, getAllContacts, transformContactToExpert } from '../services/contactsService';
import { semanticSearch } from '../services/vectorUploader';
import { generateExpertsForQuery } from '../services/aiExpertService';
import { searchExpertsSemanticly, expertVectorTableExists } from '../services/expertVectorUploader';
import { supabase } from '../services/supabaseClient';
import ExpertCard from './ExpertCard';

const FindExpert = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFindingExperts, setIsFindingExperts] = useState(false);
  const [searchingSources, setSearchingSources] = useState([]);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);
  const [expertVectorAvailable, setExpertVectorAvailable] = useState(false);

  // Load total contacts count and check expert vector availability on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check if expert vector database is available
        const expertVectorExists = await expertVectorTableExists();
        setExpertVectorAvailable(expertVectorExists);
        
        if (expertVectorExists) {
          // If expert vector is available, get count from expert table
          try {
            const { count } = await supabase
              .from('expert_profiles_vector')
              .select('*', { count: 'exact', head: true });
            setTotalContacts(count || 0);
          } catch (error) {
            console.error('Failed to get expert count:', error);
            setTotalContacts(0);
          }
        } else {
          // Fall back to contacts table
          try {
            const contacts = await getAllContacts({ limit: 1 });
            const allContacts = await getAllContacts();
            setTotalContacts(allContacts.length);
          } catch (error) {
            console.error('Failed to get contacts count:', error);
            setTotalContacts(0);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };
    loadData();
  }, []);

  const popularSearches = [
    'AI researchers',
    'blockchain experts',
    'machine learning engineers',
    'startup founders',
    'technology consultants'
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      let results = [];
      
      if (useSemanticSearch) {
        try {
          // Try expert vector search first if available
          if (expertVectorAvailable) {
            const expertResults = await searchExpertsSemanticly(searchQuery, {
              similarityThreshold: 0.6,
              maxResults: 10,
              minExpertScore: 1
            });
            
            // Transform expert results to match expected format
            results = expertResults.map(expert => ({
              id: expert.id,
              name: expert.name,
              title: expert.ld_position || expert.position,
              company: expert.ld_company || expert.current_company?.name || expert.current_company,
              location: expert.location,
              linkedin: null, // Expert profiles don't have direct LinkedIn URLs
              innovera_contact: 'Expert Profile',
              industry: expert.industry,
              avatar: expert.avatar,
              expert_score: expert.expert_score,
              scoring_rationale: expert.scoring_rationale,
              followers: expert.followers,
              connections: expert.connections,
              similarity: expert.similarity,
              isExpert: true,
              // Ensure expertise is always an array
              expertise: Array.isArray(expert.industry) ? expert.industry : (expert.industry ? [expert.industry] : []),
              type: 'Expert Profile',
              function: 'Expert',
              availability: 'Unknown',
              photo: expert.avatar
            }));
          } else {
            // Fall back to contact vector search
            const vectorResults = await semanticSearch(searchQuery, { matchCount: 10 });
            results = vectorResults.map(contact => ({
              ...transformContactToExpert(contact),
              similarity: contact.similarity
            }));
          }
        } catch (error) {
          console.warn('Semantic search failed, falling back to text search:', error);
          // Show detailed error information
          console.error('Detailed semantic search error:', {
            message: error.message,
            stack: error.stack,
            query: searchQuery
          });
          
          // Fall back to text search
          const textResults = await searchContacts(searchQuery, { limit: 20 });
          results = textResults.map(transformContactToExpert);
        }
      } else {
        // Use regular text search
        const textResults = await searchContacts(searchQuery, { limit: 20 });
        results = textResults.map(transformContactToExpert);
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickSearch = async (term) => {
    setSearchQuery(term);
    setIsSearching(true);
    setHasSearched(true);

    try {
      let results = [];
      
      if (useSemanticSearch) {
        try {
          // Try expert vector search first if available
          if (expertVectorAvailable) {
            const expertResults = await searchExpertsSemanticly(term, {
              similarityThreshold: 0.6,
              maxResults: 10,
              minExpertScore: 1
            });
            
            // Transform expert results to match expected format
            results = expertResults.map(expert => ({
              id: expert.id,
              name: expert.name,
              title: expert.ld_position || expert.position,
              company: expert.ld_company || expert.current_company?.name || expert.current_company,
              location: expert.location,
              linkedin: null,
              innovera_contact: 'Expert Profile',
              industry: expert.industry,
              avatar: expert.avatar,
              expert_score: expert.expert_score,
              scoring_rationale: expert.scoring_rationale,
              followers: expert.followers,
              connections: expert.connections,
              similarity: expert.similarity,
              isExpert: true,
              // Ensure expertise is always an array
              expertise: Array.isArray(expert.industry) ? expert.industry : (expert.industry ? [expert.industry] : []),
              type: 'Expert Profile',
              function: 'Expert',
              availability: 'Unknown',
              photo: expert.avatar
            }));
          } else {
            // Fall back to contact vector search
            const vectorResults = await semanticSearch(term, { matchCount: 10 });
            results = vectorResults.map(contact => ({
              ...transformContactToExpert(contact),
              similarity: contact.similarity
            }));
          }
        } catch (error) {
          console.warn('Semantic search failed, falling back to text search:', error);
          console.error('Detailed semantic search error (quick search):', {
            message: error.message,
            stack: error.stack,
            query: term
          });
          const textResults = await searchContacts(term, { limit: 20 });
          results = textResults.map(transformContactToExpert);
        }
      } else {
        const textResults = await searchContacts(term, { limit: 20 });
        results = textResults.map(transformContactToExpert);
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Sources to simulate searching through
  const searchSources = [
    { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { name: 'Industry Networks', icon: Building2, color: 'text-gray-600', bgColor: 'bg-gray-50' },
    { name: 'Research Papers', icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50' },
    { name: 'Professional Databases', icon: Users, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { name: 'Expert Directories', icon: UserCheck, color: 'text-orange-600', bgColor: 'bg-orange-50' }
  ];

  const handleFindExpert = async () => {
    setIsFindingExperts(true);
    setSearchingSources([]);

    // Simulate searching through different sources with delays
    const searchSequence = async () => {
      for (let i = 0; i < searchSources.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setSearchingSources(prev => [...prev, i]);
      }

      // Final delay before showing results
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        // Generate experts using AI service
        const aiExperts = await generateExpertsForQuery(searchQuery);
        
        // Add to global store
        addAIGeneratedExperts(aiExperts);
        
        // Update search results
        const allResults = searchAllExperts(searchQuery);
        setSearchResults(allResults);
        
      } catch (error) {
        console.error('Error finding experts:', error);
        // Fallback to just showing a message or empty results
        setSearchResults([]);
      }

      setIsFindingExperts(false);
      setSearchingSources([]);
    };

    await searchSequence();
  };

  // All results are now real contacts from Supabase

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-frank-blue to-frank-light-blue text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">Find Your Perfect Expert</h1>
            <p className="text-xl text-blue-100 mb-4">
              Search through {totalContacts} {expertVectorAvailable ? 'expert profiles' : 'real contacts'} using AI-powered semantic search
            </p>
            
            {/* Search Mode Toggle */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <label className="flex items-center gap-2 text-blue-100">
                <input
                  type="checkbox"
                  checked={useSemanticSearch}
                  onChange={(e) => setUseSemanticSearch(e.target.checked)}
                  className="rounded"
                />
                <Brain className="h-4 w-4" />
                <span className="text-sm">AI Semantic Search</span>
                {expertVectorAvailable && (
                  <span className="text-xs bg-green-500/20 text-green-100 px-2 py-1 rounded-full border border-green-400/30">
                    Expert DB Ready
                  </span>
                )}
              </label>
              <span className="text-xs text-blue-200">
                {useSemanticSearch 
                  ? (expertVectorAvailable ? 'Search expert profiles by meaning & context' : 'Search by meaning & context')
                  : 'Search by exact keywords'
                }
              </span>
            </div>
          </div>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Describe your project or expertise needed..."
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
                    <Search className="h-5 w-5" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Search Tags */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="text-sm text-blue-100">Popular searches:</span>
            {popularSearches.map((term, index) => (
              <button
                key={index}
                onClick={() => handleQuickSearch(term)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-sm text-white transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Stats Section */}
      {!hasSearched && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <Database className="h-8 w-8 text-frank-blue mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{totalContacts}</div>
              <div className="text-sm text-gray-600">Total Contacts</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <Brain className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">AI</div>
              <div className="text-sm text-gray-600">Semantic Search</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">Global</div>
              <div className="text-sm text-gray-600">Expert Network</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
              <Search className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">Smart</div>
              <div className="text-sm text-gray-600">Context Matching</div>
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
                  Don't worry! Frank can search external networks to find the perfect experts for your project.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleFindExpert}
                    className="w-full px-6 py-3 bg-gradient-to-r from-frank-blue to-frank-light-blue text-white rounded-lg hover:from-frank-blue/90 hover:to-frank-light-blue/90 transition-all transform hover:scale-105 flex items-center justify-center space-x-2 font-semibold"
                  >
                    <Sparkles className="h-5 w-5" />
                    <span>Find Expert</span>
                  </button>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setHasSearched(false);
                    }}
                    className="w-full px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Found {searchResults.length} contact{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {useSemanticSearch ? 'Using AI semantic search' : 'Using keyword search'} 
                    {searchResults.some(r => r.similarity) && ' • Sorted by relevance'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setHasSearched(false);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  Clear search
                </button>
              </div>

              {/* Search Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((expert) => (
                  <div key={expert.id} className="relative">
                    <ExpertCard expert={expert} />
                    {expert.similarity && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                          {Math.round(expert.similarity * 100)}% match
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* AI Expert Generation Section */}
              {searchResults.length < 5 && (
                <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                  <div className="text-center">
                    <Sparkles className="h-8 w-8 text-purple-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Need more experts?</h3>
                    <p className="text-gray-600 mb-4">
                      Let Frank generate additional expert profiles based on your search query
                    </p>
                    <button
                      onClick={handleFindExpert}
                      disabled={isFindingExperts}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center space-x-2 mx-auto"
                    >
                      <Sparkles className="h-5 w-5" />
                      <span>{isFindingExperts ? 'Generating...' : 'Generate AI Experts'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Find Expert Animation */}
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Frank is finding experts for you...</h3>
              <p className="text-gray-600">Searching through professional networks and databases</p>
            </div>

            {/* Sources Animation */}
            <div className="space-y-4 max-w-md mx-auto">
              {searchSources.map((source, index) => {
                const Icon = source.icon;
                const isSearching = searchingSources.includes(index);
                const isCompleted = searchingSources.includes(index);
                
                return (
                  <div
                    key={source.name}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-500 ${
                      isSearching ? `${source.bgColor} border-2 border-dashed ${source.color.replace('text-', 'border-')}` : 'bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-full ${isSearching ? 'bg-white' : 'bg-gray-200'} transition-all duration-300`}>
                      <Icon className={`h-4 w-4 ${isSearching ? source.color : 'text-gray-400'} ${isSearching ? 'animate-pulse' : ''}`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium ${isSearching ? 'text-gray-900' : 'text-gray-500'}`}>
                        {source.name}
                      </div>
                      {isSearching && (
                        <div className="text-sm text-gray-600 animate-pulse">
                          Searching...
                        </div>
                      )}
                    </div>
                    {isCompleted && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600 font-medium">Found</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Progress indicator */}
            <div className="mt-8">
              <div className="bg-gray-200 rounded-full h-2 max-w-md mx-auto">
                <div 
                  className="bg-gradient-to-r from-frank-blue to-frank-light-blue h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${(searchingSources.length / searchSources.length) * 100}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {searchingSources.length} of {searchSources.length} sources searched
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow-md p-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-frank-blue mb-4"></div>
              <p className="text-gray-600">AI is analyzing your request and finding the best experts...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindExpert;
