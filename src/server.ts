import { connectToDatabase } from "./config/dbConfig";
import express, { Application, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import multer from "multer";

import userRouter from "./routers/userRouter";
import postRouter from "./routers/postRouter";
import commentRouter from "./routers/commentRouter";
import likeShareRouter from "./routers/like&ShareRouter";

const app: Application = express();

const corsOptions = {
    origin: "*",
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"]
};


// Middleware for CORS
app.use(cors(corsOptions));

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(cookieParser());

// Define routes
app.get('/', (req: Request, res: Response) => {
    res.send("Welcome EchoSphere Blog project API 🎉🎉🎉");
});

// Routes
app.use('/api/v1', userRouter);
app.use('/api/v1', postRouter);
app.use('/api/v1', commentRouter);
app.use('/api/v1', likeShareRouter);


// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
    if (err instanceof SyntaxError && "status" in err && (err as any).status === 400 && "body" in err) {
        res.status(400).json({ error: 'Invalid JSON' });
    } else if (err instanceof multer.MulterError) {
        // Multer-specific error
        res.status(400).json({ error: `Multer Error: ${err.message}` });
    } else {
        console.error('Internal Server Error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
        next()
    }
});
  
const port = process.env.PORT || 3000;

// Start server and connect to database
const startServer = async () => {
await connectToDatabase();
app.listen(port, () => {
    console.log(`Server up and running on port: ${port} 🎉🎉🎉`);
})
}

startServer();