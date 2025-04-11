
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

export const uploadTeamImage = async (file: File) => {
  // Generate a unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${uuidv4()}.${fileExt}`;
  const filePath = `${fileName}`;

  try {
    // Upload the file to Supabase storage
    const { data, error } = await supabase.storage
      .from('teams')
      .upload(filePath, file);

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
