import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

export function findAttachedAssetsDirectory(): string | null {
  const candidates = [
    path.resolve(process.cwd(), "attached_assets"),
    path.resolve(process.cwd(), "../attached_assets"),
    path.resolve(process.cwd(), "../../attached_assets"),
    path.resolve(process.cwd(), "../../../attached_assets"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

export function findAttachedAsset(
  predicate: (fileName: string) => boolean,
): string | null {
  const directory = findAttachedAssetsDirectory();
  if (!directory) return null;
  const fileName = readdirSync(directory).find(predicate);
  return fileName ? path.join(directory, fileName) : null;
}