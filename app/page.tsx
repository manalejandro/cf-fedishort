"use client";

import { useState, useEffect, useRef } from "react";

type Locale = "en" | "es";

const dict = {
  en: {
    title: "FediShort",
    tagline: "Short links, federated.",
    heroTitle: "Short Links for the Fediverse",
    heroSub: "FediShort lets you create shortened URLs that federate through ActivityPub. Share links with your followers across the fediverse — your short links, your rules.",
    cta: "Get Started",
    learnMore: "Learn More",
    howItWorks: "How It Works",
    step1: "Create an Account",
    step1Desc: "Sign up with a username and start sharing links across the fediverse.",
    step2: "Shorten a Link",
    step2Desc: "Paste any URL and get a short link that you can share anywhere.",
    step3: "Federate",
    step3Desc: "Your short link is shared with your followers via ActivityPub automatically.",
    features: "Features",
    feature1: "ActivityPub Federation",
    feature1Desc: "Every short link is an ActivityPub Note that federates to your followers.",
    feature2: "Custom Slugs",
    feature2Desc: "Choose your own short link names for easy reference.",
    feature3: "Open Source",
    feature3Desc: "Built with Next.js, Cloudflare, and ActivityPub. Fully open source.",
    login: "Sign In",
    register: "Sign Up",
    logout: "Sign Out",
    myLinks: "My Links",
    newLink: "New Link",
    url: "URL",
    urlPlaceholder: "https://example.com/very/long/url",
    slug: "Custom Slug",
    slugPlaceholder: "my-link",
    slugHelp: "Optional. Leave blank for auto-generated.",
    title_: "Title",
    titlePlaceholder: "My Awesome Link",
    createLink: "Create Short Link",
    createDesc: "Paste a long URL and get a federated short link.",
    submit: "Create Link",
    success: "Link created!",
    copy: "Copy",
    copied: "Copied!",
    noLinks: "No links yet. Create your first one!",
    clicks: "clicks",
    yourLinks: "Your Links",
    shortenAnother: "Shorten another",
    shortUrl: "Short URL",
    poweredBy: "Powered by Next.js, Cloudflare & ActivityPub",
    source: "Source Code",
    language: "Language",
    username: "Username",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    loginTitle: "Welcome Back",
    registerTitle: "Join FediShort",
    loginBtn: "Sign In",
    registerBtn: "Create Account",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    usernamePlaceholder: "yourusername",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "••••••••",
    search: "Search",
    notifications: "Notifications",
    loggingIn: "Signing in...",
    registering: "Creating account...",
  },
  es: {
    title: "FediShort",
    tagline: "Enlaces cortos, federados.",
    heroTitle: "Enlaces Cortos para el Fediverso",
    heroSub: "FediShort te permite crear URLs acortadas que se federan a través de ActivityPub. Comparte enlaces con tus seguidores en todo el fediverso — tus enlaces cortos, tus reglas.",
    cta: "Comenzar",
    learnMore: "Más Información",
    howItWorks: "Cómo Funciona",
    step1: "Crea una Cuenta",
    step1Desc: "Regístrate con un usuario y comienza a compartir enlaces en el fediverso.",
    step2: "Acorta un Enlace",
    step2Desc: "Pega cualquier URL y obtén un enlace corto que puedes compartir en cualquier lugar.",
    step3: "Federa",
    step3Desc: "Tu enlace corto se comparte con tus seguidores automáticamente vía ActivityPub.",
    features: "Características",
    feature1: "Federación ActivityPub",
    feature1Desc: "Cada enlace corto es una Nota ActivityPub que se federa a tus seguidores.",
    feature2: "Slugs Personalizados",
    feature2Desc: "Elige tus propios nombres para enlaces cortos y fáciles de recordar.",
    feature3: "Código Abierto",
    feature3Desc: "Construido con Next.js, Cloudflare y ActivityPub. Totalmente open source.",
    login: "Iniciar Sesión",
    register: "Registrarse",
    logout: "Cerrar Sesión",
    myLinks: "Mis Enlaces",
    newLink: "Nuevo Enlace",
    url: "URL",
    urlPlaceholder: "https://ejemplo.com/enlace/muy/largo",
    slug: "Slug Personalizado",
    slugPlaceholder: "mi-enlace",
    slugHelp: "Opcional. Deja en blanco para autogenerado.",
    title_: "Título",
    titlePlaceholder: "Mi Enlace Increíble",
    createLink: "Crear Enlace Corto",
    createDesc: "Pega una URL larga y obtén un enlace corto federado.",
    submit: "Crear Enlace",
    success: "¡Enlace creado!",
    copy: "Copiar",
    copied: "¡Copiado!",
    noLinks: "Aún no hay enlaces. ¡Crea el primero!",
    clicks: "clics",
    yourLinks: "Tus Enlaces",
    shortenAnother: "Acortar otro",
    shortUrl: "URL Corta",
    poweredBy: "Desarrollado con Next.js, Cloudflare y ActivityPub",
    source: "Código Fuente",
    language: "Idioma",
    username: "Usuario",
    email: "Correo electrónico",
    password: "Contraseña",
    confirmPassword: "Confirmar Contraseña",
    loginTitle: "Bienvenido de Nuevo",
    registerTitle: "Únete a FediShort",
    loginBtn: "Iniciar Sesión",
    registerBtn: "Crear Cuenta",
    noAccount: "¿No tienes cuenta?",
    haveAccount: "¿Ya tienes cuenta?",
    usernamePlaceholder: "tuusuario",
    emailPlaceholder: "tu@ejemplo.com",
    passwordPlaceholder: "••••••••",
    search: "Buscar",
    notifications: "Notificaciones",
    loggingIn: "Iniciando sesión...",
    registering: "Creando cuenta...",
  },
};

type D = typeof dict.en;

interface Link {
  id: string;
  slug: string;
  url: string;
  shortUrl: string;
  title: string | null;
  description: string | null;
  clicks: number;
  published: string;
}

function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [actorId, setActorId] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("fs_token");
    const u = localStorage.getItem("fs_username");
    const a = localStorage.getItem("fs_actorId");
    if (t && u) { setToken(t); setUsername(u); setActorId(a); }
  }, []);

  const login = (t: string, u: string, a: string) => {
    localStorage.setItem("fs_token", t);
    localStorage.setItem("fs_username", u);
    localStorage.setItem("fs_actorId", a);
    setToken(t); setUsername(u); setActorId(a);
  };

  const logout = () => {
    localStorage.removeItem("fs_token");
    localStorage.removeItem("fs_username");
    localStorage.removeItem("fs_actorId");
    setToken(null); setUsername(null); setActorId(null);
  };

  return { token, username, actorId, login, logout };
}

function Toggle({ locale, setLocale }: { locale: Locale; setLocale: (l: Locale) => void }) {
  return (
    <button
      onClick={() => setLocale(locale === "en" ? "es" : "en")}
      className="px-3 py-1.5 rounded-lg bg-card border border-border text-sm font-medium text-muted hover:text-foreground transition-colors"
    >
      {locale === "en" ? "ES" : "EN"}
    </button>
  );
}

function Nav({ d, locale, setLocale, token, username, logout, ctaKey, onRegistered }: { d: D; locale: Locale; setLocale: (l: Locale) => void; token: string | null; username: string | null; logout: () => void; ctaKey?: number; onRegistered?: () => void }) {
  const [showAuth, setShowAuth] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    if (ctaKey && ctaKey > 0) { setShowAuth(true); setShowRegister(true); setUsernameInput(""); setEmail(""); setPassword(""); setConfirmPassword(""); setAuthError(""); }
  }, [ctaKey]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let widgetId: string | undefined;
    if (showAuth && showRegister && turnstileRef.current && !widgetId) {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const ts = (window as unknown as { turnstile?: { render: (el: string | HTMLElement, opts: Record<string, unknown>) => string } }).turnstile;
        if (ts && turnstileRef.current) {
          widgetId = ts.render(turnstileRef.current, {
            sitekey: "0x4AAAAAADzhx7-iwaum1vmJ",
            callback: (token: string) => setTurnstileToken(token),
          });
        }
      };
      document.head.appendChild(script);
    }
    return () => {
      if (widgetId) {
        const ts = (window as unknown as { turnstile?: { remove: (id: string) => void } }).turnstile;
        ts?.remove(widgetId);
      }
    };
  }, [showAuth, showRegister]);

  const handleAuth = async () => {
    setLoading(true); setAuthError("");
    try {
      const endpoint = showRegister ? "/api/auth/register" : "/api/auth/login";
      const body: Record<string, string> = { username: usernameInput, password };
      if (showRegister) { body.email = email; body.confirmPassword = confirmPassword; body.turnstileToken = turnstileToken; }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      if (!res.ok) { setAuthError(data.error || "Error"); return; }
      if (showRegister && data.verified === false) {
        setShowAuth(false);
        setUsernameInput("");
        setPassword("");
        setConfirmPassword("");
        setEmail("");
        onRegistered?.();
        return;
      }
      localStorage.setItem("fs_token", data.token);
      localStorage.setItem("fs_username", data.username);
      localStorage.setItem("fs_actorId", data.actorId);
      window.location.reload();
    } catch { setAuthError("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform">
              F
            </div>
            <span className="font-semibold text-lg">{d.title}</span>
          </a>

          <div className="flex items-center gap-3">
            <Toggle locale={locale} setLocale={setLocale} />
            {token ? (
              <>
                <a href="/search" className="text-sm text-muted hover:text-foreground transition-colors">{d.search}</a>
                <a href="/notifications" className="text-sm text-muted hover:text-foreground transition-colors relative">
                  {d.notifications}
                </a>
                <a href={`/users/${username}`} className="text-sm text-muted hover:text-foreground transition-colors">{username}</a>
                <a href="/links" className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors">{d.myLinks}</a>
                <button onClick={logout} className="text-sm text-muted hover:text-error transition-colors">{d.logout}</button>
              </>
            ) : (
              <>
                <button onClick={() => { setShowAuth(true); setShowRegister(false); }} className="text-sm text-muted hover:text-foreground transition-colors">{d.login}</button>
                <button onClick={() => { setShowAuth(true); setShowRegister(true); }} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors">{d.register}</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {showAuth && !token && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setShowAuth(false); setUsernameInput(""); setEmail(""); setPassword(""); setConfirmPassword(""); setAuthError(""); }}>
          <div className="bg-card border border-border rounded-2xl p-8 w-full max-w-md mx-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6">{showRegister ? d.registerTitle : d.loginTitle}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted mb-1.5 block">{d.username}</label>
                <input
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder={d.usernamePlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
              {showRegister && (
                <div>
                  <label className="text-sm text-muted mb-1.5 block">{d.email}</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={d.emailPlaceholder}
                    type="email"
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                </div>
              )}
              <div>
                <label className="text-sm text-muted mb-1.5 block">{d.password}</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={d.passwordPlaceholder}
                  type="password"
                  className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                />
              </div>
              {showRegister && (
                <div>
                  <label className="text-sm text-muted mb-1.5 block">{d.confirmPassword}</label>
                  <input
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={d.passwordPlaceholder}
                    type="password"
                    className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  />
                </div>
              )}
              {showRegister && <div ref={turnstileRef} className="flex justify-center my-3" />}
              {authError && <p className="text-error text-sm">{authError}</p>}
              <button
                onClick={handleAuth}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {loading ? (showRegister ? d.registering : d.loggingIn) : (showRegister ? d.registerBtn : d.loginBtn)}
              </button>
              <p className="text-center text-sm text-muted">
                {showRegister ? d.haveAccount : d.noAccount}{" "}
                <button onClick={() => setShowRegister(!showRegister)} className="text-primary hover:underline">
                  {showRegister ? d.login : d.register}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("en");
  const [ctaKey, setCtaKey] = useState(0);
  const [showLinks, setShowLinks] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);
  const [newUrl, setNewUrl] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [successUrl, setSuccessUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const d = dict[locale];
  const isAuth = typeof window !== "undefined" && localStorage.getItem("fs_token");

  const [justRegistered, setJustRegistered] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{ ok?: boolean; reason?: string }>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("verified");
    if (v === "true") {
      setVerificationStatus({ ok: true });
      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    } else if (v === "false") {
      setVerificationStatus({ ok: false, reason: params.get("reason") ?? undefined });
      const url = new URL(window.location.href);
      url.searchParams.delete("verified");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  useEffect(() => {
    if (isAuth) {
      fetch("/api/links", {
        headers: { Authorization: `Bearer ${localStorage.getItem("fs_token")}` },
      }).then((r) => r.json()).then((data) => {
        if (Array.isArray(data)) setLinks(data);
      }).catch(() => {});
    }
  }, [isAuth]);

  const handleCreate = async () => {
    if (!newUrl) return;
    setCreating(true); setError(""); setSuccessUrl("");
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fs_token")}`,
        },
        body: JSON.stringify({
          url: newUrl,
          slug: newSlug || undefined,
          title: newTitle || undefined,
        }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json();
      if (!res.ok) { setError(data.error || "Error"); return; }
      setSuccessUrl(data.shortUrl);
      setNewUrl(""); setNewSlug(""); setNewTitle("");
      setLinks((prev) => [data, ...prev]);
    } catch { setError("Network error"); }
    finally { setCreating(false); }
  };

  const handleDelete = async (linkId: string) => {
    setDeleting(linkId);
    try {
      const res = await fetch(`/api/links/${linkId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("fs_token")}` },
      });
      if (!res.ok) return;
      setLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const token = typeof window !== "undefined" ? localStorage.getItem("fs_token") : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Nav d={d} locale={locale} setLocale={setLocale} token={token} username={typeof window !== "undefined" ? localStorage.getItem("fs_username") : null} logout={() => { localStorage.clear(); window.location.reload(); }} ctaKey={ctaKey} onRegistered={() => setJustRegistered(true)} />

      <main className="flex-1">
        {justRegistered && (
          <div className="max-w-lg mx-auto mt-6 px-4">
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
              <p className="text-primary font-semibold">Account created!</p>
              <p className="text-sm text-muted mt-1">Check your email for a verification link.</p>
              <button onClick={() => setJustRegistered(false)} className="mt-2 text-xs text-muted hover:text-foreground underline">Dismiss</button>
            </div>
          </div>
        )}
        {verificationStatus.ok && (
          <div className="max-w-lg mx-auto mt-6 px-4">
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-center">
              <p className="text-green-500 font-semibold">Email verified!</p>
              <p className="text-sm text-muted mt-1">Your account is now active. You can sign in.</p>
              <button onClick={() => setVerificationStatus({})} className="mt-2 text-xs text-muted hover:text-foreground underline">Dismiss</button>
            </div>
          </div>
        )}
        {verificationStatus.ok === false && (
          <div className="max-w-lg mx-auto mt-6 px-4">
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-center">
              <p className="text-red-500 font-semibold">Verification failed</p>
              <p className="text-sm text-muted mt-1">
                {verificationStatus.reason === "missing-token" ? "No verification token provided." :
                 verificationStatus.reason === "invalid-token" ? "Invalid or expired verification link." :
                 "Could not verify your email. The link may be expired."}
              </p>
              <button onClick={() => setVerificationStatus({})} className="mt-2 text-xs text-muted hover:text-foreground underline">Dismiss</button>
            </div>
          </div>
        )}
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-6xl mx-auto px-4 pt-24 pb-32 text-center relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              ActivityPub + Cloudflare
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white via-white to-primary bg-clip-text text-transparent">
              {d.heroTitle}
            </h1>
            <p className="text-lg sm:text-xl text-muted max-w-2xl mx-auto mb-10 leading-relaxed">
              {d.heroSub}
            </p>
            <div className="flex items-center justify-center gap-4">
              {token ? (
                <a
                  href="#create"
                  onClick={(e) => { e.preventDefault(); document.getElementById("create")?.scrollIntoView({ behavior: "smooth" }); }}
                  className="px-8 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-all hover:scale-105"
                >
                  {d.newLink}
                </a>
              ) : (
                <button
                  onClick={() => setCtaKey(k => k + 1)}
                  className="px-8 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-all hover:scale-105"
                >
                  {d.cta}
                </button>
              )}
              <a
                href="#how-it-works"
                onClick={(e) => { e.preventDefault(); document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }); }}
                className="px-8 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-card transition-colors"
              >
                {d.learnMore}
              </a>
            </div>
          </div>
        </section>

        {/* Create Link Section */}
        {token && (
          <section id="create" className="max-w-2xl mx-auto px-4 pb-24">
            <div className="bg-card border border-border rounded-2xl p-8 animate-glow">
              <h2 className="text-2xl font-bold mb-2">{d.createLink}</h2>
              <p className="text-muted text-sm mb-6">{d.createDesc}</p>

              {successUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20">
                    <svg className="w-5 h-5 text-success shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <div>
                      <p className="font-medium text-success">{d.success}</p>
                      <p className="text-sm text-foreground font-mono">{successUrl}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { navigator.clipboard.writeText(successUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-colors"
                    >
                      {copied ? d.copied : d.copy}
                    </button>
                    <button
                      onClick={() => { setSuccessUrl(""); setNewUrl(""); setNewSlug(""); setNewTitle(""); }}
                      className="flex-1 py-2.5 rounded-xl border border-border text-foreground font-medium hover:bg-card-hover transition-colors"
                    >
                      {d.shortenAnother}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted mb-1.5 block">{d.url} *</label>
                    <input
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder={d.urlPlaceholder}
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted mb-1.5 block">{d.title_}</label>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={d.titlePlaceholder}
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted mb-1.5 block">{d.slug}</label>
                    <input
                      value={newSlug}
                      onChange={(e) => setNewSlug(e.target.value)}
                      placeholder={d.slugPlaceholder}
                      className="w-full px-4 py-2.5 rounded-xl bg-secondary border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-mono"
                    />
                    <p className="text-xs text-muted mt-1">{d.slugHelp}</p>
                  </div>
                  {error && <p className="text-error text-sm">{error}</p>}
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newUrl}
                    className="w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {creating ? "..." : d.submit}
                  </button>
                </div>
              )}
            </div>

            {/* Links List */}
            {links.length > 0 && (
              <div className="mt-12">
                <h3 className="text-xl font-bold mb-4">{d.yourLinks}</h3>
                <div className="space-y-3">
                  {links.map((link) => (
                    <div key={link.id} className="bg-card border border-border rounded-xl p-4 hover:bg-card-hover transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{link.title || link.url}</p>
                          <p className="text-sm text-primary font-mono mt-1">{window.location.origin}/l/{link.slug}</p>
                          <p className="text-xs text-muted mt-1 truncate">{link.url}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-muted">{link.clicks} {d.clicks}</span>
                          <button
                            onClick={() => handleDelete(link.id)}
                            disabled={deleting === link.id}
                            className="px-3 py-1.5 rounded-lg bg-error/10 text-error text-sm hover:bg-error/20 transition-colors disabled:opacity-50"
                          >
                            {deleting === link.id ? "..." : "Del"}
                          </button>
                          <button
                            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/l/${link.slug}`); }}
                            className="px-3 py-1.5 rounded-lg bg-secondary text-sm text-muted hover:text-foreground transition-colors"
                          >
                            {d.copy}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* How It Works */}
        {!token && (
          <>
            <section id="how-it-works" className="max-w-6xl mx-auto px-4 pb-24">
              <h2 className="text-3xl font-bold text-center mb-16">{d.howItWorks}</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { num: "01", title: d.step1, desc: d.step1Desc },
                  { num: "02", title: d.step2, desc: d.step2Desc },
                  { num: "03", title: d.step3, desc: d.step3Desc },
                ].map((step) => (
                  <div key={step.num} className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                    <div className="relative bg-card border border-border rounded-2xl p-8">
                      <span className="text-4xl font-bold text-primary/30">{step.num}</span>
                      <h3 className="text-xl font-bold mt-4 mb-3">{step.title}</h3>
                      <p className="text-muted leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Features */}
            <section className="max-w-6xl mx-auto px-4 pb-24">
              <h2 className="text-3xl font-bold text-center mb-16">{d.features}</h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { title: d.feature1, desc: d.feature1Desc, icon: "🔄" },
                  { title: d.feature2, desc: d.feature2Desc, icon: "✏️" },
                  { title: d.feature3, desc: d.feature3Desc, icon: "📖" },
                ].map((feat) => (
                  <div key={feat.title} className="bg-card border border-border rounded-2xl p-8 hover:border-primary/30 transition-colors">
                    <span className="text-3xl">{feat.icon}</span>
                    <h3 className="text-lg font-bold mt-4 mb-3">{feat.title}</h3>
                    <p className="text-muted leading-relaxed text-sm">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted">{d.poweredBy}</p>
          <div className="flex items-center gap-6">
            <button onClick={() => setLocale(locale === "en" ? "es" : "en")} className="text-sm text-muted hover:text-foreground transition-colors">{d.language}: {locale === "en" ? "Español" : "English"}</button>
            <a href="https://github.com/manalejandro/cf-fedishort" target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-foreground transition-colors">
              {d.source} ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
