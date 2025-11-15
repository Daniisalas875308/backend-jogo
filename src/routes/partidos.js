import express from "express";
import { supabase } from "../db.js";

const router = express.Router();

/**
 * PATCH /api/partidos/:id/resultado
 * Actualizar resultado y estado de un partido en TIEMPO REAL
 */
router.patch("/resultado/:id", async (req, res) => {
  const { id } = req.params;
  const { goles_local, goles_visitante, estado } = req.body;
  console.log(`Actualizar resultado partido ID ${id}:`, req.body);
  // Validar que al menos un campo esté presente
  if (goles_local === undefined && goles_visitante === undefined && !estado) {
    return res.status(400).json({ 
      error: "Debes proporcionar al menos un campo: goles_local, goles_visitante o estado" 
    });
  }

  // Construir objeto de actualización solo con campos definidos
  const updates = {};
  if (goles_local !== undefined) updates.goles_local = goles_local;
  if (goles_visitante !== undefined) updates.goles_visitante = goles_visitante;
  if (estado) updates.estado = estado;

  const { data, error } = await supabase
    .from("partido")
    .update(updates)
    .eq("id", id)
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
    .single();

  if (error) return res.status(400).json({ error: error.message });
  
  if (!data) {
    return res.status(404).json({ error: "Partido no encontrado" });
  }

  const faseId = data.fases?.id;

  // 🔥 EMITIR EVENTO DE WEBSOCKET a todos los clientes suscritos
  const io = req.app.get('io');
  console.log(`Emitiendo evento partido_actualizado para partido ID ${id}`);
  io.to(`fase_${faseId}`).emit("partido_actualizado", data);
  
  // También emitir a un canal general por si hay vistas de "todos los partidos"
  io.emit("partidos_cambio", { 
    tipo: "actualizado", 
    partido: data 
  });

  res.json(data);
});

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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: "Formato de fecha inválido. Usa YYYY-MM-DD" });
  }

  try {
    const dayStartLocal = new Date(`${fecha}T00:00:00`);
    const dayEndLocal = new Date(dayStartLocal.getTime() + 24 * 60 * 60 * 1000);

    const startISO = dayStartLocal.toISOString();
    const endISO = dayEndLocal.toISOString();

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
      .or('junior.eq.false,junior.is.null')
      .order("fecha", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

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

    const result = partidos.map((p) => ({
      id: p.id,
      fecha: p.fecha,
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

router.get("/por-dia-junior/:fecha", async (req, res) => {
  const { fecha } = req.params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return res.status(400).json({ error: "Formato de fecha inválido. Usa YYYY-MM-DD" });
  }

  try {
    const dayStartLocal = new Date(`${fecha}T00:00:00`);
    const dayEndLocal = new Date(dayStartLocal.getTime() + 24 * 60 * 60 * 1000);

    const startISO = dayStartLocal.toISOString();
    const endISO = dayEndLocal.toISOString();

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
      .or('junior.eq.true,junior.is.null')
      .order("fecha", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });
        
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

    const result = partidos.map((p) => ({
      id: p.id,
      fecha: p.fecha,
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
      .eq("fase_id", fase_id);

    if (error) return res.status(400).json({ error: error.message });

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
    partidos.sort((a, b) => {
      const fechaDiff = new Date(a.fecha) - new Date(b.fecha);
      if (fechaDiff !== 0) return fechaDiff;
      return a.campo - b.campo; // si la fecha es igual, ordena por campo
    });

    const result = partidos.map((p) => ({
      id: p.id,
      fecha: p.fecha,
      goles_local: p.goles_local,
      goles_visitante: p.goles_visitante,
      equipo_local: equiposMap[p.equipo_local_id] || { id: p.equipo_local_id, nombre: null },
      equipo_visitante: equiposMap[p.equipo_visitante_id] || { id: p.equipo_visitante_id, nombre: null },
      fase: p.fase || null,
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

  if (!equipo_local_id || !equipo_visitante_id || !campo) {
    return res
      .status(400)
      .json({ error: "Faltan datos obligatorios: equipo_local_id, equipo_visitante_id, campo" });
  }

  const { data, error } = await supabase
    .from("partido")
    .insert([{ fecha, equipo_local_id, equipo_visitante_id, fase_id, campo }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  
  // Emitir evento de nuevo partido creado
  const io = req.app.get('io');
  io.emit("partidos_cambio", { 
    tipo: "creado", 
    partido: data[0] 
  });
  
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
  
  // Emitir evento de partido eliminado
  const io = req.app.get('io');
  io.emit("partidos_cambio", { 
    tipo: "eliminado", 
    partidoId: id 
  });
  
  res.json({ message: "Partido eliminado correctamente" });
});

export default router;