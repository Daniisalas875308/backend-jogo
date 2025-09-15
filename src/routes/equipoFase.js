// src/routes/equiposFase.js
import express from "express";
import { supabase } from "../db.js";

const router = express.Router();


/**
 * GET /api/equipos-fase
 * Listar todas las fases
 */
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("equipos_fase")
    .select(`
      id,
      equipo_id,
      fase_id
    `);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.get("/grupo/:faseId", async (req, res) => {
  const { faseId } = req.params;

  const { data, error } = await supabase
    .from("equipos_fase")
    .select(`
      id,
      fase_id,
      equipos (
        id,
        nombre,
        logo_url,
        puntos
      )
    `)
    .eq("fase_id", faseId);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});


// 1. Añadir equipo a fase
router.post("/", async (req, res) => {
  const { equipo_id, fase_id } = req.body;

  const { data, error } = await supabase
    .from("equipos_fase")
    .insert([{ equipo_id, fase_id }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

// 3. Eliminar relación equipo-fase
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from("equipos_fase")
    .delete()
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Relación eliminada" });
});

export default router;
