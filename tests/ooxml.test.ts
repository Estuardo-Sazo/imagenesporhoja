/** Pruebas de los fragmentos de OOXML que consume Word. */

import { describe, expect, it } from 'vitest';
import { escapeXml, inlineImage, sectionProperties, spacerParagraph } from '../src/lib/export/ooxml';
import { mmToEmu, mmToTwips } from '../src/lib/layout/units';

describe('escapeXml', () => {
  it('escapa los caracteres que romperían el XML', () => {
    expect(escapeXml('foto & "prueba" <1>')).toBe('foto &amp; &quot;prueba&quot; &lt;1&gt;');
  });
});

describe('inlineImage', () => {
  const xml = inlineImage({
    id: 3,
    relationId: 'rId3',
    widthMm: 50,
    heightMm: 25,
    name: 'perro & gato.jpg',
  });

  it('convierte los milímetros a EMU', () => {
    expect(xml).toContain(`cx="${mmToEmu(50)}"`);
    expect(xml).toContain(`cy="${mmToEmu(25)}"`);
  });

  it('enlaza la relación correcta', () => {
    expect(xml).toContain('r:embed="rId3"');
  });

  it('escapa el nombre del archivo', () => {
    expect(xml).toContain('perro &amp; gato.jpg');
    expect(xml).not.toContain('perro & gato');
  });
});

describe('spacerParagraph', () => {
  it('fija la altura exacta en twips', () => {
    expect(spacerParagraph(3)).toContain(`w:line="${mmToTwips(3)}"`);
    expect(spacerParagraph(3)).toContain('w:lineRule="exact"');
  });
});

describe('sectionProperties', () => {
  const props = sectionProperties({
    widthMm: 215.9,
    heightMm: 279.4,
    landscape: false,
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
  });

  it('define el tamaño de hoja en twips', () => {
    expect(props).toContain(`w:w="${mmToTwips(215.9)}"`);
    expect(props).toContain(`w:h="${mmToTwips(279.4)}"`);
  });

  it('traduce 1 cm de margen a 567 twips', () => {
    expect(mmToTwips(10)).toBe(567);
    expect(props).toContain('w:top="567"');
  });

  it('marca la orientación horizontal cuando toca', () => {
    const landscape = sectionProperties({
      widthMm: 279.4,
      heightMm: 215.9,
      landscape: true,
      margins: { top: 10, right: 10, bottom: 10, left: 10 },
    });
    expect(landscape).toContain('w:orient="landscape"');
    expect(props).not.toContain('w:orient');
  });
});
