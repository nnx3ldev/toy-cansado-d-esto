import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { checkMinecraftServer, BRAND_COLOR } from "../utils";
import type { Command } from "../types";

const ip: Command = {
  data: new SlashCommandBuilder()
    .setName("ip")
    .setDescription("Muestra la IP y el estado rápido del servidor de Minecraft."),
  async execute(interaction) {
    await interaction.deferReply();
    const server = await checkMinecraftServer();
    const embed = new EmbedBuilder()
      .setColor(server.online ? 0x22c55e : 0xef4444)
      .setTitle("YupiCraft • Servidor de Minecraft")
      .addFields(
        { name: "IP", value: `\`${server.host}\``, inline: true },
        { name: "Puerto", value: String(server.port), inline: true },
        { name: "Estado", value: server.online ? "🟢 En línea" : "🔴 Sin respuesta", inline: true },
      )
      .setDescription("Visita https://yupicraft.serv.cx para más información.")
      .setFooter({ text: "La comprobación usa una conexión TCP directa." });
    await interaction.editReply({ embeds: [embed] });
  },
};

const verify: Command = {
  data: new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Muestra cómo vincular tu cuenta de Discord con YupiCraft."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle("Verificación de YupiCraft")
      .setDescription("Completa la verificación desde la web oficial para vincular tu cuenta.")
      .addFields(
        { name: "Paso 1", value: "Abre la web de YupiCraft.", inline: true },
        { name: "Paso 2", value: "Inicia sesión con Discord.", inline: true },
        { name: "Paso 3", value: "Sigue las instrucciones de vinculación.", inline: true },
      )
      .setURL("https://yupicraft.serv.cx")
      .setFooter({ text: "Este comando es un punto de entrada para el sistema web." });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

const coinflip: Command = {
  data: new SlashCommandBuilder().setName("coinflip").setDescription("Lanza una moneda."),
  async execute(interaction) {
    const result = Math.random() < 0.5 ? "Cara" : "Cruz";
    await interaction.reply(`🪙 La moneda cayó en **${result}**.`);
  },
};

const roll: Command = {
  data: new SlashCommandBuilder().setName("roll").setDescription("Lanza un dado aleatorio del 1 al 100."),
  async execute(interaction) {
    const value = Math.floor(Math.random() * 100) + 1;
    await interaction.reply(`🎲 ${interaction.user} sacó **${value}**.`);
  },
};

const hug: Command = {
  data: new SlashCommandBuilder()
    .setName("hug")
    .setDescription("Envía un abrazo a otro usuario.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Persona que recibirá el abrazo.").setRequired(true),
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
    const embed = new EmbedBuilder()
      .setColor(0xec4899)
      .setTitle("Abrazo YupiCraft")
      .setDescription(`**${interaction.user.username}** le dio un abrazo a **${user.username}**.`);
    await interaction.reply({ embeds: [embed] });
  },
};

export const communityCommands: Command[] = [ip, verify, coinflip, roll, hug];