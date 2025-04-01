import express from "express";
import { logger } from "../utils/logger";
import { successResponse, errorResponse } from "../utils/response";

const router = express.Router();

// Test endpoint
router.get("/", (req, res) => {
    logger.info("Test endpoint called");
    successResponse(res, "Test endpoint working successfully");
});

// Test error endpoint
router.get("/error", (req, res) => {
    logger.error("Test error endpoint called");
    errorResponse(res, "Test error endpoint", 500);
});

router.get('/health', (req, res) => {
    logger.info("Health endpoint called");
    successResponse(res, "OK");
  });
  

export default router;
