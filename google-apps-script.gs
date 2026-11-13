const RESPONSE_HEADERS = [
  "Data e hora",
  "Nome",
  "E-mail",
  "Telefone",
  "Presença",
  "Número de pessoas"
];

function doPost(event) {
  const parameters = event && event.parameter ? event.parameter : {};
  const name = cleanCell(parameters.name);
  const email = cleanCell(parameters.email);
  const phoneInput = String(parameters.phone || "").trim();
  const phone = cleanCell(phoneInput);
  const attendance = parameters.attendance;
  const guestCount = Number(parameters.guestCount);

  if (!name || name.length > 100) {
    return jsonResponse({ ok: false, error: "Nome inválido." });
  }
  if (!email && !phone) {
    return jsonResponse({ ok: false, error: "Informe um e-mail ou telefone." });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ ok: false, error: "E-mail inválido." });
  }
  const phoneDigits = phoneInput.replace(/\D/g, "");
  if (phoneInput && (
    !/^[+\d().\s-]+$/.test(phoneInput) ||
    phoneDigits.length < 8 ||
    phoneDigits.length > 15
  )) {
    return jsonResponse({ ok: false, error: "Telefone inválido." });
  }
  if (attendance !== "Sim" && attendance !== "Não") {
    return jsonResponse({ ok: false, error: "Opção de presença inválida." });
  }
  const validGuestCount = attendance === "Sim"
    ? Number.isInteger(guestCount) && guestCount >= 1 && guestCount <= 5
    : guestCount === 0;
  if (!validGuestCount) {
    return jsonResponse({ ok: false, error: "Número de pessoas inválido." });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    if (!spreadsheet) throw new Error("Vincule este script a uma planilha Google.");

    const sheet = spreadsheet.getSheets()[0] || spreadsheet.insertSheet("Respostas");
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, RESPONSE_HEADERS.length).setValues([RESPONSE_HEADERS]);
      sheet.setFrozenRows(1);
    } else {
      const existingHeaders = sheet
        .getRange(1, 1, 1, sheet.getLastColumn())
        .getDisplayValues()[0];
      const emailColumn = existingHeaders.indexOf("E-mail") + 1;
      const phoneColumn = existingHeaders.indexOf("Telefone") + 1;

      if (emailColumn && !phoneColumn) {
        sheet.insertColumnAfter(emailColumn);
        sheet.getRange(1, emailColumn + 1).setValue("Telefone");
      }
    }

    sheet.appendRow([
      new Date(),
      name,
      email,
      phone,
      attendance,
      guestCount
    ]);
    return jsonResponse({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function cleanCell(value) {
  const text = String(value || "").trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
