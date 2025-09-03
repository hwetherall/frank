import React from 'react';
import { MapPin, Building2, Briefcase, Mail, Phone, Clock, CheckCircle, AlertCircle, Brain, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import StarRating from './StarRating';

const ExpertCard = ({ expert, variant = 'default' }) => {
  const getAvailabilityIcon = () => {
    switch (expert.availability) {
      case 'Available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Busy':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTypeColor = () => {
    return expert.type === 'Internal' 
      ? 'bg-internal-green text-white' 
      : 'bg-external-blue text-white';
  };

  if (variant === 'compact') {
    // Compact version for search results
    return (
      <Link 
        to={`/expert/${expert.id}`}
        className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-4 border border-gray-100"
      >
        <div className="flex items-start space-x-4">
          <img
            src={expert.photo}
            alt={expert.name}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-200"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 hover:text-frank-blue transition-colors">
                  {expert.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{expert.expertise[0]}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor()}`}>
                  {expert.type}
                </span>
                {expert.isAIGenerated && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 flex items-center space-x-1">
                    <Brain className="h-3 w-3" />
                    <span>Frank</span>
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <MapPin className="h-3 w-3" />
                <span>{expert.location}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Building2 className="h-3 w-3" />
                <span>{expert.industry}</span>
              </div>
              <div className="flex items-center space-x-1">
                {getAvailabilityIcon()}
                <span>{expert.availability}</span>
              </div>
            </div>
            
            {/* Rating Display */}
            {expert.rating && (
              <div className="mt-2">
                <StarRating 
                  rating={expert.rating} 
                  reviewCount={expert.reviewCount}
                  size="sm"
                  interactive={false}
                />
              </div>
            )}
            
            {expert.expertise.length > 1 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {expert.expertise.slice(0, 3).map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-frank-light-gray text-xs text-gray-700 rounded-full"
                  >
                    {skill}
                  </span>
                ))}
                {expert.expertise.length > 3 && (
                  <span className="px-2 py-1 text-xs text-gray-500">
                    +{expert.expertise.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Default full card version
  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
      <div className="relative">
        <div className="h-32 bg-gradient-to-r from-frank-blue to-frank-light-blue"></div>
        <div className="absolute -bottom-12 left-6">
          <img
            src={expert.photo}
            alt={expert.name}
            className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
          />
        </div>
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getTypeColor()}`}>
            {expert.type}
          </span>
          {expert.isAIGenerated && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white flex items-center space-x-1">
              <Sparkles className="h-3 w-3" />
              <span>Frank</span>
            </span>
          )}
        </div>
      </div>

      <div className="pt-14 px-6 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{expert.name}</h2>
            <p className="text-gray-600 mt-1">{expert.industry} • {expert.function}</p>
          </div>
          <div className="flex items-center space-x-1">
            {getAvailabilityIcon()}
            <span className="text-sm text-gray-600">{expert.availability}</span>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center space-x-2 text-gray-600">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{expert.location}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Mail className="h-4 w-4 text-gray-400" />
            <a href={`mailto:${expert.email}`} className="text-sm hover:text-frank-blue transition-colors">
              {expert.email}
            </a>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Phone className="h-4 w-4 text-gray-400" />
            <span className="text-sm">{expert.phone}</span>
          </div>
        </div>

        {expert.bio && (
          <p className="text-gray-700 text-sm leading-relaxed mb-4">
            {expert.bio}
          </p>
        )}

        {/* Rating Display */}
        {expert.rating && (
          <div className="mb-4 flex justify-center">
            <StarRating 
              rating={expert.rating} 
              reviewCount={expert.reviewCount}
              size="md"
              interactive={false}
            />
          </div>
        )}

        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Expertise Areas</h3>
          <div className="flex flex-wrap gap-2">
            {expert.expertise.map((skill, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-frank-light-gray text-sm text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {expert.yearsExperience && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{expert.yearsExperience}</span> years experience
            </div>
            {expert.lastContact && (
              <div className="text-sm text-gray-500">
                Last contact: {new Date(expert.lastContact).toLocaleDateString()}
              </div>
            )}
          </div>
        )}

        <Link
          to={`/expert/${expert.id}`}
          className="mt-4 w-full bg-frank-blue text-white py-2 px-4 rounded-lg hover:bg-frank-blue/90 transition-colors text-center font-medium inline-block"
        >
          View Full Profile
        </Link>
      </div>
    </div>
  );
};

export default ExpertCard;
