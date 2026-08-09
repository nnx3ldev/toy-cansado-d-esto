import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { GuildConfig, WarningRecord } from "./types";
import { firestore } from "./firebase";

const dataDir = path.resolve(process.env.BOT_DATA_DIR ?? "data");
mkdirSync(dataDir, { recursive: true });

const database = new DatabaseSync(path.join(dataDir, "yupicraft.db"));

database.exec(`
  CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    welcome_channel_id TEXT,
    welcome_message TEXT NOT NULL DEFAULT '¡Bienvenido/a {user} a {server}!',
    logs_channel_id TEXT,
    autorole_id TEXT,
    rules_channel_id TEXT,
    ticket_category_id TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS warnings_guild_user_idx
    ON warnings(guild_id, user_id);
`);

const defaultConfig = (guildId: string): GuildConfig => ({
  guildId,
  welcomeChannelId: null,
  welcomeMessage: "¡Bienvenido/a {user} a {server}!",
  logsChannelId: null,
  autoroleId: null,
  rulesChannelId: null,
  ticketCategoryId: null,
  updatedAt: new Date().toISOString(),
});

function getLocalGuildConfig(guildId: string): GuildConfig {
  const row = database
    .prepare("SELECT * FROM guild_config WHERE guild_id = ?")
    .get(guildId) as
    | {
        guild_id: string;
        welcome_channel_id: string | null;
        welcome_message: string;
        logs_channel_id: string | null;
        autorole_id: string | null;
        rules_channel_id: string | null;
        ticket_category_id: string | null;
        updated_at: string;
      }
    | undefined;

  if (row) {
    return {
      guildId: row.guild_id,
      welcomeChannelId: row.welcome_channel_id,
      welcomeMessage: row.welcome_message,
      logsChannelId: row.logs_channel_id,
      autoroleId: row.autorole_id,
      rulesChannelId: row.rules_channel_id,
      ticketCategoryId: row.ticket_category_id,
      updatedAt: row.updated_at,
    };
  }

  const config = defaultConfig(guildId);
  database
    .prepare(
      `INSERT INTO guild_config
       (guild_id, welcome_message, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)`,
    )
    .run(guildId, config.welcomeMessage);
  return getLocalGuildConfig(guildId);
}

async function getFirestoreGuildConfig(guildId: string): Promise<GuildConfig | null> {
  if (!firestore) return null;
  const snapshot = await firestore.collection("guilds").doc(guildId).get();
  if (!snapshot.exists) {
    const config = defaultConfig(guildId);
    await firestore.collection("guilds").doc(guildId).set(config, { merge: true });
    return config;
  }
  return { ...defaultConfig(guildId), ...snapshot.data(), guildId } as GuildConfig;
}

export async function getGuildConfig(guildId: string): Promise<GuildConfig> {
  if (firestore) {
    try {
      return (await getFirestoreGuildConfig(guildId)) ?? getLocalGuildConfig(guildId);
    } catch {
      return getLocalGuildConfig(guildId);
    }
  }
  return getLocalGuildConfig(guildId);
}

function updateLocalGuildConfig(
  guildId: string,
  values: Partial<Omit<GuildConfig, "guildId" | "updatedAt">>,
): GuildConfig {
  const current = getLocalGuildConfig(guildId);
  const next = { ...current, ...values };
  database
    .prepare(
      `UPDATE guild_config SET
        welcome_channel_id = ?,
        welcome_message = ?,
        logs_channel_id = ?,
        autorole_id = ?,
        rules_channel_id = ?,
        ticket_category_id = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE guild_id = ?`,
    )
    .run(
      next.welcomeChannelId,
      next.welcomeMessage,
      next.logsChannelId,
      next.autoroleId,
      next.rulesChannelId,
      next.ticketCategoryId,
      guildId,
    );
  return getLocalGuildConfig(guildId);
}

export async function updateGuildConfig(
  guildId: string,
  values: Partial<Omit<GuildConfig, "guildId" | "updatedAt">>,
): Promise<GuildConfig> {
  if (firestore) {
    try {
      const next = { ...(await getFirestoreGuildConfig(guildId)), ...values, updatedAt: new Date().toISOString() };
      await firestore.collection("guilds").doc(guildId).set(next, { merge: true });
      return next as GuildConfig;
    } catch {
      // The local store remains available if Firebase is temporarily unreachable.
    }
  }
  return updateLocalGuildConfig(guildId, values);
}

export async function resetGuildConfig(guildId: string): Promise<GuildConfig> {
  const config = defaultConfig(guildId);
  if (firestore) {
    try {
      await firestore.collection("guilds").doc(guildId).set(config, { merge: true });
      return config;
    } catch {
      // Fall through to the local store.
    }
  }
  getLocalGuildConfig(guildId);
  database
    .prepare(
      `UPDATE guild_config SET
        welcome_channel_id = NULL,
        welcome_message = ?,
        logs_channel_id = NULL,
        autorole_id = NULL,
        rules_channel_id = NULL,
        ticket_category_id = NULL,
        updated_at = CURRENT_TIMESTAMP
       WHERE guild_id = ?`,
    )
    .run(defaultConfig(guildId).welcomeMessage, guildId);
  return getLocalGuildConfig(guildId);
}

function addLocalWarning(
  guildId: string,
  userId: string,
  moderatorId: string,
  reason: string,
): WarningRecord {
  const result = database
    .prepare(
      `INSERT INTO warnings (guild_id, user_id, moderator_id, reason)
       VALUES (?, ?, ?, ?)`,
    )
    .run(guildId, userId, moderatorId, reason);
  return database
    .prepare("SELECT * FROM warnings WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as WarningRecord;
}

export async function addWarning(
  guildId: string,
  userId: string,
  moderatorId: string,
  reason: string,
): Promise<WarningRecord> {
  if (firestore) {
    try {
      const reference = firestore
        .collection("guilds")
        .doc(guildId)
        .collection("warnings")
        .doc();
      const record: WarningRecord = {
        id: reference.id,
        guildId,
        userId,
        moderatorId,
        reason,
        createdAt: new Date().toISOString(),
      };
      await reference.set(record);
      return record;
    } catch {
      // Fall through to the local store.
    }
  }
  return addLocalWarning(guildId, userId, moderatorId, reason);
}

function getLocalWarnings(
  guildId: string,
  userId: string,
): WarningRecord[] {
  const rows = database
    .prepare(
      `SELECT * FROM warnings
       WHERE guild_id = ? AND user_id = ?
       ORDER BY id DESC`,
    )
    .all(guildId, userId) as Array<{
    id: number;
    guild_id: string;
    user_id: string;
    moderator_id: string;
    reason: string;
    created_at: string;
  }>;
  return rows.map((row) => ({
    id: row.id,
    guildId: row.guild_id,
    userId: row.user_id,
    moderatorId: row.moderator_id,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

export async function getWarnings(
  guildId: string,
  userId: string,
): Promise<WarningRecord[]> {
  if (firestore) {
    try {
      const snapshot = await firestore
        .collection("guilds")
        .doc(guildId)
        .collection("warnings")
        .where("userId", "==", userId)
        .get();
      return snapshot.docs
        .map((doc) => doc.data() as WarningRecord)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } catch {
      // Fall through to the local store.
    }
  }
  return getLocalWarnings(guildId, userId);
}

export async function removeWarnings(guildId: string, userId: string): Promise<number> {
  if (firestore) {
    try {
      const snapshot = await firestore
        .collection("guilds")
        .doc(guildId)
        .collection("warnings")
        .where("userId", "==", userId)
        .get();
      const batch = firestore.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      return snapshot.size;
    } catch {
      // Fall through to the local store.
    }
  }
  const result = database
    .prepare("DELETE FROM warnings WHERE guild_id = ? AND user_id = ?")
    .run(guildId, userId);
  return Number(result.changes);
}

export function closeDatabase(): void {
  database.close();
}