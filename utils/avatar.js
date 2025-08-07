import axios from "axios";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { cloudinary } from "../config/cloudinary.js";

export const fetchAndUploadAvatar = async (authorName) => {
  const seed = encodeURIComponent(authorName || "Unknown");
  const url = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
  const filename = `${uuidv4()}.svg`;
  const tempPath = path.join("/tmp", filename);

  const response = await axios.get(url, { responseType: "stream" });
  const writer = fs.createWriteStream(tempPath);

  response.data.pipe(writer);

  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  const uploadResult = await cloudinary.uploader.upload(tempPath, {
    folder: "avatars",
    resource_type: "image",
    format: "svg",
  });

  fs.unlink(tempPath, () => {}); // clean up

  return uploadResult.secure_url;
};
