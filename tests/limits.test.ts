/** Pruebas del reparto por capacidad: nunca se debe pasar del tope. */

import { describe, expect, it } from 'vitest';
import { MAX_IMAGES, WARN_IMAGES, splitByCapacity } from '../src/lib/config/limits';

const many = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('límites', () => {
  it('el aviso llega antes que el bloqueo', () => {
    expect(WARN_IMAGES).toBeLessThan(MAX_IMAGES);
  });
});

describe('splitByCapacity', () => {
  it('acepta todo cuando hay espacio de sobra', () => {
    const { accepted, discarded } = splitByCapacity(0, many(10));
    expect(accepted).toHaveLength(10);
    expect(discarded).toHaveLength(0);
  });

  it('recorta lo que no cabe', () => {
    const { accepted, discarded } = splitByCapacity(MAX_IMAGES - 5, many(20));
    expect(accepted).toHaveLength(5);
    expect(discarded).toHaveLength(15);
  });

  it('no acepta nada si ya se llegó al tope', () => {
    const { accepted, discarded } = splitByCapacity(MAX_IMAGES, many(3));
    expect(accepted).toHaveLength(0);
    expect(discarded).toHaveLength(3);
  });

  it('nunca deja pasar del tope aunque el recuento venga inflado', () => {
    const { accepted } = splitByCapacity(MAX_IMAGES + 50, many(10));
    expect(accepted).toHaveLength(0);
  });

  it('llena justo hasta el tope', () => {
    const { accepted } = splitByCapacity(0, many(MAX_IMAGES + 40));
    expect(accepted).toHaveLength(MAX_IMAGES);
  });

  it('conserva el orden de llegada', () => {
    const { accepted, discarded } = splitByCapacity(MAX_IMAGES - 2, many(5));
    expect(accepted).toEqual([0, 1]);
    expect(discarded).toEqual([2, 3, 4]);
  });
});
