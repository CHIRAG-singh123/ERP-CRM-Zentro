import multer from 'multer';
import path from 'path';
import fs from 'fs';

const AVATAR_DIR = path.join(process.cwd(), 'server', 'uploads', 'avatars');

// Ensure upload directory exists
if (!fs.existsSync(AVATAR_DIR)) {
  fs.mkdirSync(AVATAR_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AVATAR_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safeExt = ext.toLowerCase();
    const userId = req.user?._id?.toString() || 'anon';
    cb(null, `${userId}-${Date.now()}${safeExt}`);
  },
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const fileFilter = (_req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only image files (jpg, png, webp) are allowed'));
  }
  cb(null, true);
};

export const avatarUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export const avatarUploadDir = AVATAR_DIR;

// Product image upload configuration
const PRODUCT_IMAGE_DIR = path.join(process.cwd(), 'server', 'uploads', 'products');

// Ensure product upload directory exists
if (!fs.existsSync(PRODUCT_IMAGE_DIR)) {
  fs.mkdirSync(PRODUCT_IMAGE_DIR, { recursive: true });
}

const productStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, PRODUCT_IMAGE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safeExt = ext.toLowerCase();
    const userId = req.user?._id?.toString() || 'anon';
    const timestamp = Date.now();
    cb(null, `product-${userId}-${timestamp}${safeExt}`);
  },
});

export const productImageUpload = multer({
  storage: productStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for product images
  },
});

export const productImageUploadDir = PRODUCT_IMAGE_DIR;

// Group avatar upload configuration
const GROUP_AVATAR_DIR = path.join(process.cwd(), 'server', 'uploads', 'group-avatars');

// Ensure group avatar upload directory exists
if (!fs.existsSync(GROUP_AVATAR_DIR)) {
  fs.mkdirSync(GROUP_AVATAR_DIR, { recursive: true });
}

const groupAvatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, GROUP_AVATAR_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safeExt = ext.toLowerCase();
    const groupId = req.params?.id || 'unknown';
    const timestamp = Date.now();
    cb(null, `group-${groupId}-${timestamp}${safeExt}`);
  },
});

export const groupAvatarUpload = multer({
  storage: groupAvatarStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

export const groupAvatarUploadDir = GROUP_AVATAR_DIR;

