import { supabase } from '../db.js'

// GET all users
export const getUsers = async (req, res) => {
  const { data, error } = await supabase.from('usuarios').select('*')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

// GET user by id
export const getUserById = async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase.from('usuarios').select('*').eq('id', id).single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

// POST new user
export const createUser = async (req, res) => {
  const { nombre, email } = req.body
  const { data, error } = await supabase.from('usuarios').insert([{ nombre, email }])
  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

// PUT update user
export const updateUser = async (req, res) => {
  const { id } = req.params
  const { nombre, email } = req.body
  const { data, error } = await supabase.from('usuarios').update({ nombre, email }).eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

// DELETE user
export const deleteUser = async (req, res) => {
  const { id } = req.params
  const { data, error } = await supabase.from('usuarios').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Usuario eliminado' })
}
