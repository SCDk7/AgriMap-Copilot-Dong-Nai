(() => {
  const backdrop = document.getElementById("authBackdrop");
  const dialog = backdrop.querySelector(".auth-dialog");
  const title = document.getElementById("authTitle");
  const tabs = document.getElementById("authTabs");
  const panels = Array.from(dialog.querySelectorAll("[data-auth-panel]"));
  const loginButton = document.getElementById("loginButton");
  const closeButton = document.getElementById("authClose");
  const loginForm = document.getElementById("authLoginForm");
  const registerForm = document.getElementById("authRegisterForm");
  const recoveryForm = document.getElementById("authRecoveryForm");
  let currentView = "login";
  let returnFocus = null;

  const translate = (key) => window.ocopLocale.t(key);
  const isPhoneValid = (value) => /^\+?[\d\s().-]{8,20}$/.test(value.trim());

  function setStatus(id, key) {
    document.getElementById(id).textContent = key ? translate(key) : "";
  }

  function updatePasswordToggleLabels() {
    dialog.querySelectorAll("[data-auth-toggle]").forEach((button) => {
      const input = document.getElementById(button.dataset.authToggle);
      button.setAttribute("aria-label", translate(input.type === "password" ? "auth.showPassword" : "auth.hidePassword"));
    });
  }

  function setView(view, focus = true) {
    currentView = view;
    tabs.hidden = view === "forgot";
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.authPanel !== view;
    });
    dialog.querySelectorAll("[data-auth-tab]").forEach((button) => {
      const selected = button.dataset.authTab === view;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    title.textContent = translate(view === "forgot" ? "auth.recoveryTitle" : "auth.title");
    if (focus) {
      const firstInput = dialog.querySelector(`[data-auth-panel="${view}"] input`);
      if (firstInput) firstInput.focus();
    }
  }

  function openDialog() {
    returnFocus = document.activeElement;
    backdrop.hidden = false;
    document.body.classList.add("auth-modal-open");
    setView("login");
  }

  function closeDialog() {
    if (backdrop.hidden) return;
    backdrop.hidden = true;
    document.body.classList.remove("auth-modal-open");
    [loginForm, registerForm, recoveryForm].forEach((form) => form.reset());
    ["authLoginStatus", "authRegisterStatus", "authRecoveryStatus"].forEach((id) => setStatus(id, ""));
    dialog.querySelectorAll("[data-auth-toggle]").forEach((button) => {
      document.getElementById(button.dataset.authToggle).type = "password";
    });
    updatePasswordToggleLabels();
    setView("login", false);
    if (returnFocus && typeof returnFocus.focus === "function") returnFocus.focus();
  }

  loginButton.addEventListener("click", openDialog);
  closeButton.addEventListener("click", closeDialog);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeDialog();
  });

  dialog.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-auth-tab]");
    if (tab) {
      setView(tab.dataset.authTab);
      return;
    }
    const tabLink = event.target.closest("[data-auth-tab-link]");
    if (tabLink) {
      setView(tabLink.dataset.authTabLink);
      return;
    }
    const toggle = event.target.closest("[data-auth-toggle]");
    if (toggle) {
      const input = document.getElementById(toggle.dataset.authToggle);
      input.type = input.type === "password" ? "text" : "password";
      updatePasswordToggleLabels();
    }
  });

  document.getElementById("authForgotLink").addEventListener("click", () => setView("forgot"));
  document.getElementById("authSendCode").addEventListener("click", () => {
    const phone = document.getElementById("authRecoveryPhone").value;
    if (!isPhoneValid(phone)) {
      setStatus("authRecoveryStatus", "auth.invalidPhone");
      document.getElementById("authRecoveryPhone").focus();
      return;
    }
    setStatus("authRecoveryStatus", "auth.smsUnavailable");
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    setStatus("authLoginStatus", "auth.loginUnavailable");
  });

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setStatus("authRegisterStatus", "");
    if (!registerForm.reportValidity()) return;
    if (!isPhoneValid(document.getElementById("authPhone").value)) {
      setStatus("authRegisterStatus", "auth.invalidPhone");
      document.getElementById("authPhone").focus();
      return;
    }
    if (document.getElementById("authRegisterPassword").value !== document.getElementById("authConfirmPassword").value) {
      setStatus("authRegisterStatus", "auth.passwordMismatch");
      document.getElementById("authConfirmPassword").focus();
      return;
    }
    setStatus("authRegisterStatus", "auth.registerUnavailable");
  });

  recoveryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setStatus("authRecoveryStatus", "");
    if (!recoveryForm.reportValidity()) return;
    if (!isPhoneValid(document.getElementById("authRecoveryPhone").value)) {
      setStatus("authRecoveryStatus", "auth.invalidPhone");
      document.getElementById("authRecoveryPhone").focus();
      return;
    }
    if (document.getElementById("authNewPassword").value !== document.getElementById("authNewPasswordConfirm").value) {
      setStatus("authRecoveryStatus", "auth.passwordMismatch");
      document.getElementById("authNewPasswordConfirm").focus();
      return;
    }
    setStatus("authRecoveryStatus", "auth.resetUnavailable");
  });

  document.addEventListener("keydown", (event) => {
    if (backdrop.hidden) return;
    if (event.key === "Escape") {
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(dialog.querySelectorAll("button:not([disabled]), input:not([disabled])"))
      .filter((element) => !element.closest("[hidden]"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener("ocop:languagechange", () => {
    title.textContent = translate(currentView === "forgot" ? "auth.recoveryTitle" : "auth.title");
    updatePasswordToggleLabels();
  });
})();
