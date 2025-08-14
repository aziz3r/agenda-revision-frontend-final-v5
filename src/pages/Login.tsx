import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { saveAuth } from "../auth";
import { useTranslation } from "react-i18next";
import "./styles/Login.css";

export default function Login() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !pwd) {
      setError(t("login.fillBoth"));
      return;
    }
    try {
      setBusy(true);
      // Strapi Users & Permissions: /api/auth/local
      const { data } = await api.post("/api/auth/local", {
        identifier: email,
        password: pwd
      });
      // data = { jwt, user: { email, ... } }
      saveAuth({ jwt: data.jwt, user: { id: data.user.id, email: data.user.email, username: data.user.username } });
      nav("/"); // vers Dashboard
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || t("login.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="card login" onSubmit={submit}>
        <div className="card-header"><strong>{t("login.title")}</strong></div>
        <div className="card-body">
          {error && <p className="form-error">{error}</p>}
          <div className="fg">
            <label>{t("login.email")}</label>
            <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="fg">
            <label>{t("login.password")}</label>
            <input className="input" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} required />
          </div>
          <div className="actions">
            <button className="btn brand" type="submit" disabled={busy}>
              {busy ? "…" : t("login.signIn")}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
