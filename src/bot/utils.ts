import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Client,
  type Guild,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import net from "node:net";
import { getGuildConfig } from "./database";

export const BRAND_COLOR = 0x6d4aff;

export function isGuildInteraction(
  interaction: ChatInputCommandInteraction,
): interaction is ChatInputCommandInteraction & {
  guild: Guild;
} {
  return Boolean(interaction.guild);
}

export async function requireGuild(
  interaction: ChatInputCommandInteraction,
): Promise<Guild | null> {
  if (!isGuildInteraction(interaction)) {
    await interaction.reply({
      content: "Este comando solo puede utilizarse dentro de un servidor.",
      ephemeral: true,
    });
    return null;
  }
  return interaction.guild;
}

export async function requirePermission(
  interaction: ChatInputCommandInteraction,
  permission: bigint,
): Promise<boolean> {
  if (!interaction.member || typeof interaction.member.permissions === "string") {
    await interaction.reply({
      content: "No se pudieron verificar tus permisos.",
      ephemeral: true,
    });
    return false;
  }
  if (!interaction.member.permissions.has(permission)) {
    await interaction.reply({
      content: "No tienes permisos suficientes para utilizar este comando.",
      ephemeral: true,
    });
    return false;
  }
  return true;
}

export async function formatConfigEmbed(guild: Guild): Promise<EmbedBuilder> {
  const config = await getGuildConfig(guild.id);
  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`Configuración de ${guild.name}`)
    .setDescription("Estos valores se leen directamente desde la base de datos local.")
    .addFields(
      {
        name: "Bienvenidas",
        value: config.welcomeChannelId
          ? `<#${config.welcomeChannelId}>\n${config.welcomeMessage}`
          : "No configuradas",
        inline: true,
      },
      {
        name: "Registros",
        value: config.logsChannelId ? `<#${config.logsChannelId}>` : "No configurados",
        inline: true,
      },
      {
        name: "Autorol",
        value: config.autoroleId ? `<@&${config.autoroleId}>` : "No configurado",
        inline: true,
      },
      {
        name: "Normas",
        value: config.rulesChannelId ? `<#${config.rulesChannelId}>` : "No configuradas",
        inline: true,
      },
      {
        name: "Tickets",
        value: config.ticketCategoryId
          ? `Categoría <#${config.ticketCategoryId}>`
          : "Categoría no configurada",
        inline: true,
      },
    )
    .setFooter({ text: "YupiCraft • configuración dinámica" })
    .setTimestamp();
}

export async function sendLog(
  client: Client,
  guild: Guild,
  title: string,
  description: string,
): Promise<void> {
  const config = await getGuildConfig(guild.id);
  if (!config.logsChannelId) return;
  const channel = await client.channels.fetch(config.logsChannelId).catch(() => null);
  if (!channel || channel.type !== ChannelType.GuildText) return;
  await (channel as TextChannel).send({
    embeds: [
      new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(title)
        .setDescription(description)
        .setTimestamp(),
    ],
  }).catch(() => undefined);
}

export function renderWelcomeMessage(
  template: string,
  member: GuildMember,
): string {
  return template
    .replaceAll("{user}", member.user.username)
    .replaceAll("{mention}", `<@${member.id}>`)
    .replaceAll("{server}", member.guild.name)
    .replaceAll("{memberCount}", String(member.guild.memberCount));
}

export async function checkMinecraftServer(
  host = process.env.MINECRAFT_IP ?? "play.yupicraft.serv.cx",
  port = Number(process.env.MINECRAFT_PORT ?? 25565),
): Promise<{ online: boolean; host: string; port: number }> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const finish = (online: boolean) => {
      socket.destroy();
      resolve({ online, host, port });
    };
    socket.setTimeout(1800);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export function hasManageGuild(member: GuildMember): boolean {
  return member.permissions.has(PermissionFlagsBits.ManageGuild);
}