
export type GradeSystem = 'v-scale' | 'font' | 'french' | 'uiaa' | 'unknown';

export type GeneralLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'elite';

export type ClimbingStyle = 'bouldering' | 'sport' | 'trad' | 'gym' | 'outdoor';

export interface ClimbingGrade {
  system: GradeSystem;           // 'v-scale', 'font', 'french', 'uiaa', 'unknown'
  value: string;                 // 'V5', '7A', '6a+', 'VI', etc.
  general_level: GeneralLevel;   // 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'elite'
}


export interface Climber {
  id: string;
  name: string;
  age: number;
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
}
