import multer from "multer";
import cloudinary from "../config/cloudinary.js";

const storage: multer.StorageEngine = {
  _handleFile(_req, file, callback) {
    const chunks: Buffer[] = [];

    file.stream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    file.stream.on("error", callback);

    file.stream.on("end", () => {
      const buffer = Buffer.concat(chunks);
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "lubrimax",
          allowed_formats: ["jpg", "jpeg", "png"],
        },
        (error, result) => {
          if (error) {
            callback(error);
            return;
          }

          if (!result?.secure_url) {
            callback(new Error("Cloudinary upload failed"));
            return;
          }

          callback(null, {
            filename: result.public_id,
            path: result.secure_url,
            size: buffer.length,
          });
        }
      );

      uploadStream.end(buffer);
    });
  },
  _removeFile(_req, _file, callback) {
    callback(null);
  },
};

const upload = multer({ storage });

export default upload;
