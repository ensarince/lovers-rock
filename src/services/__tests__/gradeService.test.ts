import {
  createDefaultGrade,
  deserializeGrade,
  formatGradeDisplay,
  formatGradeSystemName,
  gradeToGeneralLevel,
  gradesEqual,
  serializeGrade,
} from '@/src/services/gradeService';
import { ClimbingGrade, GeneralLevel, GradeSystem } from '@/src/types/climber';

const makeGrade = (system: GradeSystem, value: string, general_level: GeneralLevel): ClimbingGrade => ({
  system,
  value,
  general_level,
});

describe('formatGradeDisplay', () => {
  it('returns "Beginner" for undefined', () => {
    expect(formatGradeDisplay(undefined)).toBe('Beginner');
  });
  it('returns "Beginner" for null', () => {
    expect(formatGradeDisplay(null)).toBe('Beginner');
  });
  it('returns capitalised level when value is empty', () => {
    expect(formatGradeDisplay(makeGrade('french', '', 'intermediate'))).toBe('Intermediate');
  });
  it('formats a french grade correctly', () => {
    expect(formatGradeDisplay(makeGrade('french', '6a', 'intermediate'))).toBe('6a (French)');
  });
  it('formats a uiaa grade correctly', () => {
    expect(formatGradeDisplay(makeGrade('uiaa', 'VII', 'advanced'))).toBe('VII (UIAA)');
  });
  it('returns capitalised level when value is only whitespace', () => {
    expect(formatGradeDisplay(makeGrade('french', '   ', 'beginner'))).toBe('Beginner');
  });
});

describe('formatGradeSystemName', () => {
  it('returns "French" for french', () => {
    expect(formatGradeSystemName('french')).toBe('French');
  });
  it('returns "UIAA" for uiaa', () => {
    expect(formatGradeSystemName('uiaa')).toBe('UIAA');
  });
});

describe('gradesEqual', () => {
  it('returns true for identical grades', () => {
    const g = makeGrade('french', '6a', 'intermediate');
    expect(gradesEqual(g, { ...g })).toBe(true);
  });
  it('returns false when value differs', () => {
    expect(gradesEqual(
      makeGrade('french', '6a', 'intermediate'),
      makeGrade('french', '6b', 'intermediate')
    )).toBe(false);
  });
  it('returns false when system differs', () => {
    expect(gradesEqual(
      makeGrade('french', '6a', 'intermediate'),
      makeGrade('uiaa', '6a', 'intermediate')
    )).toBe(false);
  });
  it('returns false when general_level differs', () => {
    expect(gradesEqual(
      makeGrade('french', '6a', 'intermediate'),
      makeGrade('french', '6a', 'advanced')
    )).toBe(false);
  });
});

describe('serializeGrade / deserializeGrade', () => {
  it('round-trips a grade through JSON', () => {
    const g = makeGrade('french', '7a', 'advanced');
    expect(deserializeGrade(serializeGrade(g))).toEqual(g);
  });
  it('deserializeGrade returns null for invalid JSON', () => {
    expect(deserializeGrade('not-json{{')).toBeNull();
  });
  it('deserializeGrade returns null for null input', () => {
    expect(deserializeGrade(null)).toBeNull();
  });
  it('deserializeGrade returns null for undefined input', () => {
    expect(deserializeGrade(undefined)).toBeNull();
  });
});

describe('gradeToGeneralLevel', () => {
  it('returns "beginner" for undefined grade', () => {
    expect(gradeToGeneralLevel(undefined)).toBe('beginner');
  });
  it('returns "beginner" when general_level is missing', () => {
    expect(gradeToGeneralLevel({ system: 'french', value: '5a' } as any)).toBe('beginner');
  });
  it('returns the grade general_level', () => {
    expect(gradeToGeneralLevel(makeGrade('french', '6a', 'intermediate'))).toBe('intermediate');
  });
});

describe('createDefaultGrade', () => {
  it('creates a beginner french grade by default', () => {
    const g = createDefaultGrade();
    expect(g.system).toBe('french');
    expect(g.general_level).toBe('beginner');
    expect(g.value).toBe('');
  });
  it('respects the generalLevel argument', () => {
    expect(createDefaultGrade('advanced').general_level).toBe('advanced');
  });
});
