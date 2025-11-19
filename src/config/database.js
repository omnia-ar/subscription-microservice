import { Pool } from "pg";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

// Determinar el tamaño del pool según el ambiente
const isProduction = process.env.NODE_ENV === "production";
const isCloudRun = process.env.K_SERVICE !== undefined;

// Pool de conexiones para PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "6543"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // ⚠️ CRÍTICO: Aumentar timeouts por la distancia Brazil <-> US-East-1
  max: isCloudRun ? 2 : 20, // 2 conexiones en Cloud Run (más resiliente)
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000, // 🔥 Aumentado de 10s a 30s

  // 🔥 NUEVO: Timeout para queries (evita queries colgadas)
  query_timeout: 25000, // 25 segundos máximo por query

  // Keepalive más agresivo para conexiones trans-continentales
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000, // Reducido de 10s a 5s

  // 🔥 SSL MEJORADO: Configuración más robusta para Supabase/Cloud
  ssl: isProduction
    ? {
        rejectUnauthorized: false,
        // 🔥 CRÍTICO para error 08P01: Deshabilitar renegociación SSL
        secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
      }
    : false,

  // 🔥 NUEVO: Configuración para manejar desconexiones
  allowExitOnIdle: true, // Permite que el pool se cierre si no hay trabajo

  // 🔥 CRÍTICO para 08P01: Añadir application_name para debugging
  application_name: isCloudRun ? "omnia-cloudrun" : "omnia-local",
});

// Test de conexión al inicializar
pool.on("connect", (client) => {
  console.log("✅ Connected to PostgreSQL database");
  // Configurar timeout a nivel de sesión
  client.query("SET statement_timeout = 25000");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err);
  // No hacer exit en producción
});

// 🔥 NUEVO: Manejar el caso de acquire timeout
pool.on("acquire", () => {
  console.log("🔄 Client acquired from pool");
});

pool.on("remove", () => {
  console.log("🗑️ Client removed from pool");
});

// Función helper para ejecutar queries con retry
export async function query(text, params, client) {
  const useClient = client || pool;
  const maxRetries = 2;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await useClient.query(text, params);
      return result;
    } catch (error) {
      lastError = error;
      console.error(
        `Database query error (attempt ${attempt}/${maxRetries}):`,
        error
      );

      // Solo reintentar en errores de conexión
      if (
        attempt < maxRetries &&
        (error.code === "ECONNRESET" ||
          error.code === "ETIMEDOUT" ||
          error.message?.includes("timeout"))
      ) {
        console.log(`⏳ Retrying query in ${attempt * 1000}ms...`);
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}

// Función para transacciones con timeout más largo
export async function transaction(callback) {
  const client = await pool.connect();

  try {
    // Aumentar timeout para transacciones
    await client.query("SET statement_timeout = 40000"); // 40 segundos
    await client.query("BEGIN");

    const result = await callback(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// Función para cerrar el pool
export async function closePool() {
  console.log("🔌 Closing database pool...");
  await pool.end();
}

// 🔥 MEJORADO: Graceful shutdown más robusto
let isShuttingDown = false;

process.on("SIGTERM", async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("⚠️ SIGTERM received, closing database pool...");

  try {
    // Dar tiempo para que las queries en curso terminen
    await Promise.race([
      closePool(),
      new Promise((resolve) => setTimeout(resolve, 5000)), // Max 5s de espera
    ]);
    console.log("✅ Database pool closed successfully");
  } catch (error) {
    console.error("❌ Error closing pool:", error);
  } finally {
    process.exit(0);
  }
});

// 🔥 NUEVO: Health check para verificar conexión
export async function healthCheck() {
  try {
    const result = await pool.query("SELECT 1");
    return result.rowCount === 1;
  } catch (error) {
    console.error("Health check failed:", error);
    return false;
  }
}

export default pool;
