import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Filter, ChevronDown, MapPin, Building2, 
  Briefcase, CheckCircle, AlertCircle, 
  Clock, Download, RefreshCw, User, Users, Loader 
} from 'lucide-react';
import { getAllContacts, searchContacts, transformContactToExpert, getContactStats, getAllExperts, getExpertStats, transformExpertForDisplay } from '../services/contactsService';
import StarRating from './StarRating';

const ViewDatabase = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [dataSource, setDataSource] = useState('experts'); // 'experts' or 'contacts'

  // Load data on component mount
  useEffect(() => {
    loadData();
    loadStats();
  }, [dataSource]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (dataSource === 'experts') {
        const expertsData = await getAllExperts({ limit: 10000 });
        setExperts(expertsData);
        setContacts([]); // Clear contacts when loading experts
      } else {
        const contactsData = await getAllContacts({ limit: 10000 });
        setContacts(contactsData);
        setExperts([]); // Clear experts when loading contacts
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error(`Failed to load ${dataSource}:`, err);
      // If experts fail to load, try contacts as fallback
      if (dataSource === 'experts') {
        try {
          const contactsData = await getAllContacts({ limit: 10000 });
          setContacts(contactsData);
          setExperts([]);
          setDataSource('contacts');
          setError(null);
        } catch (contactsErr) {
          console.error('Failed to load contacts as fallback:', contactsErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    setDataSource('contacts');
  };

  const loadStats = async () => {
    try {
      if (dataSource === 'experts') {
        const statsData = await getExpertStats();
        setStats(statsData);
      } else {
        const statsData = await getContactStats();
        setStats(statsData);
      }
    } catch (err) {
      console.error(`Failed to load ${dataSource} stats:`, err);
    }
  };

  // Transform data for display
  const displayData = useMemo(() => {
    if (dataSource === 'experts') {
      return experts.map(transformExpertForDisplay);
    } else {
      return contacts.map(transformContactToExpert);
    }
  }, [contacts, experts, dataSource]);

  // Extract unique values for filters
  const industries = useMemo(() => {
    const allIndustries = new Set();
    const sourceData = dataSource === 'experts' ? experts : contacts;
    sourceData.forEach(item => {
      let industry = item.industry;
      
      // Handle case where industry might be an object
      if (typeof industry === 'object' && industry !== null && !Array.isArray(industry)) {
        industry = industry.name || industry.title || String(industry);
      }
      
      if (Array.isArray(industry)) {
        industry.forEach(ind => {
          // Handle nested objects in array
          const indStr = typeof ind === 'object' && ind !== null ? (ind.name || ind.title || String(ind)) : ind;
          if (indStr && typeof indStr === 'string' && indStr.trim() && indStr !== 'Unknown') {
            allIndustries.add(indStr);
          }
        });
      } else if (industry && typeof industry === 'string' && industry.trim() && industry !== 'Unknown') {
        allIndustries.add(industry);
      }
    });
    return [...allIndustries].sort();
  }, [contacts, experts, dataSource]);

  // Filter data based on criteria
  const filteredData = useMemo(() => {
    if (searchTerm.trim()) {
      // If there's a search term, don't apply other filters to keep it simple
      return displayData.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        return item.name.toLowerCase().includes(searchLower) ||
               item.company.toLowerCase().includes(searchLower) ||
               item.title.toLowerCase().includes(searchLower) ||
               item.industry.toLowerCase().includes(searchLower) ||
               (item.lead && item.lead.toLowerCase().includes(searchLower));
      });
    }

    return displayData.filter(item => {
      const matchesIndustry = industryFilter === 'all' || 
        (Array.isArray(item.industries) ? 
          item.industries.some(ind => ind === industryFilter) : 
          item.industry.includes(industryFilter));

      return matchesIndustry;
    });
  }, [displayData, searchTerm, industryFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setIndustryFilter('all');
  };

  const getAvailabilityIcon = (availability) => {
    switch (availability) {
      case 'Available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Busy':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const activeFiltersCount = [
    industryFilter !== 'all'
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-frank-blue mx-auto mb-4" />
          <p className="text-gray-600">Loading {dataSource === 'experts' ? 'experts' : 'contacts'} from Supabase...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading {dataSource === 'experts' ? 'Experts' : 'Contacts'}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-2">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 transition-colors"
            >
              Try Again
            </button>
            {dataSource === 'experts' && (
              <button
                onClick={() => setDataSource('contacts')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Load Contacts Instead
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{dataSource === 'experts' ? 'Expert' : 'Contact'} Database</h1>
              <p className="mt-1 text-sm text-gray-600">
                Browse and manage all {dataSource === 'experts' ? experts.length : contacts.length} {dataSource === 'experts' ? 'experts' : 'contacts'} from Supabase
                {stats && (
                  <span className="ml-2 text-gray-500">
                    • {dataSource === 'experts' ? stats.uniqueIndustries : stats.uniqueIndustries} industries • {dataSource === 'experts' ? stats.uniqueCompanies : stats.uniqueCompanies} companies
                  </span>
                )}
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setDataSource('experts')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    dataSource === 'experts' 
                      ? 'bg-white text-frank-blue shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Experts
                </button>
                <button
                  onClick={() => setDataSource('contacts')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    dataSource === 'contacts' 
                      ? 'bg-white text-frank-blue shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Contacts
                </button>
              </div>
              <button className="px-4 py-2 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 transition-colors flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button 
                onClick={loadData}
                className="px-4 py-2 bg-white text-frank-blue border border-frank-blue rounded-lg hover:bg-frank-light-gray transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${dataSource} by name, company, title, industry, or lead...`}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-frank-blue focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 font-medium"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="px-2 py-1 bg-frank-blue text-white text-xs rounded-full">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-sm text-gray-600 hover:text-gray-900 underline"
              >
                Reset all filters
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-frank-blue"
                >
                  <option value="all">All Industries</option>
                  {industries.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Data</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredData.length}</span> of{' '}
          <span className="font-semibold">{dataSource === 'experts' ? experts.length : contacts.length}</span> {dataSource}
        </p>
      </div>

      {/* Table */}
      <div className="w-full px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-1/5 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="w-1/6 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="w-1/5 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="w-1/4 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="w-16 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LinkedIn
                  </th>
                  <th className="w-20 px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((expert) => (
                  <tr key={expert.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-frank-blue flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-medium text-xs">
                            {expert.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                          <Link
                            to={`/expert/${expert.id}`}
                            className="text-sm font-medium text-frank-blue hover:text-frank-blue/80 transition-colors block truncate"
                            title={expert.name}
                          >
                            {expert.name}
                          </Link>
                          <div className="text-xs text-gray-500">ID: {expert.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-gray-900 truncate" title={expert.company}>
                        <Building2 className="h-3 w-3 inline mr-1 text-gray-400" />
                        {expert.company}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-gray-900 truncate" title={expert.title}>
                        <Briefcase className="h-3 w-3 inline mr-1 text-gray-400" />
                        {expert.title}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-sm text-gray-900">
                        {Array.isArray(expert.industries) && expert.industries.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {expert.industries.map((industry, idx) => (
                              <span key={idx} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full whitespace-nowrap">
                                {industry}
                              </span>
                            ))}
                          </div>
                        ) : expert.industry && expert.industry !== 'Unknown' ? (
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full whitespace-nowrap">
                            {expert.industry}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      {expert.lead && expert.lead !== 'Unknown' ? (
                        <div className="text-xs text-gray-900 truncate" title={expert.lead}>
                          {expert.lead}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      {expert.linkedin ? (
                        <a
                          href={expert.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-frank-blue hover:text-frank-blue/80 text-xs"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="text-xs text-gray-500">
                        {expert.lastContact ? new Date(expert.lastContact).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        }) : '-'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (dataSource === 'experts' ? experts.length > 0 : contacts.length > 0) && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No {dataSource} found matching your criteria</p>
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
          
          {(dataSource === 'experts' ? experts.length === 0 : contacts.length === 0) && !loading && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No {dataSource} found in database</p>
              <p className="text-sm text-gray-400 mt-2">Upload some {dataSource} to get started!</p>
              {dataSource === 'experts' && (
                <button
                  onClick={() => setDataSource('contacts')}
                  className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Try Viewing Contacts Instead
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewDatabase;
