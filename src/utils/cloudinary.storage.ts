import CloudinaryStorage from 'multer-storage-cloudinary';
import cloudinary from './cloudinary';

// Storage cho posts
export const postStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'posts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  },
});

// Storage cho comments
export const commentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'comments',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  },
});

// Storage cho avatars
export const avatarStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'avatars',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    },
});

// Backward compatibility - default to comments
export const storage = commentStorage;
