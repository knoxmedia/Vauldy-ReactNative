/**
 * Regenerate Android adaptive icon foreground with safe-zone padding.
 * Android masks only show ~66% of the center — scale the logo to ~56% of canvas.
 */
import { compositeImagesAsync, createSquareAsync, jimpAsync } from "@expo/image-utils";
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcIcon = join(root, "assets", "icon.png");
const destIcon = join(root, "assets", "adaptive-icon.png");
const CANVAS_SIZE = 1024;
const FOREGROUND_RATIO = 0.56;
const BACKGROUND_COLOR = "#e8eef5";

async function main() {
  const foregroundSize = Math.round(CANVAS_SIZE * FOREGROUND_RATIO);
  const foreground = await jimpAsync(
    { input: srcIcon, originalInput: srcIcon },
    [{ operation: "resize", width: foregroundSize, height: foregroundSize, fit: "contain" }],
  );
  const background = await createSquareAsync({ size: CANVAS_SIZE, color: BACKGROUND_COLOR });
  const offset = Math.round((CANVAS_SIZE - foregroundSize) / 2);
  const result = await compositeImagesAsync({
    foreground,
    background,
    x: offset,
    y: offset,
  });
  writeFileSync(destIcon, result);
  console.log(
    `generate-adaptive-icon: wrote ${destIcon} (${CANVAS_SIZE}px, logo ${foregroundSize}px / ${Math.round(FOREGROUND_RATIO * 100)}%)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
