import { getPocketBaseUrl } from '@/src/utils/helperFunctions';

const POCKETBASE_URL = getPocketBaseUrl();

// Strip non-alphanumeric chars to prevent filter injection — PocketBase IDs are alphanumeric only
const safeId = (id: string): string => String(id).replace(/[^a-zA-Z0-9]/g, '');

// Whitelist intent values — rejects anything that isn't a known literal,
// preventing filter injection via tampered server-returned intent fields
const safeIntent = (intent: string): 'dating' | 'partner' =>
  intent === 'partner' ? 'partner' : 'dating';

type IntentType = 'dating' | 'partner';

export interface LikeRecord {
  id: string;
  from_user: string;
  to_user: string;
  intent: IntentType;
  created?: string;
  updated?: string;
}

export interface DeclineRecord {
  id: string;
  from_user: string;
  to_user: string;
  intent: IntentType;
  declined_at?: string;
  created?: string;
  updated?: string;
}

export interface BlockRecord {
  id: string;
  from_user: string;
  to_user: string;
  created?: string;
  updated?: string;
}

const fetchAllRecords = async <T>(
  collection: string,
  token: string,
  filter?: string
): Promise<T[]> => {
  const perPage = 200;
  let page = 1;
  const items: T[] = [];

  while (true) {
    const filterParam = filter ? `&filter=${encodeURIComponent(filter)}` : '';
    const response = await fetch(
      `${POCKETBASE_URL}/api/collections/${collection}/records?page=${page}&perPage=${perPage}${filterParam}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch ${collection}`);
    }

    const data = await response.json();
    items.push(...((data.items || []) as T[]));

    if (!data.totalPages || page >= data.totalPages) {
      break;
    }

    page += 1;
  }

  return items;
};

const buildFilter = (parts: Array<string | null | undefined>) =>
  parts.filter(Boolean).join(' && ');

export const getOutgoingLikes = async (
  userId: string,
  token: string,
  intent?: IntentType
): Promise<LikeRecord[]> => {
  const filter = buildFilter([
    `from_user = "${safeId(userId)}"`,
    intent ? `intent = "${safeIntent(intent)}"` : null,
  ]);
  return fetchAllRecords<LikeRecord>('likes', token, filter);
};

export const getIncomingLikes = async (
  userId: string,
  token: string,
  intent?: IntentType
): Promise<LikeRecord[]> => {
  const filter = buildFilter([
    `to_user = "${safeId(userId)}"`,
    intent ? `intent = "${safeIntent(intent)}"` : null,
  ]);
  return fetchAllRecords<LikeRecord>('likes', token, filter);
};

export const createLike = async (
  fromUserId: string,
  toUserId: string,
  intent: IntentType,
  token: string
): Promise<void> => {
  const filter = buildFilter([
    `from_user = "${safeId(fromUserId)}"`,
    `to_user = "${safeId(toUserId)}"`,
    `intent = "${safeIntent(intent)}"`,
  ]);

  const existing = await fetchAllRecords<LikeRecord>('likes', token, filter);
  if (existing.length > 0) return;

  const response = await fetch(`${POCKETBASE_URL}/api/collections/likes/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      from_user: fromUserId,
      to_user: toUserId,
      intent,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create like: ${errorText}`);
  }
};

export const removeLike = async (
  fromUserId: string,
  toUserId: string,
  intent: IntentType,
  token: string
): Promise<void> => {
  const filter = buildFilter([
    `from_user = "${safeId(fromUserId)}"`,
    `to_user = "${safeId(toUserId)}"`,
    `intent = "${safeIntent(intent)}"`,
  ]);

  const records = await fetchAllRecords<LikeRecord>('likes', token, filter);
  if (records.length === 0) return;

  await Promise.all(
    records.map((record) =>
      fetch(`${POCKETBASE_URL}/api/collections/likes/records/${record.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    )
  );
};

export const getOutgoingDeclines = async (
  userId: string,
  token: string,
  intent?: IntentType
): Promise<DeclineRecord[]> => {
  const filter = buildFilter([
    `from_user = "${safeId(userId)}"`,
    intent ? `intent = "${safeIntent(intent)}"` : null,
  ]);
  return fetchAllRecords<DeclineRecord>('declines', token, filter);
};

export const getIncomingDeclines = async (
  userId: string,
  token: string,
  intent?: IntentType
): Promise<DeclineRecord[]> => {
  const filter = buildFilter([
    `to_user = "${safeId(userId)}"`,
    intent ? `intent = "${safeIntent(intent)}"` : null,
  ]);
  return fetchAllRecords<DeclineRecord>('declines', token, filter);
};

export const createDecline = async (
  fromUserId: string,
  toUserId: string,
  intent: IntentType,
  token: string
): Promise<void> => {
  const filter = buildFilter([
    `from_user = "${safeId(fromUserId)}"`,
    `to_user = "${safeId(toUserId)}"`,
    `intent = "${safeIntent(intent)}"`,
  ]);

  const existing = await fetchAllRecords<DeclineRecord>('declines', token, filter);
  if (existing.length > 0) return;

  const response = await fetch(`${POCKETBASE_URL}/api/collections/declines/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      from_user: fromUserId,
      to_user: toUserId,
      intent,
      declined_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create decline: ${errorText}`);
  }
};

export const removeDecline = async (
  fromUserId: string,
  toUserId: string,
  intent: IntentType,
  token: string
): Promise<void> => {
  const filter = buildFilter([
    `from_user = "${safeId(fromUserId)}"`,
    `to_user = "${safeId(toUserId)}"`,
    `intent = "${safeIntent(intent)}"`,
  ]);

  const records = await fetchAllRecords<DeclineRecord>('declines', token, filter);
  if (records.length === 0) return;

  await Promise.all(
    records.map((record) =>
      fetch(`${POCKETBASE_URL}/api/collections/declines/records/${record.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    )
  );
};

export const getBlockedByUser = async (userId: string, token: string): Promise<BlockRecord[]> => {
  const filter = `from_user = "${safeId(userId)}"`;
  return fetchAllRecords<BlockRecord>('blocks', token, filter);
};

export const getBlockedAgainstUser = async (userId: string, token: string): Promise<BlockRecord[]> => {
  const filter = `to_user = "${safeId(userId)}"`;
  return fetchAllRecords<BlockRecord>('blocks', token, filter);
};

export const createBlock = async (
  fromUserId: string,
  toUserId: string,
  token: string
): Promise<void> => {
  const filter = buildFilter([`from_user = "${safeId(fromUserId)}"`, `to_user = "${safeId(toUserId)}"`]);
  const existing = await fetchAllRecords<BlockRecord>('blocks', token, filter);
  if (existing.length > 0) return;

  const response = await fetch(`${POCKETBASE_URL}/api/collections/blocks/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      from_user: fromUserId,
      to_user: toUserId,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create block: ${errorText}`);
  }
};

export const resetDatingDeclines = async (userId: string, token: string): Promise<void> => {
  const records = await fetchAllRecords<DeclineRecord>(
    'declines',
    token,
    `from_user = "${safeId(userId)}" && intent = "dating"`
  );
  if (records.length === 0) return;
  await Promise.all(
    records.map((record) =>
      fetch(`${POCKETBASE_URL}/api/collections/declines/records/${record.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    )
  );
};

export const removeBlock = async (
  fromUserId: string,
  toUserId: string,
  token: string
): Promise<void> => {
  const filter = buildFilter([`from_user = "${safeId(fromUserId)}"`, `to_user = "${safeId(toUserId)}"`]);
  const records = await fetchAllRecords<BlockRecord>('blocks', token, filter);
  if (records.length === 0) return;

  await Promise.all(
    records.map((record) =>
      fetch(`${POCKETBASE_URL}/api/collections/blocks/records/${record.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    )
  );
};

const getDeclineTimestamp = (decline: DeclineRecord): number => {
  const raw = decline.declined_at || decline.created;
  if (!raw) return 0;
  const timestamp = Date.parse(raw);
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const isDeclineStillActive = (decline: DeclineRecord, intent: IntentType): boolean => {
  const timestamp = getDeclineTimestamp(decline);
  if (!timestamp) {
    return true;
  }

  const expiryMs = intent === 'dating'
    ? 30 * 24 * 60 * 60 * 1000
    : 90 * 24 * 60 * 60 * 1000;

  return Date.now() - timestamp < expiryMs;
};

export const getActiveDeclinedUserIds = (
  declines: DeclineRecord[],
  intent: IntentType,
  direction: 'outgoing' | 'incoming'
): string[] => {
  const idKey = direction === 'outgoing' ? 'to_user' : 'from_user';
  return declines
    .filter((decline) => decline.intent === intent)
    .filter((decline) => isDeclineStillActive(decline, intent))
    .map((decline) => decline[idKey])
    .filter(Boolean);
};

export const hasIncomingLike = async (
  currentUserId: string,
  fromUserId: string,
  intent: IntentType,
  token: string
): Promise<boolean> => {
  const filter = buildFilter([
    `from_user = "${safeId(fromUserId)}"`,
    `to_user = "${safeId(currentUserId)}"`,
    `intent = "${safeIntent(intent)}"`,
  ]);

  const records = await fetchAllRecords<LikeRecord>('likes', token, filter);
  return records.length > 0;
};
