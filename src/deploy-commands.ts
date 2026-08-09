import { REST, Routes } from "discord.js";
import "dotenv/config";
import { communityCommands } from "./commands/community.js";
import { configurationCommands } from "./commands/configuration.js";
import { generalCommands } from "./commands/general.js";
import { moderationCommands } from "./commands/moderation.js";

const allCommands = [
  ...communityCommands,
  ...configurationCommands,
  ...generalCommands,
  ...moderationCommands,
];

const commandsData = allCommands.map((cmd) => cmd.data.toJSON());

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

if (!token || !clientId) {
  console.error("❌ Error: DISCORD_TOKEN y CLIENT_ID deben estar definidos.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log(`⏳ Registrando ${commandsData.length} comandos slash en Discord...`);
    await rest.put(Routes.applicationCommands(clientId), { body: commandsData });
    console.log("✅ ¡Comandos slash registrados con éxito!");
  } catch (error) {
    console.error("❌ Error al registrar comandos:", error);
  }
})();