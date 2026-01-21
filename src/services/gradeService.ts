import { ClimbingGrade, GeneralLevel, GradeSystem } from '@/src/types/climber';

/**
 * Maps specific grades to general levels
 * This allows filtering by general level even if users enter specific grades
 */
export const gradeToGeneralLevel = (grade: ClimbingGrade | undefined): GeneralLevel => {
  if (!grade || !grade.general_level) {
    return 'beginner';
  }
  return grade.general_level;
};

/**
 * Get display text for a climbing grade
 * e.g., "V5 Bouldering" or just "Intermediate"
 */
export const formatGradeDisplay = (grade: ClimbingGrade | undefined | null): string => {
  // Safe checks for undefined/null grade
  if (!grade || typeof grade !== 'object') {
    return 'Beginner';
  }
  
  // Safe check for general_level
  const level = grade.general_level;
  if (!level || typeof level !== 'string' || level.length === 0) {
    return 'Beginner';
  }
  
  // Safe check for system and value
  if (!grade.system || !grade.value || grade.value.trim().length === 0) {
    return level.charAt(0).toUpperCase() + level.slice(1);
  }
  
  return `${grade.value} (${formatGradeSystemName(grade.system)})`;
};

/**
 * Get readable grade system name
 */
export const formatGradeSystemName = (system: GradeSystem): string => {
  const systemNames: Record<GradeSystem, string> = {
    'french': 'French',
    'uiaa': 'UIAA',
  };
  return systemNames[system];
};

/**
 * Get example grades for each system
 */
export const getExampleGrades = (system: GradeSystem): string[] => {
  const examples: Record<GradeSystem, string[]> = {
    'french': ['4b', '4b+', '4c', '5a', '5a+', '5b', '5b+', '5c', '5c+', '6a', '6a+', '6b', '6b+', '6c', '6c+', '7a', '7a+', '7b', '7b+', '7c', '7c+', '8a', '8a+', '8b', '8b+', '8c', '8c+', '9a'],
    'uiaa': ['IV', 'IV+', 'V-', 'V', 'V+', 'VI-', 'VI', 'VI+', 'VII-', 'VII', 'VII+', 'VIII-', 'VIII', 'VIII+', 'IX-', 'IX', 'IX+', 'X-', 'X', 'X+', 'XI-', 'XI', 'XI+', 'XII'],
  };
  return examples[system] || [];
};

/**
 * Create a default grade for new users
 */
export const createDefaultGrade = (generalLevel: GeneralLevel = 'beginner'): ClimbingGrade => {
  return {
    system: 'french',
    value: '',
    general_level: generalLevel,
  };
};

/**
 * Check if two grades are equal
 */
export const gradesEqual = (a: ClimbingGrade, b: ClimbingGrade): boolean => {
  return (
    a.system === b.system &&
    a.value === b.value &&
    a.general_level === b.general_level
  );
};

/**
 * Convert grade object to JSON for storage
 */
export const serializeGrade = (grade: ClimbingGrade): string => {
  return JSON.stringify(grade);
};

/**
 * Parse grade from JSON
 */
export const deserializeGrade = (json: string | null | undefined): ClimbingGrade | null => {
  if (!json) return null;
  try {
    return JSON.parse(json) as ClimbingGrade;
  } catch {
    return null;
  }
};
