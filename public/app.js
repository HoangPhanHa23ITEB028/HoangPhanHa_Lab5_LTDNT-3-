import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Geolocation } from "@capacitor/geolocation";

// ĐÃ SỬA: Thay đổi import thành đường dẫn tương đối (./)
import { facilitySurveySchema } from "./survey-schema.js";
import {
  saveSubmission,
  getAllSubmissions,
  getPendingSubmissions,
  updateSubmission,
} from "./db.js";

/* =========================================================
   BASIC ELEMENTS
========================================================= */
const statusEl = document.querySelector("#network-status");
const formEl = document.querySelector("#survey-form");
const titleEl = document.querySelector("#form-title");
const listEl = document.querySelector("#submission-list");
const pendingCounterEl = document.querySelector("#pending-counter");
const syncedCounterEl = document.querySelector("#synced-counter");
const syncButton = document.querySelector("#sync-button");

/* =========================================================
   NATIVE EVIDENCE ELEMENTS
========================================================= */
const cameraButton = document.querySelector("#camera-button");
const clearPhotoButton = document.querySelector("#clear-photo-button");
const photoStatusEl = document.querySelector("#photo-status");
const photoPreviewEl = document.querySelector("#photo-preview");

const locationButton = document.querySelector("#location-button");
const locationStatusEl = document.querySelector("#location-status");
const locationCoordinatesEl = document.querySelector("#location-coordinates");
const locationAccuracyEl = document.querySelector("#location-accuracy");

/* =========================================================
   NATIVE STATE
========================================================= */
let currentPhoto = null;
let currentLocation = null;

/* =========================================================
   PLATFORM
========================================================= */
const isNative = Capacitor.isNativePlatform();
console.log("Running platform:", Capacitor.getPlatform());
console.log("Is native:", isNative);

/* =========================================================
   API BASE URL
========================================================= */
const API_BASE_URL = isNative
  ? "http://10.0.2.2:3001"
  : "http://localhost:3001";
const API_SUBMISSIONS_URL = `${API_BASE_URL}/api/submissions`;

/* =========================================================
   NETWORK STATUS
========================================================= */
function updateNetworkStatus() {
  if (!statusEl) return;
  statusEl.textContent = navigator.onLine
    ? "Trạng thái: ONLINE"
    : "Trạng thái: OFFLINE";
}
updateNetworkStatus();

/* =========================================================
   SERVICE WORKER
========================================================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./sw.js");
      console.log("Service Worker registered:", registration.scope);
    } catch (error) {
      console.error("Service Worker registration failed:", error);
    }
  });
}

/* =========================================================
   FORM
========================================================= */
const answers = {};

if (titleEl) {
  titleEl.textContent = facilitySurveySchema.title;
}

function renderForm() {
  if (!formEl) return;
  formEl.innerHTML = "";

  for (const field of facilitySurveySchema.fields) {
    if (!shouldShowField(field)) continue;
    formEl.appendChild(renderField(field));
  }

  const actions = document.createElement("div");
  actions.className = "actions";

  const submitButton = document.createElement("button");
  submitButton.type = "submit";
  submitButton.textContent = "Lưu khảo sát";

  actions.appendChild(submitButton);
  formEl.appendChild(actions);
}

function renderField(field) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  if (field.type === "text") {
    const label = document.createElement("label");
    label.textContent = field.label;
    const input = document.createElement("input");
    input.type = "text";
    input.value = answers[field.id] ?? "";
    if (field.required) input.required = true;
    input.addEventListener("input", () => {
      answers[field.id] = input.value;
    });
    wrapper.append(label, input);
  }

  if (field.type === "textarea") {
    const label = document.createElement("label");
    label.textContent = field.label;
    const textarea = document.createElement("textarea");
    textarea.value = answers[field.id] ?? "";
    if (field.required) textarea.required = true;
    textarea.addEventListener("input", () => {
      answers[field.id] = textarea.value;
    });
    wrapper.append(label, textarea);
  }

  if (field.type === "radio") {
    const label = document.createElement("div");
    label.className = "field-label";
    label.textContent = field.label;
    wrapper.appendChild(label);

    for (const option of field.options) {
      const optionLabel = document.createElement("label");
      optionLabel.className = "radio-option";

      const input = document.createElement("input");
      input.type = "radio";
      input.name = field.id;
      input.value = option.value;
      input.checked = answers[field.id] === option.value;

      input.addEventListener("change", () => {
        answers[field.id] = option.value;
        removeHiddenAnswers();
        renderForm();
      });

      optionLabel.append(input, ` ${option.label}`);
      wrapper.appendChild(optionLabel);
    }
  }

  return wrapper;
}

/* =========================================================
   CAMERA PERMISSION & CAPTURE
========================================================= */
async function ensureCameraPermission() {
  try {
    const permissions = await Camera.checkPermissions();
    if (permissions.camera === "granted") return true;

    const requested = await Camera.requestPermissions({
      permissions: ["camera"],
    });
    if (requested.camera !== "granted") {
      throw new Error("Quyền Camera chưa được cấp.");
    }
    return true;
  } catch (error) {
    console.error("Camera permission error:", error);
    throw error;
  }
}

async function takePhoto() {
  try {
    console.log("Opening Camera...");
    if (isNative) {
      await ensureCameraPermission();
    }

    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });

    if (!photo.dataUrl) throw new Error("Camera không trả về dữ liệu ảnh.");

    currentPhoto = {
      previewDataUrl: photo.dataUrl,
      format: photo.format ?? "jpeg",
      capturedAt: new Date().toISOString(),
    };

    renderNativeEvidence();
    console.log("Photo captured successfully.");
  } catch (error) {
    console.error("Camera error:", error);
    const message = error?.message ?? String(error);
    alert("Không thể chụp ảnh.\n\n" + message);
  }
}

function clearCurrentPhoto() {
  currentPhoto = null;
  renderNativeEvidence();
}

/* =========================================================
   GEOLOCATION PERMISSION & CAPTURE
========================================================= */
async function ensureLocationPermission() {
  try {
    let permission = await Geolocation.checkPermissions();
    if (permission.location === "granted") return true;

    permission = await Geolocation.requestPermissions({
      permissions: ["location", "coarseLocation"],
    });
    if (permission.location !== "granted") {
      throw new Error("Quyền vị trí chưa được cấp.");
    }
    return true;
  } catch (error) {
    console.error("Location permission error:", error);
    throw error;
  }
}

async function getCurrentLocation() {
  try {
    console.log("Requesting location...");
    if (isNative) {
      await ensureLocationPermission();
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });

    if (!position || !position.coords)
      throw new Error("Không nhận được dữ liệu GPS.");

    currentLocation = {
      latitude: Number(position.coords.latitude),
      longitude: Number(position.coords.longitude),
      accuracy: Number(position.coords.accuracy),
      altitude: position.coords.altitude ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null,
      capturedAt: new Date().toISOString(),
    };

    renderNativeEvidence();
    console.log("Location captured:", currentLocation);
  } catch (error) {
    console.error("Geolocation error:", error);
    const message = error?.message ?? String(error);
    alert("Không thể lấy vị trí.\n\n" + message);
  }
}

/* =========================================================
   HELPER & RENDER
========================================================= */
function getAccuracyLabel(accuracy) {
  const value = Number(accuracy);
  if (!Number.isFinite(value)) return "Không xác định";
  if (value <= 20) return "Tốt";
  if (value <= 50) return "Trung bình";
  return "Thấp";
}

function renderNativeEvidence() {
  if (currentPhoto) {
    if (photoStatusEl) photoStatusEl.textContent = "Đã chụp ảnh hiện trường.";
    if (photoPreviewEl && currentPhoto.previewDataUrl) {
      photoPreviewEl.src = currentPhoto.previewDataUrl;
      photoPreviewEl.hidden = false;
    }
  } else {
    if (photoStatusEl) photoStatusEl.textContent = "Chưa có ảnh.";
    if (photoPreviewEl) {
      photoPreviewEl.src = "";
      photoPreviewEl.hidden = true;
    }
  }

  if (currentLocation) {
    if (locationStatusEl)
      locationStatusEl.textContent = "Đã lấy vị trí hiện tại.";
    const latitude = Number(currentLocation.latitude);
    const longitude = Number(currentLocation.longitude);

    if (locationCoordinatesEl) {
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        locationCoordinatesEl.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      } else {
        locationCoordinatesEl.textContent = "Tọa độ không hợp lệ.";
      }
      locationCoordinatesEl.hidden = false;
    }

    const accuracy = Number(currentLocation.accuracy);
    if (locationAccuracyEl) {
      if (Number.isFinite(accuracy)) {
        locationAccuracyEl.textContent = `Accuracy: ${Math.round(accuracy)} m — ${getAccuracyLabel(accuracy)}`;
      } else {
        locationAccuracyEl.textContent = "Accuracy: Không xác định";
      }
      locationAccuracyEl.hidden = false;
    }
  } else {
    if (locationStatusEl) locationStatusEl.textContent = "Chưa có vị trí.";
    if (locationCoordinatesEl) {
      locationCoordinatesEl.textContent = "";
      locationCoordinatesEl.hidden = true;
    }
    if (locationAccuracyEl) {
      locationAccuracyEl.textContent = "";
      locationAccuracyEl.hidden = true;
    }
  }
}

/* =========================================================
   VALIDATION & SUBMIT
========================================================= */
function validateNativeEvidence() {
  const errors = [];
  if (!currentLocation)
    errors.push("Vui lòng lấy vị trí trước khi lưu khảo sát.");
  if (answers.condition === "damaged" && !currentPhoto) {
    errors.push("Khảo sát hư hỏng phải có ảnh hiện trường.");
  }
  return errors;
}

function validateAnswers() {
  const errors = [];
  for (const field of facilitySurveySchema.fields) {
    if (!shouldShowField(field)) continue;
    if (field.required && !String(answers[field.id] ?? "").trim()) {
      errors.push(`${field.label} là bắt buộc`);
    }
  }
  return errors;
}

if (formEl) {
  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      removeHiddenAnswers();
      const errors = [...validateAnswers(), ...validateNativeEvidence()];

      if (errors.length > 0) {
        alert(errors.join("\n"));
        return;
      }

      const submission = {
        id: crypto.randomUUID(),
        formId: facilitySurveySchema.id,
        answers: { ...answers },
        photo: currentPhoto ? { ...currentPhoto } : null,
        location: currentLocation ? { ...currentLocation } : null,
        createdAt: new Date().toISOString(),
        syncStatus: "pending",
        syncAttempts: 0,
        lastError: null,
        syncedAt: null,
      };

      await saveSubmission(submission);
      console.log("Saved locally:", submission);

      clearForm();
      resetNativeEvidence();
      await renderSubmissionList();

      if (navigator.onLine) await syncPendingSubmissions();
    } catch (error) {
      console.error("Submit error:", error);
      alert("Không thể lưu khảo sát.\n\n" + `${error?.message ?? error}`);
    }
  });
}

function resetNativeEvidence() {
  currentPhoto = null;
  currentLocation = null;
  renderNativeEvidence();
}

/* =========================================================
   LIST & UI LOGIC
========================================================= */
async function renderSubmissionList() {
  if (!listEl) return;
  try {
    const submissions = await getAllSubmissions();
    submissions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    updateCounters(submissions);

    listEl.innerHTML = "";
    if (submissions.length === 0) {
      listEl.textContent = "Chưa có submission.";
      return;
    }

    for (const submission of submissions) {
      const item = document.createElement("div");
      item.className = "submission";

      const facilityName = submission.answers?.facility_name ?? "(Không tên)";
      const buildingLabel = getOptionLabel(
        "building",
        submission.answers?.building,
      );
      const facilityTypeLabel = getOptionLabel(
        "facility_type",
        submission.answers?.facility_type,
      );
      const conditionLabel = getOptionLabel(
        "condition",
        submission.answers?.condition,
      );
      const createdAt = formatDateTime(submission.createdAt);
      const hasPhoto = Boolean(submission.photo);
      const location = submission.location;
      const badgeClass =
        submission.syncStatus === "synced" ? "badge synced" : "badge pending";

      item.innerHTML = `
        <div class="submission-top">
          <strong>${escapeHTML(facilityName)}</strong>
          <span class="${badgeClass}">${escapeHTML(submission.syncStatus)}</span>
        </div>
        <p>Tòa nhà: ${escapeHTML(buildingLabel)}</p>
        <p>Loại hạng mục: ${escapeHTML(facilityTypeLabel)}</p>
        <p>Tình trạng: ${escapeHTML(conditionLabel)}</p>
        <p>Created: ${escapeHTML(createdAt)}</p>
        <p>Photo: ${hasPhoto ? "Có" : "Không"}</p>
        ${
          location
            ? `
          <p>Location: ${formatCoordinate(location.latitude)},${formatCoordinate(location.longitude)}</p>
          <p>Accuracy: ${Number.isFinite(Number(location.accuracy)) ? `${Math.round(Number(location.accuracy))} m` : "—"}</p>
        `
            : `<p>Location: Không có</p>`
        }
      `;

      if (submission.photo?.previewDataUrl) {
        const img = document.createElement("img");
        img.src = submission.photo.previewDataUrl;
        img.alt = "Ảnh hiện trường";
        img.className = "submission-photo";
        item.appendChild(img);
      }

      listEl.appendChild(item);
    }
  } catch (error) {
    console.error("Render error:", error);
    listEl.textContent = "Không thể đọc submission.";
  }
}

function formatCoordinate(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(6) : "—";
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML;
}

function clearForm() {
  for (const key of Object.keys(answers)) delete answers[key];
  renderForm();
}

function shouldShowField(field) {
  if (!field.showIf) return true;
  return answers[field.showIf.field] === field.showIf.equals;
}

function getOptionLabel(fieldId, value) {
  const field = facilitySurveySchema.fields.find((f) => f.id === fieldId);
  if (!field || !field.options) return value ?? "—";
  const option = field.options.find((o) => o.value === value);
  return option ? option.label : (value ?? "—");
}

function updateCounters(submissions) {
  const pendingCount = submissions.filter(
    (s) => s.syncStatus === "pending",
  ).length;
  const syncedCount = submissions.filter(
    (s) => s.syncStatus === "synced",
  ).length;
  if (pendingCounterEl)
    pendingCounterEl.textContent = `Pending: ${pendingCount}`;
  if (syncedCounterEl) syncedCounterEl.textContent = `Synced: ${syncedCount}`;
}

function removeHiddenAnswers() {
  for (const field of facilitySurveySchema.fields) {
    if (!shouldShowField(field)) delete answers[field.id];
  }
}

/* =========================================================
   SYNC ENGINE
========================================================= */
let syncInProgress = false;

function getRetryDelay(attempt) {
  return Math.min(1000 * 2 ** attempt, 30000);
}
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function syncPendingSubmissions() {
  if (syncInProgress || !navigator.onLine) return;
  syncInProgress = true;
  try {
    const pending = await getPendingSubmissions();
    pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    await Promise.allSettled(
      pending.map((submission) => syncOneSubmission(submission)),
    );
  } finally {
    syncInProgress = false;
    await renderSubmissionList();
  }
}

async function syncOneSubmission(submission) {
  while (navigator.onLine) {
    try {
      const response = await fetch(API_SUBMISSIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const syncedAt = new Date().toISOString();
      await updateSubmission(submission.id, {
        syncStatus: "synced",
        syncedAt,
        lastError: null,
      });
      break;
    } catch (error) {
      const nextAttempts = (submission.syncAttempts ?? 0) + 1;
      await updateSubmission(submission.id, {
        syncStatus: "pending",
        syncAttempts: nextAttempts,
        lastError: String(error),
      });
      if (!navigator.onLine) break;
      await wait(getRetryDelay(nextAttempts - 1));
    }
  }
}

function formatDateTime(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

/* =========================================================
   EVENTS & INIT
========================================================= */
if (cameraButton) cameraButton.addEventListener("click", takePhoto);
if (clearPhotoButton)
  clearPhotoButton.addEventListener("click", clearCurrentPhoto);
if (locationButton)
  locationButton.addEventListener("click", getCurrentLocation);
if (syncButton) syncButton.addEventListener("click", syncPendingSubmissions);

window.addEventListener("online", async () => {
  updateNetworkStatus();
  await syncPendingSubmissions();
});
window.addEventListener("offline", updateNetworkStatus);

async function init() {
  renderForm();
  renderNativeEvidence();
  await renderSubmissionList();
  if (navigator.onLine) syncPendingSubmissions();
}

init();
