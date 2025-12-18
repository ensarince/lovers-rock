import { Climber } from '@/src/types/climber';

export interface UserPreference {
  climberId: string;
  action: 'accept' | 'reject';
  timestamp: number;
}

class PreferenceService {
  private acceptedClimbers: Set<string> = new Set();
  private rejectedClimbers: Set<string> = new Set();
  private preferences: UserPreference[] = [];

  accept(climber: Climber): void {
    this.acceptedClimbers.add(climber.id);
    this.rejectedClimbers.delete(climber.id);
    this.preferences.push({
      climberId: climber.id,
      action: 'accept',
      timestamp: Date.now(),
    });
  }

  reject(climber: Climber): void {
    this.rejectedClimbers.add(climber.id);
    this.acceptedClimbers.delete(climber.id);
    this.preferences.push({
      climberId: climber.id,
      action: 'reject',
      timestamp: Date.now(),
    });
  }

  getAccepted(): string[] {
    return Array.from(this.acceptedClimbers);
  }

  getRejected(): string[] {
    return Array.from(this.rejectedClimbers);
  }

  getPreferences(): UserPreference[] {
    return [...this.preferences];
  }

  isAccepted(climberId: string): boolean {
    return this.acceptedClimbers.has(climberId);
  }

  isRejected(climberId: string): boolean {
    return this.rejectedClimbers.has(climberId);
  }

  isSeen(climberId: string): boolean {
    return this.isAccepted(climberId) || this.isRejected(climberId);
  }

  reset(): void {
    this.acceptedClimbers.clear();
    this.rejectedClimbers.clear();
    this.preferences = [];
  }
}

export const preferenceService = new PreferenceService();
