import helmet from "helmet";
import cors from "cors";

const SECURITY_CONFIG_ERROR_PREFIX = "[SECURITY_CONFIG]";

const parseAllowedOrigins = (rawValue) => {
  if (!rawValue || typeof rawValue !== "string") return [];
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

const buildIsAllowedOrigin = ({ allowAnyOrigin, allowedOrigins, isProduction }) => {
  return (origin) => {
    if (allowAnyOrigin) return true;
    if (allowedOrigins.includes(origin)) return true;

    for (const configuredOrigin of allowedOrigins) {
      if (!configuredOrigin.includes("*")) continue;
      const escaped = configuredOrigin.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
      const regexPattern = `^${escaped.replace(/\\\*/g, ".*")}$`;
      if (new RegExp(regexPattern, "i").test(origin)) {
        return true;
      }
    }

    if (!isProduction && /^https?:\/\/localhost(:\d+)?$/i.test(origin)) {
      return true;
    }

    return false;
  };
};

const validateAllowedOrigins = (allowedOrigins) => {
  for (const origin of allowedOrigins) {
    if (origin === "*") continue;

    // Allow wildcard host patterns such as https://*.example.com
    const normalized = origin.includes("*") ? origin.replace("*", "placeholder") : origin;
    try {
      const url = new URL(normalized);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("protocol-not-allowed");
      }
    } catch {
      throw new Error(`${SECURITY_CONFIG_ERROR_PREFIX} ALLOWED_ORIGINS contiene un origen invalido: ${origin}`);
    }
  }
};

const validateSecurityConfiguration = ({
  isProduction,
  allowedOrigins,
  allowInlineStyleInProd,
  allowCorsCredentials,
  cspHeaderValue,
}) => {
  if (![true, false].includes(isProduction)) {
    throw new Error(`${SECURITY_CONFIG_ERROR_PREFIX} isProduction debe ser boolean.`);
  }

  validateAllowedOrigins(allowedOrigins);

  if (isProduction) {
    if (allowedOrigins.length === 0) {
      throw new Error(`${SECURITY_CONFIG_ERROR_PREFIX} ALLOWED_ORIGINS es obligatorio en production.`);
    }

    if (allowedOrigins.includes("*")) {
      throw new Error(`${SECURITY_CONFIG_ERROR_PREFIX} ALLOWED_ORIGINS no puede incluir '*' en production.`);
    }

    if (allowCorsCredentials && allowedOrigins.some((origin) => origin.includes("*"))) {
      throw new Error(
        `${SECURITY_CONFIG_ERROR_PREFIX} CORS con credentials en production no permite wildcard en ALLOWED_ORIGINS.`
      );
    }
  }

  const inlineStyleProdFlag = process.env.CSP_ALLOW_INLINE_STYLE_PROD;
  if (inlineStyleProdFlag && !["true", "false"].includes(inlineStyleProdFlag)) {
    throw new Error(`${SECURITY_CONFIG_ERROR_PREFIX} CSP_ALLOW_INLINE_STYLE_PROD solo permite 'true' o 'false'.`);
  }

  const requiredCspFragments = [
    "default-src",
    "connect-src",
    "script-src",
    "style-src",
    "base-uri",
    "form-action",
    "frame-ancestors",
    "object-src",
  ];

  for (const fragment of requiredCspFragments) {
    if (!cspHeaderValue.includes(fragment)) {
      throw new Error(`${SECURITY_CONFIG_ERROR_PREFIX} CSP incompleta: falta directiva '${fragment}'.`);
    }
  }

  if (isProduction && allowInlineStyleInProd === false && cspHeaderValue.includes("style-src 'self' 'unsafe-inline'")) {
    throw new Error(`${SECURITY_CONFIG_ERROR_PREFIX} style-src invalida para production estricta.`);
  }
};

export const registerSecurityMiddleware = (app, { isProduction }) => {
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  const allowInlineStyleInProd = process.env.CSP_ALLOW_INLINE_STYLE_PROD !== "false";
  const allowCorsCredentials = process.env.CORS_ALLOW_CREDENTIALS !== "false";
  const allowAnyOrigin = allowedOrigins.includes("*");
  const localhostOrigins = ["http://localhost:3000", "http://localhost:6001"];
  const cspOrigins = Array.from(new Set([...allowedOrigins.filter((o) => o !== "*"), ...localhostOrigins]));

  const connectSrc = [
    "'self'",
    ...cspOrigins,
    "ws://localhost:6001",
    "wss:",
    "https://accounts.google.com",
    "https://www.googleapis.com",
    "https://*.googleusercontent.com"
  ];

  const scriptSrc = isProduction
    ? ["'self'", ...cspOrigins]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...cspOrigins];
  const styleSrc = isProduction
    ? (allowInlineStyleInProd ? ["'self'", "'unsafe-inline'"] : ["'self'"])
    : ["'self'", "'unsafe-inline'"];
  const imgSrc = [
    "'self'",
    "data:",
    "https:",
    ...cspOrigins,
    "https://developers.google.com",
    "https://lh3.googleusercontent.com",
    "https://*.googleusercontent.com"
  ];

  const cspHeaderValue = [
    "default-src 'self'",
    `connect-src ${connectSrc.join(" ")}`,
    `script-src ${scriptSrc.join(" ")}`,
    `style-src ${styleSrc.join(" ")}`,
    `img-src ${imgSrc.join(" ")}`,
    "base-uri 'self'",
    "font-src 'self' https: data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "script-src-attr 'none'",
    "upgrade-insecure-requests",
  ].join(";");

  validateSecurityConfiguration({
    isProduction,
    allowedOrigins,
    allowInlineStyleInProd,
    allowCorsCredentials,
    cspHeaderValue,
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", cspHeaderValue);
    next();
  });

  const isAllowedOrigin = buildIsAllowedOrigin({ allowAnyOrigin, allowedOrigins, isProduction });

  const corsOptions = {
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const allowed = isAllowedOrigin(origin);
      console.log("[CORS] Origin recibido:", origin || "(undefined - same-origin)");
      console.log("[CORS] Allowed:", allowed);
      if (allowed) {
        callback(null, true);
      } else {
        console.error("[CORS] DENIED -", origin);
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: allowCorsCredentials,
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 3600,
  };

  app.use(cors(corsOptions));
};
