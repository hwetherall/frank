import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Filter, ChevronDown, MapPin, Building2, 
  Briefcase, Users, Globe, CheckCircle, AlertCircle, 
  Clock, ExternalLink, Download, RefreshCw 
} from 'lucide-react';
import { mockExperts } from '../data/mockExperts';

const ViewDatabase = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [functionFilter, setFunctionFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(true);

  // Extract unique values for filters
  const locations = [...new Set(mockExperts.map(e => e.location))].sort();
  const industries = [...new Set(mockExperts.map(e => e.industry))].sort();
  const functions = [...new Set(mockExperts.map(e => e.function))].sort();

  // Filter experts based on all criteria
  const filteredExperts = useMemo(() => {
    return mockExperts.filter(expert => {
      const matchesSearch = searchTerm === '' || 
        expert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expert.expertise.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())) ||
        expert.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expert.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesLocation = locationFilter === 'all' || expert.location === locationFilter;
      const matchesIndustry = industryFilter === 'all' || expert.industry === industryFilter;
      const matchesFunction = functionFilter === 'all' || expert.function === functionFilter;
      const matchesType = typeFilter === 'all' || expert.type === typeFilter;

      return matchesSearch && matchesLocation && matchesIndustry && matchesFunction && matchesType;
    });
  }, [searchTerm, locationFilter, industryFilter, functionFilter, typeFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setLocationFilter('all');
    setIndustryFilter('all');
    setFunctionFilter('all');
    setTypeFilter('all');
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
    locationFilter !== 'all',
    industryFilter !== 'all',
    functionFilter !== 'all',
    typeFilter !== 'all'
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Expert Database</h1>
              <p className="mt-1 text-sm text-gray-600">
                Browse and manage all {mockExperts.length} experts in the system
              </p>
            </div>
            <div className="mt-4 md:mt-0 flex space-x-3">
              <button className="px-4 py-2 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 transition-colors flex items-center space-x-2">
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button className="px-4 py-2 bg-white text-frank-blue border border-frank-blue rounded-lg hover:bg-frank-light-gray transition-colors flex items-center space-x-2">
                <RefreshCw className="h-4 w-4" />
                <span>Sync</span>
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
              placeholder="Search by name, expertise, location, or industry..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-frank-blue focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-frank-blue"
                >
                  <option value="all">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Function</label>
                <select
                  value={functionFilter}
                  onChange={(e) => setFunctionFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-frank-blue"
                >
                  <option value="all">All Functions</option>
                  {functions.map(func => (
                    <option key={func} value={func}>{func}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expert Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-frank-blue"
                >
                  <option value="all">All Types</option>
                  <option value="Internal">Internal Only</option>
                  <option value="External">External Only</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-sm text-gray-600">
          Showing <span className="font-semibold">{filteredExperts.length}</span> of{' '}
          <span className="font-semibold">{mockExperts.length}</span> experts
        </p>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expert
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Industry
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Function
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExperts.map((expert) => (
                  <tr key={expert.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={expert.photo}
                          alt={expert.name}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{expert.name}</div>
                          <div className="text-sm text-gray-500">{expert.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                        {expert.location}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Building2 className="h-3 w-3 mr-1 text-gray-400" />
                        {expert.industry}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Briefcase className="h-3 w-3 mr-1 text-gray-400" />
                        {expert.function}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        expert.type === 'Internal' 
                          ? 'bg-internal-green text-white' 
                          : 'bg-external-blue text-white'
                      }`}>
                        {expert.type === 'Internal' ? (
                          <Users className="h-3 w-3 mr-1" />
                        ) : (
                          <Globe className="h-3 w-3 mr-1" />
                        )}
                        {expert.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm">
                        {getAvailabilityIcon(expert.availability)}
                        <span className="ml-1 text-gray-900">{expert.availability}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        to={`/expert/${expert.id}`}
                        className="text-frank-blue hover:text-frank-blue/80 flex items-center space-x-1"
                      >
                        <span>View Profile</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredExperts.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No experts found matching your criteria</p>
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewDatabase;
