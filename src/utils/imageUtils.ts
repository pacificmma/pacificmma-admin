// src/utils/imageUtils.ts

export interface ImageOptimizationOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeKB?: number;
    format?: 'jpeg' | 'webp' | 'png';
  }
  
  export interface OptimizedImageResult {
    file: File;
    preview: string;
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
  }
  
  // Default options for class images
  export const DEFAULT_CLASS_IMAGE_OPTIONS: ImageOptimizationOptions = {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 0.85,
    maxSizeKB: 500, // 500KB max
    format: 'jpeg'
  };
  
  // Check if file is a valid image
  export const isValidImageFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    return validTypes.includes(file.type);
  };
  
  // Get file size in KB
  export const getFileSizeKB = (file: File): number => {
    return Math.round(file.size / 1024);
  };
  
  // Compress and resize image
  export const optimizeImage = async (
    file: File, 
    options: ImageOptimizationOptions = DEFAULT_CLASS_IMAGE_OPTIONS
  ): Promise<OptimizedImageResult> => {
    return new Promise((resolve, reject) => {
      // Validate file type
      if (!isValidImageFile(file)) {
        reject(new Error('Invalid file type. Please upload JPG, PNG, or WebP images.'));
        return;
      }
  
      const originalSize = file.size;
      const maxSizeBytes = (options.maxSizeKB || 500) * 1024;
  
      // If file is already small enough, return as-is
      if (originalSize <= maxSizeBytes) {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            file,
            preview: reader.result as string,
            originalSize,
            optimizedSize: originalSize,
            compressionRatio: 1
          });
        };
        reader.readAsDataURL(file);
        return;
      }
  
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
  
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }
  
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        const maxWidth = options.maxWidth || 1200;
        const maxHeight = options.maxHeight || 800;
  
        // Maintain aspect ratio while respecting max dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
  
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
  
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
  
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
  
        // Try different quality levels to meet size requirement
        let quality = options.quality || 0.85;
        let attempt = 0;
        const maxAttempts = 5;
  
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
  
              // Check if we've met the size requirement or reached max attempts
              if (blob.size <= maxSizeBytes || attempt >= maxAttempts) {
                // Create optimized file
                const optimizedFile = new File(
                  [blob], 
                  file.name.replace(/\.[^/.]+$/, `.${options.format || 'jpeg'}`),
                  { 
                    type: `image/${options.format || 'jpeg'}`,
                    lastModified: Date.now()
                  }
                );
  
                // Create preview URL
                const preview = URL.createObjectURL(blob);
  
                resolve({
                  file: optimizedFile,
                  preview,
                  originalSize,
                  optimizedSize: blob.size,
                  compressionRatio: Math.round((blob.size / originalSize) * 100) / 100
                });
              } else {
                // Reduce quality and try again
                attempt++;
                quality = Math.max(0.3, quality - 0.1);
                tryCompress();
              }
            },
            `image/${options.format || 'jpeg'}`,
            quality
          );
        };
  
        tryCompress();
      };
  
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
  
      // Load the image
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };
  
  // Format file size for display
  export const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / (1024 * 1024) * 10) / 10} MB`;
  };
  
  // Validate image file before upload
  export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
    // Check file type
    if (!isValidImageFile(file)) {
      return {
        isValid: false,
        error: 'Invalid file type. Please upload JPG, PNG, or WebP images.'
      };
    }
  
    // Check file size (max 10MB for original file)
    const maxOriginalSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxOriginalSize) {
      return {
        isValid: false,
        error: 'File too large. Maximum size is 10MB.'
      };
    }
  
    return { isValid: true };
  };