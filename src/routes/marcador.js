import express from "express";
import { supabase } from "../db.js";

const router = express.Router();

/**
 * 🟢 Obtener partidos activos del marcador
 */
// GET: obtener partidos activos en el marcador
router.get("/", async (req, res) => {
  try {
    // Traer los partidos activos junto con los datos completos
    const { data, error } = await supabase
      .from("marcador")
      .select(`
        orden,
        partido_id,
        partido:partido_id (
          id,
          goles_local,
          goles_visitante,
          estado,
          fase_id (
            id,
            nombre
          ),
          equipo_local:equipo_local_id (
            nombre,
            logo_url
          ),
          equipo_visitante:equipo_visitante_id (
            nombre,
            logo_url
          )
        )
      `)
      .order("orden", { ascending: true });

    if (error) throw error;

    // Convertir la data para devolver un array de partidos
    const partidos = data.map((item) => ({
      ...item.partido,
    }));

    console.log("📺 Partidos activos del marcador:", partidos.map(p => p.id));

    res.json(partidos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener partidos del marcador" });
  }
});

/**
 * 🔴 Actualizar partidos del marcador
 * Espera:
 * { partidos: [12, 15] }
 */
router.post("/", async (req, res) => {
  const { partidos } = req.body; // array de ids de partidos [id1, id2]
  if (!partidos || !Array.isArray(partidos) || partidos.length > 2)
    return res.status(400).json({ error: "Se requieren 1 o 2 partidos" });

  try {
    // --- BORRAR TODOS los registros existentes ---
    const { error: delError } = await supabase.from("marcador").delete().neq("id", 0);
    if (delError) throw delError;

    // --- INSERTAR solo los nuevos partidos ---
    const inserts = partidos.map((pid, index) => ({
      partido_id: pid,
      orden: index + 1
    }));

    const { data, error } = await supabase.from("marcador").insert(inserts);
    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error actualizando marcador" });
  }
});

// PUT toggle corriendo de todos los partidos
router.put('/estado-global', async (req, res) => {
  const { corriendo } = req.body; // boolean
  if (typeof corriendo !== 'boolean') return res.status(400).json({ error: 'Corriendo debe ser booleano' });

  try {
    // Actualizar los dos partidos del marcador
    const { data, error } = await supabase
      .from("marcador")
      .update({ corriendo })
      .limit(2); // solo los primeros 2 registros
    if (error) throw error;

    res.json({ corriendo, data });
  } catch (err) {
    console.error("Error actualizando cronómetro global:", err);
    res.status(500).json({ error: 'Error actualizando cronómetro global' });
  }
});

// Obtener todos los partidos del marcador (máximo 2)
export const getTodosLosPartidosMarcador = async () => {
  const { data, error } = await supabase
    .from('marcador')
    .select('*')
    .limit(2);

  if (error) {
    console.error("Error obteniendo partidos del marcador:", error);
    throw error;
  }

  return data;
};

// Actualizar el estado corriendo de todos los partidos
export const actualizarCorriendoPartidos = async (nuevoEstado) => {
  const { data, error } = await supabase
    .from('marcador')
    .update({ corriendo: nuevoEstado })
    .neq('id', 0); // Esto actúa como un "WHERE id != 0", es un truco para actualizar todo

  if (error) {
    console.error("Error actualizando corriendo:", error);
    throw error;
  }

  return data;
};



export default router;
