
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';

/**
 * Verifies that a compressed image meets minimum quality requirements
 * @param file The file to verify
 * @returns Promise<boolean> True if valid, false otherwise
 */
const isValidCompressedImage = async (file: File): Promise<boolean> => {
  // Check file size (minimum 5KB)
  const minSizeKB = 5;
  const fileSizeKB = file.size / 1024;
  if (fileSizeKB < minSizeKB) {
    console.warn(`Compressed image too small (${fileSizeKB.toFixed(2)}KB < ${minSizeKB}KB)`);
    return false;
  }
  
  // Verify MIME type
  if (!file.type.startsWith('image/')) {
    console.warn(`Invalid MIME type: ${file.type}`);
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
          console.warn(`Invalid image dimensions: ${image.width}x${image.height}`);
        }
        resolve(isValid);
      };
      
      image.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        console.warn('Failed to load image for validation');
        resolve(false);
      };
      
      image.src = imageUrl;
    });
  } catch (error) {
    console.warn('Error validating image:', error);
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
  const maxSizeMB = 0.5; // 500KB max size
  const maxWidthOrHeight = 300; // Max dimensions 300x300px
  
  try {
    // Attempt to compress and resize the image
    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      fileType: file.type,
    });
    
    console.log('Original file size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('Compressed file size:', (compressedFile.size / 1024 / 1024).toFixed(2), 'MB');
    
    // Verify the compressed image meets quality standards
    const isValid = await isValidCompressedImage(compressedFile);
    
    if (isValid) {
      console.log('Using compressed image for upload');
      fileToUpload = compressedFile;
    } else {
      console.warn('Compressed image failed validation, using original file');
      fileToUpload = file;
    }
  } catch (error) {
    console.warn('Image compression failed, uploading original file:', error);
    // Continue with the original file if compression fails
    fileToUpload = file;
  }

  // Generate a unique filename
  const fileExt = file.name.split('.').pop();
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
      console.error('Error uploading image:', error);
      throw error;
    }

    // Get the public URL for the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('teams')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Image upload failed:', error);
    throw error;
  }
};
