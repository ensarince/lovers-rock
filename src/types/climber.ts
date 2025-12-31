export type ClimbingStyle = 'bouldering' | 'sport' | 'trad' | 'gym' | 'outdoor' | 'speed';

export type ClimbingGrade = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'elite';


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
  liked_users?: string[];
  image_url?: string; // For displaying avatar URL
  intent: 'partner' | 'date' | Array<'partner' | 'date'>;
}
