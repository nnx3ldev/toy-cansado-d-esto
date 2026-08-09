import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type Client,
} from "discord.js";
import {
  addWarning,
  getWarnings,
  removeWarnings,
} from "../database";
import {
  BRAND_COLOR,
  requireGuild,
  requirePermission,
  sendLog,
} from "../utils";
import type { Command } from "../types";

async function getTarget(
  interaction: ChatInputCommandInteraction,
  optionName = "user",
) {
  const guild = await requireGuild(interaction);
  if (!guild) return null;
  const user = interaction.options.getUser(optionName, true);
  const member = await guild.members.fetch(user.id).catch(() => null);
  if (!member) {
    await interaction.reply({
      content: "No encontré a ese miembro en el servidor.",
      ephemeral: true,
    });
    return null;
  }
  return { guild, user, member };
}

const ban: Command = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banea a un miembro del servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Miembro que será baneado.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Motivo del baneo.").setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("delete_days")
        .setDescription("Días de mensajes recientes que se eliminarán (0-7).")
        .setMinValue(0)
        .setMaxValue(7),
    ),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.BanMembers))) return;
    const target = await getTarget(interaction);
    if (!target) return;
    const reason = interaction.options.getString("reason", true);
    const deleteDays = interaction.options.getInteger("delete_days") ?? 0;
    if (!target.member.bannable) {
      await interaction.reply({ content: "No puedo banear a ese miembro por la jerarquía de roles.", ephemeral: true });
      return;
    }
    await target.member.ban({
      deleteMessageSeconds: deleteDays * 86400,
      reason: `${reason} • por ${interaction.user.tag}`,
    });
    await interaction.reply(`⛔ ${target.user.tag} fue baneado. Motivo: ${reason}`);
    await sendLog(client, target.guild, "Miembro baneado", `**Usuario:** ${target.user.tag}\n**Moderador:** ${interaction.user.tag}\n**Motivo:** ${reason}`);
  },
};

const kick: Command = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulsa a un miembro del servidor.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Miembro que será expulsado.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Motivo de la expulsión.").setRequired(true),
    ),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.KickMembers))) return;
    const target = await getTarget(interaction);
    if (!target) return;
    const reason = interaction.options.getString("reason", true);
    if (!target.member.kickable) {
      await interaction.reply({ content: "No puedo expulsar a ese miembro por la jerarquía de roles.", ephemeral: true });
      return;
    }
    await target.member.kick(`${reason} • por ${interaction.user.tag}`);
    await interaction.reply(`👢 ${target.user.tag} fue expulsado. Motivo: ${reason}`);
    await sendLog(client, target.guild, "Miembro expulsado", `**Usuario:** ${target.user.tag}\n**Moderador:** ${interaction.user.tag}\n**Motivo:** ${reason}`);
  },
};

const timeout: Command = {
  data: new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("Silencia temporalmente a un miembro.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Miembro que será silenciado.").setRequired(true),
    )
    .addIntegerOption((option) =>
      option.setName("minutes").setDescription("Duración en minutos (1-40320).").setMinValue(1).setMaxValue(40320).setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Motivo del silencio.").setRequired(true),
    ),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ModerateMembers))) return;
    const target = await getTarget(interaction);
    if (!target) return;
    const minutes = interaction.options.getInteger("minutes", true);
    const reason = interaction.options.getString("reason", true);
    if (!target.member.moderatable) {
      await interaction.reply({ content: "No puedo silenciar a ese miembro por la jerarquía de roles.", ephemeral: true });
      return;
    }
    await target.member.timeout(minutes * 60_000, `${reason} • por ${interaction.user.tag}`);
    await interaction.reply(`🔇 ${target.user.tag} quedó en silencio durante ${minutes} minutos.`);
    await sendLog(client, target.guild, "Miembro silenciado", `**Usuario:** ${target.user.tag}\n**Duración:** ${minutes} minutos\n**Motivo:** ${reason}`);
  },
};

const untimeout: Command = {
  data: new SlashCommandBuilder()
    .setName("untimeout")
    .setDescription("Quita el silencio temporal a un miembro.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Miembro al que se le quitará el silencio.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Motivo opcional.").setRequired(false),
    ),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ModerateMembers))) return;
    const target = await getTarget(interaction);
    if (!target) return;
    const reason = interaction.options.getString("reason") ?? "Sin motivo indicado";
    await target.member.timeout(null, `${reason} • por ${interaction.user.tag}`);
    await interaction.reply(`🔊 Se quitó el silencio a ${target.user.tag}.`);
    await sendLog(client, target.guild, "Silencio retirado", `**Usuario:** ${target.user.tag}\n**Motivo:** ${reason}`);
  },
};

const clear: Command = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Borra de 1 a 100 mensajes recientes.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option.setName("amount").setDescription("Cantidad de mensajes.").setMinValue(1).setMaxValue(100).setRequired(true),
    ),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ManageMessages))) return;
    const guild = await requireGuild(interaction);
    if (!guild) return;
    const channel = interaction.channel;
    if (!channel || !channel.isTextBased() || !("bulkDelete" in channel)) {
      await interaction.reply({ content: "Este canal no permite borrar mensajes en bloque.", ephemeral: true });
      return;
    }
    const amount = interaction.options.getInteger("amount", true);
    const deleted = await channel.bulkDelete(amount, true);
    await interaction.reply({ content: `🧹 Eliminé ${deleted.size} mensajes.`, ephemeral: true });
    await sendLog(client, guild, "Mensajes eliminados", `**Moderador:** ${interaction.user.tag}\n**Cantidad:** ${deleted.size}`);
  },
};

const warn: Command = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Añade una advertencia persistente a un miembro.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Miembro advertido.").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Motivo de la advertencia.").setRequired(true),
    ),
  async execute(interaction, client) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ModerateMembers))) return;
    const target = await getTarget(interaction);
    if (!target) return;
    const reason = interaction.options.getString("reason", true);
    const record = await addWarning(target.guild.id, target.user.id, interaction.user.id, reason);
    const total = (await getWarnings(target.guild.id, target.user.id)).length;
    await interaction.reply(`⚠️ Advertencia #${record.id} para ${target.user.tag}. Total: ${total}.`);
    await sendLog(client, target.guild, "Advertencia registrada", `**Usuario:** ${target.user.tag}\n**Moderador:** ${interaction.user.tag}\n**Motivo:** ${reason}`);
  },
};

const warnings: Command = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Consulta las advertencias persistentes de un miembro.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Miembro a consultar.").setRequired(true),
    )
    .addBooleanOption((option) =>
      option.setName("clear").setDescription("Elimina todas sus advertencias después de consultarlas."),
    ),
  async execute(interaction) {
    if (!(await requirePermission(interaction, PermissionFlagsBits.ModerateMembers))) return;
    const target = await getTarget(interaction);
    if (!target) return;
    const records = await getWarnings(target.guild.id, target.user.id);
    const shouldClear = interaction.options.getBoolean("clear") ?? false;
    if (shouldClear && records.length) await removeWarnings(target.guild.id, target.user.id);
    const description = records.length
      ? records
          .slice(0, 15)
          .map((warning) => `**#${warning.id}** — ${warning.reason}\n<@${warning.moderatorId}> · <t:${Math.floor(new Date(warning.createdAt).getTime() / 1000)}:R>`)
          .join("\n\n")
      : "Este miembro no tiene advertencias.";
    const embed = new EmbedBuilder()
      .setColor(records.length ? 0xf59e0b : BRAND_COLOR)
      .setTitle(`Advertencias de ${target.user.tag}`)
      .setDescription(description)
      .setFooter({ text: shouldClear && records.length ? "Advertencias eliminadas después de la consulta." : `${records.length} advertencia(s)` });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};

export const moderationCommands: Command[] = [ban, kick, timeout, untimeout, clear, warn, warnings];