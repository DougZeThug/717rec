import { ImageIcon, Loader2, Palette, Upload } from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/useToast';
import { uploadHeroCardImage } from '@/utils/imageUpload';

import { ColorPresetPicker } from '../ColorPresetPicker';
import { IconPicker } from '../IconPicker';
import { SectionHeader } from './SectionHeader';
import { FormSectionProps } from './types';

export const DesignAppearanceSection: React.FC<FormSectionProps> = ({ formData, onChange }) => {
  const isFlyer = formData.card_type === 'flyer';
  const [imgError, setImgError] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUrlChange = (value: string) => {
    setImgError(false);
    onChange('image_url', value);
  };

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'File too large', description: 'Max file size is 10MB.', variant: 'destructive' });
        return;
      }

      setIsUploading(true);
      setImgError(false);
      try {
        const publicUrl = await uploadHeroCardImage(file);
        onChange('image_url', publicUrl);
        toast({ title: 'Uploaded!', description: 'Flyer image uploaded successfully.' });
      } catch (err: any) {
        toast({ title: 'Upload failed', description: err?.message || 'Something went wrong.', variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    },
    [onChange, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
      // Reset so same file can be re-selected
      e.target.value = '';
    },
    [handleFileUpload]
  );

  if (isFlyer) {
    return (
      <div className="bg-card rounded-lg border p-4">
        <SectionHeader icon={ImageIcon} title="Flyer Image" />

        <div className="space-y-4">
          {/* Drag-and-drop / click-to-upload zone */}
          <div
            role="button"
            tabIndex={0}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
            }}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-4 transition-colors ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border bg-muted/30 hover:border-muted-foreground/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {isUploading ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mb-3 h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-medium">Uploading…</p>
                <Progress value={undefined} className="mt-3 w-48" />
              </div>
            ) : formData.image_url && !imgError ? (
              <div className="relative">
                <img
                  src={formData.image_url}
                  alt="Flyer preview"
                  className="mx-auto max-h-64 w-auto rounded-md object-contain"
                  onError={() => setImgError(true)}
                />
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Click or drag a new image to replace
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Upload className="mb-2 h-10 w-10" />
                <p className="text-sm font-medium">
                  {formData.image_url && imgError
                    ? 'Could not load image — try uploading again'
                    : 'Click to browse or drag & drop an image'}
                </p>
                <p className="mt-1 text-xs">PNG, JPG, WebP up to 10MB</p>
              </div>
            )}
          </div>

          {/* Manual URL input as fallback */}
          <div>
            <Label htmlFor="image_url" className="text-xs text-muted-foreground">
              Or paste an image URL
            </Label>
            <Input
              id="image_url"
              value={formData.image_url}
              onChange={(e) => handleImageUrlChange(e.target.value)}
              placeholder="/images/my-flyer.png or https://..."
              className="mt-1"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border p-4">
      <SectionHeader icon={Palette} title="Design & Appearance" />

      <div className="space-y-6">
        <div>
          <Label className="mb-3 block">Color Theme</Label>
          <ColorPresetPicker
            backgroundValue={formData.background_color}
            textValue={formData.text_color}
            onSelect={(bg, text) => {
              onChange('background_color', bg);
              onChange('text_color', text);
            }}
          />
        </div>

        <div>
          <Label className="mb-3 block">Icon</Label>
          <IconPicker
            value={formData.icon_name}
            onChange={(iconId) => onChange('icon_name', iconId)}
          />
        </div>

        <div>
          <Label htmlFor="image_url">Background Image URL (optional)</Label>
          <Input
            id="image_url"
            value={formData.image_url}
            onChange={(e) => onChange('image_url', e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>
    </div>
  );
};
