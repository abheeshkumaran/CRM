import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Check if Cloudinary is configured
export const isCloudinaryConfigured = () => {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
};

// Cloudinary storage for images
export const cloudinaryImageStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'crm/images',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
    } as any,
});

// Cloudinary storage for documents
export const cloudinaryDocumentStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'crm/documents',
        allowed_formats: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'],
        resource_type: 'auto',
    } as any,
});

// Cloudinary storage for recordings
export const cloudinaryRecordingStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'crm/recordings',
        allowed_formats: ['mp3', 'wav', 'ogg', 'm4a', 'webm'],
        resource_type: 'video', // audio files are stored as video resource type
    } as any,
});

export default cloudinary;
