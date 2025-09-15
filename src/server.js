import express from "express";
import equiposFaseRoutes from "./routes/equipoFase.js";
import equiposRoutes from "./routes/equipos.js";
import partidosRoutes from "./routes/partidos.js";
import documentosRoutes from "./routes/documentos.js";
import fasesRoutes from "./routes/fases.js";
import economiaRoutes from "./routes/economia.js";
import presupuestoRoutes from "./routes/presupuesto.js";
import cors from "cors";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getUserByNombre } from './routes/usuarios.js'

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

// habilita CORS solo para el frontend local
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5000",
  credentials: true
}));


app.use("/api/equipos-fase", equiposFaseRoutes);

app.use("/api/equipos", equiposRoutes);

app.use("/api/partidos", partidosRoutes);

app.use("/api/documentos", documentosRoutes);

app.use("/api/fases", fasesRoutes);

app.use("/api/economia", economiaRoutes);

app.use("/api/presupuesto", presupuestoRoutes);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Ruta de login
const SECRET_KEY = 'mi_clave_super_secreta';

app.post('/api/login', async (req, res) => {
  const { nombre, password } = req.body;
  if (!nombre || !password) return res.status(400).json({ error: 'Faltan datos' });

  try {
    const user = await getUserByNombre(nombre);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user.id, nombre: user.nombre }, SECRET_KEY, { expiresIn: '8h' });

    res.json({ token, nombre: user.nombre, id: user.id  });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});
