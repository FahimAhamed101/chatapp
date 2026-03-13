import express from "express";
import cors from "cors";
import { chatRoutes } from "./routes/chat.routes";
import { authRoutes } from "./routes/auth.routes";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

app.use(errorHandler);

export default app;
