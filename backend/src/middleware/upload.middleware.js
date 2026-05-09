import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    const safeBase = path
      .basename(file.originalname, extension)
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()
      .slice(0, 48);
    cb(null, `${Date.now()}-${safeBase}${extension}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
  cb(null, allowed.includes(file.mimetype));
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});

