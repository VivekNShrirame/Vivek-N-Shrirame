
export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  dob: string;
  currentCompany: string;
  designation: string;
  totalExperience: number; // Changed to number based on previous updates
  relevantExperience: number; // Changed to number based on previous updates
  skills: string[];
  currentCTC: string;
  expectedCTC: string;
  noticePeriod: string;
  highestQualification: string;
  educationField: string;
  currentLocation: string;
  fileName: string;
  // New fields for Job Description Analysis
  matchScore?: number;
  matchReason?: string;
  isShortlisted?: boolean;
}

export interface FileStatus {
  status: 'parsing' | 'success' | 'error';
  progress: number;
  error?: string;
}
