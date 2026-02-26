import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Database, Search, ChevronLeft, ChevronRight, RefreshCw, Star, ExternalLink } from 'lucide-react';
import { getAllContacts, getAnalytics } from '../services/contactsService';

const PAGE_SIZE = 50;

const ViewDatabase = () => {
  const [contacts, setContacts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [analytics, setAnalytics] = useState(null);

  const loadPage = async (p = page) => {
    setLoading(true);
    try {
      const { data, count } = await getAllContacts({
        limit: PAGE_SIZE,
        offset: p * PAGE_SIZE,
        status: statusFilter || null,
      });
      setContacts(data);
      setTotalCount(count);
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage(0);
    setPage(0);
  }, [statusFilter]);

  useEffect(() => {
    getAnalytics().then(setAnalytics).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return contacts;
    const q = searchTerm.toLowerCase();
    return contacts.filter(c =>
      [c.name, c.company, c.title, c.headline, c.current_company, c.current_position, c.innovera_contact, c.location]
        .some(f => f && f.toLowerCase().includes(q))
    );
  }, [contacts, searchTerm]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const goToPage = (p) => {
    setPage(p);
    loadPage(p);
  };

  const statusColors = {
    uploaded: 'bg-gray-100 text-gray-700',
    enriching: 'bg-blue-100 text-blue-700',
    enriched: 'bg-blue-200 text-blue-800',
    scoring: 'bg-yellow-100 text-yellow-700',
    scored: 'bg-yellow-200 text-yellow-800',
    embedding: 'bg-purple-100 text-purple-700',
    ready: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="h-8 w-8 text-frank-blue" /> Contact Database
          </h1>
          <p className="text-gray-600 mt-1">
            {totalCount} contacts total
            {analytics && ` — ${analytics.searchable} searchable, ${analytics.unique_companies} companies`}
          </p>
        </div>
        <button onClick={() => loadPage(page)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter visible rows..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-frank-blue focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-frank-blue"
        >
          <option value="">All statuses</option>
          <option value="uploaded">Uploaded</option>
          <option value="enriched">Enriched</option>
          <option value="scored">Scored</option>
          <option value="ready">Ready</option>
          <option value="error">Error</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">LinkedIn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No contacts found</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/contact/${c.id}`} className="text-frank-blue hover:underline font-medium">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate">
                    {c.current_position || c.headline || c.title || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">
                    {c.current_company || c.company || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-[150px] truncate">{c.location || '—'}</td>
                  <td className="px-4 py-3">
                    {c.expert_score ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                        {c.expert_score}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusColors[c.status] || 'bg-gray-100'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.innovera_contact || '—'}</td>
                  <td className="px-4 py-3">
                    {c.linkedin_url && (
                      <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-frank-blue hover:underline">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-600">
              Page {page + 1} of {totalPages} ({totalCount} total)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 0}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages - 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewDatabase;
