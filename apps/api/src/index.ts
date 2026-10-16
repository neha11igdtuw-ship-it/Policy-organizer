import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth";
import { policiesRouter } from "./routes/policies";
import { remindersRouter } from "./routes/reminders";
import { sharingRouter } from "./routes/sharing";
import { uploadRouter } from "./routes/upload";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/policies", policiesRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/sharing", sharingRouter);

app.listen(PORT, () => {
  console.log(`Policy Organizer API listening on port ${PORT}`);
});
