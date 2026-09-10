const API_URL = "https://script.google.com/macros/s/AKfycbyWgVtd8AZYNQAUa8w9cNw4VtvUJ-AviCfyknaKTLIptpLAVZXbZM5C3eVcP1RRm5zPhA/exec";
let contacts = [];

function $(id) { return document.getElementById(id); }

function getDriveFileId(url) {
  const s = String(url || "");
  let m = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : "";
}

function getPhotoUrl(url) {
  const id = getDriveFileId(url);
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w600` : (url || "");
}

function photoError(img) {
  const id = img.dataset.fileId || getDriveFileId(img.dataset.original || img.src);
  if (!id) { img.style.display = "none"; return; }
  const attempt = Number(img.dataset.attempt || "0") + 1;
  img.dataset.attempt = String(attempt);
  if (attempt === 1) img.src = `https://drive.google.com/uc?export=view&id=${id}`;
  else img.style.display = "none";
}

function resetForm() {
  const form = $("contactForm");
  if (form) form.reset();
  if ($("contactId")) $("contactId").value = "";
  const preview = $("photoPreview");
  if (preview) {
    preview.classList.add("hidden");
    preview.removeAttribute("src");
    preview.removeAttribute("data-file-id");
    preview.removeAttribute("data-original");
    preview.removeAttribute("data-attempt");
  }
}

function closeForm() {
  resetForm();
  if ($("modal")) $("modal").classList.add("hidden");
}

function openForm(contact = null) {
  if (!$("modal")) return;
  resetForm();
  if (contact) {
    $("contactId").value = contact.id || "";
    $("name").value = contact.name || "";
    $("surname").value = contact.surname || "";
    $("phone").value = contact.phone || "";
    $("phone2").value = contact.phone2 || "";
    $("email").value = contact.email || "";
    $("code").value = contact.code || "";
    $("zip").value = contact.zip || "";
    $("city").value = contact.city || "";
    $("address").value = contact.address || "";
    $("note").value = contact.note || "";
    if (contact.photo) {
      const p = $("photoPreview");
      p.src = getPhotoUrl(contact.photo);
      p.dataset.fileId = contact.photoId || getDriveFileId(contact.photo);
      p.dataset.original = contact.photo;
      p.dataset.attempt = "0";
      p.classList.remove("hidden");
      p.onerror = () => photoError(p);
    }
  }
  $("modal").classList.remove("hidden");
}

async function loadData() {
  const container = $("contactsContainer");
  if (container) container.innerHTML = "<p>Nańć??t?°m‚Ä¶</p>";
  try {
    const response = await fetch(API_URL + "?action=list", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const result = await response.json();
    if (!Array.isArray(result)) throw new Error(result.error || "API nevr?°tilo seznam kontaktŇI.");
    contacts = result;
    render();
  } catch (err) {
    console.error(err);
    if (container) container.innerHTML = `<p class="error">NepodaŇôilo se nańć??st kontakty: ${escapeHtml(err.message)}</p>`;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function render() {
  const container = $("contactsContainer");
  if (!container) return;
  if (!contacts.length) {
    container.innerHTML = '<div class="contact-card">ŇĹ?°dn?© kontakty.</div>';
    return;
  }
  container.innerHTML = contacts.map(c => {
    const fileId = c.photoId || getDriveFileId(c.photo);
    const photo = c.photo ? `<img class="contact-photo" src="${escapeHtml(getPhotoUrl(c.photo))}" data-file-id="${escapeHtml(fileId)}" data-original="${escapeHtml(c.photo)}" onerror="photoError(this)" alt="">` : "";
    return `<div class="contact-card" data-id="${escapeHtml(c.id)}">
      ${photo}
      <div class="contact-main">
        <div class="contact-name">${escapeHtml([c.name, c.surname].filter(Boolean).join(" "))}</div>
        ${c.phone ? `<div>uüďě ${escapeHtml(c.phone)}</div>` : ""}
        ${c.phone2 ? `<div>uüďě ${escapeHtml(c.phone2)}</div>` : ""}
        ${c.email ? `<div>‚úČÔłŹ ${escapeHtml(c.email)}</div>` : ""}
        ${c.city || c.address ? `<div>uüďć ${escapeHtml([c.city, c.address].filter(Boolean).join(", "))}</div>` : ""}
        ${c.note ? `<div>${escapeHtml(c.note)}</div>` : ""}
      </div>
      <div class="contact-actions">
        <button type="button" onclick="editContact('${escapeHtml(c.id)}')">Upravit</button>
        <button type="button" onclick="deleteContact('${escapeHtml(c.id)}')">Smazat</button>
      </div>
    </div>`;
  }).join("");
}

function editContact(id) {
  const contact = contacts.find(c => String(c.id) === String(id));
  if (contact) openForm(contact);
}

async function uploadPhoto(file) {
  const reader = new FileReader();
  const base64 = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "uploadPhoto", fileName: file.name, mimeType: file.type, data: base64 })
  });
  if (!response.ok) throw new Error("Nahr?°n?? fotografie selhalo.");
  const result = await response.json();
  if (!result.success) throw new Error(result.error || "Nahr?°n?? fotografie selhalo.");
  return result.url;
}

async function saveContact(event) {
  event.preventDefault();
  const button = $("saveButton");
  if (button) { button.disabled = true; button.textContent = "Ukl?°d?°m‚Ä¶"; }
  try {
    let photoUrl = "";
    const input = $("photo");
    if (input && input.files && input.files[0]) photoUrl = await uploadPhoto(input.files[0]);

    const data = {
      action: $("contactId").value ? "update" : "create",
      id: $("contactId").value,
      name: $("name").value.trim(), surname: $("surname").value.trim(),
      phone: $("phone").value.trim(), phone2: $("phone2").value.trim(),
      email: $("email").value.trim(), code: $("code").value.trim(),
      zip: $("zip").value.trim(), city: $("city").value.trim(),
      address: $("address").value.trim(), note: $("note").value.trim(),
      photo: photoUrl
    };

    const response = await fetch(API_URL, { method: "POST", body: JSON.stringify(data) });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || "UloŇĺen?? se nezdaŇôilo.");

    closeForm();
    await loadData();
  } catch (err) {
    console.error(err);
    alert("Chyba: " + err.message);
  } finally {
    if (button) { button.disabled = false; button.textContent = "UloŇĺit"; }
  }
}

async function deleteContact(id) {
  if (!confirm("Opravdu smazat tento kontakt?")) return;
  try {
    const response = await fetch(API_URL, { method: "POST", body: JSON.stringify({ action: "delete", id }) });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const result = await response.json();
    if (!result.success) throw new Error(result.error || "Maz?°n?? se nezdaŇôilo.");
    await loadData();
  } catch (err) { alert("Chyba: " + err.message); }
}

function setup() {
  if ($("newContact")) $("newContact").addEventListener("click", () => openForm());
  if ($("closeForm")) $("closeForm").addEventListener("click", closeForm);
  if ($("cancelForm")) $("cancelForm").addEventListener("click", closeForm);
  if ($("contactForm")) $("contactForm").addEventListener("submit", saveContact);

  const photoInput = $("photo");
  if (photoInput) photoInput.addEventListener("change", () => {
    const file = photoInput.files && photoInput.files[0];
    const preview = $("photoPreview");
    if (!preview) return;
    if (!file) { preview.classList.add("hidden"); preview.removeAttribute("src"); return; }
    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
  });

  loadData();
}

document.addEventListener("DOMContentLoaded", setup);
