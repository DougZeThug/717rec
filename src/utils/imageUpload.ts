
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';

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
    fileToUpload = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      fileType: file.type,
    });
    
    console.log('Original file size:', file.size / 1024 / 1024, 'MB');
    console.log('Compressed file size:', fileToUpload.size / 1024 / 1024, 'MB');
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
