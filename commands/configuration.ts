import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
  type TextChannel,
} from "discord.js";
import { resetGuildConfig, updateGuildConfig } from "../database";
import {
  formatConfigEmbed,
  requireGuild,
  requirePermission,
} from "../utils";
import type { Command } from "../types";

const setwelcome: Command = {
  data: new SlashCommandBuilder()
    .setName("setwelcome")
    .setDescription("Configura el canal donde se enviarán las bienvenidas.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Canal de texto para bienvenidas.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageGuild))) return;
    const guild = await requireGuild(interaction);
    if (!guild) return;
    const channel = interaction.options.getChannel("channel", true);
    await updateGuildConfig(guild.id, { welcomeChannelId: channel.id });
    await interaction.reply(`✅ Las bienvenidas se enviarán en <#${channel.id}>.`);
  },
};

const setwelcomemsg: Command = {
  data: new SlashCommandBuilder()
    .setName("setwelcomemsg")
    .setDescription("Personaliza el mensaje de bienvenida.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("Usa {user}, {mention}, {server} o {memberCount}.")
        .setMaxLength(1000)
        .setRequired(true),
    ),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageGuild))) return;
    const guild = await requireGuild(interaction);
    if (!guild) return;
    const message = interaction.options.getString("message", true);
    await updateGuildConfig(guild.id, { welcomeMessage: message });
    await interaction.reply({
      content: `✅ Mensaje actualizado.\nVista previa: ${message.replaceAll("{user}", interaction.user.username).replaceAll("{mention}", `<@${interaction.user.id}>`).replaceAll("{server}", guild.name).replaceAll("{memberCount}", String(guild.memberCount))}`,
      ephemeral: true,
    });
  },
};

const setlogs: Command = {
  data: new SlashCommandBuilder()
    .setName("setlogs")
    .setDescription("Configura el canal para registros de moderación.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Canal de registros.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageGuild))) return;
    const guild = await requireGuild(interaction);
    if (!guild) return;
    const channel = interaction.options.getChannel("channel", true);
    await updateGuildConfig(guild.id, { logsChannelId: channel.id });
    await interaction.reply(`✅ Los registros de moderación se enviarán en <#${channel.id}>.`);
  },
};

const setautorole: Command = {
  data: new SlashCommandBuilder()
    .setName("setautorole")
    .setDescription("Configura el rol que recibirán los nuevos miembros.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((option) =>
      option.setName("role").setDescription("Rol automático.").setRequired(true),
    ),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageGuild))) return;
    const guild = await requireGuild(interaction);
    if (!guild) return;
    const role = interaction.options.getRole("role", true);
    await updateGuildConfig(guild.id, { autoroleId: role.id });
    await interaction.reply(`✅ El autorol quedó configurado como <@&${role.id}>.`);
  },
};

const setrules: Command = {
  data: new SlashCommandBuilder()
    .setName("setrules")
    .setDescription("Establece el canal oficial de normas.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Canal donde están las normas.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageGuild))) return;
    const guild = await requireGuild(interaction);
    if (!guild) return;
    const channel = interaction.options.getChannel("channel", true);
    await updateGuildConfig(guild.id, { rulesChannelId: channel.id });
    await interaction.reply(`✅ El canal oficial de normas es <#${channel.id}>.`);
  },
};

const config: Command = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Gestiona la configuración persistente del servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand.setName("view").setDescription("Muestra la configuración actual."),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("reset").setDescription("Restablece toda la configuración."),
    ),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageGuild))) return;
    const guild = await requireGuild(interaction);
    if (!guild) return;
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "reset") {
      await resetGuildConfig(guild.id);
      await interaction.reply("✅ La configuración volvió a sus valores por defecto.");
      return;
    }
    await interaction.reply({ embeds: [await formatConfigEmbed(guild)], ephemeral: true });
  },
};

const ticketSetup: Command = {
  data: new SlashCommandBuilder()
    .setName("ticket-setup")
    .setDescription("Publica el panel para abrir tickets de soporte.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName("category")
        .setDescription("Categoría donde se crearán los tickets.")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Canal donde se publicará el panel.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    ),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageGuild))) return;
    const guild = await requireGuild(interaction);
    if (!guild) return;
    const category = interaction.options.getChannel("category", true);
    const channel = interaction.options.getChannel("channel", true) as TextChannel;
    await updateGuildConfig(guild.id, { ticketCategoryId: category.id });
    await channel.send({
      embeds: [{
        color: 0x6d4aff,
        title: "Centro de soporte YupiCraft",
        description: "¿Necesitas ayuda? Pulsa el botón para abrir un ticket privado con el equipo.",
        footer: { text: "YupiCraft • soporte" },
      }],
      components: [{
        type: 1,
        components: [{
          type: 2,
          custom_id: "ticket:create",
          label: "Abrir ticket",
          style: 1,
        }],
      }],
    });
    await interaction.reply(`✅ Panel de tickets publicado en <#${channel.id}>.`);
  },
};

export const configurationCommands: Command[] = [
  setwelcome,
  setwelcomemsg,
  setlogs,
  setautorole,
  setrules,
  config,
  ticketSetup,
];