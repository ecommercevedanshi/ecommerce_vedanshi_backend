import { config } from "dotenv";
config();;

let db = {};

if (process.env.ENV === "DEVELOPMENT") {
  db.port = process.env.PORT;
  db.mongoUrl = process.env.DEV_MONGO_URL;
  db.dbName = process.env.DEV_DB_NAME;
  db.bucketName = process.env.DEV_BUCKET_NAME;
  db.accessKey = process.env.ACCESS_KEY;
  db.secretKey = process.env.SECRET_KEY;
  db.region = process.env.REGION;
} else if (process.env.ENV === "PRODUCTION") {
  db.port = process.env.PORT;
  db.mongoUrl = process.env.PROD_MONGO_URL;
  db.dbName = process.env.PROD_DB_NAME;
  db.bucketName = process.env.PROD_BUCKET_NAME;
  db.accessKey = process.env.ACCESS_KEY;
  db.secretKey = process.env.SECRET_KEY;
  db.region = process.env.REGION;
}

export default db;
