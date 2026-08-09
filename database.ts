import { DatabaseSync } from "node:sqlite";
import path from "node:path";

const dbPath = path.join(process.cwd(), "yupicraft.db");
export const db = new DatabaseSync(dbPath);

// Inicializar tablas básicas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '!'
  );
  CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    user_id TEXT,
    reason TEXT
  );
`);
