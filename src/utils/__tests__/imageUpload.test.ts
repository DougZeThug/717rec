import { beforeEach, describe, expect, it, vi } from 'vitest';

const uploadMock = vi.fn();
const getPublicUrlMock = vi.fn();
const storageFromMock = vi.fn().mockReturnValue({
  upload: uploadMock,
  getPublicUrl: getPublicUrlMock,
});

vi.mock('uuid', () => ({
  v4: () => 'fixed-uuid',
}));

const imageCompressionMock = vi.fn();
vi.mock('browser-image-compression', () => ({
  default: (...args: unknown[]) => imageCompressionMock(...args),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => storageFromMock(bucket),
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  errorLog: vi.fn(),
  warnLog: vi.fn(),
}));

import { uploadHeroCardImage, uploadTeamImage } from '../imageUpload';

const makeJpegFile = (name = 'logo.jpg') => {
  const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  return new File([jpegHeader], name, { type: 'image/jpeg' });
};

describe('imageUpload validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/file.jpg' } });
    imageCompressionMock.mockImplementation((file: File, options?: { fileType?: string }) => {
      if (options?.fileType === 'image/webp') {
        return Promise.resolve(
          new File([new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])], 'logo.webp', {
            type: 'image/webp',
          })
        );
      }

      return Promise.resolve(file);
    });

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    class MockImage {
      width = 100;
      height = 100;
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }

    vi.stubGlobal('Image', MockImage as unknown as typeof Image);
  });

  it('uploads allowed hero card image and returns public URL', async () => {
    const file = makeJpegFile('flyer.jpg');

    const publicUrl = await uploadHeroCardImage(file);

    expect(storageFromMock).toHaveBeenCalledWith('hero-cards');
    expect(uploadMock).toHaveBeenCalledWith('flyers/fixed-uuid.jpg', file, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpeg',
    });
    expect(publicUrl).toBe('https://cdn.example.com/file.jpg');
  });

  it('rejects disallowed extension before upload', async () => {
    const file = makeJpegFile('flyer.gif');

    await expect(uploadHeroCardImage(file)).rejects.toThrow('Unsupported file extension');
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('rejects file when MIME and signature do not match allowlist', async () => {
    const badFile = new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])], 'bad.jpg', {
      type: 'image/jpeg',
    });

    await expect(uploadHeroCardImage(badFile)).rejects.toThrow(
      'File signature does not match an allowed image format.'
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });

  it('accepts a valid JPEG with empty MIME type (browser could not detect)', async () => {
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const file = new File([jpegHeader], 'photo.jpg', { type: '' });

    const publicUrl = await uploadHeroCardImage(file);

    expect(uploadMock).toHaveBeenCalled();
    expect(publicUrl).toBe('https://cdn.example.com/file.jpg');
  });

  it('uploads team image into team-specific path', async () => {
    const file = makeJpegFile('team-logo.jpg');

    const publicUrl = await uploadTeamImage(file, 'team-123');

    expect(storageFromMock).toHaveBeenCalledWith('teams');
    expect(uploadMock).toHaveBeenCalledWith('teams/team-123/fixed-uuid.webp', expect.any(File), {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/webp',
    });
    expect(publicUrl).toBe('https://cdn.example.com/file.jpg');
  });
});
