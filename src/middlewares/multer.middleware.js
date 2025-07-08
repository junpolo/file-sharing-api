import multer from "multer";
import crypto from "crypto";
import fs from "fs";

import { uploadDir } from "../services/file.service.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: function (_, file, cb) {
    // Generate publicKey and privateKey directly within the filename function
    const publicKey = crypto.randomBytes(8).toString("hex");
    const privateKey = crypto.randomBytes(8).toString("hex");

    file.publicKey = publicKey;
    file.privateKey = privateKey;

    // Construct the new filename
    const originalNameParts = file.originalname.split(".");
    const extension = originalNameParts.pop();
    const baseName = originalNameParts.join(".");

    const newFilename = `${publicKey}_${privateKey}_${baseName}.${extension}`;
    cb(null, newFilename);
  },
});

export const multerMiddleware = multer({ storage }).array("files");
