import type { Expert, ExpertIndustry, ExpertFunction, ExpertType, ExpertAvailability } from '../types';

export const mockExperts: Expert[] = [
  // Internal Experts
  {
    id: 'int-001',
    name: 'Dr. Sarah Chen',
    photo: 'https://ui-avatars.com/api/?name=Sarah+Chen&background=10B981&color=fff&size=200',
    location: 'Chicago, IL',
    industry: 'Nuclear' as ExpertIndustry,
    function: 'Engineering' as ExpertFunction,
    type: 'Internal' as ExpertType,
    lead: 'Daniel',
    email: 'sarah.chen@innovera.com',
    phone: '+1 (312) 555-0101',
    expertise: [
      'Nuclear Reactor Design',
      'Safety Systems Engineering',
      'Thermal Hydraulics',
      'Nuclear Fuel Management',
      'Regulatory Compliance'
    ],
    notes: 'Led the safety review for 3 major nuclear facilities. Published 15 papers on reactor safety. Fluent in Mandarin and English. Available for complex safety assessments and regulatory reviews.',
    lastContact: '2024-01-15',
    availability: 'Available' as ExpertAvailability,
    yearsExperience: 18,
    certifications: ['PE - Nuclear', 'NRC Senior Reactor Operator'],
    bio: 'Dr. Chen is a leading expert in nuclear engineering with extensive experience in reactor design and safety systems. She has consulted for major utilities across North America.',
    rating: 4.8,
    reviewCount: 23
  },
  {
    id: 'int-002',
    name: 'Marcus Rodriguez',
    photo: 'https://ui-avatars.com/api/?name=Marcus+Rodriguez&background=10B981&color=fff&size=200',
    location: 'New York, NY',
    industry: 'Venture Capital' as ExpertIndustry,
    function: 'Finance' as ExpertFunction,
    type: 'Internal' as ExpertType,
    lead: 'Bobby',
    email: 'marcus.rodriguez@innovera.com',
    phone: '+1 (212) 555-0102',
    expertise: [
      'Series A/B Funding',
      'Due Diligence',
      'Portfolio Management',
      'Tech Startup Valuation',
      'Exit Strategy Planning',
      'LP Relations'
    ],
    notes: 'Successfully raised $2.3B across 4 funds. Portfolio includes 3 unicorns. Strong network in Silicon Valley and NYC. Specializes in deep tech and clean energy investments.',
    lastContact: '2024-01-20',
    availability: 'Busy' as ExpertAvailability,
    yearsExperience: 15,
    certifications: ['CFA', 'MBA - Wharton'],
    bio: 'Marcus has been instrumental in funding over 50 startups, with a focus on transformative technologies. His expertise spans from seed to growth stage investments.',
    rating: 4.9,
    reviewCount: 41
  },
  {
    id: 'int-003',
    name: 'Dr. Raj Patel',
    photo: 'https://ui-avatars.com/api/?name=Raj+Patel&background=10B981&color=fff&size=200',
    location: 'Singapore',
    industry: 'Robotics' as ExpertIndustry,
    function: 'Research' as ExpertFunction,
    type: 'Internal' as ExpertType,
    lead: 'Kamran',
    email: 'raj.patel@innovera.com',
    phone: '+65 8555-0103',
    expertise: [
      'Industrial Automation',
      'Computer Vision',
      'Motion Planning',
      'Human-Robot Interaction',
      'Manufacturing Robotics',
      'AI Integration'
    ],
    notes: 'Holds 22 patents in robotics. Former lead at Boston Dynamics. Currently working on autonomous manufacturing systems. Available for consulting on large-scale automation projects.',
    lastContact: '2024-01-18',
    availability: 'Available' as ExpertAvailability,
    yearsExperience: 20,
    certifications: ['PhD - MIT', 'IEEE Fellow'],
    bio: 'Dr. Patel pioneered several breakthrough technologies in industrial robotics, including adaptive manufacturing systems now used by Fortune 500 companies.',
    rating: 4.7,
    reviewCount: 18
  },
  {
    id: 'int-004',
    name: 'Dr. Lisa Zhang',
    photo: 'https://ui-avatars.com/api/?name=Lisa+Zhang&background=10B981&color=fff&size=200',
    location: 'San Francisco, CA',
    industry: 'AI/ML' as ExpertIndustry,
    function: 'Research' as ExpertFunction,
    type: 'Internal' as ExpertType,
    lead: 'Pedram',
    email: 'lisa.zhang@innovera.com',
    phone: '+1 (415) 555-0104',
    expertise: [
      'Deep Learning',
      'Natural Language Processing',
      'Computer Vision',
      'Reinforcement Learning',
      'MLOps',
      'Transformer Models'
    ],
    notes: 'Former Google Brain researcher. Published 40+ papers in top ML conferences. Expert in large language models and their applications. Currently leading our AI initiatives.',
    lastContact: '2024-01-22',
    availability: 'Available' as ExpertAvailability,
    yearsExperience: 12,
    certifications: ['PhD - Stanford', 'Google Cloud ML Engineer'],
    bio: 'Dr. Zhang has been at the forefront of AI research, contributing to major advances in transformer architectures and practical ML applications.',
    rating: 4.9,
    reviewCount: 35
  },
  {
    id: 'int-005',
    name: 'Mike Thompson',
    photo: 'https://ui-avatars.com/api/?name=Mike+Thompson&background=10B981&color=fff&size=200',
    location: 'Perth, Australia',
    industry: 'Mining' as ExpertIndustry,
    function: 'Operations' as ExpertFunction,
    type: 'Internal' as ExpertType,
    lead: 'Harry',
    email: 'mike.thompson@innovera.com',
    phone: '+61 8 5555 0105',
    expertise: [
      'Open Pit Mining',
      'Mine Planning',
      'Equipment Optimization',
      'Safety Management',
      'Environmental Compliance',
      'Cost Reduction Strategies'
    ],
    notes: 'Managed operations for 5 major mines across Australia and Chile. Reduced operational costs by 30% at Rio Tinto sites. Expert in autonomous mining equipment deployment.',
    lastContact: '2024-01-19',
    availability: 'Available' as ExpertAvailability,
    yearsExperience: 25,
    certifications: ['Mining Engineering - WASM', 'Mine Manager Certificate'],
    bio: 'Mike has revolutionized mining operations through innovative approaches to automation and sustainability, leading teams of 500+ across multiple continents.',
    rating: 4.6,
    reviewCount: 29
  },
  
  // External Experts
  {
    id: 'ext-001',
    name: 'Prof. James Wilson',
    photo: 'https://ui-avatars.com/api/?name=James+Wilson&background=3B82F6&color=fff&size=200',
    location: 'London, UK',
    industry: 'Nuclear' as ExpertIndustry,
    function: 'Strategy' as ExpertFunction,
    type: 'External' as ExpertType,
    lead: 'Daniel',
    email: 'j.wilson@oxfordnuclear.ac.uk',
    phone: '+44 20 5555 0201',
    expertise: [
      'Nuclear Safety Protocols',
      'International Regulations',
      'Risk Assessment',
      'Emergency Response Planning',
      'Decommissioning Strategies',
      'Waste Management'
    ],
    notes: 'Oxford professor and IAEA consultant. Written 3 textbooks on nuclear safety. Advises UK government on nuclear policy. Available for high-level strategic consulting.',
    lastContact: '2024-01-10',
    availability: 'Unknown' as ExpertAvailability,
    yearsExperience: 30,
    certifications: ['PhD - Cambridge', 'Fellow of Royal Society'],
    bio: 'Professor Wilson is internationally recognized for his work on nuclear safety frameworks adopted by over 20 countries.',
    rating: 4.5,
    reviewCount: 12
  },
  {
    id: 'ext-002',
    name: 'Angela Foster',
    photo: 'https://ui-avatars.com/api/?name=Angela+Foster&background=3B82F6&color=fff&size=200',
    location: 'Silicon Valley, CA',
    industry: 'Venture Capital' as ExpertIndustry,
    function: 'Finance' as ExpertFunction,
    type: 'External' as ExpertType,
    lead: 'Bobby',
    email: 'angela@fosteri.com',
    phone: '+1 (650) 555-0202',
    expertise: [
      'Series A/B Venture Funding',
      'Growth Capital',
      'Board Governance',
      'Startup Scaling',
      'Market Analysis',
      'Term Sheet Negotiation'
    ],
    notes: 'Partner at Sequoia Capital for 10 years. Currently runs own fund focused on climate tech. Invested in 8 companies that achieved $1B+ valuations.',
    lastContact: '2023-12-15',
    availability: 'Busy' as ExpertAvailability,
    yearsExperience: 22,
    certifications: ['MBA - Harvard', 'CPA'],
    bio: 'Angela has been a driving force in Silicon Valley, known for identifying and nurturing breakthrough companies in their early stages.',
    rating: 4.8,
    reviewCount: 27
  },
  {
    id: 'ext-003',
    name: 'Hiroshi Tanaka',
    photo: 'https://ui-avatars.com/api/?name=Hiroshi+Tanaka&background=3B82F6&color=fff&size=200',
    location: 'Tokyo, Japan',
    industry: 'Robotics' as ExpertIndustry,
    function: 'Engineering' as ExpertFunction,
    type: 'External' as ExpertType,
    lead: 'Kamran',
    email: 'tanaka@tokyorobotics.jp',
    phone: '+81 3 5555 0203',
    expertise: [
      'Industrial Robotics',
      'Precision Manufacturing',
      'Collaborative Robots',
      'Sensor Integration',
      'Quality Control Systems',
      'Lean Manufacturing'
    ],
    notes: 'Former Toyota chief robotics engineer. Developed cobots used in 200+ factories worldwide. Speaks Japanese, English, and Mandarin. Expert in Japanese manufacturing principles.',
    lastContact: '2024-01-05',
    availability: 'Available' as ExpertAvailability,
    yearsExperience: 28,
    certifications: ['Professional Engineer - Japan', 'Six Sigma Black Belt'],
    bio: 'Tanaka-san revolutionized automotive manufacturing with his innovative approach to human-robot collaboration, increasing productivity by 40% while improving safety.',
    rating: 4.7,
    reviewCount: 19
  },
  {
    id: 'ext-004',
    name: 'Dr. Amanda Kumar',
    photo: 'https://ui-avatars.com/api/?name=Amanda+Kumar&background=3B82F6&color=fff&size=200',
    location: 'Toronto, Canada',
    industry: 'AI/ML' as ExpertIndustry,
    function: 'Research' as ExpertFunction,
    type: 'External' as ExpertType,
    lead: 'Pedram',
    email: 'akumar@vectorinstitute.ca',
    phone: '+1 (416) 555-0204',
    expertise: [
      'Deep Learning Applications',
      'Healthcare AI',
      'Ethical AI',
      'Federated Learning',
      'Neural Architecture Search',
      'AI Safety'
    ],
    notes: 'Director at Vector Institute. Pioneered AI applications in medical imaging that are FDA approved. Published 60+ papers. Strong advocate for responsible AI development.',
    lastContact: '2024-01-12',
    availability: 'Available' as ExpertAvailability,
    yearsExperience: 14,
    certifications: ['PhD - University of Toronto', 'Canada Research Chair'],
    bio: 'Dr. Kumar bridges the gap between cutting-edge AI research and practical healthcare applications, with her work impacting millions of patients globally.',
    rating: 4.9,
    reviewCount: 33
  },
  {
    id: 'ext-005',
    name: 'Robert Clarke',
    photo: 'https://ui-avatars.com/api/?name=Robert+Clarke&background=3B82F6&color=fff&size=200',
    location: 'Vancouver, Canada',
    industry: 'Mining' as ExpertIndustry,
    function: 'Engineering' as ExpertFunction,
    type: 'External' as ExpertType,
    lead: 'Harry',
    email: 'rclarke@miningconsult.ca',
    phone: '+1 (604) 555-0205',
    expertise: [
      'Underground Mining',
      'Geological Modeling',
      'Resource Estimation',
      'Mine Ventilation',
      'Rock Mechanics',
      'Sustainable Mining Practices'
    ],
    notes: 'Consulted on 50+ mining projects globally. Expert in complex underground operations. Developed new techniques for ore extraction that increased yields by 25%. Available for technical reviews.',
    lastContact: '2024-01-08',
    availability: 'Available' as ExpertAvailability,
    yearsExperience: 32,
    certifications: ['Professional Geologist', 'SME Registered Member'],
    bio: 'Robert is known for solving the most challenging mining engineering problems, having worked on projects in over 15 countries across 6 continents.',
    rating: 4.4,
    reviewCount: 16
  }
];

// Helper function to search experts
export const searchExperts = (query: string): Expert[] => {
  if (!query || query.trim() === '') return [];
  
  const lowercaseQuery = query.toLowerCase();
  const results = mockExperts.filter(expert => {
    const searchableText = [
      expert.name,
      expert.location,
      expert.industry,
      expert.function,
      expert.lead || '',
      ...expert.expertise,
      expert.notes,
      expert.bio
    ].join(' ').toLowerCase();
    
    return searchableText.includes(lowercaseQuery);
  });
  
  // Sort to show internal experts first
  return results.sort((a, b) => {
    if (a.type === 'Internal' && b.type === 'External') return -1;
    if (a.type === 'External' && b.type === 'Internal') return 1;
    return 0;
  });
};

// Helper function to get expert by ID
export const getExpertById = (id: string): Expert | undefined => {
  return mockExperts.find(expert => expert.id === id);
};

// Store for AI-generated experts (in-memory for demo)
let aiGeneratedExperts: Expert[] = [];

// Helper function to update expert
export const updateExpert = (id: string, updatedData: Partial<Expert>): Expert | null => {
  // Check in main experts first
  const index = mockExperts.findIndex(expert => expert.id === id);
  if (index !== -1) {
    mockExperts[index] = { ...mockExperts[index], ...updatedData };
    return mockExperts[index];
  }
  
  // Check in AI-generated experts
  const aiIndex = aiGeneratedExperts.findIndex(expert => expert.id === id);
  if (aiIndex !== -1) {
    aiGeneratedExperts[aiIndex] = { ...aiGeneratedExperts[aiIndex], ...updatedData };
    return aiGeneratedExperts[aiIndex];
  }
  
  return null;
};

// Helper function to add AI-generated experts to the global store
export const addAIGeneratedExperts = (experts: Expert[]): void => {
  aiGeneratedExperts = [...aiGeneratedExperts, ...experts];
};

// Helper function to get all experts (including AI-generated)
export const getAllExperts = (): Expert[] => {
  return [...mockExperts, ...aiGeneratedExperts];
};

// Updated search function to include AI-generated experts
export const searchAllExperts = (query: string): Expert[] => {
  if (!query || query.trim() === '') return [];
  
  const allExperts = getAllExperts();
  const lowercaseQuery = query.toLowerCase();
  const results = allExperts.filter(expert => {
    const searchableText = [
      expert.name,
      expert.location,
      expert.industry,
      expert.function,
      expert.lead || '',
      ...expert.expertise,
      expert.notes,
      expert.bio
    ].join(' ').toLowerCase();
    
    return searchableText.includes(lowercaseQuery);
  });
  
  // Sort to show internal experts first
  return results.sort((a, b) => {
    if (a.type === 'Internal' && b.type === 'External') return -1;
    if (a.type === 'External' && b.type === 'Internal') return 1;
    return 0;
  });
};

// Updated getExpertById to check AI-generated experts too
export const getExpertByIdFromAll = (id: string): Expert | undefined => {
  const expert = mockExperts.find(expert => expert.id === id);
  if (expert) return expert;
  
  return aiGeneratedExperts.find(expert => expert.id === id);
};
