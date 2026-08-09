const guildConfigs = new Map();
const warningsDb = new Map();

export async function getGuildConfig(guildId) {
  if (!guildConfigs.has(guildId)) {
    guildConfigs.set(guildId, {
      welcomeChannelId: null,
      welcomeMessage: null,
      logsChannelId: null,
      autoroleId: null,
      rulesChannelId: null,
      ticketCategoryId: null,
    });
  }
  return guildConfigs.get(guildId);
}

export async function updateGuildConfig(guildId, newConfig) {
  const current = await getGuildConfig(guildId);
  const updated = { ...current, ...newConfig };
  guildConfigs.set(guildId, updated);
  return updated;
}

export async function resetGuildConfig(guildId) {
  guildConfigs.delete(guildId);
  return getGuildConfig(guildId);
}

export async function addWarning(guildId, userId, moderatorId, reason) {
  const key = `${guildId}:${userId}`;
  const list = warningsDb.get(key) || [];
  const record = {
    id: list.length + 1,
    moderatorId,
    reason,
    createdAt: new Date(),
  };
  list.push(record);
  warningsDb.set(key, list);
  return record;
}

export async function getWarnings(guildId, userId) {
  const key = `${guildId}:${userId}`;
  return warningsDb.get(key) || [];
}

export async function removeWarnings(guildId, userId) {
  const key = `${guildId}:${userId}`;
  warningsDb.delete(key);
}