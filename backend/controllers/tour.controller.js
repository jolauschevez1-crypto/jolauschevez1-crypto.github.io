import { pool } from "../config/db.js";

function numero(valor, predeterminado = 0) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : predeterminado;
}

function urlImagen(req, imagen) {
  if (!imagen) {
    return "/guayaquilcompleto.jpg";
  }

  const ruta = String(imagen).trim();

  if (
    ruta.startsWith("http://") ||
    ruta.startsWith("https://") ||
    ruta.startsWith("/")
  ) {
    return ruta;
  }

  if (ruta.startsWith("uploads/")) {
    return `${req.protocol}://${req.get("host")}/${ruta}`;
  }

  return `${req.protocol}://${req.get("host")}/uploads/${ruta}`;
}

function separarLineas(valor) {
  return String(valor || "")
    .split(/\r?\n|;/)
    .map((linea) => linea.trim())
    .filter(Boolean);
}

function transformarTour(req, fila, filasImagenes = []) {
  const precio = numero(fila.precio);
  const precioMenor = numero(fila.precio_menor);
  const duracionHoras = numero(fila.duracion_horas);
  const calificacion = numero(fila.calificacion_promedio);
  const totalComentarios = numero(fila.total_comentarios);

  const imagenes = filasImagenes
    .map((imagen) => urlImagen(req, imagen.url_imagen))
    .filter(Boolean)
    .filter((imagen, indice, lista) => lista.indexOf(imagen) === indice);

  /*
    Prioridad de la portada:

    1. Primera imagen de tour_imagen cuando se carga el detalle.
    2. Imagen de portada obtenida desde tour_imagen en el listado.
    3. Columna imagen de public.tour.
    4. Imagen general de respaldo.
  */
  const imagenPrincipal =
    imagenes[0] ||
    (fila.imagen_portada ? urlImagen(req, fila.imagen_portada) : "") ||
    (fila.imagen ? urlImagen(req, fila.imagen) : "") ||
    "/guayaquilcompleto.jpg";

  return {
    id: Number(fila.id_tour),
    idTour: Number(fila.id_tour),

    title: fila.nombre,
    nombre: fila.nombre,
    description: fila.descripcion || "",
    descripcion: fila.descripcion || "",

    image: imagenPrincipal,
    imagen: fila.imagen || "",
    imagenes,
    alt: fila.nombre,

    idCategoria: Number(fila.id_categoria),
    categoria: fila.categoria || "",

    fechaTour: fila.fecha_tour,
    cupoTotal: numero(fila.cupo_total),
    cuposDisponibles: numero(fila.cupos_disponibles),

    precio,
    precioNumerico: precio,
    price: `$${precio.toFixed(2)} por persona`,
    precioMenor,
    edadGratis: numero(fila.edad_gratis, 4),

    duracionHoras,
    duration: `${duracionHoras} Horas`,
    badgeText: `${duracionHoras} Horas`,
    badgeClass: "bg-primary",

    puntoEncuentro: fila.punto_encuentro || "",
    idioma: fila.idioma || "Español",
    incluido: fila.incluido || "",
    incluidoLista: separarLineas(fila.incluido),
    noIncluido: fila.no_incluido || "",
    noIncluidoLista: separarLineas(fila.no_incluido),
    horasAnticipacion: numero(fila.horas_anticipacion, 9),
    tipoBono: fila.tipo_bono || "Electrónico",
    accesibilidad: fila.accesibilidad || "Consultar disponibilidad",
    sostenibilidad: fila.sostenibilidad || "",
    indicaciones: fila.indicaciones || "",

    activo: fila.activo !== false,
    calificacionPromedio: calificacion,
    totalComentarios,
    rating: `${calificacion.toFixed(1)} / 5`,
  };
}

function consultaTours(condicion = "") {
  return `
    SELECT
      t.id_tour,
      t.id_categoria,
      c.nombre AS categoria,
      t.nombre,
      t.descripcion,
      t.fecha_tour,
      t.cupo_total,
      t.precio,
      t.imagen,
      t.duracion_horas,
      t.punto_encuentro,
      t.activo,
      t.idioma,
      t.incluido,
      t.no_incluido,
      t.horas_anticipacion,
      t.tipo_bono,
      t.accesibilidad,
      t.sostenibilidad,
      t.indicaciones,
      t.precio_menor,
      t.edad_gratis,
      galeria.imagen_portada,

      GREATEST(
        t.cupo_total - COALESCE(cupos.personas_reservadas, 0),
        0
      )::integer AS cupos_disponibles,

      COALESCE(opiniones.calificacion_promedio, 0)
        AS calificacion_promedio,
      COALESCE(opiniones.total_comentarios, 0)
        AS total_comentarios

    FROM public.tour t
    INNER JOIN public.categoria_tour c
      ON c.id_categoria = t.id_categoria

    /*
      Primera imagen relacionada con el tour.
      Se utiliza como portada en las tarjetas públicas.
    */
    LEFT JOIN LATERAL (
      SELECT
        ti.url_imagen AS imagen_portada
      FROM public.tour_imagen ti
      WHERE ti.id_tour = t.id_tour
      ORDER BY
        ti.orden ASC NULLS LAST,
        ti.id_imagen ASC
      LIMIT 1
    ) galeria ON true

    LEFT JOIN LATERAL (
      SELECT
        COALESCE(SUM(r.cantidad_personas), 0)::integer
          AS personas_reservadas
      FROM public.reserva r
      WHERE r.id_tour = t.id_tour
        AND r.fecha_tour = t.fecha_tour
        AND r.estado IN ('Pendiente', 'Confirmada')
    ) cupos ON true

    LEFT JOIN LATERAL (
      SELECT
        ROUND(AVG(o.puntuacion)::numeric, 1)
          AS calificacion_promedio,
        COUNT(*)::integer AS total_comentarios
      FROM public.opinion_tour o
      WHERE o.id_tour = t.id_tour
        AND o.activo = true
    ) opiniones ON true

    ${condicion}
  `;
}

function responderError(res, error) {
  console.error("Error en tours:", error);

  return res.status(500).json({
    ok: false,
    mensaje: "No se pudo completar la operación con los tours",
    detalle: error.message,
  });
}

export async function listarTours(req, res) {
  try {
    const resultado = await pool.query(`
      ${consultaTours(`
        WHERE t.activo = true
          AND c.activo = true
      `)}
      ORDER BY t.fecha_tour, t.id_tour
    `);

    return res.status(200).json({
      ok: true,
      total: resultado.rows.length,
      tours: resultado.rows.map((fila) => transformarTour(req, fila)),
    });
  } catch (error) {
    return responderError(res, error);
  }
}

export async function obtenerTourPorId(req, res) {
  const idTour = Number(req.params.id);

  if (!Number.isInteger(idTour) || idTour <= 0) {
    return res.status(400).json({
      ok: false,
      mensaje: "El ID del tour no es válido",
    });
  }

  try {
    const [resultado, resultadoImagenes] = await Promise.all([
      pool.query(
        `
          ${consultaTours(`
            WHERE t.id_tour = $1
              AND t.activo = true
              AND c.activo = true
          `)}
        `,
        [idTour],
      ),

      pool.query(
        `
          SELECT
            id_imagen,
            id_tour,
            url_imagen,
            orden
          FROM public.tour_imagen
          WHERE id_tour = $1
          ORDER BY
            orden ASC NULLS LAST,
            id_imagen ASC
        `,
        [idTour],
      ),
    ]);

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        mensaje: "Tour no encontrado",
      });
    }

    return res.status(200).json({
      ok: true,
      tour: transformarTour(req, resultado.rows[0], resultadoImagenes.rows),
    });
  } catch (error) {
    return responderError(res, error);
  }
}

export async function listarCategorias(req, res) {
  try {
    const resultado = await pool.query(`
      SELECT
        id_categoria,
        nombre,
        descripcion,
        activo
      FROM public.categoria_tour
      WHERE activo = true
      ORDER BY nombre
    `);

    return res.status(200).json({
      ok: true,
      total: resultado.rows.length,
      categorias: resultado.rows,
    });
  } catch (error) {
    return responderError(res, error);
  }
}
