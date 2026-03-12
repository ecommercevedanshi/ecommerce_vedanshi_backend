// import dotenv from "dotenv";
// dotenv.config({ quiet: true });
// import express from "express";
// import cors from "cors";
// import config from "./config/configration.js";
// import connectToDb from "./config/mongoConnection.js";
// import router from "./main/router.js";
// // import { createTopics, connectToProducer } from "./config/producer.kafka.js";
// // import UserConsumer from "./modules/user/consumers/user.consumer.js";
// // import walletConsumer from "./modules/wallet/wallet.consumer.js";


// const app = express();
// // app.use(cors());
// app.use(express.json());

// // app.use(express.json()); // to parse JSON bodies
// app.use(express.urlencoded({ extended: true })); // optional, for form submissions

// // List of allowed origins
// const productionOrigins = [
//   "https://jaimax.com",
//   "https://www.jaimax.com",
//   "https://admin.jaimax.com",
//   "https://team.jaisviksolutions.com",
//   "https://www.team.jaisviksolutions.com",
//   // "https://www.admin.jaimax.com",
//   // "http://devadmin.jaimax.com","http://dev.jaimax.com",
//   "http://localhost:5173",
// ];
// const corsOptions = {
//   origin: (origin, callback) => {
//     if (process.env.NODE_ENV !== "production") {
//       // Allow all origins in development and qa
//       callback(null, true);
//     } else {
//       // Restrict origins in production
//       if (!origin || productionOrigins.includes(origin)) {
//         // Allow requests with no origin (like mobile apps) or matching origins
//         callback(null, true);
//       } else {
//         logger.error("Blocked CORS request from:", origin); // Log the origin
//         callback(new Error("Not allowed by CORS"));
//       }
//     }
//   },
//   methods: "*",
//   allowedHeaders: "*",
//   credentials: true,
// };

// app.use(cors(corsOptions));

// app.get("/", (req, res) => {
//   res.send("test data!");
// });

// app.use("/api", router);
// const PORT = config.port || 3000;

// const bootstrap = async () => {
//   await connectToDb();
//   // await connectToProducer();

//   // await Promise.all([
//   //   UserConsumer.startNotificationConsumer(),
//   //   UserConsumer.startUpdateRoleconsumer(),
//   //   walletConsumer.startWalletCreationConsumer()

//   // ]);




//   app.listen(PORT, () => {
//     console.log(`app running on ${PORT}`);
//   });
// };

// bootstrap();


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


app.use(
  fileUpload({
    limits: { fileSize: 500 * 1024 * 1024 }, // 50MB limit
  }),
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