export function registrarError(contexto, error) {
  if (!import.meta.env.DEV) {
    return;
  }

  const detalle = error instanceof Error ? error : new Error(String(error || "Error desconocido"));
  console.error(`[V-TECH] ${contexto}`, detalle);
}
