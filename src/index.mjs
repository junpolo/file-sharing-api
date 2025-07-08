import "dotenv/config";
import express from "express";

import filesRouters from "./routes/files.route.mjs";

const app = express();

app.use(express.json());
app.use(filesRouters);

const PORT = process.env.PORT || 3000;

app.get("/", (_, response) => {
  response.send("Hello World");
});

app.listen(PORT, () => {
  console.log(`Running on PORT: ${PORT}`);
});
