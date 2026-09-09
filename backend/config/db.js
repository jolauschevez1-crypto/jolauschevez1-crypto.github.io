import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const variablesRequeridas = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
];

for (const variable of variablesRequeridas) {
  if (!process.env[variable]) {
    throw new Error(`Falta la variable ${variable} en el archivo .env`);
  }
}

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  console.error("Error inesperado en PostgreSQL:", error.message);
});

export async function verificarConexion() {
  const cliente = await pool.connect();

  try {
    const resultado = await cliente.query(`
      SELECT
        NOW() AS fecha_servidor,
        current_database() AS base_datos,
        current_user AS usuario
    `);

    const datos = resultado.rows[0];

    console.log("Conexión con PostgreSQL exitosa");
    console.log(`Base de datos: ${datos.base_datos}`);
    console.log(`Usuario: ${datos.usuario}`);

    return datos;
  } catch (error) {
    console.error("No se pudo conectar con PostgreSQL");
    throw error;
  } finally {
    cliente.release();
  }
}
