/**
 * Credenciales por defecto del usuario `admin` en el primer arranque (sin otros administradores).
 * Deben cambiarse tras el primer inicio de sesion; quedan visibles en el binario (no son secretos de largo plazo).
 */
export const DEFAULT_INITIAL_ADMIN_PASSWORD = 'SistemaBarra1'

/** Codigos de recuperacion del admin inicial (minimo uno; validos mientras no se regeneren). */
export const DEFAULT_INITIAL_ADMIN_RECOVERY_CODES = ['BARRA2026ADMIN'] as const
