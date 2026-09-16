import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  UploadCloud,
  Film,
  Type,
  Palette,
  Volume2,
  VolumeX,
  Captions,
} from "lucide-react";

import {
  setCurrentVideo,
  getCurrentVideoUrl,
  clearCurrentVideo,
} from "../utils/currentVideo.js";


const API_URL = "http://127.0.0.1:8000";

const MAX_FILE_SIZE =
  500 * 1024 * 1024;


const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
];


const ALLOWED_EXTENSIONS = [
  ".mp4",
  ".mov",
  ".avi",
];


const FONT_OPTIONS = [
  "Arial",
  "Verdana",
  "Georgia",
  "Times New Roman",
  "Courier New",
];


const COLOR_OPTIONS = [
  {
    name: "White",
    value: "#ffffff",
  },
  {
    name: "Yellow",
    value: "#ffd84d",
  },
  {
    name: "Red",
    value: "#ff5b5b",
  },
  {
    name: "Light Blue",
    value: "#69d5ff",
  },
  {
    name: "Green",
    value: "#6ee7a8",
  },
];


const POSITION_OPTIONS = [
  "Bottom",
  "Center",
  "Top",
];


const BACKGROUND_OPTIONS = [
  {
    label: "Semi-transparent Black",
    value: "semi-transparent",
  },
  {
    label: "Black",
    value: "black",
  },
  {
    label: "None",
    value: "none",
  },
];


const DEFAULT_SUBTITLE_STYLE = {
  font: "Arial",
  color: "#ffffff",
  size: 32,
  bold: true,
  position: "Bottom",
  background: "semi-transparent",
};


const CENSOR_OPTIONS = [
  {
    value: "beep",
    title: "Beep",
    description:
      "Replace offensive words with a beep sound.",
    icon: Volume2,
  },
  {
    value: "mute",
    title: "Mute",
    description:
      "Silence the audio only during offensive words.",
    icon: VolumeX,
  },
  {
    value: "subtitles",
    title: "Subtitles only",
    description:
      "Keep the original audio and censor only the subtitles.",
    icon: Captions,
  },
];


function UploadBox({ compact = false }) {
  const fileInputRef = useRef(null);

  const navigate = useNavigate();


  const [file, setFile] =
    useState(null);

  const [isUploading, setIsUploading] =
    useState(false);

  const [isDragging, setIsDragging] =
    useState(false);

  const [error, setError] =
    useState("");


  const [censorMode, setCensorMode] =
    useState("beep");


  const [
    subtitleStyle,
    setSubtitleStyle,
  ] = useState(
    DEFAULT_SUBTITLE_STYLE
  );


  function openFilePicker() {
    if (isUploading) {
      return;
    }

    fileInputRef.current?.click();
  }


  function updateSubtitleStyle(
    field,
    value
  ) {
    setSubtitleStyle(
      (currentStyle) => ({
        ...currentStyle,
        [field]: value,
      })
    );
  }


  function saveSelectedFile(
    selectedFile
  ) {
    if (!selectedFile) {
      return;
    }


    setError("");


    const fileName =
      selectedFile.name.toLowerCase();


    const hasAllowedExtension =
      ALLOWED_EXTENSIONS.some(
        (extension) =>
          fileName.endsWith(
            extension
          )
      );


    const hasAllowedMimeType =
      ALLOWED_VIDEO_TYPES.includes(
        selectedFile.type
      );


    if (
      !hasAllowedExtension &&
      !hasAllowedMimeType
    ) {
      setFile(null);

      clearCurrentVideo();

      setError(
        "Unsupported file format. Please choose an MP4, MOV or AVI video."
      );

      return;
    }


    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {
      setFile(null);

      clearCurrentVideo();

      setError(
        "This video is too large. The maximum allowed size is 500 MB."
      );

      return;
    }


    if (
      selectedFile.size === 0
    ) {
      setFile(null);

      clearCurrentVideo();

      setError(
        "This video file is empty. Please choose another video."
      );

      return;
    }


    setFile(
      selectedFile
    );


    setCurrentVideo(
      selectedFile
    );


    sessionStorage.removeItem(
      "cleanCaptionJobId"
    );

    sessionStorage.removeItem(
      "cleanCaptionProcessedVideoUrl"
    );

    sessionStorage.removeItem(
      "cleanCaptionDownloadUrl"
    );

    sessionStorage.removeItem(
      "cleanCaptionDetections"
    );
  }


  function handleFileChange(
    event
  ) {
    const selectedFile =
      event.target.files?.[0];

    saveSelectedFile(
      selectedFile
    );
  }


  function handleDragOver(
    event
  ) {
    event.preventDefault();

    event.stopPropagation();


    if (!isUploading) {
      setIsDragging(true);
    }
  }


  function handleDragLeave(
    event
  ) {
    event.preventDefault();

    event.stopPropagation();

    setIsDragging(false);
  }


  function handleDrop(
    event
  ) {
    event.preventDefault();

    event.stopPropagation();


    if (isUploading) {
      return;
    }


    setIsDragging(false);


    const droppedFile =
      event.dataTransfer.files?.[0];


    saveSelectedFile(
      droppedFile
    );
  }


  function resetSelection() {
    setFile(null);

    setError("");

    setCensorMode(
      "beep"
    );

    setSubtitleStyle(
      DEFAULT_SUBTITLE_STYLE
    );

    clearCurrentVideo();


    sessionStorage.removeItem(
      "cleanCaptionJobId"
    );

    sessionStorage.removeItem(
      "cleanCaptionProcessedVideoUrl"
    );

    sessionStorage.removeItem(
      "cleanCaptionDownloadUrl"
    );

    sessionStorage.removeItem(
      "cleanCaptionDetections"
    );

    sessionStorage.removeItem(
      "cleanCaptionSubtitleStyle"
    );

    sessionStorage.removeItem(
      "cleanCaptionCensorMode"
    );


    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }


  async function startProcessing() {
    if (
      !file ||
      isUploading
    ) {
      return;
    }


    try {
      setIsUploading(true);

      setError("");


      const formData =
        new FormData();


      formData.append(
        "video",
        file
      );


      formData.append(
        "censor_mode",
        censorMode
      );


      formData.append(
        "subtitle_font",
        subtitleStyle.font
      );


      formData.append(
        "subtitle_color",
        subtitleStyle.color
      );


      formData.append(
        "subtitle_size",
        String(
          subtitleStyle.size
        )
      );


      formData.append(
        "subtitle_bold",
        String(
          subtitleStyle.bold
        )
      );


      formData.append(
        "subtitle_position",
        subtitleStyle.position
      );


      formData.append(
        "subtitle_background",
        subtitleStyle.background
      );


      console.log(
        "Censor mode sent to backend:",
        censorMode
      );


      console.log(
        "Subtitle style sent to backend:",
        subtitleStyle
      );


      const response =
        await fetch(
          `${API_URL}/api/process`,
          {
            method: "POST",
            body: formData,
          }
        );


      let data = {};


      try {
        data =
          await response.json();
      } catch {
        data = {};
      }


      if (!response.ok) {
        if (
          response.status ===
          413
        ) {
          throw new Error(
            "The video is larger than the 500 MB upload limit."
          );
        }


        if (
          response.status ===
          400
        ) {
          throw new Error(
            data.detail ||
              "The video or processing settings are not supported."
          );
        }


        if (
          response.status >=
          500
        ) {
          throw new Error(
            "CleanCaption encountered a server problem. Please try again."
          );
        }


        throw new Error(
          data.detail ||
            `Upload failed (${response.status}).`
        );
      }


      if (!data.jobId) {
        throw new Error(
          "The server did not return a processing job ID."
        );
      }


      sessionStorage.setItem(
        "cleanCaptionJobId",
        data.jobId
      );


      sessionStorage.setItem(
        "cleanCaptionFileName",
        file.name
      );


      sessionStorage.setItem(
        "cleanCaptionSubtitleStyle",
        JSON.stringify(
          subtitleStyle
        )
      );


      sessionStorage.setItem(
        "cleanCaptionCensorMode",
        censorMode
      );


      navigate(
        "/processing"
      );
    } catch (err) {
      console.error(
        "CleanCaption upload error:",
        err
      );


      let message =
        "Could not start processing.";


      if (
        err instanceof
        TypeError
      ) {
        message =
          "CleanCaption cannot connect to the processing server. Please make sure the backend is running and try again.";
      } else if (
        err?.message
      ) {
        message =
          err.message;
      }


      setError(
        message
      );
    } finally {
      setIsUploading(
        false
      );
    }
  }


  const previewBackground =
    subtitleStyle.background ===
    "black"
      ? "#000000"
      : subtitleStyle.background ===
          "semi-transparent"
        ? "rgba(0, 0, 0, 0.68)"
        : "transparent";


  return (
    <section
      className={`${
        compact
          ? "upload-box compact"
          : "upload-box"
      } ${
        isDragging
          ? "drag-over"
          : ""
      }`}
      onDragOver={
        handleDragOver
      }
      onDragLeave={
        handleDragLeave
      }
      onDrop={
        handleDrop
      }
    >
      <input
        ref={
          fileInputRef
        }
        type="file"
        accept=".mp4,.mov,.avi,video/mp4,video/quicktime,video/x-msvideo"
        onChange={
          handleFileChange
        }
        hidden
      />


      {!file ? (
        <>
          <div
            className="upload-icon"
            aria-hidden="true"
          >
            <UploadCloud
              size={34}
              strokeWidth={
                2.1
              }
            />
          </div>


          <h2>
            {isDragging
              ? "Drop the video here"
              : "Drop your video here"}
          </h2>


          <p>
            or choose a file
            from your computer
          </p>


          <button
            type="button"
            className="button"
            onClick={
              openFilePicker
            }
          >
            <UploadCloud
              size={19}
              strokeWidth={
                2.1
              }
            />

            Choose video
          </button>


          <p className="upload-help">
            Drag and drop a
            video here, or
            click the button.
            MP4, MOV and AVI ·
            Maximum 500 MB
          </p>


          {error && (
            <div
              className="upload-error-message"
              role="alert"
            >
              <strong>
                Upload problem
              </strong>

              <span>
                {error}
              </span>
            </div>
          )}
        </>
      ) : (
        <>
          <video
            className="upload-preview"
            src={
              getCurrentVideoUrl()
            }
            controls
            muted
          />


          <div className="upload-preview-info">
            <Film
              size={16}
            />

            <span>
              {file.name}
            </span>
          </div>


          {/* =========================
              CENSOR MODE
              ========================= */}

          <section className="censor-mode-panel">
            <div className="censor-mode-heading">
              <div>
                <h3>
                  Censor Mode
                </h3>

                <p>
                  Choose how
                  CleanCaption
                  should handle
                  offensive words.
                </p>
              </div>
            </div>


            <div className="censor-mode-options">
              {CENSOR_OPTIONS.map(
                (option) => {
                  const Icon =
                    option.icon;


                  const selected =
                    censorMode ===
                    option.value;


                  return (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      className={`censor-mode-card ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        setCensorMode(
                          option.value
                        )
                      }
                      aria-pressed={
                        selected
                      }
                    >
                      <div className="censor-mode-icon">
                        <Icon
                          size={
                            23
                          }
                          strokeWidth={
                            2
                          }
                        />
                      </div>


                      <div className="censor-mode-text">
                        <div className="censor-mode-title-row">
                          <strong>
                            {
                              option.title
                            }
                          </strong>


                          <span className="censor-radio">
                            <span />
                          </span>
                        </div>


                        <p>
                          {
                            option.description
                          }
                        </p>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </section>


          {/* =========================
              SUBTITLE STYLE
              ========================= */}

          <section className="subtitle-style-panel">
            <div className="subtitle-style-heading">
              <div
                className="subtitle-style-icon"
                aria-hidden="true"
              >
                <Type
                  size={20}
                />
              </div>


              <div>
                <h3>
                  Subtitle Style
                </h3>

                <p>
                  Customize how
                  subtitles will
                  look on your
                  video.
                </p>
              </div>
            </div>


            <div className="subtitle-style-grid">

              <label className="subtitle-control">
                <span>
                  Font
                </span>

                <select
                  value={
                    subtitleStyle.font
                  }
                  onChange={(
                    event
                  ) =>
                    updateSubtitleStyle(
                      "font",
                      event
                        .target
                        .value
                    )
                  }
                >
                  {FONT_OPTIONS.map(
                    (font) => (
                      <option
                        key={
                          font
                        }
                        value={
                          font
                        }
                      >
                        {font}
                      </option>
                    )
                  )}
                </select>
              </label>


              <div className="subtitle-control subtitle-color-control">
                <span>
                  Color
                </span>


                <div className="subtitle-color-options">
                  {COLOR_OPTIONS.map(
                    (
                      color
                    ) => (
                      <button
                        key={
                          color.value
                        }
                        type="button"
                        className={`subtitle-color-button ${
                          subtitleStyle.color ===
                          color.value
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          updateSubtitleStyle(
                            "color",
                            color.value
                          )
                        }
                        title={
                          color.name
                        }
                        aria-label={`Use ${color.name} subtitles`}
                        aria-pressed={
                          subtitleStyle.color ===
                          color.value
                        }
                      >
                        <span
                          className="subtitle-color-swatch"
                          style={{
                            backgroundColor:
                              color.value,
                          }}
                        />


                        <span>
                          {
                            color.name
                          }
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>


              <label className="subtitle-control subtitle-size-control">
                <span>
                  Subtitle Size

                  <strong>
                    {
                      subtitleStyle.size
                    }
                    px
                  </strong>
                </span>


                <div className="subtitle-size-row">
                  <small>
                    18px
                  </small>


                  <input
                    type="range"
                    min="18"
                    max="60"
                    step="1"
                    value={
                      subtitleStyle.size
                    }
                    onChange={(
                      event
                    ) =>
                      updateSubtitleStyle(
                        "size",
                        Number(
                          event
                            .target
                            .value
                        )
                      )
                    }
                    aria-label="Subtitle size"
                  />


                  <small>
                    60px
                  </small>
                </div>
              </label>


              <div className="subtitle-control">
                <span>
                  Text Weight
                </span>


                <button
                  type="button"
                  className={`subtitle-toggle ${
                    subtitleStyle.bold
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    updateSubtitleStyle(
                      "bold",
                      !subtitleStyle.bold
                    )
                  }
                  aria-pressed={
                    subtitleStyle.bold
                  }
                >
                  <span className="subtitle-toggle-switch">
                    <span />
                  </span>


                  <strong>
                    Bold
                  </strong>


                  <small>
                    {subtitleStyle.bold
                      ? "On"
                      : "Off"}
                  </small>
                </button>
              </div>


              <label className="subtitle-control">
                <span>
                  Position
                </span>


                <select
                  value={
                    subtitleStyle.position
                  }
                  onChange={(
                    event
                  ) =>
                    updateSubtitleStyle(
                      "position",
                      event
                        .target
                        .value
                    )
                  }
                >
                  {POSITION_OPTIONS.map(
                    (
                      position
                    ) => (
                      <option
                        key={
                          position
                        }
                        value={
                          position
                        }
                      >
                        {
                          position
                        }
                      </option>
                    )
                  )}
                </select>
              </label>


              <label className="subtitle-control">
                <span>
                  Background
                </span>


                <select
                  value={
                    subtitleStyle.background
                  }
                  onChange={(
                    event
                  ) =>
                    updateSubtitleStyle(
                      "background",
                      event
                        .target
                        .value
                    )
                  }
                >
                  {BACKGROUND_OPTIONS.map(
                    (
                      background
                    ) => (
                      <option
                        key={
                          background.value
                        }
                        value={
                          background.value
                        }
                      >
                        {
                          background.label
                        }
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>


            <div className="subtitle-live-preview">
              <div className="subtitle-preview-label">
                <Palette
                  size={15}
                />

                Live preview
              </div>


              <div
                className={`subtitle-preview-stage position-${subtitleStyle.position.toLowerCase()}`}
              >
                <span
                  className="subtitle-preview-text"
                  style={{
                    fontFamily:
                      subtitleStyle.font,

                    color:
                      subtitleStyle.color,

                    fontSize: `${Math.max(
                      16,
                      subtitleStyle.size *
                        0.75
                    )}px`,

                    fontWeight:
                      subtitleStyle.bold
                        ? 700
                        : 400,

                    background:
                      previewBackground,
                  }}
                >
                  Your subtitles
                  will look like
                  this.
                </span>
              </div>
            </div>
          </section>


          {error && (
            <div
              className="upload-error-message"
              role="alert"
            >
              <strong>
                Upload problem
              </strong>

              <span>
                {error}
              </span>
            </div>
          )}


          <div className="download-actions">
            <button
              type="button"
              className="button"
              onClick={
                startProcessing
              }
              disabled={
                isUploading
              }
            >
              {isUploading
                ? "Uploading..."
                : "Start processing"}
            </button>


            <button
              type="button"
              className="button button-secondary"
              onClick={
                resetSelection
              }
              disabled={
                isUploading
              }
            >
              Choose a
              different video
            </button>
          </div>


          <p className="upload-help">
            You can also drop
            another video here
            to replace this one.
          </p>
        </>
      )}
    </section>
  );
}


export default UploadBox;