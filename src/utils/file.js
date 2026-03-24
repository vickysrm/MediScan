export function validateFile(file) {
  if (!file) return { valid: false, error: "No file selected" };
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Please upload an image file (JPG, PNG, WEBP)" };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: "File too large. Maximum size is 10MB." };
  }
  return { valid: true };
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Enhance image for better OCR: increase contrast, brightness, and sharpness
function enhanceImageForOCR(canvas, ctx, img) {
  canvas.width = img.width;
  canvas.height = img.height;

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Apply contrast and brightness enhancement
  const contrast = 1.4;  // 40% more contrast
  const brightness = 20; // +20 brightness

  for (let i = 0; i < data.length; i += 4) {
    // Enhance each channel
    data[i] = clamp((data[i] - 128) * contrast + 128 + brightness); // R
    data[i + 1] = clamp((data[i + 1] - 128) * contrast + 128 + brightness); // G
    data[i + 2] = clamp((data[i + 2] - 128) * contrast + 128 + brightness); // B
  }

  ctx.putImageData(imageData, 0, 0);

  // Apply sharpening using unsharp mask technique
  applySharpen(ctx, canvas.width, canvas.height);

  return canvas;
}

function clamp(value) {
  return Math.max(0, Math.min(255, value));
}

function applySharpen(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const original = new Uint8ClampedArray(data);

  // Sharpening kernel
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += original[idx] * kernel[ki++];
          }
        }
        const idx = (y * width + x) * 4 + c;
        data[idx] = clamp(sum);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export async function preprocessImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(file);
          return;
        }

        // Enhance the image
        enhanceImageForOCR(canvas, ctx, img);

        // Use JPEG for photos (much smaller), PNG only if original was PNG/WEBP
        const isPNG = file.type === "image/png" || file.type === "image/webp";
        const outputType = isPNG ? "image/png" : "image/jpeg";
        const outputQuality = isPNG ? undefined : 0.92;

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              resolve(new File([blob], file.name, { type: outputType }));
            } else {
              resolve(file);
            }
          },
          outputType,
          outputQuality
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(file); // Fallback to original on error
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // Fallback to original on error
    };

    img.src = url;
  });
}
