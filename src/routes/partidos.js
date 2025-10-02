import express from "express";
import { supabase } from "../db.js";

const router = express.Router();

/**
 * GET /api/partidos
 * Obtener todos los partidos con info de equipos y fase
 */
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("partido")
    .select(`
      id,
      fecha,
      goles_local,
      goles_visitante,
      estado,
      campo,
      equipos_local:equipo_local_id (id, nombre, logo_url),
      equipos_visitante:equipo_visitante_id (id, nombre, logo_url),
      fases:fase_id (id, nombre, estado)
    `);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.get("/por-dia/:fecha", async (req, res) => {
  const { fecha } = req.params;

  // validar formato básico
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: "Formato de fecha inválido. Usa YYYY-MM-DD" });
  }

  try {
    // midnight local (host) para esa fecha
    const dayStartLocal = new Date(`${fecha}T00:00:00`);
    const dayEndLocal = new Date(dayStartLocal.getTime() + 24 * 60 * 60 * 1000);

    const startISO = dayStartLocal.toISOString();
    const endISO = dayEndLocal.toISOString();

    // Traer partidos entre startISO (inclusive) y endISO (exclusive)
    const { data: partidos, error } = await supabase
      .from("partido")
      .select(`
        id,
        fecha,
        equipo_local_id,
        equipo_visitante_id,
        goles_local,
        goles_visitante,
        fase:fase_id ( id, nombre ),
        estado,
        campo,
        tipo
      `)
      .gte("fecha", startISO)
      .lt("fecha", endISO)
      .order("fecha", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    // recolectar ids de equipos para traer nombres
    const teamIds = [
      ...new Set(
        partidos
          .flatMap((p) => [p.equipo_local_id, p.equipo_visitante_id])
          .filter(Boolean)
      ),
    ];

    let equiposMap = {};
    if (teamIds.length) {
      const { data: equiposData, error: errEquipos } = await supabase
        .from("equipos")
        .select("id, nombre, logo_url")
        .in("id", teamIds);

      if (errEquipos) return res.status(400).json({ error: errEquipos.message });

      equiposMap = Object.fromEntries(equiposData.map((e) => [e.id, e]));
    }



    // montar resultado con equipos embebidos
    const result = partidos.map((p) => ({
      id: p.id,
      fecha: p.fecha, // timestamp ISO que devolverá Supabase
      goles_local: p.goles_local,
      goles_visitante: p.goles_visitante,
      equipo_local: equiposMap[p.equipo_local_id] || { id: p.equipo_local_id, nombre: null },
      equipo_visitante: equiposMap[p.equipo_visitante_id] || { id: p.equipo_visitante_id, nombre: null },
      fase_id: p.fase,
      estado: p.estado,
      campo: p.campo,
      tipo: p.tipo,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener partidos por día", detail: err.message });
  }
});


router.get("/por-fase/:fase_id", async (req, res) => {
  const { fase_id } = req.params;

  try {
    // Traer partidos de la fase específica
    const { data: partidos, error } = await supabase
      .from("partido")
      .select(`
        id,
        fecha,
        equipo_local_id,
        equipo_visitante_id,
        goles_local,
        goles_visitante,
        fase:fase_id ( id, nombre ),
        estado,
        campo
      `)
      .eq("fase_id", fase_id) // <-- filtramos por fase

    if (error) return res.status(400).json({ error: error.message });

    // recolectar ids de equipos para traer nombres
    const teamIds = [
      ...new Set(
        partidos
          .flatMap((p) => [p.equipo_local_id, p.equipo_visitante_id])
          .filter(Boolean)
      ),
    ];

    let equiposMap = {};
    if (teamIds.length) {
      const { data: equiposData, error: errEquipos } = await supabase
        .from("equipos")
        .select("id, nombre, logo_url")
        .in("id", teamIds);

      if (errEquipos) return res.status(400).json({ error: errEquipos.message });

      equiposMap = Object.fromEntries(equiposData.map((e) => [e.id, e]));
    }

    // montar resultado con equipos embebidos y fase
    const result = partidos.map((p) => ({
      id: p.id,
      fecha: p.fecha,
      goles_local: p.goles_local,
      goles_visitante: p.goles_visitante,
      equipo_local: equiposMap[p.equipo_local_id] || { id: p.equipo_local_id, nombre: null },
      equipo_visitante: equiposMap[p.equipo_visitante_id] || { id: p.equipo_visitante_id, nombre: null },
      fase: p.fase || null, // <-- aquí tienes el nombre de la fase
      estado: p.estado,
      campo: p.campo,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener partidos por fase", detail: err.message });
  }
});


/**
 * GET /api/partidos/:id
 * Obtener un partido por ID
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("partido")
    .select(`
      id,
      fecha,
      goles_local,
      goles_visitante,
      estado,
      campo,
      equipos_local:equipo_local_id (id, nombre, logo_url),
      equipos_visitante:equipo_visitante_id (id, nombre, logo_url),
      fases:fase_id (id, nombre, estado)
    `)
    .eq("id", id)
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

/**
 * POST /api/partidos
 * Crear un nuevo partido
 */
router.post("/", async (req, res) => {
  const { fecha, equipo_local_id, equipo_visitante_id, fase_id, campo } = req.body;

  if ( !equipo_local_id || !equipo_visitante_id || !campo) {
    return res
      .status(400)
      .json({ error: "Faltan datos obligatorios: equipo_local_id, equipo_visitante_id, campo" });
  }

  const { data, error } = await supabase
    .from("partido")
    .insert([{ fecha, equipo_local_id, equipo_visitante_id, fase_id, campo}])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

/**
 * PUT /api/partidos/:id
 * Actualizar datos de un partido (ej: goles, estado, fecha)
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { fecha, goles_local, goles_visitante, estado } = req.body;

  const { data, error } = await supabase
    .from("partido")
    .update({ fecha, goles_local, goles_visitante, estado })
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

/**
 * DELETE /api/partidos/:id
 * Eliminar un partido
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("partido").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Partido eliminado correctamente" });
});

export default router;
