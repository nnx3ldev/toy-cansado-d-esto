import type {
  ChatInputCommandInteraction,
  Client,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export type CommandBuilder =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;

export type Command = {
  data: CommandBuilder;
  execute: (
    interaction: ChatInputCommandInteraction,
    client: Client,
  ) => Promise<void>;
};

export type GuildConfig = {
  guildId: string;
  welcomeChannelId: string | null;
  welcomeMessage: string;
  logsChannelId: string | null;
  autoroleId: string | null;
  rulesChannelId: string | null;
  ticketCategoryId: string | null;
  updatedAt: string;
};

export type WarningRecord = {
  id: string | number;
  guildId: string;
  userId: string;
  moderatorId: string;
  reason: string;
  createdAt: string;
};