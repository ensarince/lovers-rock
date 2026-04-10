import { getFirstImageUrl, intentIncludes, normalizeIntentValue } from '@/src/utils/helperFunctions';

describe('normalizeIntentValue', () => {
  it('returns undefined for undefined input', () => {
    expect(normalizeIntentValue(undefined)).toBeUndefined();
  });
  it('returns undefined for empty string', () => {
    expect(normalizeIntentValue('')).toBeUndefined();
  });
  it('normalizes legacy "dating" to "date"', () => {
    expect(normalizeIntentValue('dating')).toBe('date');
  });
  it('normalizes legacy "partnering" to "partner"', () => {
    expect(normalizeIntentValue('partnering')).toBe('partner');
  });
  it('passes through canonical "date"', () => {
    expect(normalizeIntentValue('date')).toBe('date');
  });
  it('passes through canonical "partner"', () => {
    expect(normalizeIntentValue('partner')).toBe('partner');
  });
  it('returns undefined for unrecognised value', () => {
    expect(normalizeIntentValue('something')).toBeUndefined();
  });
});

describe('intentIncludes', () => {
  it('returns false for undefined intent', () => {
    expect(intentIncludes(undefined, 'date')).toBe(false);
  });
  it('returns false for empty string intent', () => {
    expect(intentIncludes('', 'date')).toBe(false);
  });
  it('matches a string intent', () => {
    expect(intentIncludes('date', 'date')).toBe(true);
  });
  it('does not match a different string intent', () => {
    expect(intentIncludes('date', 'partner')).toBe(false);
  });
  it('matches in an array containing the target', () => {
    expect(intentIncludes(['date', 'partner'], 'date')).toBe(true);
    expect(intentIncludes(['date', 'partner'], 'partner')).toBe(true);
  });
  it('normalises legacy "dating" in array', () => {
    expect(intentIncludes(['dating'], 'date')).toBe(true);
  });
  it('normalises legacy "partnering" in array', () => {
    expect(intentIncludes(['partnering'], 'partner')).toBe(true);
  });
  it('returns false when target not in array', () => {
    expect(intentIncludes(['date'], 'partner')).toBe(false);
  });
});

describe('getFirstImageUrl', () => {
  it('returns undefined for empty array', () => {
    expect(getFirstImageUrl([], 'user1')).toBeUndefined();
  });
  it('returns undefined for undefined images', () => {
    expect(getFirstImageUrl(undefined, 'user1')).toBeUndefined();
  });
  it('constructs a URL containing the userId and filename', () => {
    const url = getFirstImageUrl(['photo.jpg'], 'user123');
    expect(url).toContain('user123');
    expect(url).toContain('photo.jpg');
  });
  it('appends thumbnail query param', () => {
    const url = getFirstImageUrl(['photo.jpg'], 'user123');
    expect(url).toContain('thumb=100x100');
  });
  it('uses the first image when multiple exist', () => {
    const url = getFirstImageUrl(['first.jpg', 'second.jpg'], 'user123');
    expect(url).toContain('first.jpg');
    expect(url).not.toContain('second.jpg');
  });
});
