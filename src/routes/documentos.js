import express from "express";
import { supabase } from "../db.js";

const router = express.Router();

/**
 * GET /api/documentos
 * Listar todos los documentos
 */
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("documentos")
    .select(`
      id,
      nombre,
      url,
      descripcion,
      estado,
      numticks,
      numnoticks,
      fecha,
      usuarios:user_id (id, nombre)
    `);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

/**
 * GET /api/documentos/:id
 * Obtener un documento por ID
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("documentos")
    .select(`
      id,
      nombre,
      url,
      descripcion,
      estado,
      numTicks,
      numNoTicks,
      fecha,
      usuarios:user_id (id, nombre)
    `)
    .eq("id", id)
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

/**
 * POST /api/documentos
 * Crear un nuevo documento
 */
router.post("/", async (req, res) => {
  const { nombre, url, descripcion, user_id } = req.body;

  if (!nombre || !url) {
    return res.status(400).json({ error: "Faltan campos obligatorios: nombre, url" });
  }

  const { data, error } = await supabase
    .from("documentos")
    .insert([{ nombre, url, descripcion, user_id }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

/**
 * PUT /api/documentos/:id
 * Actualizar estado, ticks, o descripción del documento
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { estado, numTicks, numNoTicks, descripcion } = req.body;

  const { data, error } = await supabase
    .from("documentos")
    .update({ estado, numTicks, numNoTicks, descripcion })
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

/**
 * DELETE /api/documentos/:id
 * Eliminar un documento
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("documentos").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Documento eliminado correctamente" });
});

export default router;
