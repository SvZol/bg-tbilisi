import api from './api'

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password })
  localStorage.setItem('token', res.data.access_token)
  return res.data
}

export async function register(email: string, password: string, full_name: string, phone?: string) {
  const res = await api.post('/auth/register', { email, password, full_name, phone })
  return res.data
}

export function logout() {
  localStorage.removeItem('token')
}

export function getToken() {
  return localStorage.getItem('token')
}

export function isLoggedIn() {
  return !!getToken()
}