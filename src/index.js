import "dotenv/config";
import express from "express";

import filesRouter from "./routes/files.route.js";
import "./services/cron.service.js";

const app = express();

app.use(express.json());
app.use(filesRouter);

const PORT = process.env.PORT || 3000;

app.get("/", (_, response) => {
  response.status(200).json({ message: "OK" });
});

app.listen(PORT, () => {
  console.log(`Running on PORT: ${PORT}`);
});

export default app;
