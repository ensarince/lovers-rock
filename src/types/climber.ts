
export type GradeSystem = 'french' | 'uiaa'

export type GeneralLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'elite';

export type ClimbingStyle = 'bouldering' | 'sport' | 'trad' | 'gym' | 'outdoor';

export type Gender = 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';

export interface ClimbingGrade {
  system: GradeSystem;           // 'french', 'uiaa'
  value: string;                 // 'V5', '7A', '6a+', 'VI', etc.
  general_level: GeneralLevel;   // 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'elite'
}


export interface Climber {
  id: string;
  name: string;
  age: number;
  gender?: Gender;
  grade: ClimbingGrade;
  climbing_styles: ClimbingStyle[];
  home_gym: string;
  bio: string;
  email: string;
  avatar?: string;
  liked_users?: string[]; // Legacy field - deprecated
  liked_users_dating?: string[]; // Users liked in dating mode
  liked_users_partner?: string[]; // Users liked in partner mode
  image_url?: string; // For displaying avatar URL
  intent: 'partner' | 'date' | Array<'partner' | 'date'>;
  latitude?: number; // User's latitude for geofinding
  longitude?: number; // User's longitude for geofinding
  last_location_update?: string; // ISO timestamp of last location update
  profile_completed?: boolean; // Whether user has completed profile setup
  blocked_users?: string[]; // Blocked user IDs
}
