import { Router } from "express";
import multer from "multer";
import crypto from "crypto";
import fs from "fs";
import path from "path";

const router = Router();

const UPLOAD_DIR = process.env.FOLDER || "uploads";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    cb(null, UPLOAD_DIR);
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

router.get("/api/files/:publicKey", (request, response) => {
  const { publicKey } = request.params;

  if (!publicKey) {
    return response.status(400).send({ message: "Public key is required." });
  }

  // Read the directory to find the file matching the public key
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) {
      return response
        .status(500)
        .send({ message: "Server error while accessing files." });
    }

    const foundFile = files.find((file) => file.startsWith(`${publicKey}_`));

    if (!foundFile) {
      return response.status(404).send({ message: "File not found." });
    }

    response.sendFile(foundFile, { root: UPLOAD_DIR }, (err) => {
      if (err) {
        if (err.code === "ENOENT") {
          return response
            .status(404)
            .send({ message: "File not found or has been removed." });
        }
        if (err.code === "ECONNABORTED" || err.code === "ECONNRESET") {
          return;
        }
        return response
          .status(500)
          .send({ message: "Could not download the file." });
      }
    });
  });
});

router.delete("/api/files/:privateKey", (request, response) => {
  const { privateKey } = request.params;

  if (!privateKey) {
    return response.status(400).send({ message: "Private key is required." });
  }

  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) {
      return response
        .status(500)
        .send({ message: "Server error while accessing files." });
    }

    const foundFile = files.find((file) => file.includes(`_${privateKey}_`));

    if (!foundFile) {
      return response
        .status(404)
        .send({ message: "File not found or private key invalid." });
    }

    const filePath = path.join(UPLOAD_DIR, foundFile);

    fs.unlink(filePath, (unlinkErr) => {
      if (unlinkErr) {
        if (unlinkErr.code === "ENOENT") {
          return response
            .status(404)
            .json({ message: "File not found or already deleted." });
        }
        return response
          .status(500)
          .json({ message: "Failed to delete the file." });
      }

      response.status(200).json({ message: "File removed successfully!" });
    });
  });
});

export default router;
