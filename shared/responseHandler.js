import nodeMailer from "nodemailer";
import axios from "axios";

import bcrypt from "bcrypt";
import crypto from "crypto";
import db from "../config/configration.js";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import Category from "../modules/categories/categories.model.js";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


const s3 = new S3Client({
  credentials: {
    accessKeyId: db.accessKey,
    secretAccessKey: db.secretKey,
  },
  region: db.region,
});





class responseHandler {
  static sendSuccessResponse(res, message, data, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static sendfailureResponse(res, message, statusCode = 400) {
    return res.status(statusCode).json({
      success: false,
      message,
    });
  }




  static async generatePreSignedURL(keyName) {
    try {
      const signedUrlExpireSeconds = 60 * 60;
      const params = {
        Bucket: db.bucketName,
        Key: keyName,
      };
      // Generate presigned URL
      const command = new GetObjectCommand(params);
      const presignedUrl = await getSignedUrl(s3, command, {
        expiresIn: signedUrlExpireSeconds,
      });
      return presignedUrl;
    } catch (error) {
      logger.error("Error generating presigned URL:", error);
      return null;
    }
  }


  static async hashPassword(password) {
    try {
      const salt = await bcrypt.genSalt(10);

      const hashedPassword = await bcrypt.hash(password, salt);

      return hashedPassword;
    } catch (error) {
      console.error("Error hashing password:", error);
      throw new Error("Password hashing failed");
    }
  }

  static async generateOTP() {
    let OTP = await Math.floor(1000 + Math.random() * 9000);
    return OTP;
  }


  static async generateRandomUsername() {
    const numbers = "0123456789";
    const letters = "abcdefghijklmnopqrstuvwxyz";

    let result = "";

    for (let i = 0; i < 3; i++) {
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    for (let i = 0; i < 4; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return result.toUpperCase();
  }

  static async comparePassword(password, hashedPassword) {
    try {
      // Compare the provided password with the stored hash
      const isMatch = await bcrypt.compare(password, hashedPassword);

      return isMatch;
    } catch (error) {
      console.error("Error comparing passwords:", error);
      throw new Error("Password comparison failed");
    }
  }




  static async nodeMailer(email, otp) {
    try {
      const transporter = nodeMailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: "ecommerce.vedanshi@gmail.com",
          pass: "qoam pzxr bxfb seak",
        },
      });
      console.log(email, otp, "email")



      const info = await transporter.sendMail({
        from: '"vedanshi" <ecommerce.vedanshi@gmail.com>',
        to: email,
        subject: "OTP for  Verification - vedanshi",
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
              <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; border-bottom: 2px solid #0000FF; padding-bottom: 20px; margin-bottom: 30px;">
                  <h1 style="color: #0000FF; margin: 0; font-size: 28px; font-weight: bold;">vedanshi</h1>
                  <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">End-to-End E-Commerce Platform</p>
                </div>
                
                <div style="text-align: center; margin-bottom: 30px;">
                  <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Thank you for choosing vedanshi! Please use the verification code below to complete your payment process.
                  </p>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                  <div style="background: linear-gradient(135deg, #0000FF, #0000CC); 
                             display: inline-block; 
                             padding: 15px 30px; 
                             border-radius: 8px; 
                             box-shadow: 0 4px 15px rgba(0,0,255,0.3);">
                    <span style="color: white; 
                                font-size: 32px; 
                                font-weight: bold; 
                                letter-spacing: 5px; 
                                font-family: 'Courier New', monospace;">${otp}</span>
                  </div>
                </div>

                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="color: #666; font-size: 14px; margin: 0; text-align: center;">
                    <strong>⏰ This OTP is valid for 10 minutes only</strong><br>
                    If you didn't initiate this payment, please contact our support team immediately.
                  </p>
                </div>

                <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                  <p style="color: #666; font-size: 14px; margin: 0;">
                    Best regards,<br>
                    <strong style="color: #0000FF;">vedanshi Team</strong>
                  </p>
                </div>

                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 12px; margin: 0;">
                    Jaisvik Software Solutions Pvt Ltd | Secure Payment Gateway<br>
                    © 2025 vedanshi. All rights reserved.
                  </p>
                </div>
              </div>
            </div>`,
      });

      console.log("Message sent: %s", info.messageId);
      return info.messageId;
    } catch (error) {
      console.log("Email sending failed:", error);
      throw error;
    }
  }


  static async formatFileName(fileName) {
    // Remove any spaces before the file extension
    fileName = fileName.replace(/\s+\./, ".").replace(/[^a-zA-Z0-9._-]/g, "");
    // Replace remaining spaces with a single hyphen
    return fileName.replace(/\s+/g, "-");
  }



  static async getFileExtension(filename) {
    const lastDotIndex = filename.lastIndexOf(".");
    return filename.substring(lastDotIndex);
  }


  // static async s3FileUpload(
  //   file,
  //   userId,
  //   documentType,
  // ) {
  //   let fileName = await this.formatFileName(file.name);

  //   const category = await Category.findOne({ name: documentType });

  //   let keyName;
  //   if (documentType === process.env.FOLDER_MENS) {
  //     keyName =
  //       process.env.FOLDER_MENS +
  //       process.env.SLASH +
  //       userId +
  //       process.env.SLASH +
  //       fileName;
  //   } else if (documentType === process.env.FOLDER_WOMENS) {
  //     keyName =
  //       process.env.FOLDER_WOMENS +
  //       process.env.SLASH +
  //       userId +
  //       process.env.SLASH +
  //       fileName;
  //   } else if (documentType === process.env.FOLDER_KIDS) {
  //     keyName =
  //       process.env.FOLDER_KIDS +
  //       process.env.SLASH +
  //       userId +
  //       process.env.SLASH +
  //       fileName;
  //   } else {
  //     const extension = await this.getFileExtension(file.name);
  //     keyName =
  //       process.env.FOLDER_USERS +
  //       process.env.SLASH +
  //       userId +
  //       process.env.FOLDER_KYC +
  //       documentType
  //   }

  //   let fileURL;
  //   const params = {
  //     Bucket: db.bucketName,
  //     Key: keyName,
  //     ContentType: file.mimetype,
  //     Body: file.data,
  //   };

  //   try {
  //     const command = new PutObjectCommand(params);
  //     const response = await s3.send(command);
  //     const fileURL = `https://${db.bucketName}.s3.${db.region}.amazonaws.com/${keyName}`;
  //     return fileURL;
  //   } catch (error) {
  //     console.error("Error uploading file:", error);
  //   }
  // }

  // In s3FileUpload — return both url and keyName
  static async s3FileUpload(file, userId, documentType) {
    let fileName = await this.formatFileName(file.name);
    const category = await Category.findOne({ name: documentType });

    let keyName;
    if (category) {
      keyName = `${category.slug}/${userId}/${fileName}`;
    } else {
      keyName = `${process.env.FOLDER_USERS}/${userId}${process.env.FOLDER_KYC}${documentType}`;
    }

    const params = {
      Bucket: db.bucketName,
      Key: keyName,
      ContentType: file.mimetype,
      Body: file.data,
    };

    try {
      const command = new PutObjectCommand(params);
      await s3.send(command);
      const fileURL = `https://${db.bucketName}.s3.${db.region}.amazonaws.com/${keyName}`;
      return { url: fileURL, key: keyName }; // ✅ return both
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }


  static async generatePreSignedURL(keyName) {
    try {
      const signedUrlExpireSeconds = 60 * 60;
      const params = {
        Bucket: db.bucketName,
        Key: keyName,
      };
      // Generate presigned URL
      const command = new GetObjectCommand(params);
      const presignedUrl = await getSignedUrl(s3, command, {
        expiresIn: signedUrlExpireSeconds,
      });
      return presignedUrl;
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      return null;
    }
  }




}


export default responseHandler;
