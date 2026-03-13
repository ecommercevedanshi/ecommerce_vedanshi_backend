;


import dotenv from "dotenv";
dotenv.config({ quiet: true });

import express from "express";
import cors from "cors";
import config from "./config/configration.js";
import connectToDb from "./config/mongoConnection.js";
import router from "./main/router.js";
import fileUpload from "express-fileupload";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Allowed origins
const productionOrigins = [
  "https://jaimax.com",
  "https://www.jaimax.com",
  "https://admin.jaimax.com",
  "https://team.jaisviksolutions.com",
  "https://www.team.jaisviksolutions.com",
  "http://localhost:5173",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      if (!origin || productionOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.send("test data!");
});


// app.use(
//   fileUpload({
//     limits: { fileSize: 500 * 1024 * 1024 }, // 50MB limit
//   }),
// );



app.use(
  fileUpload(),
);



app.use("/api", router);

const PORT = config.port || 3000;

const bootstrap = async () => {
  await connectToDb();

  app.listen(PORT, () => {
    console.log(`app running on ${PORT}`);
  });
};

bootstrap();