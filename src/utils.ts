import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  Guild,
  TextChannel,
  type Client,
} from "discord.js";
import { getGuildConfig } from "./database.js";

export const BRAND_COLOR = 0x6d4aff;

export async function checkMinecraftServer(): Promise<{ online: boolean; host: string; port: number }> {
  try {
    const res = await fetch("https://api.mcsrvstat.us/3/yupicraft.serv.cx");
    if (res.ok) {
      const data = (await res.json()) as { online: boolean; port?: number };
      return {
        online: data.online ?? false,
        host: "yupicraft.serv.cx",
        port: data.port ?? 25565,
      };
    }
  } catch {
    // Si falla la petición HTTP
  }
  return { online: false, host: "yupicraft.serv.cx", port: 25565 };
}

export async function requireGuild(
  interaction: ChatInputCommandInteraction
): Promise<Guild | null> {
  if (!interaction.guild) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Este comando solo se puede usar dentro de un servidor.",
        ephemeral: true,
      });
    }
    return null;
  }
  return interaction.guild;
}

export async function requirePermission(
  interaction: ChatInputCommandInteraction,
  permission: bigint
): Promise<boolean> {
  if (!interaction.memberPermissions?.has(permission)) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "❌ No tienes los permisos necesarios para ejecutar este comando.",
        ephemeral: true,
      });
    }
    return false;
  }
  return true;
}

export async function formatConfigEmbed(guild: Guild): Promise<EmbedBuilder> {
  const config = await getGuildConfig(guild.id);
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`Configuración de ${guild.name}`)
    .addFields(
      { name: "📢 Bienvenidas", value: config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : "No configurado", inline: true },
      { name: "📜 Mensaje", value: config.welcomeMessage ? `\`${config.welcomeMessage}\`` : "Por defecto", inline: true },
      { name: "📝 Registros (Logs)", value: config.logsChannelId ? `<#${config.logsChannelId}>` : "No configurado", inline: true },
      { name: "🎭 Autorol", value: config.autoroleId ? `<@&${config.autoroleId}>` : "No configurado", inline: true },
      { name: "📋 Normas", value: config.rulesChannelId ? `<#${config.rulesChannelId}>` : "No configurado", inline: true },
      { name: "🎫 Categoría Tickets", value: config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : "No configurada", inline: true }
    )
    .setFooter({ text: "YupiCraft • Estado de la configuración" });
}

export async function sendLog(
  client: Client,
  guild: Guild,
  actionTitle: string,
  description: string
): Promise<void> {
  const config = await getGuildConfig(guild.id);
  if (!config.logsChannelId) return;

  const channel = await guild.channels.fetch(config.logsChannelId).catch(() => null);
  if (channel && channel.isTextBased() && "send" in channel) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(`📋 Registro: ${actionTitle}`)
      .setDescription(description)
      .setTimestamp();
    await (channel as TextChannel).send({ embeds: [embed] }).catch(() => null);
  }
}