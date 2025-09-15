import express from "express";
import { supabase } from "../db.js";

const router = express.Router();

/**
 * GET /api/fases
 * Listar todas las fases
 */
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("fase")
    .select(`
      id,
      nombre,
      estado
    `);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

/**
 * GET /api/fases/:id
 * Obtener una fase por ID
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("fase")
    .select(`
      id,
      nombre,
      estado
    `)
    .eq("id", id)
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

/**
 * POST /api/fases
 * Crear una nueva fase (ejemplo: Grupo A, Octavos, Final)
 */
router.post("/", async (req, res) => {
  const { nombre, estado } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: "El campo nombre es obligatorio" });
  }

  const { data, error } = await supabase
    .from("fase")
    .insert([{ nombre, estado }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

/**
 * PUT /api/fases/:id
 * Actualizar el estado de la fase (pendiente / en progreso / completada)
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { identificador, estado } = req.body;

  const { data, error } = await supabase
    .from("fase")
    .update({ identificador, estado })
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

/**
 * DELETE /api/fases/:id
 * Eliminar una fase
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("fase").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Fase eliminada correctamente" });
});

export default router;
