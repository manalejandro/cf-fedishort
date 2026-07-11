export type Locale = "en" | "es";

export type Dict = {
  lang: Locale;
  site: {
    title: string;
    tagline: string;
    description: string;
  };
  nav: {
    home: string;
    myLinks: string;
    createLink: string;
    login: string;
    register: string;
    logout: string;
    profile: string;
  };
  hero: {
    title: string;
    subtitle: string;
    cta: string;
    learnMore: string;
  };
  link: {
    create: string;
    createDesc: string;
    url: string;
    urlPlaceholder: string;
    slug: string;
    slugPlaceholder: string;
    slugHelp: string;
    title_: string;
    titlePlaceholder: string;
    submit: string;
    success: string;
    copy: string;
    copied: string;
    delete: string;
    confirmDelete: string;
    noLinks: string;
    stats: string;
    clicks: string;
    created: string;
    yourLinks: string;
    shortenAnother: string;
  };
  auth: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    loginTitle: string;
    registerTitle: string;
    loginBtn: string;
    registerBtn: string;
    noAccount: string;
    haveAccount: string;
    usernamePlaceholder: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    loggingIn: string;
    registering: string;
    loginError: string;
    registerError: string;
  };
  profile: {
    title: string;
    links: string;
    followers: string;
    following: string;
    editProfile: string;
    displayName: string;
    bio: string;
    save: string;
    saved: string;
  };
  footer: {
    poweredBy: string;
    source: string;
    language: string;
  };
  errors: {
    notFound: string;
    serverError: string;
    unauthorised: string;
  };
};

export const dicts: Record<Locale, Dict> = {
  en: {
    lang: "en",
    site: {
      title: "FediShort",
      tagline: "Short links, federated.",
      description: "A federated link shortener powered by ActivityPub and Cloudflare. Share shortened URLs across the fediverse.",
    },
    nav: {
      home: "Home",
      myLinks: "My Links",
      createLink: "New Link",
      login: "Sign In",
      register: "Sign Up",
      logout: "Sign Out",
      profile: "Profile",
    },
    hero: {
      title: "Short Links for the Fediverse",
      subtitle: "FediShort lets you create shortened URLs that federate through ActivityPub. Share links with your followers across the fediverse — your short links, your rules.",
      cta: "Get Started",
      learnMore: "Learn More",
    },
    link: {
      create: "Create Short Link",
      createDesc: "Paste a long URL and get a federated short link.",
      url: "URL",
      urlPlaceholder: "https://example.com/very/long/url",
      slug: "Custom Slug",
      slugPlaceholder: "my-link",
      slugHelp: "Optional. Leave blank for auto-generated.",
      title_: "Title",
      titlePlaceholder: "My Awesome Link",
      submit: "Create Link",
      success: "Link created!",
      copy: "Copy",
      copied: "Copied!",
      delete: "Delete",
      confirmDelete: "Are you sure you want to delete this link?",
      noLinks: "No links yet. Create your first one!",
      stats: "Stats",
      clicks: "clicks",
      created: "Created",
      yourLinks: "Your Links",
      shortenAnother: "Shorten another",
    },
    auth: {
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
      loggingIn: "Signing in...",
      registering: "Creating account...",
      loginError: "Invalid username or password",
      registerError: "Registration failed",
    },
    profile: {
      title: "Profile",
      links: "Links",
      followers: "Followers",
      following: "Following",
      editProfile: "Edit Profile",
      displayName: "Display Name",
      bio: "Bio",
      save: "Save",
      saved: "Saved!",
    },
    footer: {
      poweredBy: "Powered by Next.js, Cloudflare & ActivityPub",
      source: "Source Code",
      language: "Language",
    },
    errors: {
      notFound: "Page not found",
      serverError: "Server error",
      unauthorised: "Unauthorised",
    },
  },
  es: {
    lang: "es",
    site: {
      title: "FediShort",
      tagline: "Enlaces cortos, federados.",
      description: "Un acortador de enlaces federado impulsado por ActivityPub y Cloudflare. Comparte URLs acortadas a través del fediverso.",
    },
    nav: {
      home: "Inicio",
      myLinks: "Mis Enlaces",
      createLink: "Nuevo Enlace",
      login: "Iniciar Sesión",
      register: "Registrarse",
      logout: "Cerrar Sesión",
      profile: "Perfil",
    },
    hero: {
      title: "Enlaces Cortos para el Fediverso",
      subtitle: "FediShort te permite crear URLs acortadas que se federan a través de ActivityPub. Comparte enlaces con tus seguidores en todo el fediverso — tus enlaces cortos, tus reglas.",
      cta: "Comenzar",
      learnMore: "Más Información",
    },
    link: {
      create: "Crear Enlace Corto",
      createDesc: "Pega una URL larga y obtén un enlace corto federado.",
      url: "URL",
      urlPlaceholder: "https://ejemplo.com/enlace/muy/largo",
      slug: "Slug Personalizado",
      slugPlaceholder: "mi-enlace",
      slugHelp: "Opcional. Deja en blanco para autogenerado.",
      title_: "Título",
      titlePlaceholder: "Mi Enlace Increíble",
      submit: "Crear Enlace",
      success: "¡Enlace creado!",
      copy: "Copiar",
      copied: "¡Copiado!",
      delete: "Eliminar",
      confirmDelete: "¿Estás seguro de que quieres eliminar este enlace?",
      noLinks: "Aún no hay enlaces. ¡Crea el primero!",
      stats: "Estadísticas",
      clicks: "clics",
      created: "Creado",
      yourLinks: "Tus Enlaces",
      shortenAnother: "Acortar otro",
    },
    auth: {
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
      loggingIn: "Iniciando sesión...",
      registering: "Creando cuenta...",
      loginError: "Usuario o contraseña inválidos",
      registerError: "Registro fallido",
    },
    profile: {
      title: "Perfil",
      links: "Enlaces",
      followers: "Seguidores",
      following: "Siguiendo",
      editProfile: "Editar Perfil",
      displayName: "Nombre",
      bio: "Biografía",
      save: "Guardar",
      saved: "¡Guardado!",
    },
    footer: {
      poweredBy: "Desarrollado con Next.js, Cloudflare y ActivityPub",
      source: "Código Fuente",
      language: "Idioma",
    },
    errors: {
      notFound: "Página no encontrada",
      serverError: "Error del servidor",
      unauthorised: "No autorizado",
    },
  },
};

export function t(locale: Locale): Dict {
  return dicts[locale];
}

export function detectLocale(acceptLanguage: string, pathLocale?: string): Locale {
  if (pathLocale === "es" || pathLocale === "en") return pathLocale;
  if (acceptLanguage?.startsWith("es")) return "es";
  return "en";
}
