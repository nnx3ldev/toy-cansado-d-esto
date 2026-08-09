import http from "http";
import {
  Client,
  Collection,
  GatewayIntentBits,
  Interaction,
  GuildMember,
  TextChannel,
  EmbedBuilder,
} from "discord.js";
import "dotenv/config";

import { communityCommands } from "./commands/community.js";
import { configurationCommands } from "./commands/configuration.js";
import { generalCommands } from "./commands/general.js";
import { moderationCommands } from "./commands/moderation.js";

import { getGuildConfig } from "./database.js";
import { BRAND_COLOR } from "./utils.js";
import type { Command } from "./types.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
  ],
});

// Registrar comandos en memoria
const commands = new Collection<string, Command>();
const allCommands = [
  ...communityCommands,
  ...configurationCommands,
  ...generalCommands,
  ...moderationCommands,
];

for (const command of allCommands) {
  commands.set(command.data.name, command);
}

// Bot listo
client.once("ready", (c) => {
  console.log(`🤖 Bot iniciado con éxito como: ${c.user.tag}`);
  console.log(`📦 ${commands.size} comandos cargados correctamente.`);
});

// Ejecución de comandos e interacción con menús
client.on("interactionCreate", async (interaction: Interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error ejecutando /${interaction.commandName}:`, error);
      const content = "❌ Ocurrió un error al ejecutar este comando.";
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content, ephemeral: true }).catch(() => null);
      } else {
        await interaction.reply({ content, ephemeral: true }).catch(() => null);
      }
    }
  } else if (interaction.isStringSelectMenu()) {
    if (interaction.customId === "help:category") {
      const category = interaction.values[0];
      const categoryNames: Record<string, string> = {
        moderation: "Moderación",
        configuration: "Configuración",
        utility: "Utilidad e información",
        community: "Comunidad y Minecraft",
      };

      const embed = new EmbedBuilder()
        .setColor(BRAND_COLOR)
        .setTitle(`Categoría: ${categoryNames[category] || category}`)
        .setDescription(`Explora las opciones de **${category}** con sus respectivos comandos slash.`)
        .setFooter({ text: "YupiCraft • Centro de ayuda" });

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
});

// Evento de Bienvenida y Autorol
client.on("guildMemberAdd", async (member: GuildMember) => {
  const config = await getGuildConfig(member.guild.id);

  // Autorol
  if (config.autoroleId) {
    await member.roles.add(config.autoroleId).catch((err) => {
      console.error(`Error al asignar autorol en ${member.guild.name}:`, err);
    });
  }

  // Bienvenida
  if (config.welcomeChannelId) {
    const channel = await member.guild.channels.fetch(config.welcomeChannelId).catch(() => null);
    if (channel && channel.isTextBased() && "send" in channel) {
      const rawMsg = config.welcomeMessage || "¡Bienvenido/a {mention} a {server}!";
      const formattedMsg = rawMsg
        .replaceAll("{user}", member.user.username)
        .replaceAll("{mention}", `<@${member.user.id}>`)
        .replaceAll("{server}", member.guild.name)
        .replaceAll("{memberCount}", String(member.guild.memberCount));

      await (channel as TextChannel).send(formattedMsg).catch(() => null);
    }
  }
});

// Servidor de Health Check para Render
const PORT = process.env.PORT || 3000;
http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.write("YupiCraft Bot está en línea 🚀");
  res.end();
}).listen(PORT, () => {
  console.log(`🌐 Servidor de Health Check escuchando en el puerto ${PORT}`);
});

// Iniciar sesión
client.login(process.env.DISCORD_TOKEN);