// Re-export types from shared contracts
export * from '@frank/contracts';

// Import types we need to use in this file
import type { Expert, ExpertFunction, ExpertAvailability } from '@frank/contracts';

// Frontend-specific types that aren't in contracts
export interface SearchFilters {
  industry?: string[];
  function?: string[];
  type?: string[];
  availability?: string[];
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
  showAIScore?: boolean;
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
  industry: string;
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