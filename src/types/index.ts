// Expert Type Definitions
export type ExpertType = 'Internal' | 'External';

export type ExpertAvailability = 'Available' | 'Busy' | 'Unknown';

export type ExpertIndustry = 
  | 'Nuclear' 
  | 'Venture Capital' 
  | 'Robotics' 
  | 'AI/ML' 
  | 'Mining' 
  | 'Biotech' 
  | 'Aerospace' 
  | 'Energy' 
  | 'Finance' 
  | 'Healthcare'
  | 'Technology';

export type ExpertFunction = 
  | 'Engineering' 
  | 'Finance' 
  | 'Research' 
  | 'Operations' 
  | 'Strategy' 
  | 'Consulting' 
  | 'Academia';

export interface Expert {
  id: string;
  name: string;
  photo: string;
  location: string;
  industry: ExpertIndustry;
  function: ExpertFunction;
  type: ExpertType;
  lead?: string;
  email: string;
  phone: string;
  expertise: string[];
  bio: string;
  notes: string;
  lastContact: string | null;
  availability: ExpertAvailability;
  yearsExperience: number;
  certifications: string[];
  isAIGenerated?: boolean;
  rating?: number;
  reviewCount?: number;
}

// Search and Filter Types
export interface SearchFilters {
  industry?: ExpertIndustry;
  function?: ExpertFunction;
  type?: ExpertType;
  availability?: ExpertAvailability;
  location?: string;
}

export interface SearchResult {
  experts: Expert[];
  total: number;
  query?: string;
}

// Component Props Types
export interface ExpertCardProps {
  expert: Expert;
  variant?: 'default' | 'compact' | 'detailed';
  onClick?: (expert: Expert) => void;
}

export interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'small' | 'medium' | 'large';
}

// AI Service Types
export interface AIExpertGenerationRequest {
  searchQuery: string;
  maxResults?: number;
}

export interface AIExpertResponse {
  name: string;
  location: string;
  industry: ExpertIndustry;
  function: ExpertFunction;
  email: string;
  phone: string;
  expertise: string[];
  bio: string;
  notes: string;
  yearsExperience: number;
  certifications: string[];
  availability: ExpertAvailability;
}

// Navigation and Routing Types
export interface NavigationItem {
  path: string;
  label: string;
  icon?: any;
}
