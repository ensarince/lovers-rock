export type ClimbingStyle = 'bouldering' | 'sport' | 'trad' | 'gym' | 'outdoor';

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
}
