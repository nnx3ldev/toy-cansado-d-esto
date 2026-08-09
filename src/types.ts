import type {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder
    | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction, client: Client) => Promise<void>;
}

export interface GuildConfig {
  welcomeChannelId?: string;
  welcomeMessage?: string;
  logsChannelId?: string;
  autoroleId?: string;
  rulesChannelId?: string;
  ticketCategoryId?: string;
}

export interface WarningRecord {
  id: number;
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  createdAt: string;
}