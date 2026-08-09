import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Collection,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  Routes,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import { commands } from "./commands";
import {
  getGuildConfig,
  getWarnings,
} from "./database";
import {
  BRAND_COLOR,
  renderWelcomeMessage,
  sendLog,
} from "./utils";
import { logger } from "../lib/logger";
import type { Command } from "./types";
import "./runtime-config";

const commandCollection = new Collection<string, Command>(
  commands.map((command) => [command.data.name, command]),
);
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

export const botState = {
  started: false,
  ready: false,
  commandCount: commands.length,
  username: null as string | null,
};

const helpDescriptions: Record<string, string> = {
  moderation: [
    "`/ban` · `/kick` · `/timeout` · `/untimeout`",
    "`/clear` · `/warn` · `/warnings`",
  ].join("\n"),
  configuration: [
    "`/setwelcome` · `/setwelcomemsg` · `/setlogs`",
    "`/setautorole` · `/setrules` · `/config` · `/ticket-setup`",
  ].join("\n"),
  utility: [
    "`/ping` · `/userinfo` · `/serverinfo` · `/avatar`",
    "`/poll` · `/say`",
  ].join("\n"),
  community: [
    "`/ip` · `/verify` · `/coinflip` · `/roll` · `/hug`",
  ].join("\n"),
};

async function registerCommands(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  const applicationId = process.env.DISCORD_APPLICATION_ID ?? process.env.CLIENT_ID;
  if (!token || !applicationId) {
    logger.warn(
      "DISCORD_TOKEN o DISCORD_APPLICATION_ID no están configurados; el servidor seguirá activo sin iniciar sesión en Discord.",
    );
    return;
  }

  const rest = new REST({ version: "10" }).setToken(token);
  const payload = commands.map((command) => command.data.toJSON());
  const guildId = process.env.DISCORD_GUILD_ID ?? process.env.GUILD_ID;
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
      body: payload,
    });
    logger.info({ guildId, commandCount: payload.length }, "Comandos registrados en el servidor de desarrollo");
  } else {
    await rest.put(Routes.applicationCommands(applicationId), { body: payload });
    logger.info({ commandCount: payload.length }, "Comandos globales registrados");
  }
}

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const command = commandCollection.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, client);
  } catch (error) {
    logger.error({ err: error, command: interaction.commandName }, "Error ejecutando comando");
    const message = {
      content: "Ocurrió un error al ejecutar el comando. Revisa los permisos y vuelve a intentarlo.",
      ephemeral: true,
    };
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message).catch(() => undefined);
    } else {
      await interaction.reply(message).catch(() => undefined);
    }
  }
}

async function handleButton(interaction: import("discord.js").ButtonInteraction): Promise<void> {
  if (interaction.customId.startsWith("poll:")) {
    await interaction.reply({
      content: `Tu voto por la opción ${interaction.customId.endsWith(":a") ? "A" : "B"} fue registrado en esta encuesta.`,
      ephemeral: true,
    });
    return;
  }

  if (interaction.customId === "ticket:create") {
    if (!interaction.guild || !interaction.member) return;
    const config = await getGuildConfig(interaction.guild.id);
    if (!config.ticketCategoryId) {
      await interaction.reply({ content: "El sistema de tickets no está configurado.", ephemeral: true });
      return;
    }
    const existing = interaction.guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        channel.name === `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20)}`,
    );
    if (existing) {
      await interaction.reply({ content: `Ya tienes un ticket abierto: <#${existing.id}>`, ephemeral: true });
      return;
    }
    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20) || interaction.user.id.slice(-6)}`,
      type: ChannelType.GuildText,
      parent: config.ticketCategoryId,
      permissionOverwrites: [
        { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: client.user!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] },
      ],
    });
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(BRAND_COLOR)
          .setTitle("Ticket de soporte")
          .setDescription(`Hola ${interaction.user}, describe tu consulta y el equipo te atenderá pronto.`),
      ],
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("ticket:close").setLabel("Cerrar ticket").setStyle(ButtonStyle.Danger),
        ),
      ],
    });
    await interaction.reply({ content: `Ticket creado: <#${channel.id}>`, ephemeral: true });
    return;
  }

  if (interaction.customId === "ticket:close") {
    if (!interaction.channel || !interaction.channel.isTextBased()) return;
    await interaction.reply("Este ticket se cerrará en 5 segundos.");
    setTimeout(() => interaction.channel?.delete("Ticket cerrado por el usuario").catch(() => undefined), 5000);
  }
}

async function handleHelpMenu(interaction: import("discord.js").StringSelectMenuInteraction): Promise<void> {
  const category = interaction.values[0];
  await interaction.update({
    embeds: [
      new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`YupiCraft • ${category}`)
        .setDescription(helpDescriptions[category] ?? "Categoría no disponible.")
        .setFooter({ text: "Usa el menú para cambiar de categoría." }),
    ],
  });
}

async function handleMemberJoin(member: GuildMember): Promise<void> {
  const config = await getGuildConfig(member.guild.id);
  if (config.autoroleId) {
    await member.roles.add(config.autoroleId, "Autorol configurado desde Discord").catch((error) => {
      logger.warn({ err: error, guildId: member.guild.id }, "No se pudo asignar el autorol");
    });
  }
  if (config.welcomeChannelId) {
    const channel = await client.channels.fetch(config.welcomeChannelId).catch(() => null);
    if (channel?.type === ChannelType.GuildText) {
      await (channel as TextChannel).send(renderWelcomeMessage(config.welcomeMessage, member)).catch(() => undefined);
    }
  }
}

client.once(Events.ClientReady, (readyClient) => {
  botState.ready = true;
  botState.username = readyClient.user.tag;
  logger.info({ username: readyClient.user.tag, guilds: readyClient.guilds.cache.size }, "Bot de YupiCraft conectado");
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) await handleCommand(interaction);
  else if (interaction.isButton()) await handleButton(interaction);
  else if (interaction.isStringSelectMenu() && interaction.customId === "help:category") await handleHelpMenu(interaction);
});

client.on(Events.GuildMemberAdd, handleMemberJoin);
client.on(Events.GuildBanAdd, async (ban) => {
  await sendLog(client, ban.guild, "Baneo detectado", `**Usuario:** ${ban.user.tag}`);
});

export async function startBot(): Promise<void> {
  if (botState.started) return;
  botState.started = true;
  const token = process.env.DISCORD_TOKEN;
  const applicationId = process.env.DISCORD_APPLICATION_ID ?? process.env.CLIENT_ID;
  if (!token || !applicationId) return;
  try {
    await registerCommands();
    await client.login(token);
  } catch (error) {
    botState.started = false;
    logger.error({ err: error }, "No se pudo iniciar el bot de Discord");
  }
}

export async function stopBot(): Promise<void> {
  if (!botState.started) return;
  client.destroy();
  botState.started = false;
  botState.ready = false;
}

export { commands };