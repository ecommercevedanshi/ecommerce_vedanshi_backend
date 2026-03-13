import Media from "./media.model.js"
import responseHandler from "../../shared/responseHandler.js";

class MediaController {


    static async uploadMedia(req, res) {
        try {
            const { baseName, entityType, entityId, alt } = req.body;
            console.log("entityType", entityType)

            // const entityId = "69b268d1e69055538a73960a"

            const filesObj = req.files || {};

            const imageKey = Object.keys(filesObj)[0];
            const rawFiles = imageKey
                ? Array.isArray(filesObj[imageKey])
                    ? filesObj[imageKey]
                    : [filesObj[imageKey]]
                : [];

            if (!rawFiles.length) {
                return res.status(400).json({ message: "No images uploaded" });
            }

            if (!entityType) {
                return res.status(400).json({ message: "Category is required" });
            }

            // const existing = await Media.findOne({ entityId });
            // if (existing) {
            //     return res.status(409).json({ message: "Media already exists for this entity. Use update instead." });
            // }

            const images = [];

            for (let i = 0; i < rawFiles.length; i++) {
                const file = rawFiles[i];
                const { url, key } = await responseHandler.s3FileUpload(file, entityId, entityType);

                images.push({
                    key,
                    url,
                    isPrimary: i === 0,
                    altText: alt || "",
                });
            }



            const media = await Media.create({ baseName, entityId, entityType, images });

            return res.status(201).json({
                message: "Media uploaded successfully",
                data: media
            });

        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    static async updateMedia(req, res) {
        try {
            const { id } = req.params;
            const { entityType, alt, entityId, removeImages } = req.body;
            console.log(removeImages, "removedImages")

            const existingMedia = await Media.findById(id);
            if (!existingMedia) {
                return res.status(400).json({ message: "Media not found" });
            }

            if (!entityType) {
                return res.status(400).json({ message: "Category is required" });
            }

            const filesObj = req.files || {};
            const imageKey = Object.keys(filesObj)[0];
            const rawFiles = imageKey
                ? Array.isArray(filesObj[imageKey])
                    ? filesObj[imageKey]
                    : [filesObj[imageKey]]
                : [];


            const removedIds = removeImages
                ? JSON.parse(removeImages)
                : [];

            console.log(removedIds, "removedIds")
            // Filter out removed images from existing
            let images = existingMedia.images.filter(
                (img) => !removedIds.includes(img._id.toString())
            );

            // Add new uploaded images
            for (let i = 0; i < rawFiles.length; i++) {
                const file = rawFiles[i];
                const { url, key } = await responseHandler.s3FileUpload(file, entityId, entityType);

                images.push({
                    key,
                    url,
                    isPrimary: false,
                    altText: alt || "",
                });
            }

            const media = await Media.findByIdAndUpdate(id, { images }, { new: true });

            return res.json({
                message: "Images updated successfully",
                data: media
            });

        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }
    // Get Media by Entity
    static async getMedia(req, res) {
        try {
            const { entityId } = req.params;

            console.log(entityId, "id")
            const media = await Media.findById({ _id: entityId });

            if (!media) {
                return res.status(404).json({ message: "Media not found" });
            }

            const itemObj = media.toObject();

            itemObj.images = await Promise.all(
                itemObj.images.map(async (image) => ({
                    ...image,
                    url: await responseHandler.generatePreSignedURL(image.key)
                }))
            );

            if (itemObj.thumbnail?.key) {
                itemObj.thumbnail.url = await responseHandler.generatePreSignedURL(itemObj.thumbnail.key);
            }

            return res.json({ data: itemObj });

        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }

    // Delete Media
    static async deleteMedia(req, res) {
        try {
            const { id } = req.params;
            const media = await Media.findByIdAndDelete(id);

            if (!media) {
                return res.status(400).json({ message: "Media not found" });
            }

            return res.json({ message: "Media deleted successfully" });

        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }


    static async getAllMedia(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;

            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const skip = (pageNum - 1) * limitNum;

            const total = await Media.countDocuments();

            const media = await Media.find()
                .skip(skip)
                .limit(limitNum)
                .sort({ createdAt: -1 });

            const mediaWithSignedUrls = await Promise.all(
                media.map(async (item) => {
                    const itemObj = item.toObject();

                    itemObj.images = await Promise.all(
                        itemObj.images.map(async (image) => ({
                            ...image,
                            url: await responseHandler.generatePreSignedURL(image.key)
                        }))
                    );


                    return itemObj;
                })
            );

            return res.status(200).json({
                message: "Media fetched successfully",
                data: mediaWithSignedUrls,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum),
                }
            });

        } catch (error) {
            return res.status(500).json({ message: error.message });
        }
    }
}

export default MediaController;