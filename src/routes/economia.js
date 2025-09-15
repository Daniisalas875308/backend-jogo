import express from "express";
import { supabase } from "../db.js";

const router = express.Router();

/**
 * GET /api/economia
 * Listar todos los registros económicos
 */
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("economia")
    .select(`
      id,
      tipo,
      monto,
      descripcion,
      fecha,
      usuarios:user_id (id, nombre)
    `)
    .order("fecha", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// GET /economia/:tipo
router.get("/por-tipo/:tipo", async (req, res) => {
  const { tipo } = req.params;

  try {
    const { data, error } = await supabase
      .from("economia")
      .select(`
        id,
        tipo,
        monto,
        descripcion,
        fecha,
        nombre,
        usuarios: user_id ( id, nombre )
      `)
      .eq("tipo", tipo)
      .order("fecha", { ascending: false });

    if (error) {
      console.error("Error en Supabase:", error.message);
      return res.status(400).json({ error: error.message });
    }

    // Adaptamos la respuesta para que devuelva directamente el nombre del usuario
    const result = data.map((item) => ({
      id: item.id,
      tipo: item.tipo,
      monto: item.monto,
      descripcion: item.descripcion,
      fecha: item.fecha,
      nombre: item.nombre,
      usuario: item.usuarios ? item.usuarios.nombre : "Desconocido",
    }));

    res.json(result);
  } catch (err) {
    console.error("Error al obtener economía:", err);
    res.status(500).json({ error: "Error en el servidor" });
  }
});



/**
 * GET /api/economia/balance
 * Calcular el balance actual (ingresos - gastos)
 */
router.get("/balance", async (req, res) => {
  const { data, error } = await supabase
    .from("economia")
    .select("tipo, monto, fecha");

  if (error) return res.status(400).json({ error: error.message });

  let balance = 0;
  data.forEach(item => {
    if (item.tipo === "ingreso") balance += Number(item.monto);
    else if (item.tipo === "gasto") balance -= Number(item.monto);
  });

  res.json({ balance });
});

/**
 * POST /api/economia
 * Insertar un ingreso o gasto
 */
router.post("/", async (req, res) => {
  try {
    const { tipo, monto, descripcion = null, user_id = null, nombre } = req.body;

    // validaciones básicas
    if (!["ingreso", "gasto"].includes(tipo)) {
      return res.status(400).json({ error: "Tipo inválido. Usa 'ingreso' o 'gasto'." });
    }
    const numMonto = Number(monto);
    if (Number.isNaN(numMonto) || numMonto <= 0) {
      return res.status(400).json({ error: "Monto inválido." });
    }

    // Inserción en Supabase
    const { data, error } = await supabase
      .from("economia")
      .insert([
        {
          tipo,
          monto: numMonto,
          descripcion,
          user_id, // puede ser null; más abajo puedes mapear a usuario si quieres
          nombre
        }
      ])
      .select(); // devuelve la fila insertada

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(400).json({ error: error.message });
    }

    // data[0] contiene la fila insertada. Si quieres devolver además el nombre del usuario
    // puedes hacer una consulta a usuarios o usar la relación en select initial (pero .insert().select() no anida relaciones).
    // Para simplicidad devolvemos la fila insertada tal cual.
    res.status(201).json(data[0]);
  } catch (err) {
    console.error("Error al crear economía:", err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});


/**
 * PUT /api/economia/:id
 * Modificar un registro económico
 */
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { tipo, monto, descripcion } = req.body;

  const { data, error } = await supabase
    .from("economia")
    .update({ tipo, monto, descripcion })
    .eq("id", id)
    .select();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data[0]);
});

/**
 * DELETE /api/economia/:id
 * Eliminar un registro económico
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase.from("economia").delete().eq("id", id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "Registro económico eliminado correctamente" });
});

export default router;
