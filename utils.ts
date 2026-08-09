import { ChatInputCommandInteraction, EmbedBuilder, Guild } from "discord.js";
import { db } from "./database.js";

// Verificar si el comando se ejecuta en un servidor
export async function requireGuild(interaction: ChatInputCommandInteraction): Promise<Guild | null> {
  if (!interaction.guild) {
    await interaction.reply({ content: "❌ Este comando solo se puede usar en un servidor.", ephemeral: true });
    return null;
  }
  return interaction.guild;
}

// Verificar permisos del usuario
export async function requirePermission(interaction: ChatInputCommandInteraction, permission: bigint): Promise<boolean> {
  if (!interaction.memberPermissions?.has(permission)) {
    await interaction.reply({ content: "❌ No tienes permisos suficientes para usar este comando.", ephemeral: true });
    return false;
  }
  return true;
}

// Funciones para actualizar/leer configuración en SQLite
export async function updateGuildConfig(guildId: string, data: Record<string, any>) {
  // Asegurar que existe la tabla de configuración extendida
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_configs (
      guild_id TEXT PRIMARY KEY,
      welcomeChannelId TEXT,
      welcomeMessage TEXT,
      logsChannelId TEXT,
      autoroleId TEXT,
      rulesChannelId TEXT,
      ticketCategoryId TEXT
    );
  `);

  // Obtener columnas actuales o insertar registro base
  const existing = db.prepare(`SELECT * FROM guild_configs WHERE guild_id = ?`).get(guildId);
  if (!existing) {
    db.prepare(`INSERT INTO guild_configs (guild_id) VALUES (?)`).run(guildId);
  }

  // Actualizar los campos pasados
  for (const [key, value] of Object.entries(data)) {
    try {
      db.prepare(`UPDATE guild_configs SET ${key} = ? WHERE guild_id = ?`).run(value, guildId);
    } catch (e) {
      console.error(`Error actualizando configuración ${key}:`, e);
    }
  }
}

export async function resetGuildConfig(guildId: string) {
  db.prepare(`DELETE FROM guild_configs WHERE guild_id = ?`).run(guildId);
}

// Formatear embed de configuración actual
export async function formatConfigEmbed(guild: Guild) {
  const config: any = db.prepare(`SELECT * FROM guild_configs WHERE guild_id = ?`).get(guild.id) || {};
  
  return new EmbedBuilder()
    .setTitle(`⚙️ Configuración de ${guild.name}`)
    .setColor(0x6d4aff)
    .addFields(
      { name: "Canal de Bienvenida", value: config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : "No configurado", inline: true },
      { name: "Canal de Logs", value: config.logsChannelId ? `<#${config.logsChannelId}>` : "No configurado", inline: true },
      { name: "Autorol", value: config.autoroleId ? `<@&${config.autoroleId}>` : "No configurado", inline: true },
      { name: "Canal de Normas", value: config.rulesChannelId ? `<#${config.rulesChannelId}>` : "No configurado", inline: true },
      { name: "Categoría de Tickets", value: config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : "No configurado", inline: true },
      { name: "Mensaje de Bienvenida", value: `\`\`\`${config.welcomeMessage || "Por defecto"}\`\`\``, inline: false }
    )
    .setTimestamp();
}
