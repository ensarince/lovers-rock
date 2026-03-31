/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const likesCollection = app.findCollectionByNameOrId("likes");
  const declinesCollection = app.findCollectionByNameOrId("declines");
  const blocksCollection = app.findCollectionByNameOrId("blocks");
  const users = app.findRecordsByFilter("users", "", "", 0, 0);

  const parseList = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
      }
    }
    return [];
  };

  const normalizeUserId = (value) => {
    if (!value) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 && trimmed !== "undefined" && trimmed !== "null"
        ? trimmed
        : null;
    }
    if (typeof value === "object") {
      if (typeof value.id === "string" && value.id.trim()) return value.id.trim();
      if (typeof value.userId === "string" && value.userId.trim()) return value.userId.trim();
    }
    return null;
  };

  const findExisting = (collectionName, filter) => {
    try {
      const records = app.findRecordsByFilter(collectionName, filter, "", 1, 0);
      return records && records.length > 0;
    } catch {
      return false;
    }
  };

  const createLike = (fromUser, toUser, intent) => {
    const fromId = normalizeUserId(fromUser);
    const toId = normalizeUserId(toUser);
    if (!fromId || !toId || fromId === toId) return;
    const filter = `from_user = "${fromId}" && to_user = "${toId}" && intent = "${intent}"`;
    if (findExisting("likes", filter)) return;

    const record = new Record(likesCollection);
    record.set("from_user", fromId);
    record.set("to_user", toId);
    record.set("intent", intent);
    app.save(record);
  };

  const createDecline = (fromUser, toUser, intent, declinedAt) => {
    const fromId = normalizeUserId(fromUser);
    const toId = normalizeUserId(toUser);
    if (!fromId || !toId || fromId === toId) return;
    const filter = `from_user = "${fromId}" && to_user = "${toId}" && intent = "${intent}"`;
    if (findExisting("declines", filter)) return;

    const record = new Record(declinesCollection);
    record.set("from_user", fromId);
    record.set("to_user", toId);
    record.set("intent", intent);
    if (declinedAt) {
      record.set("declined_at", declinedAt);
    }
    app.save(record);
  };

  const createBlock = (fromUser, toUser) => {
    const fromId = normalizeUserId(fromUser);
    const toId = normalizeUserId(toUser);
    if (!fromId || !toId || fromId === toId) return;
    const filter = `from_user = "${fromId}" && to_user = "${toId}"`;
    if (findExisting("blocks", filter)) return;

    const record = new Record(blocksCollection);
    record.set("from_user", fromId);
    record.set("to_user", toId);
    app.save(record);
  };

  users.forEach((user) => {
    const userId = user.id;
    if (!userId) return;

    const likedDating = parseList(user.get("liked_users_dating"));
    likedDating.forEach((targetId) => createLike(userId, targetId, "dating"));

    const likedPartner = parseList(user.get("liked_users_partner"));
    likedPartner.forEach((targetId) => createLike(userId, targetId, "partner"));

    const declinedDating = parseList(user.get("declined_users_as_dating"));
    declinedDating.forEach((item) => {
      const targetId = normalizeUserId(item);
      const declinedAtMs = typeof item === "object" ? Number(item?.declinedAt) : null;
      const declinedAt = declinedAtMs && !Number.isNaN(declinedAtMs)
        ? new Date(declinedAtMs).toISOString()
        : null;
      createDecline(userId, targetId, "dating", declinedAt);
    });

    const declinedPartner = parseList(user.get("declined_users_as_partner"));
    declinedPartner.forEach((item) => {
      const targetId = normalizeUserId(item);
      const declinedAtMs = typeof item === "object" ? Number(item?.declinedAt) : null;
      const declinedAt = declinedAtMs && !Number.isNaN(declinedAtMs)
        ? new Date(declinedAtMs).toISOString()
        : null;
      createDecline(userId, targetId, "partner", declinedAt);
    });

    const blocked = parseList(user.get("blocked_users"));
    blocked.forEach((targetId) => createBlock(userId, targetId));
  });
}, (app) => {
  // no rollback for data backfill
});
