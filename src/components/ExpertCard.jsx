import React from 'react';
import { MapPin, Building2, Briefcase, Mail, Phone, Clock, CheckCircle, AlertCircle, Brain, Sparkles, User } from 'lucide-react';
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
            src={expert.photo || expert.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name || 'Expert')}&background=6366F1&color=fff&size=200`}
            alt={expert.name}
            className="w-16 h-16 rounded-full object-cover ring-2 ring-gray-200"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 hover:text-frank-blue transition-colors">
                  {expert.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{expert.title}</p>
                {expert.expertise && Array.isArray(expert.expertise) && expert.expertise.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {expert.expertise.slice(0, 2).join(' • ')}
                    {expert.expertise.length > 2 && ` • +${expert.expertise.length - 2} more`}
                  </p>
                )}
                {expert.industry && (
                  <p className="text-xs text-gray-500 mt-1">
                    {Array.isArray(expert.industry) ? expert.industry.slice(0, 2).join(' • ') : expert.industry}
                  </p>
                )}
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
            
            {/* Expert Score Display */}
            {expert.expert_score && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Expert Score:</span>
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={`text-xs ${i < expert.expert_score ? 'text-yellow-400' : 'text-gray-300'}`}
                      >
                        ★
                      </span>
                    ))}
                    <span className="text-xs text-gray-600 ml-1">({expert.expert_score}/5)</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Similarity Score Display */}
            {expert.similarity && (
              <div className="mt-1">
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  {Math.round(expert.similarity * 100)}% match
                </span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
              {expert.company && (
                <div className="flex items-center space-x-1">
                  <Building2 className="h-3 w-3" />
                  <span>{expert.company}</span>
                </div>
              )}
              {expert.function && expert.function !== 'Unknown' && (
                <div className="flex items-center space-x-1">
                  <Briefcase className="h-3 w-3" />
                  <span>{expert.function}</span>
                </div>
              )}
              {expert.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>{expert.location}</span>
                </div>
              )}
              {expert.lead && expert.lead !== 'Unknown' && (
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>{expert.lead}</span>
                </div>
              )}
              {expert.followers && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs">👥 {expert.followers.toLocaleString()} followers</span>
                </div>
              )}
              {expert.connections && (
                <div className="flex items-center space-x-1">
                  <span className="text-xs">🔗 {expert.connections.toLocaleString()} connections</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                {getAvailabilityIcon()}
                <span>{expert.availability || 'Unknown'}</span>
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
            
            {/* Show expertise or industry tags */}
            {((expert.expertise && Array.isArray(expert.expertise) && expert.expertise.length > 1) || (expert.industry && Array.isArray(expert.industry))) && (
              <div className="flex flex-wrap gap-1 mt-3">
                {expert.expertise && Array.isArray(expert.expertise) && expert.expertise.length > 1 ? (
                  <>
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
                  </>
                ) : expert.industry && Array.isArray(expert.industry) && expert.industry.length > 0 ? (
                  expert.industry.slice(0, 3).map((industry, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-xs text-blue-700 rounded-full"
                    >
                      {industry}
                    </span>
                  ))
                ) : null}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Default full card version
  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden h-full flex flex-col">
      <div className="relative flex-shrink-0">
        <div className="h-32 bg-gradient-to-r from-frank-blue to-frank-light-blue"></div>
        <div className="absolute -bottom-12 left-6">
          <img
            src={expert.photo || expert.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(expert.name || 'Expert')}&background=6366F1&color=fff&size=200`}
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

      <div className="pt-14 px-6 pb-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{expert.name}</h2>
            <p className="text-gray-600 mt-1">
              {expert.industry && Array.isArray(expert.industry) 
                ? expert.industry.join(' • ') 
                : expert.industry || expert.function || 'Professional'}
            </p>
            {expert.expert_score && (
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm text-gray-500">Expert Score:</span>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-sm ${i < expert.expert_score ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      ★
                    </span>
                  ))}
                  <span className="text-sm text-gray-600 ml-1">({expert.expert_score}/5)</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end space-y-1">
            <div className="flex items-center space-x-1">
              {getAvailabilityIcon()}
              <span className="text-sm text-gray-600">{expert.availability || 'Unknown'}</span>
            </div>
            {expert.similarity && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                {Math.round(expert.similarity * 100)}% match
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3 mb-4 flex-shrink-0">
          {expert.location && (
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{expert.location}</span>
            </div>
          )}
          {expert.lead && expert.lead !== 'Unknown' && (
            <div className="flex items-center space-x-2 text-gray-600">
              <User className="h-4 w-4 text-gray-400" />
              <span className="text-sm">Innovera Lead: {expert.lead}</span>
            </div>
          )}
          {expert.email && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Mail className="h-4 w-4 text-gray-400" />
              <a href={`mailto:${expert.email}`} className="text-sm hover:text-frank-blue transition-colors">
                {expert.email}
              </a>
            </div>
          )}
          {expert.phone && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Phone className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{expert.phone}</span>
            </div>
          )}
          {expert.company && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Building2 className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{expert.company}</span>
            </div>
          )}
          {expert.title && (
            <div className="flex items-center space-x-2 text-gray-600">
              <Briefcase className="h-4 w-4 text-gray-400" />
              <span className="text-sm">{expert.title}</span>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col">
          {expert.bio && (
            <div className="mb-4 flex-shrink-0">
              <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
                {expert.bio}
              </p>
            </div>
          )}

          {/* Rating Display */}
          {expert.rating && (
            <div className="mb-4 flex justify-center flex-shrink-0">
              <StarRating 
                rating={expert.rating} 
                reviewCount={expert.reviewCount}
                size="md"
                interactive={false}
              />
            </div>
          )}

          {/* Show expertise or industry areas */}
          {((expert.expertise && Array.isArray(expert.expertise) && expert.expertise.length > 0) || (expert.industry && Array.isArray(expert.industry) && expert.industry.length > 0)) && (
            <div className="mb-4 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {expert.expertise && Array.isArray(expert.expertise) && expert.expertise.length > 0 ? 'Expertise Areas' : 'Industry Focus'}
              </h3>
              <div className="flex flex-wrap gap-2">
                {expert.expertise && Array.isArray(expert.expertise) && expert.expertise.length > 0 ? (
                  <>
                    {expert.expertise.slice(0, 4).map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-frank-light-gray text-sm text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        {skill}
                      </span>
                    ))}
                    {expert.expertise.length > 4 && (
                      <span className="px-3 py-1 text-sm text-gray-500">
                        +{expert.expertise.length - 4} more
                      </span>
                    )}
                  </>
                ) : expert.industry && Array.isArray(expert.industry) && expert.industry.length > 0 ? (
                  expert.industry.slice(0, 4).map((industry, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-50 text-sm text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      {industry}
                    </span>
                  ))
                ) : null}
              </div>
            </div>
          )}

          {expert.certifications && Array.isArray(expert.certifications) && expert.certifications.length > 0 && (
            <div className="mb-4 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Certifications</h3>
              <div className="flex flex-wrap gap-2">
                {expert.certifications.slice(0, 2).map((cert, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-50 text-sm text-blue-700 rounded-full border border-blue-200"
                  >
                    {cert}
                  </span>
                ))}
                {expert.certifications.length > 2 && (
                  <span className="px-3 py-1 text-sm text-gray-500">
                    +{expert.certifications.length - 2} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex-1"></div>

          {expert.yearsExperience && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-shrink-0">
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
            className="mt-4 w-full bg-frank-blue text-white py-2 px-4 rounded-lg hover:bg-frank-blue/90 transition-colors text-center font-medium inline-block flex-shrink-0"
          >
            View Full Profile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ExpertCard;
