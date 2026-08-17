/**
 * Límites de uso.
 *
 * No hay servidor: el techo real lo pone la memoria del equipo de la persona.
 * Una foto de celular de 12 megapíxeles ocupa unos 48 MB ya decodificada, así
 * que el número de imágenes abiertas a la vez es lo que decide si el navegador
 * aguanta o se arrastra.
 *
 * Por eso, además del tope, la vista previa carga las imágenes de forma
 * diferida y descarta el dibujado de las hojas que están fuera de pantalla.
 */

/** Tope duro: más allá de esto no se aceptan archivos. */
export const MAX_IMAGES = 200;

/** A partir de aquí se avisa de que puede ir lento en equipos modestos. */
export const WARN_IMAGES = 100;

export interface CapacitySplit<T> {
  /** Lo que cabe dentro del tope. */
  accepted: T[];
  /** Lo que sobra y hay que descartar. */
  discarded: T[];
}

/** Reparte lo que llega según el espacio que quede hasta `MAX_IMAGES`. */
export function splitByCapacity<T>(currentCount: number, incoming: T[]): CapacitySplit<T> {
  const room = Math.max(0, MAX_IMAGES - currentCount);
  return { accepted: incoming.slice(0, room), discarded: incoming.slice(room) };
}
