import { Climber } from "./climber";

export interface Match {
  id: string;
  climber: Climber;
  matchedAt: number;
  messagePreview?: string;
  unreadCount: number;
  type?: 'dating' | 'partner';
}