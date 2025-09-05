// Shared Zod schemas and TypeScript types
import { z } from 'zod';

// Expert status enum
export const ExpertStatusSchema = z.enum(['Validated', 'Contract', 'Pending', 'Conversation']);
export type ExpertStatus = z.infer<typeof ExpertStatusSchema>;

// Expert type enum
export const ExpertTypeSchema = z.enum(['Internal', 'External']);
export type ExpertType = z.infer<typeof ExpertTypeSchema>;

// Expert availability enum
export const ExpertAvailabilitySchema = z.enum(['Available', 'Busy', 'Unavailable']);
export type ExpertAvailability = z.infer<typeof ExpertAvailabilitySchema>;

// Expert industry enum
export const ExpertIndustrySchema = z.enum([
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Energy',
  'Transportation',
  'Real Estate',
  'Media',
  'Government',
  'Non-profit',
  'Academia',
  'AI & Robotics',
  'Venture Capital',
  'Mining',
  'Nuclear Safety',
  'Nuclear',
  'Robotics',
  'AI/ML',
  'Aerospace',
  'Biotech',
  'Other'
]);
export type ExpertIndustry = z.infer<typeof ExpertIndustrySchema>;

// Expert function enum
export const ExpertFunctionSchema = z.enum([
  'Engineering',
  'Product Management',
  'Design',
  'Marketing',
  'Sales',
  'Operations',
  'Finance',
  'Legal',
  'HR',
  'Research',
  'Consulting',
  'Executive',
  'Other'
]);
export type ExpertFunction = z.infer<typeof ExpertFunctionSchema>;

// Core Expert schema
export const ExpertSchema = z.object({
  id: z.string(),
  name: z.string(),
  photo: z.string().url().optional(), // Added for frontend compatibility
  email: z.string().email().optional(),
  phone: z.string().optional(), // Added for frontend compatibility
  company: z.string().optional(),
  title: z.string().optional(),
  location: z.string().optional(),
  timeZone: z.string().optional(),
  linkedinUrl: z.string().url().optional(),
  industry: z.string(), // Array of industries
  function: ExpertFunctionSchema.optional(),
  innoveraContact: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().optional(), // Added for frontend compatibility
  type: ExpertTypeSchema.default('External'),
  availability: ExpertAvailabilitySchema.default('Available'),
  expertise: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  yearsExperience: z.number().min(0).optional(),
  bio: z.string().optional(),
  notes: z.string().optional(),
  lastContact: z.string().optional(), // ISO date string
  avatar: z.string().url().optional(),
  lead: z.string().optional(),
  createdAt: z.string().optional(), // ISO date string
  updatedAt: z.string().optional(), // ISO date string
  isAIGenerated: z.boolean().optional()
});

export type Expert = z.infer<typeof ExpertSchema>;

// API Request/Response schemas
export const CreateExpertSchema = ExpertSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type CreateExpertRequest = z.infer<typeof CreateExpertSchema>;

export const UpdateExpertSchema = ExpertSchema.partial().extend({
  id: z.string()
});
export type UpdateExpertRequest = z.infer<typeof UpdateExpertSchema>;

// Search and filter schemas
export const SearchExpertsSchema = z.object({
  query: z.string().optional(),
  industry: z.array(z.string()).optional(),
  function: z.array(ExpertFunctionSchema).optional(),
  status: z.array(ExpertStatusSchema).optional(),
  type: z.array(ExpertTypeSchema).optional(),
  availability: z.array(ExpertAvailabilitySchema).optional(),
  location: z.string().optional(),
  minRating: z.number().min(0).max(5).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});
export type SearchExpertsRequest = z.infer<typeof SearchExpertsSchema>;

// API Response schemas
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

export const ExpertsListResponseSchema = ApiResponseSchema(
  z.object({
    experts: z.array(ExpertSchema),
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
  })
);
export type ExpertsListResponse = z.infer<typeof ExpertsListResponseSchema>;

export const ExpertResponseSchema = ApiResponseSchema(ExpertSchema);
export type ExpertResponse = z.infer<typeof ExpertResponseSchema>;

// Navigation types (for frontend)
export const NavigationItemSchema = z.object({
  path: z.string(),
  label: z.string(),
  icon: z.any().optional(), // For React component types
});
export type NavigationItem = z.infer<typeof NavigationItemSchema>;
