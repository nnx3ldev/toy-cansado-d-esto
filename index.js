import { Client, Collection, Events, GatewayIntentBits } from "discord.js";
import { communityCommands } from "./commands/community.js";
import { configurationCommands } from "./commands/configuration.js";
import { generalCommands } from "./commands/general.js";
import { moderationCommands } from "./commands/moderation.js";
import { getGuildConfig } from "./database.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

client.commands = new Collection();

const allCommands = [
  ...communityCommands,
  ...configurationCommands,
  ...generalCommands,
  ...moderationCommands,
];

for (const command of allCommands) {
  client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, (c) => {
  console.log(`🤖 Bot iniciado con éxito como ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error ejecutando /${interaction.commandName}:`, error);
      const replyOptions = {
        content: "Ocurrió un error al ejecutar este comando.",
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(replyOptions);
      } else {
        await interaction.reply(replyOptions);
      }
    }
    return;
  }

  if (interaction.isButton() && interaction.customId === "ticket:create") {
    const guild = interaction.guild;
    if (!guild) return;

    const config = await getGuildConfig(guild.id);
    if (!config.ticketCategoryId) {
      await interaction.reply({
        content: "El sistema de tickets no está configurado correctamente.",
        ephemeral: true,
      });
      return;
    }

    const channel = await guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      parent: config.ticketCategoryId,
      permissionOverwrites: [
        { id: guild.id, deny: ["ViewChannel"] },
        { id: interaction.user.id, allow: ["ViewChannel", "SendMessages"] },
      ],
    });

    await channel.send({
      content: `Hola ${interaction.user}, un miembro del equipo te atenderá en breve.`,
    });

    await interaction.reply({
      content: `✅ Ticket creado en <#${channel.id}>.`,
      ephemeral: true,
    });
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  const config = await getGuildConfig(member.guild.id);

  if (config.autoroleId) {
    await member.roles.add(config.autoroleId).catch(console.error);
  }

  if (config.welcomeChannelId) {
    const channel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (channel && channel.isTextBased()) {
      const message = (config.welcomeMessage || "¡Bienvenido/a {mention} a {server}!")
        .replaceAll("{user}", member.user.username)
        .replaceAll("{mention}", `<@${member.id}>`)
        .replaceAll("{server}", member.guild.name)
        .replaceAll("{memberCount}", String(member.guild.memberCount));

      await channel.send(message).catch(console.error);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);