// Use namespace import so we read the live module binding after mutation
import * as notifModule from '@/src/services/notificationService';

describe('activeConversationPartnerId', () => {
  afterEach(() => {
    notifModule.setActiveConversationPartnerId(null);
  });

  it('is null by default', () => {
    expect(notifModule.activeConversationPartnerId).toBeNull();
  });

  it('can be set to a partner id', () => {
    notifModule.setActiveConversationPartnerId('partner-abc');
    expect(notifModule.activeConversationPartnerId).toBe('partner-abc');
  });

  it('can be cleared back to null', () => {
    notifModule.setActiveConversationPartnerId('partner-abc');
    notifModule.setActiveConversationPartnerId(null);
    expect(notifModule.activeConversationPartnerId).toBeNull();
  });

  it('overwrites a previous value', () => {
    notifModule.setActiveConversationPartnerId('partner-1');
    notifModule.setActiveConversationPartnerId('partner-2');
    expect(notifModule.activeConversationPartnerId).toBe('partner-2');
  });
});
