import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit2, Mail, Phone, MapPin, Building2, 
  Briefcase, Calendar, Award, FileText, Paperclip, 
  MessageSquare, Clock, CheckCircle, AlertCircle,
  Download, Share2, Star, Globe, Users, BookOpen, User
} from 'lucide-react';
import { getExpertByIdFromAll } from '../data/mockExperts';
import StarRating from './StarRating';

const ExpertProfile = () => {
  const { id }: any = useParams();
  const navigate = useNavigate();
  const expert = getExpertByIdFromAll(id);
  const [activeTab, setActiveTab] = useState('overview');

  if (!expert) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Expert not found</h2>
          <p className="text-gray-600 mb-4">The expert you're looking for doesn't exist.</p>
          <Link to="/database" className="text-frank-blue hover:underline">
            Return to Database
          </Link>
        </div>
      </div>
    );
  }

  const getAvailabilityStatus = () => {
    switch (expert.availability) {
      case 'Available':
        return { icon: <CheckCircle className="h-5 w-5" />, color: 'text-green-500', bg: 'bg-green-50' };
      case 'Busy':
        return { icon: <AlertCircle className="h-5 w-5" />, color: 'text-orange-500', bg: 'bg-orange-50' };
      default:
        return { icon: <Clock className="h-5 w-5" />, color: 'text-gray-500', bg: 'bg-gray-50' };
    }
  };

  const availabilityStatus = getAvailabilityStatus();

  // Mock files/documents
  const documents = [
    { id: 1, name: 'CV_Resume.pdf', size: '2.4 MB', uploadedDate: '2024-01-15' },
    { id: 2, name: 'Certifications.pdf', size: '1.8 MB', uploadedDate: '2024-01-10' },
    { id: 3, name: 'Publications_List.docx', size: '856 KB', uploadedDate: '2024-01-05' }
  ];

  // Mock recent activities
  const recentActivities = [
    { id: 1, action: 'Completed project review', date: '2 days ago', type: 'project' },
    { id: 2, action: 'Updated expertise areas', date: '1 week ago', type: 'update' },
    { id: 3, action: 'Added new certification', date: '2 weeks ago', type: 'certification' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with back button */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/database')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Database</span>
            </button>
            <div className="flex space-x-3">
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Share2 className="h-5 w-5" />
              </button>
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="h-5 w-5" />
              </button>
              <Link
                to={`/update/${expert.id}`}
                className="px-4 py-2 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 transition-colors flex items-center space-x-2"
              >
                <Edit2 className="h-4 w-4" />
                <span>Edit Expert</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-frank-blue to-frank-light-blue">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
            <img
              src={expert.photo}
              alt={expert.name}
              className="w-32 h-32 rounded-full border-4 border-white shadow-xl"
            />
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
                <h1 className="text-3xl font-bold text-white">{expert.name}</h1>
                <div className="flex items-center justify-center md:justify-start space-x-2 mt-2 md:mt-0">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    expert.type === 'Internal' 
                      ? 'bg-internal-green text-white' 
                      : 'bg-external-blue text-white'
                  }`}>
                    {expert.type === 'Internal' ? <Users className="h-3 w-3 inline mr-1" /> : <Globe className="h-3 w-3 inline mr-1" />}
                    {expert.type} Expert
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${availabilityStatus.bg} ${availabilityStatus.color} flex items-center space-x-1`}>
                    {availabilityStatus.icon}
                    <span>{expert.availability}</span>
                  </span>
                </div>
              </div>
              
              <p className="text-blue-100 mt-2">{expert.industry} • {expert.function}</p>
              
              {/* Rating Display */}
              {expert.rating && (
                <div className="mt-3 flex justify-center md:justify-start">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                    <StarRating 
                      rating={expert.rating} 
                      reviewCount={expert.reviewCount}
                      size="lg"
                      interactive={false}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex flex-wrap gap-4 mt-4 text-white justify-center md:justify-start">
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{expert.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Award className="h-4 w-4" />
                  <span>{expert.yearsExperience} years experience</span>
                </div>
                {expert.certifications && (
                  <div className="flex items-center space-x-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{expert.certifications.length} certifications</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {['overview', 'expertise', 'notes', 'documents', 'activity'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? 'border-frank-blue text-frank-blue'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Bio */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Biography</h2>
                <p className="text-gray-700 leading-relaxed">{expert.bio}</p>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
                <div className="space-y-3">
                  {expert.lead && (
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Internal Lead</p>
                        <p className="text-gray-900">{expert.lead}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <a href={`mailto:${expert.email}`} className="text-frank-blue hover:underline">
                        {expert.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="text-gray-900">{expert.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Location</p>
                      <p className="text-gray-900">{expert.location}</p>
                    </div>
                  </div>
                  {expert.lastContact && (
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Last Contact</p>
                        <p className="text-gray-900">{new Date(expert.lastContact).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Quick Stats */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Experience</span>
                    <span className="font-semibold">{expert.yearsExperience} years</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Expertise Areas</span>
                    <span className="font-semibold">{expert.expertise.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Type</span>
                    <span className="font-semibold">{expert.type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Industry</span>
                    <span className="font-semibold">{expert.industry}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Function</span>
                    <span className="font-semibold">{expert.function}</span>
                  </div>
                  {expert.lead && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Lead</span>
                      <span className="font-semibold">{expert.lead}</span>
                    </div>
                  )}
                  {expert.rating && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Rating</span>
                      <div className="flex items-center space-x-1">
                        <StarRating 
                          rating={expert.rating} 
                          reviewCount={0}
                          size="sm"
                          interactive={false}
                          showReviewCount={false}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Certifications */}
              {expert.certifications && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
                  <div className="space-y-2">
                    {expert.certifications.map((cert, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <Award className="h-4 w-4 text-frank-blue mt-0.5" />
                        <span className="text-sm text-gray-700">{cert}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'expertise' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Areas of Expertise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expert.expertise.map((skill, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-gray-700">{skill}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Notes</h2>
              <button className="px-4 py-2 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 transition-colors flex items-center space-x-2">
                <MessageSquare className="h-4 w-4" />
                <span>Add Note</span>
              </button>
            </div>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-gray-700">{expert.notes}</p>
                  <p className="text-sm text-gray-500 mt-2">Last updated: {expert.lastContact ? new Date(expert.lastContact).toLocaleDateString() : 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Files & Documents</h2>
              <button className="px-4 py-2 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 transition-colors flex items-center space-x-2">
                <Paperclip className="h-4 w-4" />
                <span>Upload File</span>
              </button>
            </div>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{doc.name}</p>
                      <p className="text-sm text-gray-500">{doc.size} • Uploaded {doc.uploadedDate}</p>
                    </div>
                  </div>
                  <button className="p-2 text-frank-blue hover:bg-blue-50 rounded-lg transition-colors">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'project' ? 'bg-blue-100' :
                    activity.type === 'update' ? 'bg-green-100' :
                    'bg-purple-100'
                  }`}>
                    {activity.type === 'project' ? <Briefcase className="h-4 w-4 text-blue-600" /> :
                     activity.type === 'update' ? <Edit2 className="h-4 w-4 text-green-600" /> :
                     <Award className="h-4 w-4 text-purple-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900">{activity.action}</p>
                    <p className="text-sm text-gray-500 mt-1">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertProfile;
