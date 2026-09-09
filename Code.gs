const SHEET_NAME = "Adresář";
const DRIVE_FOLDER_NAME = "Adresář fotografie";

const HEADERS = [
    "ID",
    "Jméno",
    "Příjmení",
    "Telefon",
    "Telefon 2",
    "E-mail",
    "Kód",
    "PSČ",
    "Město",
    "Adresa",
    "Fotografie",
    "Poznámka"
];

/**
 * Vytvoří list a hlavičku, pokud ještě neexistují.
 */
function setup() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
        sheet = spreadsheet.insertSheet(SHEET_NAME);
    }

    if (sheet.getLastRow() === 0) {
        sheet.appendRow(HEADERS);
    }

    return sheet;
}

/**
 * GET požadavek – načtení kontaktů.
 */
function doGet(e) {
    setup();

    if (e.parameter.action === "list") {
        return jsonResponse(listContacts());
    }

    return jsonResponse({
        ok: true,
        message: "Adresář API běží."
    });
}

/**
 * POST požadavek – vytvoření, úprava nebo odstranění kontaktu.
 */
function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents || "{}");
        const sheet = setup();

        switch (data.action) {
            case "create":
                return jsonResponse({
                    ok: true,
                    id: createContact(sheet, data)
                });

            case "update":
                return jsonResponse({
                    ok: true,
                    id: updateContact(sheet, data)
                });

            case "delete":
                return jsonResponse({
                    ok: true,
                    id: deleteContact(sheet, data.id)
                });

            default:
                return jsonResponse({
                    ok: false,
                    error: "Neznámá akce."
                });
        }
    } catch (error) {
        return jsonResponse({
            ok: false,
            error: String(error)
        });
    }
}

/**
 * Vrátí všechny kontakty.
 */
function listContacts() {
    const sheet = setup();
    const values = sheet.getDataRange().getValues();

    if (values.length < 2) {
        return [];
    }

    return values
        .slice(1)
        .filter(row => row[0] !== "")
        .map(rowToObject);
}

/**
 * Převod řádku ze Sheets na objekt pro aplikaci.
 */
function rowToObject(row) {
    return {
        id: row[0],
        name: row[1],
        surname: row[2],
        phone: row[3],
        phone2: row[4],
        email: row[5],
        code: row[6],
        zip: row[7],
        city: row[8],
        address: row[9],
        photo: row[10],
        note: row[11]
    };
}

/**
 * Najde nebo vytvoří složku pro fotografie.
 */
function getPhotoFolder() {
    const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);

    if (folders.hasNext()) {
        return folders.next();
    }

    return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

/**
 * Nahraje fotografii na Google Drive
 * a vrátí URL vhodné pro zobrazení v aplikaci.
 */
function uploadPhoto(data) {
    if (!data.photoData) {
        return "";
    }

    const bytes = Utilities.base64Decode(data.photoData);

    const blob = Utilities.newBlob(
        bytes,
        data.photoType || "image/jpeg",
        data.photoName || "foto.jpg"
    );

    const file = getPhotoFolder().createFile(blob);

    file.setSharing(
        DriveApp.Access.ANYONE_WITH_LINK,
        DriveApp.Permission.VIEW
    );

    return `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w600`;
}

/**
 * Vytvoří nový kontakt.
 */
function createContact(sheet, data) {
    const id = Utilities.getUuid();
    const photoUrl = uploadPhoto(data);

    sheet.appendRow([
        id,
        data.name || "",
        data.surname || "",
        data.phone || "",
        data.phone2 || "",
        data.email || "",
        data.code || "",
        data.zip || "",
        data.city || "",
        data.address || "",
        photoUrl,
        data.note || ""
    ]);

    return id;
}

/**
 * Upraví existující kontakt.
 */
function updateContact(sheet, data) {
    const values = sheet.getDataRange().getValues();

    const rowIndex = values.findIndex(
        (row, index) =>
            index > 0 &&
            String(row[0]) === String(data.id)
    );

    if (rowIndex < 1) {
        throw new Error("Kontakt nebyl nalezen.");
    }

    const oldPhotoUrl = values[rowIndex][10];

    const photoUrl = data.photoData
        ? uploadPhoto(data)
        : oldPhotoUrl;

    sheet
        .getRange(rowIndex + 1, 1, 1, HEADERS.length)
        .setValues([[
            data.id,
            data.name || "",
            data.surname || "",
            data.phone || "",
            data.phone2 || "",
            data.email || "",
            data.code || "",
            data.zip || "",
            data.city || "",
            data.address || "",
            photoUrl,
            data.note || ""
        ]]);

    return data.id;
}

/**
 * Odstraní kontakt.
 */
function deleteContact(sheet, id) {
    const values = sheet.getDataRange().getValues();

    const rowIndex = values.findIndex(
        (row, index) =>
            index > 0 &&
            String(row[0]) === String(id)
    );

    if (rowIndex < 1) {
        throw new Error("Kontakt nebyl nalezen.");
    }

    sheet.deleteRow(rowIndex + 1);

    return id;
}

/**
 * Vrátí JSON odpověď.
 */
function jsonResponse(data) {
    return ContentService
        .createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}
