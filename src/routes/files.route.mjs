import { Router } from "express";
import multer from "multer";
import crypto from "crypto";

const router = Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 'uploads' directory must exist or Multer will throw an error
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    // Generate publicKey and privateKey directly within the filename function
    const publicKey = crypto.randomBytes(8).toString("hex");
    const privateKey = crypto.randomBytes(8).toString("hex");

    // Store these keys on the request object for later use in your route handler
    // This is a common pattern to pass data generated during file processing.
    if (!req.fileKeys) {
      req.fileKeys = {}; // Initialize if not present
    }
    req.fileKeys[file.fieldname] = {
      // Use fieldname to handle multiple files if needed
      publicKey: publicKey,
      privateKey: privateKey,
    };

    // Construct the new filename
    const originalNameParts = file.originalname.split(".");
    const extension = originalNameParts.pop(); // Get the last part as extension
    const baseName = originalNameParts.join("."); // Join the rest as base name

    const newFilename = `${publicKey}_${privateKey}_${baseName}.${extension}`;
    cb(null, newFilename);
  },
});

const upload = multer({ storage });

router.post("/api/files", upload.array("files"), (request, response) => {
  // Check if files were uploaded
  if (!request.files || request.files.length === 0) {
    return response.status(400).send({ message: "No files uploaded." });
  }

  return response.status(200).json({
    message: "Files uploaded successfully!",
  });
});

export default router;
