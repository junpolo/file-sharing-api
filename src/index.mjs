import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (_, response) => {
  response.send("Hello World");
});

app.listen(PORT, () => {
  console.log(`Running on PORT: ${PORT}`);
});
