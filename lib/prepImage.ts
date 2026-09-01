import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// A phone camera photo is often 3-4 MB at 4000px wide. That is slow to upload
// and slow for the vision model to read, and none of that resolution helps the
// estimate. Downscale and recompress before the photo leaves the device.
//
// Text-heavy photos (a nutrition label, a handwritten workout plan) need more
// pixels than a plate of food to stay legible, so the caller passes the cap.
export async function downscaleForVision(
  uri: string,
  maxWidth: number,
): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: maxWidth });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.7,
  });
  return result.uri;
}

// A plate of food. 1024px is plenty for portion and macro estimation.
export const VISION_FOOD_WIDTH = 1024;

// A printed label or a handwritten schedule, where small digits and letters
// have to survive the downscale.
export const VISION_TEXT_WIDTH = 1600;
