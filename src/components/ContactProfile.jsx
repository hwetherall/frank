import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Star, MapPin, Building2, Mail, Phone, ExternalLink, Briefcase, GraduationCap, Award, Globe, Users, BookOpen } from 'lucide-react';
import { getContactById } from '../services/contactsService';

const ContactProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getContactById(id);
        setContact(data);
      } catch (err) {
        console.error('Failed to load contact:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-frank-blue mx-auto" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Contact not found</h2>
        <Link to="/database" className="text-frank-blue hover:underline">Back to database</Link>
      </div>
    );
  }

  const avatarUrl = contact.profile_pic_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=6366F1&color=fff&size=200`;

  const industries = Array.isArray(contact.industry) ? contact.industry : [];
  const skills = Array.isArray(contact.skills) ? contact.skills : [];
  const experiences = Array.isArray(contact.experiences) ? contact.experiences : [];
  const educations = Array.isArray(contact.education) ? contact.education : [];
  const certs = Array.isArray(contact.certifications) ? contact.certifications : [];
  const languages = Array.isArray(contact.languages) ? contact.languages : [];

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'experience', label: 'Experience' },
    { key: 'education', label: 'Education' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="h-5 w-5 mr-1" /> Back
      </button>

      {/* Header card */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-r from-frank-blue to-frank-light-blue" />
        <div className="px-6 pb-6 -mt-12">
          <div className="flex items-end space-x-4">
            <img src={avatarUrl} alt="" className="h-24 w-24 rounded-full border-4 border-white object-cover" />
            <div className="pb-1 flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
                  <p className="text-gray-600">{contact.current_position || contact.headline || contact.title}</p>
                  <p className="text-gray-500 text-sm">{contact.current_company || contact.company}</p>
                </div>
                {contact.expert_score && (
                  <div className="flex items-center space-x-1 bg-yellow-50 px-3 py-1 rounded-full">
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-yellow-800">{contact.expert_score}/5</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick info pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            {contact.location && (
              <span className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                <MapPin className="h-3.5 w-3.5" /> {contact.location}
              </span>
            )}
            {(contact.current_company || contact.company) && (
              <span className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                <Building2 className="h-3.5 w-3.5" /> {contact.current_company || contact.company}
              </span>
            )}
            {contact.follower_count > 0 && (
              <span className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                <Users className="h-3.5 w-3.5" /> {contact.follower_count.toLocaleString()} followers
              </span>
            )}
            {contact.connection_count > 0 && (
              <span className="flex items-center gap-1 text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                <Users className="h-3.5 w-3.5" /> {contact.connection_count.toLocaleString()} connections
              </span>
            )}
          </div>

          {/* Links */}
          <div className="mt-3 flex gap-3">
            {contact.linkedin_url && (
              <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-frank-blue hover:underline text-sm flex items-center gap-1">
                <ExternalLink className="h-3.5 w-3.5" /> LinkedIn
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="text-frank-blue hover:underline text-sm flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {contact.email}
              </a>
            )}
            {contact.phone && (
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {contact.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === key ? 'border-frank-blue text-frank-blue' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary */}
          {contact.summary && (
            <Section title="About">
              <p className="text-gray-700 whitespace-pre-line">{contact.summary}</p>
            </Section>
          )}

          {/* Scoring */}
          {contact.scoring_rationale && (
            <Section title="Expert Assessment">
              <p className="text-gray-700">{contact.scoring_rationale}</p>
            </Section>
          )}

          {/* Industries */}
          {industries.length > 0 && (
            <Section title="Industries">
              <div className="flex flex-wrap gap-2">
                {industries.map((ind, i) => (
                  <span key={i} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">{ind}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <Section title="Skills">
              <div className="flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{typeof s === 'string' ? s : s.name || s}</span>
                ))}
              </div>
            </Section>
          )}

          {/* Languages */}
          {languages.length > 0 && (
            <Section title="Languages">
              <div className="flex flex-wrap gap-2">
                {languages.map((l, i) => (
                  <span key={i} className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" /> {typeof l === 'string' ? l : l.name || l}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Certifications */}
          {certs.length > 0 && (
            <Section title="Certifications">
              <div className="space-y-2">
                {certs.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-yellow-500" />
                    <span>{c.name || c}</span>
                    {c.authority && <span className="text-gray-500">— {c.authority}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Metadata */}
          <Section title="Pipeline Info">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Status:</span> <span className="font-medium">{contact.status}</span></div>
              <div><span className="text-gray-500">Lead:</span> <span className="font-medium">{contact.innovera_contact || '—'}</span></div>
              <div><span className="text-gray-500">Source file:</span> <span className="font-medium">{contact.source_file || '—'}</span></div>
              <div><span className="text-gray-500">Added:</span> <span className="font-medium">{contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '—'}</span></div>
            </div>
          </Section>
        </div>
      )}

      {activeTab === 'experience' && (
        <div className="space-y-6">
          {experiences.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No experience data. Enrich this contact to populate.</p>
          ) : experiences.map((exp, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-5">
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-frank-blue mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">{exp.title}</h3>
                  <p className="text-gray-600">{exp.company}</p>
                  {exp.location && <p className="text-sm text-gray-500">{exp.location}</p>}
                  <p className="text-sm text-gray-400">
                    {formatDate(exp.starts_at)} — {exp.ends_at ? formatDate(exp.ends_at) : 'Present'}
                  </p>
                  {exp.description && <p className="mt-2 text-sm text-gray-700">{exp.description}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'education' && (
        <div className="space-y-6">
          {educations.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No education data. Enrich this contact to populate.</p>
          ) : educations.map((edu, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border p-5">
              <div className="flex items-start gap-3">
                <GraduationCap className="h-5 w-5 text-frank-blue mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-gray-900">{edu.school}</h3>
                  {edu.degree && <p className="text-gray-600">{edu.degree}{edu.field_of_study ? ` — ${edu.field_of_study}` : ''}</p>}
                  <p className="text-sm text-gray-400">
                    {formatDate(edu.starts_at)} — {edu.ends_at ? formatDate(edu.ends_at) : ''}
                  </p>
                  {edu.activities && <p className="mt-2 text-sm text-gray-700">{edu.activities}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-5">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function formatDate(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  const parts = [];
  if (d.month) parts.push(String(d.month).padStart(2, '0'));
  if (d.year) parts.push(d.year);
  return parts.join('/') || '';
}

export default ContactProfile;
