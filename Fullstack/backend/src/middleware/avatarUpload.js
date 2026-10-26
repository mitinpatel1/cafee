
const multer = require("multer");

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const uploadAvatar = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_AVATAR_BYTES,
    files: 1,
    fields: 0,
    parts: 1,
  },

  fileFilter: (req, file, callback) => {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(
        new Error("Only JPG, PNG and WebP images are allowed.")
      );
    }

    callback(null, true);
  },
}).single("avatar");

const avatarUploadMiddleware = (req, res, next) => {
  uploadAvatar(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message:
          error.code === "LIMIT_FILE_SIZE"
            ? "Profile photo must be 2 MB or smaller."
            : "Upload one image using the avatar field.",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  });
};

module.exports = {
  avatarUploadMiddleware,
  MAX_AVATAR_BYTES,
};
