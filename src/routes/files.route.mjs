import { Router } from "express";
import multer from "multer";
import crypto from "crypto";

const router = Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
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

const upload = multer({ storage });

router.post("/api/files", upload.array("files"), (request, response) => {
  // Check if files were uploaded
  if (!request.files || request.files.length === 0) {
    return response.status(400).send({ message: "No files uploaded." });
  }

  // Process the uploaded files
  const fileInfos = request.files.map((file) => {
    return {
      fileName: file.originalname, // Original name from the client
      publicKey: file.publicKey,
      privateKey: file.privateKey,
    };
  });

  if (fileInfos.length === 1) {
    return response.status(200).json({
      message: "File uploaded successfully!",
      file: fileInfos[0],
    });
  } else {
    return response.status(200).json({
      message: "Files uploaded successfully!",
      files: fileInfos,
    });
  }
});
export default router;
