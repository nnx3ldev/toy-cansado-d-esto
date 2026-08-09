import type { GuildConfig, WarningRecord } from "./types.js";

const guildConfigs = new Map<string, GuildConfig>();
const warningsStore: WarningRecord[] = [];
let warningIdCounter = 1;

export async function updateGuildConfig(
  guildId: string,
  data: Partial<GuildConfig>
): Promise<GuildConfig> {
  const current = guildConfigs.get(guildId) || {};
  const updated = { ...current, ...data };
  guildConfigs.set(guildId, updated);
  return updated;
}

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  return guildConfigs.get(guildId) || {};
}

export async function resetGuildConfig(guildId: string): Promise<void> {
  guildConfigs.delete(guildId);
}

export async function addWarning(
  guildId: string,
  userId: string,
  moderatorId: string,
  reason: string
): Promise<WarningRecord> {
  const record: WarningRecord = {
    id: warningIdCounter++,
    guildId,
    userId,
    moderatorId,
    reason,
    createdAt: new Date().toISOString(),
  };
  warningsStore.push(record);
  return record;
}

export async function getWarnings(guildId: string, userId: string): Promise<WarningRecord[]> {
  return warningsStore.filter((w) => w.guildId === guildId && w.userId === userId);
}

export async function removeWarnings(guildId: string, userId: string): Promise<void> {
  let index = warningsStore.length;
  while (index--) {
    if (warningsStore[index].guildId === guildId && warningsStore[index].userId === userId) {
      warningsStore.splice(index, 1);
    }
  }
}