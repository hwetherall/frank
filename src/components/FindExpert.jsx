import React, { useState } from 'react';
import { Search, Sparkles, Users, Globe, TrendingUp, Award, Filter, Linkedin, Twitter, FileText, Building2, UserCheck } from 'lucide-react';
import { searchExperts, addAIGeneratedExperts, searchAllExperts } from '../data/mockExperts';
import { generateExpertsForQuery } from '../services/aiExpertService';
import ExpertCard from './ExpertCard';

const FindExpert = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFindingExperts, setIsFindingExperts] = useState(false);
  const [searchingSources, setSearchingSources] = useState([]);

  const popularSearches = [
    'Nuclear safety',
    'Venture capital funding',
    'AI and machine learning',
    'Robotics automation',
    'Mining operations'
  ];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const results = searchAllExperts(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 800);
  };

  const handleQuickSearch = (term) => {
    setSearchQuery(term);
    setIsSearching(true);
    setHasSearched(true);

    setTimeout(() => {
      const results = searchAllExperts(term);
      setSearchResults(results);
      setIsSearching(false);
    }, 800);
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
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">Find Your Perfect Expert</h1>
            <p className="text-xl text-blue-100 mb-8">
              Connect with internal experts or discover external specialists for your project
            </p>
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

      {/* Stats Section */}
      {!hasSearched && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <Users className="h-8 w-8 text-internal-green mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">5</div>
              <div className="text-sm text-gray-600">Internal Experts</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <Globe className="h-8 w-8 text-external-blue mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">5</div>
              <div className="text-sm text-gray-600">External Experts</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <TrendingUp className="h-8 w-8 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">5</div>
              <div className="text-sm text-gray-600">Industries Covered</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <Award className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">20+</div>
              <div className="text-sm text-gray-600">Years Avg. Experience</div>
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
                <h2 className="text-2xl font-bold text-gray-900">
                  Found {searchResults.length} expert{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                </h2>
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
                      <ExpertCard key={expert.id} expert={expert} variant="compact" />
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
                      <ExpertCard key={expert.id} expert={expert} variant="compact" />
                    ))}
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
