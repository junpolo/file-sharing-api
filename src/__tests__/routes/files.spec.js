import request from "supertest";
import express from "express";

import filesRouter from "../../routes/files.route.js";
import {
  getFileInfoResponse,
  findFileByPublicKey,
  deleteFileByPrivateKey,
} from "../../services/file.service.js";
import {
  fileUploadLimiter,
  fileDownloadLimiter,
} from "../../middlewares/ratelimit.middleware.js";
import { multerMiddleware } from "../../middlewares/multer.middleware.js";

// Mock file service
jest.mock("../../services/file.service.js", () => ({
  getFileInfoResponse: jest.fn(),
  findFileByPublicKey: jest.fn(),
  deleteFileByPrivateKey: jest.fn(),
  uploadDir: "/mock/upload/dir",
}));

// Mock middleware
jest.mock("../../middlewares/ratelimit.middleware.js", () => ({
  fileUploadLimiter: jest.fn((req, res, next) => next()),
  fileDownloadLimiter: jest.fn((req, res, next) => next()),
}));

jest.mock("../../middlewares/multer.middleware.js", () => ({
  multerMiddleware: jest.fn((req, res, next) => {
    // Mock multer behavior - add files to request
    req.files = req.mockFiles || [];
    next();
  }),
}));

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use(filesRouter);
  return app;
};

describe("File Routes Integration Tests", () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe("POST /api/files", () => {
    it("should return 400 when no files are uploaded", async () => {
      const response = await request(app).post("/api/files").expect(400);

      expect(response.body).toEqual({
        message: "No files uploaded.",
      });
    });

    it("should return 400 when files array is empty", async () => {
      // Mock empty files array
      multerMiddleware.mockImplementation((req, res, next) => {
        req.files = [];
        next();
      });

      const response = await request(app).post("/api/files").expect(400);

      expect(response.body).toEqual({
        message: "No files uploaded.",
      });
    });

    it("should return single file info when one file is uploaded", async () => {
      const mockFile = {
        originalname: "test.txt",
        publicKey: "pub123",
        privateKey: "priv123",
      };

      const mockFileInfo = {
        filename: "test.txt",
        publicKey: "pub123",
        privateKey: "priv123",
      };

      // Mock multer to provide files
      multerMiddleware.mockImplementation((req, res, next) => {
        req.files = [mockFile];
        next();
      });

      getFileInfoResponse.mockReturnValue([mockFileInfo]);

      const response = await request(app).post("/api/files").expect(200);

      expect(response.body).toEqual({
        message: "File uploaded successfully!",
        file: mockFileInfo,
      });

      expect(getFileInfoResponse).toHaveBeenCalledWith([mockFile]);
    });

    it("should return multiple files info when multiple files are uploaded", async () => {
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

      const mockFileInfos = [
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
      ];

      // Mock multer to provide files
      multerMiddleware.mockImplementation((req, res, next) => {
        req.files = mockFiles;
        next();
      });

      getFileInfoResponse.mockReturnValue(mockFileInfos);

      const response = await request(app).post("/api/files").expect(200);

      expect(response.body).toEqual({
        message: "Files uploaded successfully!",
        files: mockFileInfos,
      });

      expect(getFileInfoResponse).toHaveBeenCalledWith(mockFiles);
    });

    it("should apply rate limiting middleware", async () => {
      await request(app).post("/api/files");

      expect(fileUploadLimiter).toHaveBeenCalled();
      expect(multerMiddleware).toHaveBeenCalled();
    });
  });

  describe("GET /api/files/:publicKey", () => {
    it("should return 404 when file service throws 404 error", async () => {
      const error = new Error("File not found");
      error.statusCode = 404;
      findFileByPublicKey.mockRejectedValue(error);

      const response = await request(app)
        .get("/api/files/nonexistent")
        .expect(404);

      expect(response.body).toEqual({
        message: "File not found",
      });

      expect(findFileByPublicKey).toHaveBeenCalledWith("nonexistent");
    });

    it("should return 500 when file service throws 500 error", async () => {
      const error = new Error("Server error");
      error.statusCode = 500;
      findFileByPublicKey.mockRejectedValue(error);

      const response = await request(app).get("/api/files/pub123").expect(500);

      expect(response.body).toEqual({
        message: "Server error",
      });

      expect(findFileByPublicKey).toHaveBeenCalledWith("pub123");
    });

    it("should return 500 when file service throws error without statusCode", async () => {
      const error = new Error("Unknown error");
      findFileByPublicKey.mockRejectedValue(error);

      const response = await request(app).get("/api/files/pub123").expect(500);

      expect(response.body).toEqual({
        message: "Unknown error",
      });

      expect(findFileByPublicKey).toHaveBeenCalledWith("pub123");
    });

    it("should apply rate limiting middleware", async () => {
      const error = new Error("File not found");
      error.statusCode = 404;
      findFileByPublicKey.mockRejectedValue(error);

      await request(app).get("/api/files/pub123");

      expect(fileDownloadLimiter).toHaveBeenCalled();
    });

    it("should attempt to send file when service succeeds", async () => {
      const mockFilename = "test_file.txt";
      findFileByPublicKey.mockResolvedValue(mockFilename);

      // Mock sendFile to simulate successful file sending
      const mockSendFile = jest.fn(function (filename, options, callback) {
        // Bind to the response object
        const res = this;

        // Handle different callback signatures
        const cb = typeof options === "function" ? options : callback;

        // Simulate successful file send
        if (cb) {
          cb(); // No error
        }

        // Set status and end response
        res.status(200);
        res.end();
      });

      jest.spyOn(express.response, "sendFile").mockImplementation(mockSendFile);

      const response = await request(app).get("/api/files/pub123");

      expect(findFileByPublicKey).toHaveBeenCalledWith("pub123");
      expect(response.status).toBe(200);

      // Clean up
      express.response.sendFile.mockRestore();
    });
  });

  describe("DELETE /api/files/:privateKey", () => {
    it("should return 200 when file is successfully deleted", async () => {
      deleteFileByPrivateKey.mockResolvedValue();

      const response = await request(app)
        .delete("/api/files/priv123")
        .expect(200);

      expect(response.body).toEqual({
        message: "File deleted successfully",
      });

      expect(deleteFileByPrivateKey).toHaveBeenCalledWith("priv123");
    });

    it("should return 404 when file service throws 404 error", async () => {
      const error = new Error("File not found or private key is invalid");
      error.statusCode = 404;
      deleteFileByPrivateKey.mockRejectedValue(error);

      const response = await request(app)
        .delete("/api/files/nonexistent")
        .expect(404);

      expect(response.body).toEqual({
        message: "File not found or private key is invalid",
      });

      expect(deleteFileByPrivateKey).toHaveBeenCalledWith("nonexistent");
    });

    it("should return 500 when file service throws 500 error", async () => {
      const error = new Error("Failed to delete file");
      error.statusCode = 500;
      deleteFileByPrivateKey.mockRejectedValue(error);

      const response = await request(app)
        .delete("/api/files/priv123")
        .expect(500);

      expect(response.body).toEqual({
        message: "Failed to delete file",
      });

      expect(deleteFileByPrivateKey).toHaveBeenCalledWith("priv123");
    });

    it("should return 500 when file service throws error without statusCode", async () => {
      const error = new Error("Unknown error");
      deleteFileByPrivateKey.mockRejectedValue(error);

      const response = await request(app)
        .delete("/api/files/priv123")
        .expect(500);

      expect(response.body).toEqual({
        message: "Unknown error",
      });

      expect(deleteFileByPrivateKey).toHaveBeenCalledWith("priv123");
    });
  });

  describe("Route Parameter Validation", () => {
    it("should handle GET request with publicKey parameter", async () => {
      const error = new Error("File not found");
      error.statusCode = 404;
      findFileByPublicKey.mockRejectedValue(error);

      await request(app).get("/api/files/test-public-key-123");

      expect(findFileByPublicKey).toHaveBeenCalledWith("test-public-key-123");
    });

    it("should handle DELETE request with privateKey parameter", async () => {
      const error = new Error("File not found");
      error.statusCode = 404;
      deleteFileByPrivateKey.mockRejectedValue(error);

      await request(app).delete("/api/files/test-private-key-456");

      expect(deleteFileByPrivateKey).toHaveBeenCalledWith(
        "test-private-key-456"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle service errors gracefully in all endpoints", async () => {
      // Test POST endpoint error handling through middleware
      multerMiddleware.mockImplementation((req, res, next) => {
        const error = new Error("Multer error");
        next(error);
      });

      await request(app).post("/api/files").expect(500);

      // Reset multer mock
      multerMiddleware.mockImplementation((req, res, next) => {
        req.files = [];
        next();
      });
    });

    it("should properly format error responses", async () => {
      const customError = new Error("Custom service error");
      customError.statusCode = 422;

      deleteFileByPrivateKey.mockRejectedValue(customError);

      const response = await request(app)
        .delete("/api/files/priv123")
        .expect(422);

      expect(response.body).toEqual({
        message: "Custom service error",
      });
    });
  });
});
