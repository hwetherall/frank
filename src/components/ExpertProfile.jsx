import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit2, Mail, Phone, MapPin, Building2, 
  Briefcase, Calendar, Award, FileText, Paperclip, 
  MessageSquare, Clock, CheckCircle, AlertCircle,
  Download, Share2, Star, Globe, Users, BookOpen, User, Loader,
  X, Plus, Save
} from 'lucide-react';
import { getContactById, transformContactToExpert } from '../services/contactsService';
import { getExpertById } from '../services/expertVectorUploader';
import StarRating from './StarRating';

const ExpertProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [expert, setExpert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Notes state
  const [notes, setNotes] = useState([]);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', priority: 'normal' });

  useEffect(() => {
    const loadExpert = async () => {
      try {
        setLoading(true);
        
        // Try to get expert from expert profiles vector first
        let expertData;
        try {
          const expertProfile = await getExpertById(id);
          
          // Transform expert profile to match expected format
            expertData = {
            id: expertProfile.id,
            name: expertProfile.name,
            title: expertProfile.ld_position || expertProfile.position,
            company: expertProfile.ld_company || (expertProfile.current_company?.name || expertProfile.current_company),
            location: expertProfile.location,
            linkedin: null,
            email: null,
            phone: null,
            industry: Array.isArray(expertProfile.industry) ? expertProfile.industry.join(', ') : (expertProfile.industry || ''),
            industries: Array.isArray(expertProfile.industry) ? expertProfile.industry : [],
            avatar: expertProfile.avatar,
            expert_score: expertProfile.expert_score,
            scoring_rationale: expertProfile.scoring_rationale,
            followers: expertProfile.followers,
            connections: expertProfile.connections,
            posts_count: expertProfile.posts_count,
            activity_count: expertProfile.activity_count,
            type: 'Expert Profile',
            lead: 'Expert Database',
            expertise: Array.isArray(expertProfile.industry) ? expertProfile.industry : [],
            function: 'Expert',
            bio: expertProfile.searchable_text || `${expertProfile.name} is a professional expert.`,
            availability: 'Unknown',
            yearsExperience: null,
            certifications: [],
            rating: null,
            reviewCount: 0,
            photo: expertProfile.avatar,
            created_at: expertProfile.created_at,
            updated_at: expertProfile.updated_at,
            notes: `Expert Score: ${expertProfile.expert_score}/5. ${expertProfile.scoring_rationale || 'Professional expert in our database.'}`,
            // Additional rich data for enhanced display
            fullLocation: expertProfile.location || 'Location not specified',
            companyDetails: expertProfile.current_company,
            rawCompanyData: expertProfile.ld_company,
            fullBio: expertProfile.about || expertProfile.searchable_text,
            experience: expertProfile.experience,
            education: expertProfile.educations_details,
            certificationDetails: expertProfile.certifications,
            publications: expertProfile.publications,
            honors: expertProfile.honors_and_awards
          };
        } catch (expertError) {
          console.warn('Expert not found in expert profiles, trying contacts:', expertError);
          // Fall back to contacts table
          const contact = await getContactById(id);
          expertData = transformContactToExpert(contact);
        }
        
        setExpert(expertData);
        setError(null);
        
        // Load comprehensive notes
        const existingNotes = [];
        
        // Expert Assessment Note
        if (expertData.expert_score && expertData.scoring_rationale) {
          existingNotes.push({
            id: 1,
            title: 'Expert Assessment',
            content: `Expert Score: ${expertData.expert_score}/5\n\nAssessment: ${expertData.scoring_rationale}\n\nScored using: ${expertProfile.scoring_model || 'AI Assessment'}\nScored on: ${expertProfile.scored_at ? new Date(expertProfile.scored_at).toLocaleDateString() : 'Recent'}`,
            priority: 'high',
            createdAt: expertProfile.scored_at || new Date().toISOString(),
            createdBy: 'AI Expert Scorer'
          });
        }

        // Professional Background Note
        if (expertData.fullBio && expertData.fullBio.length > 100) {
          existingNotes.push({
            id: 2,
            title: 'Professional Background',
            content: expertData.fullBio,
            priority: 'normal',
            createdAt: expertData.created_at || new Date().toISOString(),
            createdBy: 'LinkedIn Profile'
          });
        }

        // Network & Activity Note
        if (expertData.followers || expertData.connections) {
          const networkInfo = [];
          if (expertData.followers) networkInfo.push(`${expertData.followers.toLocaleString()} LinkedIn followers`);
          if (expertData.connections) networkInfo.push(`${expertData.connections.toLocaleString()} connections`);
          if (expertData.posts_count) networkInfo.push(`${expertData.posts_count} posts`);
          if (expertData.activity_count) networkInfo.push(`${expertData.activity_count} recent activities`);
          
          existingNotes.push({
            id: 3,
            title: 'Professional Network & Activity',
            content: `LinkedIn Metrics:\n• ${networkInfo.join('\n• ')}\n\nThis indicates ${expertData.followers > 1000 ? 'strong' : 'moderate'} professional visibility and engagement in their field.`,
            priority: 'normal',
            createdAt: expertData.updated_at || new Date().toISOString(),
            createdBy: 'LinkedIn Data'
          });
        }

        // Experience & Education Note  
        if (expertProfile.experience || expertProfile.educations_details) {
          let experienceContent = '';
          if (expertProfile.experience) {
            experienceContent += `Professional Experience:\n${typeof expertProfile.experience === 'string' ? expertProfile.experience : JSON.stringify(expertProfile.experience, null, 2)}\n\n`;
          }
          if (expertProfile.educations_details) {
            experienceContent += `Education:\n${typeof expertProfile.educations_details === 'string' ? expertProfile.educations_details : JSON.stringify(expertProfile.educations_details, null, 2)}`;
          }
          
          if (experienceContent.trim()) {
            existingNotes.push({
              id: 4,
              title: 'Experience & Education',
              content: experienceContent,
              priority: 'normal',
              createdAt: expertData.created_at || new Date().toISOString(),
              createdBy: 'Profile Data'
            });
          }
        }

        // Default note if no specific notes
        if (existingNotes.length === 0) {
          existingNotes.push({
            id: 1,
            title: 'Expert Profile',
            content: expertData.notes || 'Professional expert in our database',
            priority: 'normal',
            createdAt: expertData.created_at || new Date().toISOString(),
            createdBy: expertData.lead || 'Expert Database'
          });
        }

        setNotes(existingNotes);
        
      } catch (err) {
        setError(err.message);
        console.error('Failed to load contact:', err);
      } finally {
        setLoading(false);
      }
    };

    loadExpert();
  }, [id]);

  // Notes functionality
  const handleAddNote = () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;
    
    const note = {
      id: Date.now(),
      title: newNote.title.trim(),
      content: newNote.content.trim(),
      priority: newNote.priority,
      createdAt: new Date().toISOString(),
      createdBy: expert?.lead || 'Current User'
    };
    
    setNotes(prev => [note, ...prev]);
    setNewNote({ title: '', content: '', priority: 'normal' });
    setShowAddNoteModal(false);
  };

  const handleDeleteNote = (noteId) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-frank-blue mx-auto mb-4" />
          <p className="text-gray-600">Loading contact...</p>
        </div>
      </div>
    );
  }

  if (error || !expert) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Contact not found</h2>
          <p className="text-gray-600 mb-4">{error || "The contact you're looking for doesn't exist."}</p>
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
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Professional Profile</h2>
                <div className="space-y-4">
                  {/* Full Biography */}
                  {expert.fullBio && expert.fullBio !== expert.bio && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                      <p className="text-gray-700 leading-relaxed">{expert.fullBio}</p>
                    </div>
                  )}
                  
                  {/* Professional Summary */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Professional Summary</h4>
                    <p className="text-gray-700 leading-relaxed">{expert.bio}</p>
                  </div>
                  
                  {/* Expert Score and Rationale */}
                  {expert.expert_score && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-blue-900">Expert Assessment</h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-blue-600">Score:</span>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={`text-sm ${i < expert.expert_score ? 'text-yellow-400' : 'text-gray-300'}`}
                              >
                                ★
                              </span>
                            ))}
                            <span className="text-sm text-blue-700 ml-1 font-semibold">({expert.expert_score}/5)</span>
                          </div>
                        </div>
                      </div>
                      {expert.scoring_rationale && (
                        <p className="text-blue-800 text-sm leading-relaxed">{expert.scoring_rationale}</p>
                      )}
                    </div>
                  )}

                  {/* LinkedIn Metrics */}
                  {(expert.followers || expert.connections) && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Professional Network</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {expert.followers && (
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{expert.followers.toLocaleString()}</div>
                            <div className="text-sm text-gray-600">Followers</div>
                          </div>
                        )}
                        {expert.connections && (
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{expert.connections.toLocaleString()}</div>
                            <div className="text-sm text-gray-600">Connections</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Expert Overview</h3>
                <div className="space-y-4">
                  
                  {/* Expert Score - Most Important */}
                  {expert.expert_score && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">Expert Score</span>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={`text-lg ${i < expert.expert_score ? 'text-yellow-400' : 'text-gray-300'}`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="font-bold text-blue-700">({expert.expert_score}/5)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Stats */}
                  <div className="space-y-3">
                    {expert.yearsExperience && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Experience</span>
                        <span className="font-semibold text-gray-900">{expert.yearsExperience} years</span>
                      </div>
                    )}
                    
                    {expert.expertise && expert.expertise.length > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Expertise Areas</span>
                        <span className="font-semibold text-gray-900">{expert.expertise.length}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Type</span>
                      <span className={`font-semibold px-2 py-1 rounded-full text-xs ${
                        expert.type === 'Expert Profile' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {expert.type}
                      </span>
                    </div>
                    
                    {expert.fullLocation && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-600">Location</span>
                        <span className="font-semibold text-gray-900 text-right">
                          {expert.fullLocation}
                        </span>
                      </div>
                    )}
                    
                    {expert.industry && (
                      <div className="flex justify-between items-start">
                        <span className="text-sm text-gray-600">Industry</span>
                        <span className="font-semibold text-gray-900 text-right max-w-32 truncate" title={expert.industry}>
                          {expert.industry}
                        </span>
                      </div>
                    )}
                    
                    {expert.function && expert.function !== 'Unknown' && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Function</span>
                        <span className="font-semibold text-gray-900">{expert.function}</span>
                      </div>
                    )}
                    
                    {expert.lead && expert.lead !== 'Unknown' && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Lead</span>
                        <span className="font-semibold text-gray-900">{expert.lead}</span>
                      </div>
                    )}
                  </div>

                  {/* Activity Metrics */}
                  {(expert.posts_count || expert.activity_count) && (
                    <div className="border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Activity</h4>
                      <div className="space-y-2">
                        {expert.posts_count > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Posts</span>
                            <span className="text-sm font-semibold text-gray-900">{expert.posts_count}</span>
                          </div>
                        )}
                        {expert.activity_count > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Activities</span>
                            <span className="text-sm font-semibold text-gray-900">{expert.activity_count}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Legacy Rating (if available) */}
                  {expert.rating && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">User Rating</span>
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
                    </div>
                  )}
                </div>
              </div>

              {/* Company Information */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h3>
                <div className="space-y-4">
                  {expert.company && (
                    <div>
                      <h4 className="font-medium text-gray-900 text-lg">{expert.company}</h4>
                      {expert.title && (
                        <p className="text-sm text-gray-600 mt-1">{expert.title}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Company enrichment suggestions */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 className="text-sm font-medium text-blue-900 mb-2">💡 Company Intelligence</h5>
                    <div className="text-xs text-blue-800 space-y-1">
                      <p>• Company size and industry details</p>
                      <p>• Recent news and developments</p>
                      <p>• Key executives and leadership</p>
                      <p>• Financial information and funding</p>
                    </div>
                    <div className="mt-2 flex space-x-2">
                      <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors">
                        Enrich with Clearbit
                      </button>
                      <button className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition-colors">
                        LinkedIn Company
                      </button>
                    </div>
                  </div>

                  {/* Show any available company data */}
                  {expert.companyDetails && typeof expert.companyDetails === 'object' && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Available Data</h5>
                      <div className="text-xs text-gray-700 space-y-1">
                        {Object.entries(expert.companyDetails).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace('_', ' ')}:</span>
                            <span className="font-medium">{String(value).substring(0, 30)}...</span>
                          </div>
                        ))}
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
              <button 
                onClick={() => setShowAddNoteModal(true)}
                className="px-4 py-2 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Note</span>
              </button>
            </div>
            
            {notes.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No notes yet</p>
                <p className="text-sm text-gray-400 mt-2">Add your first note to keep track of interactions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className={`border rounded-lg p-4 ${getPriorityColor(note.priority)}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{note.title}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadge(note.priority)}`}>
                          {note.priority}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-gray-700 mb-3">{note.content}</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>By {note.createdBy}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add New Note</h3>
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter note title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-frank-blue focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority
                </label>
                <select
                  value={newNote.priority}
                  onChange={(e) => setNewNote(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-frank-blue focus:border-transparent"
                >
                  <option value="normal">Normal</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter your note here..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-frank-blue focus:border-transparent resize-none"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAddNoteModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={!newNote.title.trim() || !newNote.content.trim()}
                className="px-4 py-2 bg-frank-blue text-white rounded-lg hover:bg-frank-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Note</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertProfile;
