import { REST, Routes } from "discord.js";
import { communityCommands } from "./commands/community.js";
import { configurationCommands } from "./commands/configuration.js";
import { generalCommands } from "./commands/general.js";
import { moderationCommands } from "./commands/moderation.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token || !clientId) {
  console.error("❌ Faltan las variables DISCORD_TOKEN o DISCORD_CLIENT_ID.");
  process.exit(1);
}

const commands = [
  ...communityCommands,
  ...configurationCommands,
  ...generalCommands,
  ...moderationCommands,
].map((cmd) => cmd.data.toJSON());

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log(`⏳ Registrando ${commands.length} comandos Slash...`);
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log("✅ ¡Comandos registrados globalmente en Discord con éxito!");
  } catch (error) {
    console.error("❌ Error al registrar los comandos:", error);
  }
})();