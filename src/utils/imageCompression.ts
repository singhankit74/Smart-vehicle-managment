import imageCompression from 'browser-image-compression';

/**
 * Compression options for meter reading photos
 * Targets 200-300 KB file size while maintaining clarity
 */
const compressionOptions = {
  maxSizeMB: 0.3, // Maximum file size in MB (300 KB)
  maxWidthOrHeight: 1920, // Maximum width or height
  useWebWorker: true, // Use web worker for better performance
  fileType: 'image/jpeg', // Convert to JPEG for better compression
  initialQuality: 0.8, // Initial quality (0-1)
};

/**
 * Compress an image file before uploading
 * @param file - The original image file
 * @returns Compressed image file
 */
export const compressImage = async (file: File): Promise<File> => {
  try {
    console.log('Original file size:', (file.size / 1024 / 1024).toFixed(2), 'MB');
    
    const compressedFile = await imageCompression(file, compressionOptions);
    
    console.log('Compressed file size:', (compressedFile.size / 1024).toFixed(2), 'KB');
    
    // Create a new File object with the original name but compressed data
    const compressedFileWithName = new File(
      [compressedFile],
      file.name.replace(/\.[^/.]+$/, '.jpg'), // Change extension to .jpg
      { type: 'image/jpeg' }
    );
    
    return compressedFileWithName;
  } catch (error) {
    console.error('Error compressing image:', error);
    throw new Error('Failed to compress image. Please try again.');
  }
};

/**
 * Compress multiple images
 * @param files - Array of image files
 * @returns Array of compressed image files
 */
export const compressMultipleImages = async (files: File[]): Promise<File[]> => {
  const compressionPromises = files.map(file => compressImage(file));
  return Promise.all(compressionPromises);
};

/**
 * Validate image file before compression
 * @param file - File to validate
 * @returns true if valid, throws error if invalid
 */
export const validateImageFile = (file: File): boolean => {
  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file');
  }

  // Check file size (max 10 MB before compression)
  const maxSizeBeforeCompression = 10 * 1024 * 1024; // 10 MB
  if (file.size > maxSizeBeforeCompression) {
    throw new Error('Image size must be less than 10 MB');
  }

  return true;
};

/**
 * Get estimated compressed size
 * @param originalSize - Original file size in bytes
 * @returns Estimated compressed size in KB
 */
export const getEstimatedCompressedSize = (originalSize: number): string => {
  // Rough estimation: compression typically reduces to 5-10% of original
  const estimatedSize = (originalSize * 0.07) / 1024; // Convert to KB
  return `~${Math.round(estimatedSize)} KB`;
};

/**
 * Upload compressed image to Supabase Storage
 * @param file - Compressed image file
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param supabase - Supabase client
 * @returns Public URL of uploaded image
 */
export const uploadCompressedImage = async (
  file: File,
  bucket: string,
  path: string,
  supabase: any
): Promise<string> => {
  try {
    // Validate the file
    validateImageFile(file);
    
    // Compress the image
    const compressedFile = await compressImage(file);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, compressedFile, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error: any) {
    console.error('Error uploading compressed image:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
};

/**
 * Calculate storage savings
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Savings information
 */
export const calculateStorageSavings = (
  originalSize: number,
  compressedSize: number
) => {
  const savedBytes = originalSize - compressedSize;
  const savedMB = savedBytes / 1024 / 1024;
  const savingsPercentage = ((savedBytes / originalSize) * 100).toFixed(1);

  return {
    savedBytes,
    savedMB: savedMB.toFixed(2),
    savingsPercentage,
    originalSizeMB: (originalSize / 1024 / 1024).toFixed(2),
    compressedSizeKB: (compressedSize / 1024).toFixed(2),
  };
};
