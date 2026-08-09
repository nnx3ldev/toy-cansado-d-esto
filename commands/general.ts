import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from "discord.js";
import { requireGuild, requirePermission, BRAND_COLOR } from "../utils";
import type { Command } from "../types";

const help: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Abre el panel interactivo de ayuda de YupiCraft."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle("YupiCraft • Centro de ayuda")
      .setDescription("Selecciona una categoría para explorar los comandos disponibles.")
      .addFields(
        { name: "Moderación", value: "Ban, kick, timeout, advertencias y limpieza.", inline: true },
        { name: "Configuración", value: "Bienvenidas, logs, autorol, normas y tickets.", inline: true },
        { name: "Utilidad", value: "Información, encuestas, mensajes y servidor.", inline: true },
        { name: "Comunidad", value: "Minecraft, verificación y diversión.", inline: true },
      )
      .setFooter({ text: "YupiCraft • usa el menú para ver detalles" });
    const menu = new StringSelectMenuBuilder()
      .setCustomId("help:category")
      .setPlaceholder("Elige una categoría")
      .addOptions(
        { label: "Moderación", value: "moderation", description: "Herramientas para el equipo moderador" },
        { label: "Configuración", value: "configuration", description: "Ajustes persistentes del servidor" },
        { label: "Utilidad e información", value: "utility", description: "Información y herramientas prácticas" },
        { label: "Comunidad y Minecraft", value: "community", description: "YupiCraft, verificación y diversión" },
      );
    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)],
    });
  },
};

const ping: Command = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Muestra la latencia del bot y de la API."),
  async execute(interaction, client) {
    const sentAt = Date.now();
    await interaction.reply("Calculando latencia...");
    const messageLatency = Date.now() - sentAt;
    await interaction.editReply(`🏓 Pong\nAPI: ${client.ws.ping}ms\nRespuesta: ${messageLatency}ms`);
  },
};

const userinfo: Command = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Muestra información detallada de un usuario.")
    .addUserOption((option) => option.setName("user").setDescription("Usuario a consultar.")),
  async execute(interaction) {
    const guild = await requireGuild(interaction);
    if (!guild) return;
    const user = interaction.options.getUser("user") ?? interaction.user;
    const member = await guild.members.fetch(user.id).catch(() => null);
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(`Información de ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: "ID", value: user.id, inline: true },
        { name: "Cuenta creada", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: true },
        { name: "Ingreso al servidor", value: member ? `<t:${Math.floor(member.joinedTimestamp! / 1000)}:F>` : "No disponible", inline: false },
        { name: "Roles", value: member?.roles.cache.filter((role) => role.id !== guild.id).map((role) => `<@&${role.id}>`).join(", ") || "Sin roles", inline: false },
      );
    await interaction.reply({ embeds: [embed] });
  },
};

const serverinfo: Command = {
  data: new SlashCommandBuilder().setName("serverinfo").setDescription("Muestra detalles y estadísticas del servidor."),
  async execute(interaction) {
    const guild = await requireGuild(interaction);
    if (!guild) return;
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(guild.name)
      .setThumbnail(guild.iconURL({ size: 512 }))
      .addFields(
        { name: "Miembros", value: String(guild.memberCount), inline: true },
        { name: "Canales", value: String(guild.channels.cache.size), inline: true },
        { name: "Roles", value: String(guild.roles.cache.size - 1), inline: true },
        { name: "Creado", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "Web", value: "https://yupicraft.serv.cx", inline: true },
      )
      .setFooter({ text: "YupiCraft" });
    await interaction.reply({ embeds: [embed] });
  },
};

const avatar: Command = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Muestra el avatar de un usuario.")
    .addUserOption((option) => option.setName("user").setDescription("Usuario a consultar.")),
  async execute(interaction) {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const embed = new EmbedBuilder()
      .setColor(BRAND_COLOR)
      .setTitle(`Avatar de ${user.tag}`)
      .setImage(user.displayAvatarURL({ size: 2048, extension: "png" }))
      .setURL(user.displayAvatarURL({ size: 2048, extension: "png" }));
    await interaction.reply({ embeds: [embed] });
  },
};

const poll: Command = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Crea una encuesta rápida con botones.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((option) => option.setName("question").setDescription("Pregunta de la encuesta.").setMaxLength(240).setRequired(true))
    .addStringOption((option) => option.setName("option_a").setDescription("Primera opción.").setMaxLength(80).setRequired(true))
    .addStringOption((option) => option.setName("option_b").setDescription("Segunda opción.").setMaxLength(80).setRequired(true)),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageMessages))) return;
    const question = interaction.options.getString("question", true);
    const optionA = interaction.options.getString("option_a", true);
    const optionB = interaction.options.getString("option_b", true);
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor(BRAND_COLOR).setTitle("Encuesta").setDescription(question).addFields({ name: "Opciones", value: `🅰️ ${optionA}\n🅱️ ${optionB}` }).setFooter({ text: `Creada por ${interaction.user.tag}` })],
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("poll:a").setLabel("🅰️ Votar A").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("poll:b").setLabel("🅱️ Votar B").setStyle(ButtonStyle.Secondary),
      )],
    });
  },
};

const say: Command = {
  data: new SlashCommandBuilder()
    .setName("say")
    .setDescription("Envía un mensaje como YupiCraft.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption((option) => option.setName("message").setDescription("Mensaje a enviar.").setMaxLength(2000).setRequired(true)),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageMessages))) return;
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || !("send" in channel)) {
      await interaction.reply({ content: "Este canal no permite enviar mensajes.", ephemeral: true });
      return;
    }
    await channel.send(interaction.options.getString("message", true));
    await interaction.reply({ content: "✅ Mensaje enviado.", ephemeral: true });
  },
};

export const generalCommands: Command[] = [help, ping, userinfo, serverinfo, avatar, poll, say];