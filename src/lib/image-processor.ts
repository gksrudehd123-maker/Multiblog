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
  // 출력 포맷
  format?: "jpeg" | "webp";
  // 품질 (0~100)
  quality?: number;
};

// 플랫폼별 프리셋 — 같은 원본 이미지라도 WP/Blogspot에 서로 다른 변형본이 올라가도록
// 구글 이미지 중복 탐지(pHash) 회피가 목적. 육안 구분은 거의 불가능한 수준의 미세 변형.
export const PLATFORM_IMAGE_PRESETS = {
  WORDPRESS: {
    hueShift: 15,
    brightness: 1.05,
    saturation: 1.1,
    resizeScale: 0.97,
    format: "jpeg" as const,
    quality: 88,
  },
  BLOGSPOT: {
    hueShift: -10,
    brightness: 1.02,
    saturation: 1.08,
    resizeScale: 0.93,
    format: "webp" as const,
    quality: 82,
  },
  TISTORY: {
    hueShift: 8,
    brightness: 1.03,
    saturation: 1.12,
    resizeScale: 0.95,
    format: "jpeg" as const,
    quality: 85,
  },
} satisfies Record<string, Required<ProcessImageOptions>>;

export type ImagePlatform = keyof typeof PLATFORM_IMAGE_PRESETS;

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
    format = "jpeg",
    quality = 88,
  } = options;

  const res = await fetch(imageUrl, {
    headers: {
      Referer: "https://blog.naver.com/",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
  });
  if (!res.ok) {
    throw new Error(`이미지 다운로드 실패: ${res.status}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  const metadata = await sharp(inputBuffer).metadata();
  const width = metadata.width
    ? Math.round(metadata.width * resizeScale)
    : undefined;

  let pipeline = sharp(inputBuffer).resize(width).modulate({
    brightness,
    saturation,
    hue: hueShift,
  });

  const processed =
    format === "webp"
      ? await pipeline.webp({ quality }).toBuffer()
      : await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();

  return {
    buffer: processed,
    mimeType: format === "webp" ? "image/webp" : "image/jpeg",
  };
}

// 플랫폼 프리셋으로 가공
export async function processImageForPlatform(
  imageUrl: string,
  platform: ImagePlatform,
): Promise<{ buffer: Buffer; mimeType: string }> {
  return processImage(imageUrl, PLATFORM_IMAGE_PRESETS[platform]);
}
