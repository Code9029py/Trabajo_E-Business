import { useState } from "react";
import { ADMIN_LOGIN_CONFIG } from "../config/apiConfig";

const AUTH_KEY = "vtech_admin_auth";

export function haySesionAdmin() {
  return typeof window !== "undefined" && window.localStorage.getItem(AUTH_KEY) === "true";
}

export function guardarSesionAdmin() {
  window.localStorage.setItem(AUTH_KEY, "true");
}

export function cerrarSesionAdmin() {
  window.localStorage.removeItem(AUTH_KEY);
}

export default function LoginPage({ onLogin, onBack }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const adminLoginConfigurado = Boolean(ADMIN_LOGIN_CONFIG.user && ADMIN_LOGIN_CONFIG.password);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!adminLoginConfigurado) {
      setError("El acceso admin no está configurado para este entorno.");
      return;
    }

    if (usuario === ADMIN_LOGIN_CONFIG.user && password === ADMIN_LOGIN_CONFIG.password) {
      guardarSesionAdmin();
      setError("");
      onLogin();
      return;
    }

    setError("Usuario o contraseña incorrectos.");
  };

  return (
    <main className="page admin-page">
      <section className="contact-form-wrapper admin-login">
        <h1 className="contact-hero__title">Acceso empresa</h1>
        <p className="contact-hero__subtitle">Ingresá para administrar los productos del catálogo.</p>
        <p className="tag-selector__helper">
          Control básico de acceso visual. La protección administrativa mínima está en Apps Script
          mediante token.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="contact-form__group">
            <label className="contact-form__label" htmlFor="adminUser">
              Usuario
            </label>
            <input
              className="contact-form__input"
              id="adminUser"
              name="usuario"
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
              autoComplete="username"
            />
          </div>
          <div className="contact-form__group">
            <label className="contact-form__label" htmlFor="adminPassword">
              Contraseña
            </label>
            <input
              className="contact-form__input"
              id="adminPassword"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="contact-form__success admin-login__error">{error}</div>}

          <button className="contact-form__submit" type="submit">
            Ingresar
          </button>
        </form>

        <button className="footer__link admin-login__back" type="button" onClick={onBack}>
          Volver al sitio público
        </button>
      </section>
    </main>
  );
}
