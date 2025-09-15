import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const SECRET_KEY = 'clave_super_secreta';

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await getUserByEmail(email); // consulta a DB
  if(!user) return res.status(401).json({ error: 'Usuario no encontrado' });

  const match = await bcrypt.compare(password, user.password_hash);
  if(!match) return res.status(401).json({ error: 'Contraseña incorrecta' });

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '8h' });
  res.json({ token, nombre: user.nombre, id: user.id });
});
