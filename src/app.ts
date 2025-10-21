import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import routes from "./routes";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["*"],
  })
);
app.use(express.json());
app.use("/", routes);
const main = async () => {
  // Aquí puedes agregar cualquier inicialización asíncrona si es necesario
  console.log("App initialized");
};

main().catch((err) => {
  console.error("Error during app initialization:", err);
});

export default app;
