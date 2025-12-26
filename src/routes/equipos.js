import express from "express";
import { supabase } from "../db.js";

const router = express.Router();

/**
 * GET /api/equipos
 * Obtener todos los equipos
 */
router.get("/", async (req, res) => {
  const { data, error } = await supabase.from("equipos").select("*");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

/**
 * POST /api/equipos
 * Crear un nuevo equipo
 */
router.post("/", async (req, res) => {
  const { nombre, logo_url } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: "El nombre es obligatorio" });
  }

  const { data, error } = await supabase
    .from("equipos")
    .insert([{ nombre, logo_url, puntos }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

/**
 * PUT /api/equipos/:id
 * Actualizar un equipo
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { nombre, logo_url } = req.body;

  const { data, error } = await supabase
    .from("equipos")
    .update({ nombre, logo_url })
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

/** Fallo al probarlo en postman
 * DELETE /api/equipos/:id
 * Eliminar un equipo
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("equipos")
    .delete()
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Equipo eliminado correctamente" });
});

/**
 * PATCH /api/equipos/actualizar-puntos
 * Actualizar los puntos de los equipos según un partido finalizado
 */
router.patch("/actualizar-puntos", async (req, res) => {
  const { partidoId, puntosLocal, puntosVisitante } = req.body;

  if (!partidoId || puntosLocal === undefined || puntosVisitante === undefined) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  // 1️⃣ Obtener IDs y puntos actuales de los equipos
  const { data: partido, error: partidoError } = await supabase
    .from("partido")
    .select("equipo_local_id, equipo_visitante_id")
    .eq("id", partidoId)
    .single();

  if (partidoError || !partido) return res.status(400).json({ error: partidoError?.message || "Partido no encontrado" });

  const { data: equipoLocalData, error: localError } = await supabase
    .from("equipos")
    .select("puntos")
    .eq("id", partido.equipo_local_id)
    .single();

  const { data: equipoVisitanteData, error: visitanteError } = await supabase
    .from("equipos")
    .select("puntos")
    .eq("id", partido.equipo_visitante_id)
    .single();

  if (localError || visitanteError) return res.status(400).json({ error: localError?.message || visitanteError?.message });

  // 2️⃣ Sumar los puntos
  const nuevosPuntosLocal = (equipoLocalData?.puntos || 0) + puntosLocal;
  const nuevosPuntosVisitante = (equipoVisitanteData?.puntos || 0) + puntosVisitante;

  // 3️⃣ Actualizar equipos
  const updates = [
    supabase.from("equipos").update({ puntos: nuevosPuntosLocal }).eq("id", partido.equipo_local_id),
    supabase.from("equipos").update({ puntos: nuevosPuntosVisitante }).eq("id", partido.equipo_visitante_id)
  ];

  const results = await Promise.all(updates);
  const errors = results.filter(r => r.error).map(r => r.error);

  if (errors.length) return res.status(400).json({ error: errors });

  // 4️⃣ Emitir evento WebSocket
  const io = req.app.get("io");
  io?.emit("equipos_cambio", { partidoId, puntosLocal, puntosVisitante });

  res.json({ message: "Puntos actualizados correctamente" });
});


export default router;
