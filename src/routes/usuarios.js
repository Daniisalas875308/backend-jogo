import { supabase } from '../db.js'

// Función para obtener usuario por nombre
export async function getUserByNombre(nombre) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('nombre', nombre)
    .single()

  if (error) {
    console.error('Error al obtener usuario:', error)
    return null
  }

  return data
}
