import mongoose from "mongoose"



const mediaSchema = new mongoose.Schema(
    {
        baseName: {
            type: String,
            required: true
        },

        entityId: {
            type: mongoose.Schema.Types.ObjectId,
        },

        entityType: {
            type: String,
            // enum: ["Mens", "Womens", "Kids"],
            required: true
        },



        images: [
            {
                key: {
                    type: String,
                    required: true
                },

                url: {
                    type: String,
                    required: true
                },

                isPrimary: {
                    type: Boolean,
                    default: false
                },

                altText: {
                    type: String
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

const Media = mongoose.model("Media", mediaSchema);

export default Media