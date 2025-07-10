import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import {
  getFileInfoResponse,
  findFileByPublicKey,
  deleteFileByPrivateKey,
  deleteOldFiles,
  uploadDir,
} from "../../services/file.service.js";

// Mock the fs modules
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  unlink: jest.fn(),
}));

jest.mock("fs/promises", () => ({
  readdir: jest.fn(),
  unlink: jest.fn(),
}));

// Mock console methods to avoid noise in tests
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

describe("File Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getFileInfoResponse", () => {
    it("should return empty array when files is null or undefined", () => {
      expect(getFileInfoResponse(null)).toEqual([]);
      expect(getFileInfoResponse(undefined)).toEqual([]);
    });

    it("should return empty array when files is empty", () => {
      expect(getFileInfoResponse([])).toEqual([]);
    });

    it("should transform files array to response format", () => {
      const mockFiles = [
        {
          originalname: "test1.txt",
          publicKey: "pub123",
          privateKey: "priv123",
        },
        {
          originalname: "test2.pdf",
          publicKey: "pub456",
          privateKey: "priv456",
        },
      ];

      const result = getFileInfoResponse(mockFiles);

      expect(result).toEqual([
        {
          filename: "test1.txt",
          publicKey: "pub123",
          privateKey: "priv123",
        },
        {
          filename: "test2.pdf",
          publicKey: "pub456",
          privateKey: "priv456",
        },
      ]);
    });
  });

  describe("findFileByPublicKey", () => {
    it("should throw error when publicKey is not provided", async () => {
      await expect(findFileByPublicKey()).rejects.toThrow(
        "Public key is required"
      );
      await expect(findFileByPublicKey(null)).rejects.toThrow(
        "Public key is required"
      );
      await expect(findFileByPublicKey("")).rejects.toThrow(
        "Public key is required"
      );
    });

    it("should return filename when file is found", async () => {
      const mockFiles = ["pub123_some_file.txt", "pub456_another_file.pdf"];
      fsPromises.readdir.mockResolvedValue(mockFiles);

      const result = await findFileByPublicKey("pub123");

      expect(result).toBe("pub123_some_file.txt");
      expect(fsPromises.readdir).toHaveBeenCalledWith(uploadDir);
    });

    it("should throw 404 error when file is not found", async () => {
      const mockFiles = ["pub456_another_file.pdf"];
      fsPromises.readdir.mockResolvedValue(mockFiles);

      await expect(findFileByPublicKey("pub123")).rejects.toMatchObject({
        message: "File not found",
        statusCode: 404,
      });
    });

    it("should throw 500 error when filesystem operation fails", async () => {
      fsPromises.readdir.mockRejectedValue(new Error("Filesystem error"));

      await expect(findFileByPublicKey("pub123")).rejects.toMatchObject({
        message: "Server error while accessing files",
        statusCode: 500,
      });
    });

    it("should rethrow error if it already has statusCode", async () => {
      const customError = new Error("Custom error");
      customError.statusCode = 403;
      fsPromises.readdir.mockRejectedValue(customError);

      await expect(findFileByPublicKey("pub123")).rejects.toMatchObject({
        message: "Custom error",
        statusCode: 403,
      });
    });
  });

  describe("deleteFileByPrivateKey", () => {
    it("should throw error when privateKey is not provided", async () => {
      await expect(deleteFileByPrivateKey()).rejects.toThrow(
        "Private key is required"
      );
      await expect(deleteFileByPrivateKey(null)).rejects.toThrow(
        "Private key is required"
      );
      await expect(deleteFileByPrivateKey("")).rejects.toThrow(
        "Private key is required"
      );
    });

    it("should successfully delete file when found", async () => {
      const mockFiles = ["pub123_priv456_file.txt", "pub789_priv012_file.pdf"];
      fsPromises.readdir.mockResolvedValue(mockFiles);
      fsPromises.unlink.mockResolvedValue();

      await deleteFileByPrivateKey("priv456");

      expect(fsPromises.readdir).toHaveBeenCalledWith(uploadDir);
      expect(fsPromises.unlink).toHaveBeenCalledWith(
        path.join(uploadDir, "pub123_priv456_file.txt")
      );
    });

    it("should throw 404 error when file is not found", async () => {
      const mockFiles = ["pub789_priv012_file.pdf"];
      fsPromises.readdir.mockResolvedValue(mockFiles);

      await expect(deleteFileByPrivateKey("priv456")).rejects.toMatchObject({
        message: "File not found or private key is invalid",
        statusCode: 404,
      });
    });

    it("should throw 500 error when filesystem operation fails", async () => {
      fsPromises.readdir.mockRejectedValue(new Error("Filesystem error"));

      await expect(deleteFileByPrivateKey("priv456")).rejects.toMatchObject({
        message: "Failed to delete file",
        statusCode: 500,
      });
    });

    it("should throw 500 error when file deletion fails", async () => {
      const mockFiles = ["pub123_priv456_file.txt"];
      fsPromises.readdir.mockResolvedValue(mockFiles);
      fsPromises.unlink.mockRejectedValue(new Error("Delete failed"));

      await expect(deleteFileByPrivateKey("priv456")).rejects.toMatchObject({
        message: "Failed to delete file",
        statusCode: 500,
      });
    });

    it("should rethrow error if it already has statusCode", async () => {
      const customError = new Error("Custom error");
      customError.statusCode = 403;
      fsPromises.readdir.mockRejectedValue(customError);

      await expect(deleteFileByPrivateKey("priv456")).rejects.toMatchObject({
        message: "Custom error",
        statusCode: 403,
      });
    });
  });

  describe("deleteOldFiles", () => {
    beforeEach(() => {
      // Mock Date.now to return a consistent timestamp
      jest.spyOn(Date, "now").mockReturnValue(1000000000000); // Mock timestamp
    });

    afterEach(() => {
      Date.now.mockRestore();
    });

    it("should return early if upload directory does not exist", () => {
      fs.existsSync.mockReturnValue(false);

      deleteOldFiles();

      expect(fs.existsSync).toHaveBeenCalledWith(uploadDir);
      expect(fs.readdirSync).not.toHaveBeenCalled();
    });

    it("should delete old files and keep new files", () => {
      const mockFiles = ["old_file.txt", "new_file.pdf"];
      const now = 1000000000000;

      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(mockFiles);

      // Mock file stats - old file is 6 minutes old, new file is 2 minutes old
      fs.statSync
        .mockReturnValueOnce({ mtimeMs: now - 6 * 60 * 1000 }) // old_file.txt
        .mockReturnValueOnce({ mtimeMs: now - 2 * 60 * 1000 }); // new_file.pdf

      fs.unlink.mockImplementation((filePath, callback) => {
        callback(); // Simulate successful deletion
      });

      deleteOldFiles();

      expect(fs.existsSync).toHaveBeenCalledWith(uploadDir);
      expect(fs.readdirSync).toHaveBeenCalledWith(uploadDir);
      expect(fs.statSync).toHaveBeenCalledTimes(2);
      expect(fs.unlink).toHaveBeenCalledTimes(1);
      expect(fs.unlink).toHaveBeenCalledWith(
        path.join(uploadDir, "old_file.txt"),
        expect.any(Function)
      );
    });

    it("should handle file deletion errors gracefully", () => {
      const mockFiles = ["old_file.txt"];
      const now = 1000000000000;

      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(mockFiles);
      fs.statSync.mockReturnValue({ mtimeMs: now - 6 * 60 * 1000 }); // old file

      fs.unlink.mockImplementation((filePath, callback) => {
        callback(new Error("Delete failed")); // Simulate deletion error
      });

      deleteOldFiles();

      expect(fs.unlink).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        `Failed to delete ${path.join(uploadDir, "old_file.txt")}:`,
        expect.any(Error)
      );
    });

    it("should log successful deletions", () => {
      const mockFiles = ["old_file.txt"];
      const now = 1000000000000;

      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(mockFiles);
      fs.statSync.mockReturnValue({ mtimeMs: now - 6 * 60 * 1000 }); // old file

      fs.unlink.mockImplementation((filePath, callback) => {
        callback(); // Simulate successful deletion
      });

      deleteOldFiles();

      expect(console.log).toHaveBeenCalledWith(
        `Deleted old file: ${path.join(uploadDir, "old_file.txt")}`
      );
    });

    it("should not delete files within the age limit", () => {
      const mockFiles = ["new_file.txt"];
      const now = 1000000000000;

      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(mockFiles);
      fs.statSync.mockReturnValue({ mtimeMs: now - 2 * 60 * 1000 }); // 2 minutes old

      deleteOldFiles();

      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });
});
