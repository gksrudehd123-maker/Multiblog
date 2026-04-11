import sharp from "sharp";

export type ProcessImageOptions = {
  // 배경 톤 시프트 (0~360)
  hueShift?: number;
  // 밝기 (1.0 = 원본)
  brightness?: number;
  // 채도 (1.0 = 원본)
  saturation?: number;
  // 리사이즈 배율 (미세 변형으로 해시 회피)
  resizeScale?: number;
};

// 이미지 URL을 받아 변형 후 Buffer 반환
// 중복 이미지 탐지 회피 목적: 색상 + 약간의 리사이즈 조합
export async function processImage(
  imageUrl: string,
  options: ProcessImageOptions = {},
): Promise<{ buffer: Buffer; mimeType: string }> {
  const {
    hueShift = 15,
    brightness = 1.05,
    saturation = 1.1,
    resizeScale = 0.97,
  } = options;

  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`이미지 다운로드 실패: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  const pipeline = sharp(inputBuffer);
  const metadata = await pipeline.metadata();

  const width = metadata.width
    ? Math.round(metadata.width * resizeScale)
    : undefined;

  const processed = await sharp(inputBuffer)
    .resize(width)
    .modulate({
      brightness,
      saturation,
      hue: hueShift,
    })
    .jpeg({ quality: 88 })
    .toBuffer();

  return { buffer: processed, mimeType: "image/jpeg" };
}
