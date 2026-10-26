
const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

const AVATAR_DIR = path.resolve(
  __dirname,
  "../../uploads/avatars"
);

const PUBLIC_AVATAR_PREFIX = "/uploads/avatars/";

function getImageExtension(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;

  // JPG signature
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "jpg";
  }

  // PNG signature
  const pngSignature = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10,
  ]);

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(pngSignature)
  ) {
    return "png";
  }

  // WebP signature
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

async function saveAvatar(userId, buffer, extension) {
  await fs.mkdir(AVATAR_DIR, {
    recursive: true,
  });

  const filename = [
    String(userId),
    crypto.randomBytes(16).toString("hex"),
  ].join("-") + "." + extension;

  await fs.writeFile(
    path.join(AVATAR_DIR, filename),
    buffer,
    { flag: "wx" }
  );

  return PUBLIC_AVATAR_PREFIX + filename;
}

async function removeAvatarFile(url) {
  if (
    typeof url !== "string" ||
    !url.startsWith(PUBLIC_AVATAR_PREFIX)
  ) {
    return;
  }

  const filename = url.slice(PUBLIC_AVATAR_PREFIX.length);

  if (!/^[a-f0-9]{24}-[a-f0-9]{32}\.(jpg|png|webp)$/.test(filename)) {
    return;
  }

  try {
    await fs.unlink(path.join(AVATAR_DIR, filename));
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Avatar cleanup failed:", error.message);
    }
  }
}

module.exports = {
  AVATAR_DIR,
  getImageExtension,
  saveAvatar,
  removeAvatarFile,
};
