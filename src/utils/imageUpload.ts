
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';
import { warnLog, errorLog } from "@/utils/logger";

/**
 * Verifies that a compressed image meets minimum quality requirements
 * @param file The file to verify
 * @returns Promise<boolean> True if valid, false otherwise
 */
const isValidCompressedImage = async (file: File): Promise<boolean> => {
  // Check file size (minimum 10KB)
  const minSizeKB = 10;
  const fileSizeKB = file.size / 1024;
  if (fileSizeKB < minSizeKB) {
    warnLog(`Compressed image too small (${fileSizeKB.toFixed(2)}KB < ${minSizeKB}KB)`);
    return false;
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
  let fileToUpload = file;
  const maxSizeMB = 0.1; // 100KB max size for better performance
  const maxWidthOrHeight = 128; // Max dimensions 128x128px for avatar-sized images
  
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
  } catch (error) {
    // Continue with the original file if compression fails
    fileToUpload = file;
  }

  // Generate a unique filename with correct extension based on actual file type
  const fileExt = fileToUpload.type === 'image/webp' ? 'webp' : file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  
  // Create path based on team ID if available
  const filePath = teamId 
    ? `teams/${teamId}/${fileName}` 
    : `${fileName}`;

  try {
    // Upload the file to Supabase storage
    const { data, error } = await supabase.storage
      .from('teams')
      .upload(filePath, fileToUpload);

    if (error) {
      errorLog('Error uploading image:', error);
      throw error;
    }

    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('teams')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    errorLog('Image upload failed:', error);
    throw error;
  }
};
