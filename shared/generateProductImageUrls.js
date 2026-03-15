import responseHandler from "./responseHandler.js";

async function generateProductImageUrls(images = []) {
  return Promise.all(
    images.map(async (img) => {

      const obj = { ...img };

      if (obj.url && !obj.url.startsWith("http")) {
        obj.url = await responseHandler.generatePreSignedURL(obj.url);
      }

      return obj;
    })
  );
}

export default generateProductImageUrls;