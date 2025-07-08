import rateLimit from "express-rate-limit";

export const fileUploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes,
  limit: 5, // Limit each IP to 5 requests per `window` (here, per 5 minutes).
  standardHeaders: "draft-8",
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});

export const fileDownloadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes,
  limit: 10, // Limit each IP to 10 requests per `window` (here, per 5 minutes).
  standardHeaders: "draft-8",
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
});
