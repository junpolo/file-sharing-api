import fsPromises from "fs/promises";
import fs from "fs";
import path from "path";

const UPLOAD_DIRECTORY = process.env.FOLDER || "uploads";
const FILE_AGE_LIMIT = 1000 * 60 * 60; // 1hr
export const uploadDir = path.resolve("./", UPLOAD_DIRECTORY);

export const getFileInfoResponse = (files) => {
  if (!files || files.length === 0) return [];

  return files.map((file) => ({
    filename: file.originalname,
    publicKey: file.publicKey,
    privateKey: file.privateKey,
  }));
};

export const findFileByPublicKey = async (publicKey) => {
  if (!publicKey) throw new Error("Public key is required");

  try {
    const filesInDirectory = await fsPromises.readdir(uploadDir);
    const foundFile = filesInDirectory.find((file) =>
      file.startsWith(`${publicKey}_`)
    );

    if (!foundFile) {
      const error = new Error("File not found");
      error.statusCode = 404;
      throw error;
    }

    return foundFile;
  } catch (error) {
    if (error.statusCode) throw error;

    const serviceError = new Error("Server error while accessing files");
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

export const deleteFileByPrivateKey = async (privateKey) => {
  if (!privateKey) throw new Error("Private key is required");

  try {
    const filesInDirectory = await fsPromises.readdir(uploadDir);
    const foundFile = filesInDirectory.find((file) =>
      file.includes(`_${privateKey}_`)
    );

    if (!foundFile) {
      const error = new Error("File not found or private key is invalid");
      error.statusCode = 404;
      throw error;
    }

    const filePath = path.join(uploadDir, foundFile);
    await fsPromises.unlink(filePath);
  } catch (error) {
    if (error.statusCode) throw error;

    const serviceError = new Error("Failed to delete file");
    serviceError.statusCode = 500;
    throw serviceError;
  }
};

export const deleteOldFiles = () => {
  if (!fs.existsSync(uploadDir)) return;

  console.log("here");
  const now = Date.now();

  fs.readdirSync(uploadDir).forEach((file) => {
    const filePath = path.join(uploadDir, file);
    const { mtimeMs } = fs.statSync(filePath);

    const age = now - mtimeMs;

    if (age > FILE_AGE_LIMIT) {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Failed to delete ${filePath}:`, err);
        else console.log(`Deleted old file: ${filePath}`);
      });
    }
  });
};
