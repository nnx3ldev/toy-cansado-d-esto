import type { Command } from "../types";
import { communityCommands } from "./community";
import { configurationCommands } from "./configuration";
import { generalCommands } from "./general";
import { moderationCommands } from "./moderation";

export const commands: Command[] = [
  ...moderationCommands,
  ...configurationCommands,
  ...generalCommands,
  ...communityCommands,
];