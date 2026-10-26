
import React, {
  useEffect,
  useRef,
  useState,
} from "react";

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

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setPhone(user?.phone || "");
  }, [user?.name, user?.phone]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (!file) return;

    setError("");
    setMessage("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Select a JPG, PNG or WebP photo.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Image size must be 2 MB or smaller.");
      return;
    }

    setPhotoBusy(true);

    try {
      await uploadProfileAvatar(file);
      setMessage("Profile photo uploaded successfully.");
    } catch (err) {
      setError(err.message || "Could not upload photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    setError("");
    setMessage("");
    setPhotoBusy(true);

    try {
      await removeProfileAvatar();
      setMessage("Profile photo removed successfully.");
    } catch (err) {
      setError(err.message || "Could not remove photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");
    setSaving(true);

    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
      });

      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="portal-auth-wrap ob-profile-wrap">
      <div className="portal-auth-card ob-profile-card">

        <div className="ob-profile-heading">
          <span className="ob-profile-eyebrow">
            YOUR ACCOUNT
          </span>

          <h1>My Profile</h1>

          <p>
            Update your profile picture and personal
            information anytime.
          </p>
        </div>

        {error && (
          <div className="portal-error" role="alert">
            {error}
          </div>
        )}

        {message && (
          <div className="site-notice" role="status">
            {message}
          </div>
        )}

        {/* Profile picture */}
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
                size={53}
                aria-hidden="true"
              />
            )}

            <span className="ob-profile-photo-camera">
              <Camera size={17} />
            </span>
          </div>

          <div className="ob-profile-photo-actions">

            <h2>Profile Picture</h2>

            <p>
              JPG, PNG or WebP · Maximum 2 MB
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              aria-label="Choose profile photo"
              className="ob-avatar-file-input"
              tabIndex={-1}
              disabled={photoBusy}
            />

            <div className="ob-profile-button-row">

              <button
                type="button"
                className="btn btn-primary"
                disabled={photoBusy}
                onClick={() => fileInputRef.current?.click()}
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
          </div>
        </section>

        {/* Personal details */}
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
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary ob-profile-save"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>

        </form>
      </div>
    </div>
  );
};
