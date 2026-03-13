
import express from "express"
import { Auth, verifyAdmin } from "../../shared/middleware/authenticate.js";


const router = express.Router();

import MediaController from "./media.controller.js";


// Upload images (max 6)
router.post(
    "/upload-media",
    MediaController.uploadMedia
);

// Replace images
router.put(
    "/update-media/:id",

    MediaController.updateMedia
);

router.get("/get-all-media", MediaController.getAllMedia);

// Get media by entity
router.get(
    "/entity/:entityId",

    MediaController.getMedia
);

// Delete media
router.delete(
    "/delete-media/:id", 
    MediaController.deleteMedia
);



export default router;