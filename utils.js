import net from "net";
import { EmbedBuilder, PermissionFlagsBits } from "discord.js";
import { getGuildConfig } from "./database.js";

export const BRAND_COLOR = 0x6d4aff;

export async function requireGuild(interaction) {
  if (!interaction.guild) {
    await interaction.reply({
      content: "Este comando solo se puede usar dentro de un servidor.",
      ephemeral: true,
    });
    return null;
  }
  return interaction.guild;
}

export async function requirePermission(interaction, permissionBit) {
  if (!interaction.memberPermissions?.has(permissionBit)) {
    await interaction.reply({
      content: "No tienes permisos suficientes para ejecutar este comando.",
      ephemeral: true,
    });
    return false;
  }
  return true;
}

export async function sendLog(client, guild, title, description) {
  const config = await getGuildConfig(guild.id);
  if (!config.logsChannelId) return;

  const channel = guild.channels.cache.get(config.logsChannelId);
  if (channel && channel.isTextBased()) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(`📋 Registro • ${title}`)
      .setDescription(description)
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(console.error);
  }
}

export async function checkMinecraftServer(host = "yupicraft.serv.cx", port = 25565) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);

    socket.on("connect", () => {
      socket.destroy();
      resolve({ online: true, host, port });
    });

    socket.on("error", () => {
      socket.destroy();
      resolve({ online: false, host, port });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ online: false, host, port });
    });

    socket.connect(port, host);
  });
}

export async function formatConfigEmbed(guild) {
  const config = await getGuildConfig(guild.id);

  return new EmbedBuilder()
    .setColor(BRAND_COLOR)
    .setTitle(`Configuración de ${guild.name}`)
    .addFields(
      { name: "Canal de bienvenidas", value: config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : "No establecido", inline: true },
      { name: "Canal de registros (logs)", value: config.logsChannelId ? `<#${config.logsChannelId}>` : "No establecido", inline: true },
      { name: "Rol automático (autorole)", value: config.autoroleId ? `<@&${config.autoroleId}>` : "No establecido", inline: true },
      { name: "Canal de normas", value: config.rulesChannelId ? `<#${config.rulesChannelId}>` : "No establecido", inline: true },
      { name: "Categoría de tickets", value: config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : "No establecida", inline: true }
    )
    .setFooter({ text: "YupiCraft • Configuración actual" });
}