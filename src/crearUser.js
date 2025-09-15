import bcrypt from 'bcrypt';
import { supabase } from './db.js';

async function createUser(nombre, password) {
  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('usuarios')
    .insert([{ nombre, password_hash }]);

  if (error) {
    console.error('Error al crear usuario:', error);
  } else {
    console.log('Usuario creado:', data);
  }
}

// Cambia el nombre y la contraseña aquí para probar
createUser('Carlos Rio', '12345');
