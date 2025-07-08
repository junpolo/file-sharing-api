import { Router } from "express";

import {
  uploadMiddleware,
  getFileInfoResponse,
  findFileByPublicKey,
  deleteFileByPrivateKey,
  uploadDir,
} from "../services/file.service.js";
import {
  fileUploadLimiter,
  fileDownloadLimiter,
} from "../middlewares/ratelimit.middleware.js";

const router = Router();

router.post(
  "/api/files",
  fileUploadLimiter,
  uploadMiddleware,
  (request, response) => {
    // Check if files were uploaded
    if (!request.files || request.files.length === 0) {
      return response.status(400).send({ message: "No files uploaded." });
    }

    // Process the uploaded files
    const fileInfos = getFileInfoResponse(request.files);

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
  }
);

router.get(
  "/api/files/:publicKey",
  fileDownloadLimiter,
  async (request, response) => {
    const { publicKey } = request.params;

    try {
      const foundFile = await findFileByPublicKey(publicKey);

      response.sendFile(foundFile, { root: uploadDir }, (err) => {
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
    } catch (error) {
      const statusCode = error.statusCode || 500;
      response.status(statusCode).send({ message: error.message });
    }
  }
);

router.delete("/api/files/:privateKey", async (request, response) => {
  const { privateKey } = request.params;

  try {
    await deleteFileByPrivateKey(privateKey);
    response.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    response.status(statusCode).send({ message: error.message });
  }
});

export default router;
