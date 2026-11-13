(() => {
  const envelope = document.querySelector(".envelope");
  const envelopeScreen = document.getElementById("envelopeScreen");
  const invitationContent = document.getElementById("invitationContent");
  const openButtons = [
    document.getElementById("openInvite"),
    document.getElementById("openInviteLink")
  ];

  const openInvitation = () => {
    if (envelopeScreen.classList.contains("is-opening")) return;
    envelope.classList.add("is-open");
    envelopeScreen.classList.add("is-opening");
    window.setTimeout(() => {
      envelopeScreen.hidden = true;
      invitationContent.classList.add("is-visible");
      invitationContent.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "";
      document.getElementById("inicio").focus({ preventScroll: true });
    }, 760);
  };

  document.body.style.overflow = "hidden";
  openButtons.forEach((button) => button.addEventListener("click", openInvitation));

  const form = document.getElementById("rsvpForm");
  const status = document.getElementById("formStatus");
  const emailField = document.getElementById("guestEmail");
  const phoneField = document.getElementById("guestPhone");
  const attendanceField = document.getElementById("attendance");
  const guestCount = document.getElementById("guestCount");
  const guestCountField = document.getElementById("guestCountField");
  const endpoint = window.INVITATION_CONFIG?.googleSheetsEndpoint?.trim();

  const updateGuestCountState = () => {
    const unavailable = attendanceField.value === "Não";
    guestCountField.hidden = unavailable;
    guestCount.disabled = unavailable;
    guestCount.required = !unavailable;
  };
  attendanceField.addEventListener("change", updateGuestCountState);

  const formatBrazilianPhone = (value) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (!digits) return "";
    if (digits.length <= 2) return `(${digits}`;

    const subscriber = digits.slice(2);
    const splitAt = digits.length > 10 ? 5 : 4;
    const firstPart = subscriber.slice(0, splitAt);
    const secondPart = subscriber.slice(splitAt);
    return `(${digits.slice(0, 2)}) ${firstPart}${secondPart ? `-${secondPart}` : ""}`;
  };

  const updateContactValidity = () => {
    const email = emailField.value.trim();
    const phone = phoneField.value.trim();
    const phoneDigits = phone.replace(/\D/g, "");
    const hasContact = Boolean(email || phone);
    const invalidPhone = phone && (phoneDigits.length < 10 || phoneDigits.length > 11);

    emailField.setCustomValidity(hasContact ? "" : "Informe um e-mail ou telefone.");
    phoneField.setCustomValidity(
      invalidPhone
        ? "Informe um telefone válido com DDD."
        : hasContact
          ? ""
          : "Informe um e-mail ou telefone."
    );
  };

  phoneField.addEventListener("input", () => {
    const value = phoneField.value;
    const cursor = phoneField.selectionStart ?? value.length;
    const digitsBeforeCursor = value.slice(0, cursor).replace(/\D/g, "").length;
    const formatted = formatBrazilianPhone(value);
    phoneField.value = formatted;

    let cursorPosition = 0;
    let digitsCounted = 0;
    while (cursorPosition < formatted.length && digitsCounted < digitsBeforeCursor) {
      if (/\d/.test(formatted[cursorPosition])) digitsCounted += 1;
      cursorPosition += 1;
    }
    while (cursorPosition < formatted.length && !/\d/.test(formatted[cursorPosition])) {
      cursorPosition += 1;
    }
    phoneField.setSelectionRange(cursorPosition, cursorPosition);
    updateContactValidity();
  });

  emailField.addEventListener("input", updateContactValidity);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.classList.remove("is-error");

    updateContactValidity();
    if (!form.reportValidity()) return;

    const formData = new FormData(form);
    const response = {
      name: String(formData.get("name")).trim(),
      email: String(formData.get("email")).trim(),
      phone: String(formData.get("phone")).trim(),
      attendance: String(formData.get("attendance")),
      guestCount: String(formData.get("attendance") === "Sim" ? formData.get("guestCount") : 0),
      submittedAt: new Date().toISOString()
    };

    if (!endpoint) {
      status.textContent = "O convite ainda não está conectado à planilha. Sua resposta não foi enviada.";
      status.classList.add("is-error");
      return;
    }

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = "Enviando...";
    status.textContent = "";

    try {
      // Apps Script accepts this simple form request without a browser CORS preflight.
      await fetch(endpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: new URLSearchParams(response).toString()
      });

      status.textContent = "Solicitação enviada. Como o Google não confirma o recebimento ao site, fale com a organização se precisar validar sua resposta.";
      form.reset();
      updateGuestCountState();
      updateContactValidity();
    } catch (error) {
      status.textContent = "Não foi possível enviar agora. Confira sua conexão e tente novamente.";
      status.classList.add("is-error");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Enviar confirmação <span aria-hidden="true">↗</span>';
    }
  });
})();
