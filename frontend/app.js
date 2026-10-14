const $ = (id) => document.getElementById(id);
const MAX = 5 * 1024 * 1024;
const allowed = ["image/jpeg", "image/png", "image/webp"];
let selected = null,
  selectedUrl = null,
  images = [],
  cursor = null,
  deleting = null,
  loading = false,
  uploading = false;
const size = (bytes) =>
  bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
const date = (value) =>
  new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
function status(id, message, error = false) {
  $(id).textContent = message;
  $(id).classList.toggle("error", error);
}
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "No se pudo completar la solicitud.");
  return data;
}
function choose(file) {
  if (uploading) return;
  if (selectedUrl) URL.revokeObjectURL(selectedUrl);
  selected = null;
  selectedUrl = null;
  $("selected").hidden = true;
  $("upload").disabled = true;
  if (!file) {
    status("upload-status", "Tus imágenes se mantienen privadas.");
    return;
  }
  if (!allowed.includes(file.type)) {
    status("upload-status", "Elige una imagen JPG, PNG o WebP.", true);
    $("file").value = "";
    return;
  }
  if (file.size <= 0 || file.size >= MAX) {
    status("upload-status", "La imagen debe pesar menos de 5 MB.", true);
    $("file").value = "";
    return;
  }
  selected = file;
  selectedUrl = URL.createObjectURL(file);
  $("selected-preview").src = selectedUrl;
  $("selected-name").textContent = file.name;
  $("selected-size").textContent = size(file.size);
  $("selected").hidden = false;
  $("upload").disabled = false;
  status("upload-status", "Lista para subir.");
}
$("file").addEventListener("change", (e) => choose(e.target.files[0]));
$("clear").addEventListener("click", () => {
  $("file").value = "";
  choose(null);
});
$("choose-first").addEventListener("click", () => $("file").click());
for (const event of ["dragenter", "dragover"])
  $("dropzone").addEventListener(event, (e) => {
    e.preventDefault();
    $("dropzone").classList.add("dragging");
  });
for (const event of ["dragleave", "drop"])
  $("dropzone").addEventListener(event, (e) => {
    e.preventDefault();
    $("dropzone").classList.remove("dragging");
  });
$("dropzone").addEventListener("drop", (e) => {
  if (e.dataTransfer.files.length !== 1) {
    status("upload-status", "Selecciona una imagen a la vez.", true);
    return;
  }
  choose(e.dataTransfer.files[0]);
});
function putDirect(url, file, headers) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.timeout = 90000;
    for (const [name, value] of Object.entries(headers))
      xhr.setRequestHeader(name, value);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        $("progress").value = Math.round((e.loaded / e.total) * 100);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(
            new Error(
              "El almacenamiento rechazó la carga. Revisa CORS o selecciona la imagen otra vez.",
            ),
          );
    xhr.onerror = () =>
      reject(
        new Error(
          "No se pudo conectar con el almacenamiento. Revisa la conexión y CORS.",
        ),
      );
    xhr.ontimeout = () =>
      reject(new Error("La carga tardó demasiado. Inténtalo otra vez."));
    xhr.send(file);
  });
}
$("upload-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selected || uploading) return;
  const file = selected;
  uploading = true;
  $("upload").disabled = true;
  $("file").disabled = true;
  $("clear").disabled = true;
  $("progress").hidden = false;
  $("progress").value = 0;
  try {
    status("upload-status", "Preparando la imagen…");
    const hash = new Uint8Array(
      await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
    );
    const checksum = btoa(String.fromCharCode(...hash));
    const ticket = await api("/api/upload-url", {
      method: "POST",
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
        checksum,
      }),
    });
    status("upload-status", "Subiendo directamente al almacenamiento…");
    await putDirect(ticket.uploadUrl, file, ticket.headers);
    status("upload-status", "Verificando el contenido de la imagen…");
    await api(`/api/uploads/${encodeURIComponent(ticket.uploadId)}/complete`, {
      method: "POST",
      body: "{}",
    });
    uploading = false;
    $("file").value = "";
    choose(null);
    status("upload-status", "Imagen guardada en tu colección.");
    await load();
  } catch (err) {
    status("upload-status", err.message, true);
  } finally {
    uploading = false;
    $("upload").disabled = !selected;
    $("file").disabled = false;
    $("clear").disabled = false;
    $("progress").hidden = true;
  }
});
const iconPaths = {
  download: "M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5",
  trash: "M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6m4-6v6",
};
function icon(name) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", iconPaths[name]);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.6");
  svg.append(path);
  return svg;
}
function render() {
  let visible = images.filter((i) =>
    i.name
      .toLocaleLowerCase("es")
      .includes($("search").value.toLocaleLowerCase("es")),
  );
  visible.sort((a, b) =>
    $("sort").value === "name"
      ? a.name.localeCompare(b.name)
      : $("sort").value === "old"
        ? new Date(a.lastModified) - new Date(b.lastModified)
        : new Date(b.lastModified) - new Date(a.lastModified),
  );
  $("count").textContent = images.length + (cursor ? "+" : "");
  $("gallery").replaceChildren();
  $("empty").hidden = images.length > 0 || loading;
  if (images.length && !visible.length)
    status(
      "gallery-status",
      cursor
        ? "No hay coincidencias entre las imágenes cargadas. Carga más imágenes para ampliar la búsqueda."
        : "No hay imágenes que coincidan con tu búsqueda.",
    );
  for (const item of visible) {
    const article = document.createElement("article");
    article.className = "photo";
    const open = document.createElement("button");
    open.className = "photo-open";
    open.setAttribute("aria-label", `Ver ${item.name}`);
    const img = document.createElement("img");
    img.src = item.url;
    img.alt = item.name;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener(
      "error",
      () =>
        status(
          "gallery-status",
          "Una vista previa no está disponible. Pulsa Actualizar para renovar los enlaces.",
          true,
        ),
      { once: true },
    );
    open.append(img);
    open.addEventListener("click", () => {
      $("preview-image").src = item.url;
      $("preview-image").alt = item.name;
      $("preview-name").textContent = item.name;
      $("preview-meta").textContent =
        `${size(item.size)} · ${date(item.lastModified)}`;
      $("preview-download").href = item.downloadUrl;
      $("preview").showModal();
    });
    const caption = document.createElement("div");
    caption.className = "photo-caption";
    const info = document.createElement("div");
    info.className = "photo-info";
    const name = document.createElement("h3");
    name.textContent = item.name;
    name.title = item.name;
    const meta = document.createElement("p");
    meta.textContent = `${size(item.size)} · ${date(item.lastModified)}`;
    info.append(name, meta);
    const actions = document.createElement("div");
    actions.className = "photo-actions";
    const download = document.createElement("a");
    download.href = item.downloadUrl;
    download.setAttribute("aria-label", `Descargar ${item.name}`);
    download.append(icon("download"));
    const remove = document.createElement("button");
    remove.setAttribute("aria-label", `Eliminar ${item.name}`);
    remove.append(icon("trash"));
    remove.addEventListener("click", () => {
      deleting = item;
      $("delete-name").textContent = item.name;
      status("delete-status", "");
      $("delete-dialog").showModal();
    });
    actions.append(download, remove);
    caption.append(info, actions);
    article.append(open, caption);
    $("gallery").append(article);
  }
  $("load-more").hidden = !cursor;
}
async function load(more = false) {
  if (loading) return;
  loading = true;
  $("refresh").disabled = true;
  $("load-more").disabled = true;
  $("gallery").setAttribute("aria-busy", "true");
  status("gallery-status", "Cargando tu colección…");
  try {
    const data = await api(
      "/api/images" +
        (more && cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""),
    );
    images = more ? [...images, ...data.items] : data.items;
    cursor = data.nextCursor;
    status("gallery-status", "");
  } catch (err) {
    status("gallery-status", err.message, true);
  } finally {
    loading = false;
    $("refresh").disabled = false;
    $("load-more").disabled = false;
    $("gallery").setAttribute("aria-busy", "false");
    render();
  }
}
$("refresh").addEventListener("click", () => load());
$("load-more").addEventListener("click", () => load(true));
$("search").addEventListener("input", () => {
  status("gallery-status", "");
  render();
});
$("sort").addEventListener("change", render);
$("close-preview").addEventListener("click", () => $("preview").close());
$("cancel-delete").addEventListener("click", () => $("delete-dialog").close());
$("confirm-delete").addEventListener("click", async () => {
  if (!deleting) return;
  $("confirm-delete").disabled = true;
  $("cancel-delete").disabled = true;
  try {
    await api(
      `/api/images/${deleting.key.split("/").map(encodeURIComponent).join("/")}`,
      { method: "DELETE" },
    );
    $("delete-dialog").close();
    status("upload-status", "Imagen eliminada de la colección.");
    await load();
  } catch (err) {
    status("delete-status", err.message, true);
  } finally {
    $("confirm-delete").disabled = false;
    $("cancel-delete").disabled = false;
  }
});
api("/api/config")
  .then((c) => {
    $("storage").textContent =
      c.storage === "Amazon S3"
        ? "Almacenamiento en AWS"
        : "Modo local · " + c.storage;
  })
  .catch(() => {
    $("storage").textContent = "Sin conexión";
  });
load();
// Refresh visible links before their 15-minute lifetime; does not run in background tabs.
setInterval(
  () => {
    if (
      document.visibilityState === "visible" &&
      !uploading &&
      !$("preview").open &&
      !$("delete-dialog").open
    )
      load();
  },
  12 * 60 * 1000,
);
