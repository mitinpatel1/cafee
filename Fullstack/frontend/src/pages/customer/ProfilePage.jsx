
import React, { useEffect, useRef, useState } from "react";

import {
  Camera,
  ImagePlus,
  Trash2,
  UserRound,
  LoaderCircle,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const ProfilePage = () => {
  const {
    user,
    updateProfile,
    uploadProfileAvatar,
    removeProfileAvatar,
  } = useAuth();

  const fileInputRef = useRef(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [photoMessage, setPhotoMessage] = useState("");
  const [photoError, setPhotoError] = useState("");

  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
  }, [user?.name, user?.phone]);

  // ==============================================
  // UPLOAD / CHANGE PROFILE PHOTO
  // ==============================================

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setPhotoMessage("");
    setPhotoError("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setPhotoError("Only JPG, PNG and WebP images are allowed.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setPhotoError("Image must be 2 MB or smaller.");
      return;
    }

    setPhotoBusy(true);

    try {
      await uploadProfileAvatar(file);

      setPhotoMessage(
        "Profile picture updated successfully."
      );
    } catch (error) {
      setPhotoError(
        error.message || "Failed to upload profile picture."
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  // ==============================================
  // REMOVE PROFILE PHOTO
  // ==============================================

  const handleRemovePhoto = async () => {
    setPhotoMessage("");
    setPhotoError("");
    setPhotoBusy(true);

    try {
      await removeProfileAvatar();

      setPhotoMessage(
        "Profile picture removed successfully."
      );
    } catch (error) {
      setPhotoError(
        error.message || "Failed to remove picture."
      );
    } finally {
      setPhotoBusy(false);
    }
  };

  // ==============================================
  // SAVE PERSONAL DETAILS
  // ==============================================

  const handleSave = async (event) => {
    event.preventDefault();

    setSaveMessage("");
    setSaveError("");
    setSaving(true);

    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
      });

      setSaveMessage(
        "Profile updated successfully."
      );
    } catch (error) {
      setSaveError(
        error.message || "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-auth-wrap ob-profile-wrap">
      <div className="portal-auth-card ob-profile-card">

        {/* HEADER */}
        <div className="ob-profile-heading">
          <span className="ob-profile-eyebrow">
            YOUR ACCOUNT
          </span>

          <h1>My Profile</h1>

          <p>
            Update your profile picture and
            personal information anytime.
          </p>
        </div>

        {/* PROFILE PICTURE SECTION */}
        <section className="ob-profile-photo-panel">

          
<div className="ob-profile-photo-frame">
  {user?.avatar ? (
    <img
      src={user.avatar}
      alt="Your profile"
      className="ob-profile-photo-image"
    />
  ) : (
    <UserRound
      size={54}
      aria-hidden="true"
    />
  )}

  <span className="ob-profile-photo-camera">
    <Camera size={16} />
  </span>
</div>


          <div className="ob-profile-photo-actions">

            <h2>Profile Picture</h2>

            <p>
              JPG, PNG or WebP · Maximum 2 MB
            </p>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              hidden
              disabled={photoBusy}
            />

            <div className="ob-profile-button-row">

              <button
                type="button"
                className="btn btn-primary"
                disabled={photoBusy}
                onClick={() =>
                  fileInputRef.current?.click()
                }
              >
                {photoBusy ? (
                  <LoaderCircle
                    size={17}
                    className="ob-spin"
                  />
                ) : (
                  <ImagePlus size={17} />
                )}

                {photoBusy
                  ? "Uploading..."
                  : user?.avatar
                    ? "Change Photo"
                    : "Upload Photo"}
              </button>

              {user?.avatar && (
                <button
                  type="button"
                  className="ob-profile-remove"
                  disabled={photoBusy}
                  onClick={handleRemovePhoto}
                >
                  <Trash2 size={16} />
                  Remove
                </button>
              )}
            </div>

            {/* Photo-specific notification */}
            {photoMessage && (
              <p
                className="ob-inline-success"
                role="status"
              >
                {photoMessage}
              </p>
            )}

            {photoError && (
              <p
                className="ob-inline-error"
                role="alert"
              >
                {photoError}
              </p>
            )}

          </div>
        </section>

        {/* PERSONAL DETAILS */}
        <form
          className="portal-form ob-profile-fields"
          onSubmit={handleSave}
        >
          <h2>Personal Details</h2>

          <label>
            Name
            <input
              type="text"
              required
              maxLength={100}
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSaveMessage("");
              }}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              disabled
              autoComplete="email"
              value={user?.email || ""}
            />
          </label>

          <label>
            Phone
            <input
              type="tel"
              maxLength={25}
              autoComplete="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSaveMessage("");
              }}
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary ob-profile-save"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

          {/* Success message under Save Changes */}
          {saveMessage && (
            <div
              className="ob-save-success"
              role="status"
            >
              {saveMessage}
            </div>
          )}

          {saveError && (
            <div
              className="ob-save-error"
              role="alert"
            >
              {saveError}
            </div>
          )}

        </form>
      </div>
    </div>
  );
};
