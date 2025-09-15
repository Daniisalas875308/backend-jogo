import express from "express";
import { supabase } from "../db.js";

const router = express.Router();

/**
 * GET /api/presupuesto
 * Listar todas las partidas del presupuesto (ingresos y gastos planificados)
 */
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("presupuesto")
    .select("id, tipo, monto, concepto");

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

/**
 * GET /api/presupuesto/resumen
 * Calcular el total de ingresos, gastos y balance planificado
 */
router.get("/resumen", async (req, res) => {
  const { data, error } = await supabase
    .from("presupuesto")
    .select("tipo, monto, concepto");

  if (error) return res.status(400).json({ error: error.message });

  let ingresos = 0;
  let gastos = 0;

  data.forEach(item => {
    if (item.tipo === "ingreso") ingresos += Number(item.monto);
    if (item.tipo === "gasto") gastos += Number(item.monto);
  });

  res.json({
    ingresos,
    gastos,
    balance_planificado: ingresos - gastos
  });
});

/**
 * POST /api/presupuesto
 * Insertar una partida en el presupuesto
 * (Ejemplo: un gasto planificado o un ingreso esperado)
 */
router.post("/", async (req, res) => {
  const { tipo, monto, concepto } = req.body;

  if (!tipo || !monto || !concepto) {
    return res.status(400).json({ error: "Faltan campos obligatorios: tipo, monto, concepto" });
  }

  const { data, error } = await supabase
    .from("presupuesto")
    .insert([{ tipo, monto, concepto }])
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

/**
 * DELETE /api/presupuesto/:id
 * Eliminar una partida del presupuesto (solo si fuese necesario)
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("presupuesto").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Partida del presupuesto eliminada correctamente" });
});

export default router;
