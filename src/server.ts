import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import logger from "./middleware/logger.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { verifyApiKey } from "./middleware/auth.js";
import { velvetRouter } from "./routes/velvet.routes.js";
import { webhook_processor_service } from "./services/webhook-processor.service.js";
import { contact_router } from "./routes/customer.router.js";

// Load environment variables from the configuration file
dotenv.config();

// Set up the database pool connection and Prisma Client instance

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Enable detailed request logging in development mode
if (process.env.ENVIRONMENT === "dev") {
    app.use(morgan("combined"));
}

// Basic health check endpoint
app.get("/api/v1/ping", (_req, res) => {

    // To check the error middleware output : Uncoomment below line
    // throw new AppError("Service is running...", 501, "SERVER_RUNNING")
    res.status(200).send({ message: "server is running....." })
})


// Centralized error handling middleware (always keep this last)
app.use(errorHandler);


app.use('/api/velvet', verifyApiKey, velvetRouter);
app.use('/api/customer-details', contact_router);
app.post('/api/webhook', async (req, res) => {
    try {
        const result = await webhook_processor_service.process(req.body);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('webhook processing error:', err.message || err);
        res.status(500).json({ error: 'webhook_processing_failed' });
    }
});




const PORT = process.env.PORT || 8000;

// Initialize the server and connect to the database
const server = app.listen(PORT, async () => {
    logger.debug(`Backend server started on PORT ==> ${PORT}`);
    // await connectDB()
});

// Handle graceful shutdowns for clean resource termination
const shutdown = (signal: string) => {
    logger.warn(`${signal} signal received. Closing server gracefully...`);
    server.close(() => {
        logger.info("HTTP server closed.");
        process.exit(0);
    });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));