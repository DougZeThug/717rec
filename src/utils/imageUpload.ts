import imageCompression from 'browser-image-compression';
import { v4 as uuidv4 } from 'uuid';

import { ADMIN_CONFIG } from '@/config/admin';
import { supabase } from '@/integrations/supabase/client';
import { errorLog, warnLog } from '@/utils/logger';

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const FILE_SIGNATURES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF....WEBP checked separately
} as const;

const hasAllowedExtension = (fileName: string): boolean => {
  const fileExtension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return ALLOWED_IMAGE_EXTENSIONS.has(fileExtension);
};

const matchesFileSignature = (bytes: Uint8Array): boolean => {
  const isJpeg = FILE_SIGNATURES.jpeg.every((byte, index) => bytes[index] === byte);
  if (isJpeg) return true;

  const isPng = FILE_SIGNATURES.png.every((byte, index) => bytes[index] === byte);
  if (isPng) return true;

  const hasRiffHeader = FILE_SIGNATURES.webp.every((byte, index) => bytes[index] === byte);
  const hasWebpType =
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50; // P

  return hasRiffHeader && hasWebpType;
};

const validateImageFile = async (file: File, maxBytes = ADMIN_CONFIG.maxUploadSize): Promise<void> => {
  if (!hasAllowedExtension(file.name)) {
    throw new Error('Unsupported file extension. Use JPG, PNG, or WebP.');
  }

  // Require a recognized MIME type. browser-image-compression rejects files
  // with empty `type`, so accepting them here would lead to uploads with
  // empty contentType metadata after the compression fallback.
  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error('Unsupported file type. Use JPEG, PNG, or WebP images only.');
  }

  if (file.size <= 0) {
    throw new Error('File is empty. Please choose a valid image.');
  }

  if (file.size > maxBytes) {
    throw new Error(`File is too large. Maximum size is ${Math.round(maxBytes / 1024 / 1024)}MB.`);
  }

  const headerBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!matchesFileSignature(headerBytes)) {
    throw new Error('File signature does not match an allowed image format.');
  }
};

/**
 * Uploads an image for hero cards (flyers) WITHOUT any compression or resizing.
 * Preserves full quality for flyer clarity.
 * @param file Original file to upload
 * @returns URL to the uploaded image
 */
export const uploadHeroCardImage = async (file: File): Promise<string> => {
  await validateImageFile(file);

  const fileExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `flyers/${fileName}`;

  const { error } = await supabase.storage.from('hero-cards').upload(filePath, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    errorLog('Error uploading hero card image:', error);
    throw error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('hero-cards').getPublicUrl(filePath);

  return publicUrl;
};

/**
 * Verifies that a compressed image meets minimum quality requirements
 * @param file The file to verify
 * @returns Promise<boolean> True if valid, false otherwise
 */
const isValidCompressedImage = async (file: File): Promise<boolean> => {
  // For WebP, small size is a feature - skip size check for WebP files
  if (file.type !== 'image/webp') {
    // Check file size (minimum 3KB for non-WebP)
    const minSizeKB = 3;
    const fileSizeKB = file.size / 1024;
    if (fileSizeKB < minSizeKB) {
      warnLog(`Compressed image too small (${fileSizeKB.toFixed(2)}KB < ${minSizeKB}KB)`);
      return false;
    }
  }

  // Verify MIME type
  if (!file.type.startsWith('image/')) {
    warnLog(`Invalid MIME type: ${file.type}`);
    return false;
  }

  // Verify image dimensions
  try {
    const image = new Image();
    const imageUrl = URL.createObjectURL(file);

    return new Promise((resolve) => {
      image.onload = () => {
        URL.revokeObjectURL(imageUrl);
        const isValid = image.width > 0 && image.height > 0;
        if (!isValid) {
          warnLog(`Invalid image dimensions: ${image.width}x${image.height}`);
        }
        resolve(isValid);
      };

      image.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        warnLog('Failed to load image for validation');
        resolve(false);
      };

      image.src = imageUrl;
    });
  } catch (error) {
    warnLog('Error validating image:', error);
    return false;
  }
};

/**
 * Compresses and resizes an image before uploading to Supabase storage
 * @param file Original file to upload
 * @param teamId Optional team ID for organized storage
 * @returns URL to the uploaded image
 */
export const uploadTeamImage = async (file: File, teamId?: string) => {
  await validateImageFile(file);

  let fileToUpload: File;
  const maxSizeMB = 0.15; // 150KB max size for quality at larger dimensions
  const maxWidthOrHeight = 300; // Max dimensions 300x300px for crisp display on high-DPI screens

  try {
    // Attempt to compress and resize the image, converting to WebP for better compression
    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      fileType: 'image/webp', // Use WebP for better compression
      initialQuality: 0.8, // 80% quality for good balance
    });

    // Verify the compressed image meets quality standards
    const isValid = await isValidCompressedImage(compressedFile);

    if (isValid) {
      fileToUpload = compressedFile;
    } else {
      // Fallback: try with original format if WebP fails
      const fallbackFile = await imageCompression(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight,
        useWebWorker: true,
        fileType: file.type,
      });
      fileToUpload = fallbackFile;
    }
  } catch (_error) {
    // Continue with the original file if compression fails
    fileToUpload = file;
  }

  // Generate a unique filename with correct extension based on actual file type
  const fileExt = fileToUpload.type === 'image/webp' ? 'webp' : file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const fileName = `${uuidv4()}.${fileExt}`;

  // Create path based on team ID if available
  const filePath = teamId ? `teams/${teamId}/${fileName}` : `${fileName}`;

  try {
    // Upload the file to Supabase storage
    const { error } = await supabase.storage.from('teams').upload(filePath, fileToUpload, {
      cacheControl: '3600',
      upsert: false,
      contentType: fileToUpload.type,
    });

    if (error) {
      errorLog('Error uploading image:', error);
      throw error;
    }

    // Get the public URL for the uploaded image
    const {
      data: { publicUrl },
    } = supabase.storage.from('teams').getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    errorLog('Image upload failed:', error);
    throw error;
  }
};
