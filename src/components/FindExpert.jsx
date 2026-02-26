import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sparkles, Brain, Database, Star, MapPin, Building2, Users } from 'lucide-react';
import { searchSemantic, searchText, getAnalytics } from '../services/contactsService';
import { embedSearchQuery } from '../services/openaiEmbeddings';
import { enhanceSearchQuery } from '../services/smartQueryService';

const FindExpert = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [searchMeta, setSearchMeta] = useState(null);

  useEffect(() => {
    getAnalytics().then(setAnalytics).catch(() => {});
  }, []);

  const popularSearches = [
    'AI engineers who speak Japanese',
    'blockchain experts in finance',
    'machine learning researchers',
    'startup founders',
    'renewable energy consultants',
  ];

  const handleSearch = async (query) => {
    const q = query || searchQuery;
    if (!q.trim()) return;

    setSearchQuery(q);
    setIsSearching(true);
    setHasSearched(true);
    setSearchMeta(null);

    try {
      let data = [];

      if (useSemanticSearch) {
        // Step 1: Enhance query with Groq
        const enhancement = await enhanceSearchQuery(q);
        const enhancedQ = enhancement.success ? enhancement.enhanced : q;

        setSearchMeta({
          original: q,
          enhanced: enhancedQ,
          wasEnhanced: enhancement.success,
        });

        // Step 2: Embed the enhanced query
        const embedding = await embedSearchQuery(enhancedQ);

        // Step 3: Vector search
        data = await searchSemantic(embedding, { matchThreshold: 0.25, maxResults: 20 });
      } else {
        data = await searchText(q, { limit: 20 });
      }

      setResults(data);
    } catch (err) {
      console.error('Search failed:', err);
      // Fallback to text search
      try {
        const fallback = await searchText(q, { limit: 20 });
        setResults(fallback);
      } catch {
        setResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero */}
      <div className="bg-gradient-to-r from-frank-blue to-frank-light-blue text-white py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Sparkles className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-4">Find Your Perfect Expert</h1>
            <p className="text-xl text-blue-100 mb-4">
              {analytics ? `Search ${analytics.searchable} contacts` : 'AI-powered semantic search'}
            </p>

            <label className="flex items-center justify-center gap-2 text-blue-100 mb-6">
              <input
                type="checkbox"
                checked={useSemanticSearch}
                onChange={(e) => setUseSemanticSearch(e.target.checked)}
                className="rounded"
              />
              <Brain className="h-4 w-4" />
              <span className="text-sm">Semantic Search</span>
            </label>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            className="relative max-w-2xl mx-auto"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Describe the expertise you need..."
              className="w-full px-6 py-4 pr-32 text-gray-900 bg-white rounded-xl shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30 text-lg"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-2 top-2 bg-frank-blue text-white px-6 py-2 rounded-lg hover:bg-frank-blue/90 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  <span>Search</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="text-sm text-blue-100">Try:</span>
            {popularSearches.map((term) => (
              <button
                key={term}
                onClick={() => handleSearch(term)}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-sm text-white transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats before search */}
      {!hasSearched && analytics && (
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard icon={Database} color="text-frank-blue" value={analytics.total} label="Total Contacts" />
            <StatCard icon={Brain} color="text-purple-500" value={analytics.searchable} label="Searchable" />
            <StatCard icon={Building2} color="text-green-500" value={analytics.unique_companies} label="Companies" />
            <StatCard icon={Users} color="text-orange-500" value={analytics.unique_leads} label="Innovera Leads" />
          </div>
        </div>
      )}

      {/* Loading */}
      {isSearching && (
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-frank-blue mx-auto mb-4" />
            <p className="text-gray-600">AI is finding the best matches...</p>
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && !isSearching && (
        <div className="max-w-6xl mx-auto px-4 py-12">
          {searchMeta?.wasEnhanced && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-1">
                <Brain className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Smart Search</span>
              </div>
              <p className="text-sm text-blue-800">
                Query expanded from "{searchMeta.original}" to include related terms and context.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {results.length} result{results.length !== 1 ? 's' : ''} for "{searchQuery}"
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {useSemanticSearch ? 'Semantic search' : 'Keyword search'}
                {results.some(r => r.similarity) && ' — sorted by relevance'}
              </p>
            </div>
            <button
              onClick={() => { setSearchQuery(''); setResults([]); setHasSearched(false); }}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Clear
            </button>
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
              <p className="text-gray-600">Try a different query or broaden your search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function StatCard({ icon: Icon, color, value, label }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow">
      <Icon className={`h-8 w-8 ${color} mx-auto mb-2`} />
      <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function ContactCard({ contact }) {
  const avatarUrl = contact.profile_pic_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name || 'U')}&background=6366F1&color=fff&size=80`;

  const industries = Array.isArray(contact.industry) ? contact.industry : [];
  const similarity = contact.similarity ? Math.round(contact.similarity * 100) : null;

  return (
    <Link to={`/contact/${contact.id}`} className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-frank-blue to-frank-light-blue" />
      <div className="p-5">
        <div className="flex items-start space-x-4">
          <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 truncate">{contact.name}</h3>
              {similarity && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2">
                  {similarity}%
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 truncate">
              {contact.current_position || contact.headline || contact.title || 'Professional'}
            </p>
            <p className="text-sm text-gray-500 truncate">
              {contact.current_company || contact.company || ''}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          {industries.slice(0, 3).map((ind, i) => (
            <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              {ind}
            </span>
          ))}
          {contact.expert_score && (
            <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star className="h-3 w-3" /> {contact.expert_score}/5
            </span>
          )}
        </div>

        {contact.location && (
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <MapPin className="h-3 w-3 mr-1" />
            {contact.location}
          </div>
        )}
      </div>
    </Link>
  );
}

export default FindExpert;
