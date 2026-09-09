// ============================================================
// ADRESÁŘ - hlavní JavaScript aplikace
// ============================================================

// URL webové aplikace Google Apps Script.
// Tuto hodnotu už není potřeba měnit.
const API_URL =
    "https://script.google.com/macros/s/AKfycbyWgVtd8AZYNQAUa8w9cNw4VtvUJ-AviCfyknaKTLIptpLAVZXbZM5C3eVcP1RRm5zPhA/exec";

let contacts = [];

// ------------------------------------------------------------
// Pomocné funkce
// ------------------------------------------------------------

function esc(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function tel(phone) {
    if (!phone) {
        return "#";
    }

    return `tel:${String(phone).replace(/[^+\d]/g, "")}`;
}

function mail(email) {
    if (!email) {
        return "#";
    }

    return `mailto:${encodeURIComponent(email)}`;
}

function map(address, city, zip) {
    const text = [address, zip, city]
        .filter(Boolean)
        .join(", ");

    if (!text) {
        return "#";
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
}

function photoUrl(url) {
    if (!url) {
        return "";
    }

    // Apps Script může vracet přímo thumbnail URL.
    return url;
}

// ------------------------------------------------------------
// Načtení kontaktů
// ------------------------------------------------------------

async function loadData() {
    setStatus("Načítám kontakty...");

    try {
        const response = await fetch(`${API_URL}?action=list`, {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("API nevrátilo seznam kontaktů.");
        }

        contacts = data;
        render();

        setStatus(`Načteno kontaktů: ${contacts.length}`);
    } catch (error) {
        console.error(error);
        setStatus(`Chyba při načítání: ${error.message}`, true);
    }
}

// ------------------------------------------------------------
// Vykreslení
// ------------------------------------------------------------

function render() {
    const search = document
        .getElementById("searchInput")
        .value
        .trim()
        .toLowerCase();

    const filtered = contacts.filter(contact => {
        const text = [
            contact.name,
            contact.surname,
            contact.phone,
            contact.phone2,
            contact.email,
            contact.code,
            contact.zip,
            contact.city,
            contact.address,
            contact.note
        ]
            .join(" ")
            .toLowerCase();

        return text.includes(search);
    });

    renderTable(filtered);
    renderMobile(filtered);
}

function renderTable(list) {
    const body = document.getElementById("contactsBody");

    if (list.length === 0) {
        body.innerHTML = `
            <tr>
                <td colspan="7">Žádné kontakty.</td>
            </tr>
        `;
        return;
    }

    body.innerHTML = list.map(contact => {
        const fullName = [contact.name, contact.surname]
            .filter(Boolean)
            .join(" ");

        const address = [contact.address, contact.zip, contact.city]
            .filter(Boolean)
            .join(", ");

        const image = contact.photo
            ? `<img class="thumb" src="${esc(photoUrl(contact.photo))}" alt="">`
            : `<div class="thumb"></div>`;

        return `
            <tr>
                <td>${image}</td>
                <td><strong>${esc(fullName)}</strong></td>
                <td>
                    ${contact.phone
                        ? `<a href="${esc(tel(contact.phone))}">${esc(contact.phone)}</a>`
                        : ""}
                    ${contact.phone2
                        ? `<br><a href="${esc(tel(contact.phone2))}">${esc(contact.phone2)}</a>`
                        : ""}
                </td>
                <td>
                    ${address
                        ? `<a href="${esc(map(contact.address, contact.city, contact.zip))}" target="_blank" rel="noopener">${esc(address)}</a>`
                        : ""}
                </td>
                <td>
                    ${contact.email
                        ? `<a href="${esc(mail(contact.email))}">${esc(contact.email)}</a>`
                        : ""}
                </td>
                <td>${esc(contact.code)}</td>
                <td>
                    <div class="actions">
                        <button class="secondary-button action-button" onclick="editContact('${esc(contact.id)}')">
                            Upravit
                        </button>
                        <button class="danger-button action-button" onclick="deleteContact('${esc(contact.id)}')">
                            Smazat
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

function renderMobile(list) {
    const container = document.getElementById("mobileList");

    if (list.length === 0) {
        container.innerHTML = '<div class="contact-card">Žádné kontakty.</div>';
        return;
    }

    container.innerHTML = list.map(contact => {
        const fullName = [contact.name, contact.surname]
            .filter(Boolean)
            .join(" ");

        const address = [contact.address, contact.zip, contact.city]
            .filter(Boolean)
            .join(", ");

        const image = contact.photo
            ? `<img class="thumb" src="${esc(photoUrl(contact.photo))}" alt="">`
            : `<div class="thumb"></div>`;

        return `
            <article class="contact-card">
                <div class="card-top">
                    ${image}
                    <div class="card-name">${esc(fullName)}</div>
                </div>

                <div class="card-details">
                    ${contact.phone
                        ? `📞 <a href="${esc(tel(contact.phone))}">${esc(contact.phone)}</a><br>`
                        : ""}
                    ${contact.phone2
                        ? `📞 <a href="${esc(tel(contact.phone2))}">${esc(contact.phone2)}</a><br>`
                        : ""}
                    ${contact.email
                        ? `✉️ <a href="${esc(mail(contact.email))}">${esc(contact.email)}</a><br>`
                        : ""}
                    ${address
                        ? `📍 <a href="${esc(map(contact.address, contact.city, contact.zip))}" target="_blank" rel="noopener">${esc(address)}</a><br>`
                        : ""}
                    ${contact.code
                        ? `Kód: ${esc(contact.code)}<br>`
                        : ""}
                    ${contact.note
                        ? `📝 ${esc(contact.note)}`
                        : ""}
                </div>

                <div class="card-actions">
                    <button class="secondary-button" onclick="editContact('${esc(contact.id)}')">
                        Upravit
                    </button>
                    <button class="danger-button" onclick="deleteContact('${esc(contact.id)}')">
                        Smazat
                    </button>
                </div>
            </article>
        `;
    }).join("");
}

// ------------------------------------------------------------
// Formulář
// ------------------------------------------------------------

function openForm(contact = null) {
    document.getElementById("modal").classList.remove("hidden");
    document.getElementById("contactForm").reset();

    document.getElementById("contactId").value = "";
    document.getElementById("photoPreview").classList.add("hidden");
    document.getElementById("photoPreview").removeAttribute("src");

    if (!contact) {
        document.getElementById("modalTitle").textContent = "Nový kontakt";
        return;
    }

    document.getElementById("modalTitle").textContent = "Upravit kontakt";

    document.getElementById("contactId").value = contact.id;
    document.getElementById("name").value = contact.name || "";
    document.getElementById("surname").value = contact.surname || "";
    document.getElementById("phone").value = contact.phone || "";
    document.getElementById("phone2").value = contact.phone2 || "";
    document.getElementById("email").value = contact.email || "";
    document.getElementById("code").value = contact.code || "";
    document.getElementById("zip").value = contact.zip || "";
    document.getElementById("city").value = contact.city || "";
    document.getElementById("address").value = contact.address || "";
    document.getElementById("note").value = contact.note || "";

    if (contact.photo) {
        const preview = document.getElementById("photoPreview");
        preview.src = photoUrl(contact.photo);
        preview.classList.remove("hidden");
    }
}

function closeForm() {
    document.getElementById("modal").classList.add("hidden");
}

function editContact(id) {
    const contact = contacts.find(item => String(item.id) === String(id));

    if (!contact) {
        alert("Kontakt nebyl nalezen.");
        return;
    }

    openForm(contact);
}

// ------------------------------------------------------------
// Fotografie
// ------------------------------------------------------------

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
            const result = String(reader.result || "");
            const comma = result.indexOf(",");

            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ------------------------------------------------------------
// Uložení
// ------------------------------------------------------------

async function saveContact(event) {
    event.preventDefault();

    const id = document.getElementById("contactId").value.trim();
    const file = document.getElementById("photoFile").files[0];

    const data = {
        action: id ? "update" : "create",
        id,
        name: document.getElementById("name").value.trim(),
        surname: document.getElementById("surname").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        phone2: document.getElementById("phone2").value.trim(),
        email: document.getElementById("email").value.trim(),
        code: document.getElementById("code").value.trim(),
        zip: document.getElementById("zip").value.trim(),
        city: document.getElementById("city").value.trim(),
        address: document.getElementById("address").value.trim(),
        note: document.getElementById("note").value.trim()
    };

    if (file) {
        data.photoData = await readFileAsBase64(file);
        data.photoName = file.name;
        data.photoType = file.type || "image/jpeg";
    }

    setStatus("Ukládám...");

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.ok) {
            throw new Error(result.error || "Uložení se nezdařilo.");
        }

        document.getElementById("contactForm").reset();
        document.getElementById("photoPreview").classList.add("hidden");
        document.getElementById("photoPreview").removeAttribute("src");

        closeForm();
        await loadData();
    } catch (error) {
        console.error(error);
        setStatus(`Chyba při ukládání: ${error.message}`, true);
    }
}

// ------------------------------------------------------------
// Mazání
// ------------------------------------------------------------

async function deleteContact(id) {
    const contact = contacts.find(item => String(item.id) === String(id));

    if (!contact) {
        return;
    }

    const name = [contact.name, contact.surname]
        .filter(Boolean)
        .join(" ");

    if (!confirm(`Opravdu chcete smazat kontakt „${name}“?`)) {
        return;
    }

    setStatus("Mažu kontakt...");

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
                action: "delete",
                id
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.ok) {
            throw new Error(result.error || "Mazání se nezdařilo.");
        }

        await loadData();
    } catch (error) {
        console.error(error);
        setStatus(`Chyba při mazání: ${error.message}`, true);
    }
}

// ------------------------------------------------------------
// Stavová zpráva
// ------------------------------------------------------------

function setStatus(message, isError = false) {
    const status = document.getElementById("status");

    status.textContent = message;
    status.style.color = isError ? "#b91c1c" : "#6b7280";
}

// ------------------------------------------------------------
// Události
// ------------------------------------------------------------

document.getElementById("newButton").addEventListener("click", () => {
    openForm();
});

document.getElementById("closeButton").addEventListener("click", closeForm);
document.getElementById("cancelButton").addEventListener("click", closeForm);

document.getElementById("reloadButton").addEventListener("click", loadData);

document.getElementById("searchInput").addEventListener("input", render);

document.getElementById("contactForm").addEventListener("submit", saveContact);

document.getElementById("photoFile").addEventListener("change", event => {
    const file = event.target.files[0];
    const preview = document.getElementById("photoPreview");

    if (!file) {
        preview.classList.add("hidden");
        preview.removeAttribute("src");
        return;
    }

    preview.src = URL.createObjectURL(file);
    preview.classList.remove("hidden");
});

document.getElementById("modal").addEventListener("click", event => {
    if (event.target.id === "modal") {
        closeForm();
    }
});

// ------------------------------------------------------------
// Start aplikace
// ------------------------------------------------------------

loadData();
