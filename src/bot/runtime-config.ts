import { config as loadDotenv } from "dotenv";
import { findAttachedAsset } from "./paths";

const uploadedEnv = findAttachedAsset((file) => file.endsWith(".env"));
if (uploadedEnv) {
  loadDotenv({ path: uploadedEnv });
}
loadDotenv();