import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import equiposFaseRoutes from "./routes/equipoFase.js";
import equiposRoutes from "./routes/equipos.js";
import partidosRoutes from "./routes/partidos.js";
import documentosRoutes from "./routes/documentos.js";
import fasesRoutes from "./routes/fases.js";
import economiaRoutes from "./routes/economia.js";
import presupuestoRoutes from "./routes/presupuesto.js";
import marcadorRoutes from "./routes/marcador.js";
import cors from "cors";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getUserByNombre } from './routes/usuarios.js';

const app = express();

// 🔥 CREAR SERVIDOR HTTP (necesario para Socket.IO)
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_COM,
  process.env.FRONTEND_ES,
  "http://localhost:3000"
];
// 🔥 CONFIGURAR SOCKET.IO
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  }
});

app.use(express.json());


const PORT = process.env.PORT || 5000;

// habilita CORS solo para el frontend local
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true
}));

// 🔥 HACER IO ACCESIBLE EN LAS RUTAS
app.set('io', io);

// Rutas
app.use("/api/equipos-fase", equiposFaseRoutes);
app.use("/api/equipos", equiposRoutes);
app.use("/api/partidos", partidosRoutes);
app.use("/api/documentos", documentosRoutes);
app.use("/api/fases", fasesRoutes);
app.use("/api/economia", economiaRoutes);
app.use("/api/presupuesto", presupuestoRoutes);
app.use("/api/marcador", marcadorRoutes);


// 🔥 EVENTOS DE SOCKET.IO
io.on("connection", (socket) => {
  console.log("✅ Cliente conectado:", socket.id);

  // Suscribirse a un partido específico
  socket.on("suscribirse_partido", (partidoId) => {
    socket.join(`partido_${partidoId}`);
    console.log(`📺 Cliente ${socket.id} siguiendo partido ${partidoId}`);
  });

  // Desuscribirse de un partido
  socket.on("desuscribirse_partido", (partidoId) => {
    socket.leave(`partido_${partidoId}`);
    console.log(`👋 Cliente ${socket.id} dejó de seguir partido ${partidoId}`);
  });

  // Suscribirse a todos los partidos de una fase
  socket.on("suscribirse_fase", (faseId) => {
    socket.join(`fase_${faseId}`);
    console.log(`📺 Cliente ${socket.id} siguiendo fase ${faseId}`);
  });

  socket.on("desuscribirse_fase", (faseId) => {
    socket.leave(`fase_${faseId}`);
    console.log(`👋 Cliente ${socket.id} dejó de seguir fase ${faseId}`);
  });

  socket.on("join_marcador", () => {
    socket.join("room_marcador");
    console.log(`🖥️ Marcador ${socket.id} listo para recibir partidos`);
  });

  // El Admin envía los partidos y el servidor los reenvía a la sala del marcador
  socket.on("cambiar_partidos_marcador", (partidos) => {
    console.log("📢 Admin cambió partidos del marcador:", partidos.map(p => p.id));
    
    // Lo enviamos a todos los que estén en la "room_marcador"
    io.to("room_marcador").emit("cambiar_partidos_marcador", partidos);
  });

  socket.on("disconnect", () => {
    console.log("❌ Cliente desconectado:", socket.id);
  });
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

    res.json({ token, nombre: user.nombre, id: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// 🔥 USAR httpServer EN LUGAR DE app.listen
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔌 WebSocket disponible en ws://localhost:${PORT}`);
});

// 🔥 EXPORTAR IO PARA USO EN OTROS ARCHIVOS SI ES NECESARIO
export { io };