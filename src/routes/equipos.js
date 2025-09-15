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

export default router;
