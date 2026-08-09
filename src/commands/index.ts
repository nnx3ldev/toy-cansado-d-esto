import { Client, GatewayIntentBits, REST, Routes } from "discord.js";
import { communityCommands } from "./commands/community.js";
import { configurationCommands } from "./commands/configuration.js";
import { generalCommands } from "./commands/general.js";
import { moderationCommands } from "./commands/moderation.js";
import type { Command } from "./types.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Combinar todos los grupos de comandos en un solo arreglo
const allCommands: Command[] = [
  ...communityCommands,
  ...configurationCommands,
  ...generalCommands,
  ...moderationCommands,
];

client.once("ready", async () => {
  console.log(`Bot encendido como ${client.user?.tag}`);

  // Registro automático de comandos de barra (Slash Commands)
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);
  try {
    const commandData = allCommands.map((c) => c.data.toJSON());
    await rest.put(Routes.applicationCommands(client.user!.id), {
      body: commandData,
    });
    console.log("Comandos de barra registrados correctamente.");
  } catch (error) {
    console.error("Error al registrar los comandos:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = allCommands.find((c) => c.data.name === interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(`Error al ejecutar el comando /${interaction.commandName}:`, error);
    const errorMessage = { content: "Hubo un error al ejecutar este comando.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
