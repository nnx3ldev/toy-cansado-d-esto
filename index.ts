import { Client, GatewayIntentBits, Collection } from "discord.js";
import fs from "node:fs";
import path from "node:path";

// Extender el cliente para incluir la colección de comandos
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
}) as Client & { commands: Collection<string, any> };

client.commands = new Collection();

// Cargar comandos dinámicamente desde la carpeta commands
const commandsPath = path.join(__dirname, "commands");
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".ts") || file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      console.log(`[COMANDO CARGADO]: ${command.data.name}`);
    }
  }
}

// Manejador de interacciones (Slash Commands)
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = (client as any).commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "Hubo un error al ejecutar este comando.", ephemeral: true });
    } else {
      await interaction.reply({ content: "Hubo un error al ejecutar este comando.", ephemeral: true });
    }
  }
});

client.once("ready", () => {
  console.log(`¡ChuriBot conectado exitosamente como ${client.user?.tag}!`);
});

client.login(process.env.DISCORD_TOKEN);
