import express, { Request } from "express";
import multer, { FileFilterCallback, StorageEngine } from "multer";
import dotenv from "dotenv";

dotenv.config();

const storage: StorageEngine = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void): void => {
    // Use environment variable for upload path, with fallback to '/tmp'
    const uploadPath = process.env.UPLOAD_PATH || '/tmp';
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void): void => {
    // Use the original filename for saving uploaded file
    cb(null, file.originalname);
  }
});

const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
  // Allow images, PDF, and DOC/DOCX file types
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else if (
    file.mimetype === "application/pdf" ||
    file.mimetype === "application/msword" ||
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    cb(null, true);
  } else {
    // Reject unsupported file types
    cb(new Error("Filetype not supported. Only images, PDF, and DOC/DOCX files are allowed"));
  }
};

// Set file size limit to 4 MB
const fileSizeLimit = 1024 * 1024 * 4;

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: fileSizeLimit }
});

export { upload };
