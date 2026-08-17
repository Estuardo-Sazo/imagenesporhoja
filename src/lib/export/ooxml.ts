/**
 * Fragmentos de OOXML (el XML que Word entiende).
 *
 * Se mantienen aparte de la lógica de exportación para que `docx.ts` se lea
 * como una receta y no como una sopa de etiquetas.
 */

import { mmToEmu, mmToTwips } from '../layout/units';

const NS_MAIN = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const NS_PICTURE = 'http://schemas.openxmlformats.org/drawingml/2006/picture';

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Una imagen incrustada en línea, con tamaño exacto en milímetros. */
export function inlineImage(params: {
  id: number;
  relationId: string;
  widthMm: number;
  heightMm: number;
  name: string;
}): string {
  const cx = mmToEmu(params.widthMm);
  const cy = mmToEmu(params.heightMm);
  const name = escapeXml(params.name);
  return (
    '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
    `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${params.id}" name="Imagen ${params.id}" descr="${name}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="${NS_MAIN}" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="${NS_MAIN}">` +
    '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    `<pic:pic xmlns:pic="${NS_PICTURE}">` +
    `<pic:nvPicPr><pic:cNvPr id="${params.id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${params.relationId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'
  );
}

/** Párrafo vacío de altura exacta: así reproducimos las separaciones al milímetro. */
export function spacerParagraph(heightMm: number): string {
  return (
    `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${mmToTwips(heightMm)}" w:lineRule="exact"/>` +
    '<w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>'
  );
}

export function pageBreakParagraph(): string {
  return (
    '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>' +
    '<w:rPr><w:sz w:val="2"/></w:rPr></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>'
  );
}

export function emptyParagraph(): string {
  return (
    '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>' +
    '<w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>'
  );
}

export function captionParagraph(text: string): string {
  return (
    '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="200" w:lineRule="exact"/></w:pPr>' +
    `<w:r><w:rPr><w:sz w:val="12"/><w:color w:val="444444"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`
  );
}

const SIDES = ['top', 'left', 'bottom', 'right'] as const;

export function cellBorders(visible: boolean): string {
  if (!visible) return '';
  const border = SIDES.map(
    (side) => `<w:${side} w:val="single" w:sz="6" w:space="0" w:color="808080"/>`,
  ).join('');
  return `<w:tcBorders>${border}</w:tcBorders>`;
}

export function tableNoBorders(): string {
  const sides = [...SIDES, 'insideH', 'insideV'];
  return `<w:tblBorders>${sides
    .map((side) => `<w:${side} w:val="none" w:sz="0" w:space="0" w:color="auto"/>`)
    .join('')}</w:tblBorders>`;
}

/** Una fila de imágenes se maqueta como una tabla sin bordes de una sola fila. */
export function imageRowTable(params: { columnWidthsTwips: number[]; cells: string[] }): string {
  const total = params.columnWidthsTwips.reduce((a, b) => a + b, 0);
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:jc w:val="center"/>` +
    tableNoBorders() +
    '<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/></w:tblCellMar>' +
    '<w:tblLayout w:type="fixed"/></w:tblPr>' +
    `<w:tblGrid>${params.columnWidthsTwips.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>` +
    `<w:tr><w:trPr><w:jc w:val="center"/><w:cantSplit/></w:trPr>${params.cells.join('')}</w:tr></w:tbl>`
  );
}

export function imageCell(params: {
  widthTwips: number;
  padLeftMm: number;
  padRightMm: number;
  borders: boolean;
  content: string;
}): string {
  return (
    `<w:tc><w:tcPr><w:tcW w:w="${params.widthTwips}" w:type="dxa"/>` +
    cellBorders(params.borders) +
    `<w:tcMar><w:top w:w="0" w:type="dxa"/><w:left w:w="${mmToTwips(params.padLeftMm || 0.01)}" w:type="dxa"/>` +
    `<w:bottom w:w="0" w:type="dxa"/><w:right w:w="${mmToTwips(params.padRightMm || 0.01)}" w:type="dxa"/></w:tcMar>` +
    '<w:vAlign w:val="center"/></w:tcPr>' +
    `${params.content}</w:tc>`
  );
}

export function imageParagraph(content: string): string {
  return (
    '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>' +
    `${content}</w:p>`
  );
}

export function sectionProperties(params: {
  widthMm: number;
  heightMm: number;
  landscape: boolean;
  margins: { top: number; right: number; bottom: number; left: number };
  footerRelationId?: string;
}): string {
  const footer = params.footerRelationId
    ? `<w:footerReference w:type="default" r:id="${params.footerRelationId}"/>`
    : '';
  return (
    `<w:sectPr>${footer}` +
    `<w:pgSz w:w="${mmToTwips(params.widthMm)}" w:h="${mmToTwips(params.heightMm)}"${
      params.landscape ? ' w:orient="landscape"' : ''
    }/>` +
    `<w:pgMar w:top="${mmToTwips(params.margins.top)}" w:right="${mmToTwips(params.margins.right)}" ` +
    `w:bottom="${mmToTwips(params.margins.bottom)}" w:left="${mmToTwips(params.margins.left)}" ` +
    `w:header="0" w:footer="${mmToTwips(Math.max(2, params.margins.bottom / 2))}" w:gutter="0"/>` +
    '<w:docGrid w:linePitch="360"/></w:sectPr>'
  );
}

export function documentXml(body: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
    'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">' +
    `<w:body>${body}</w:body></w:document>`
  );
}

export function pageNumberFooterXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>' +
    '<w:r><w:fldChar w:fldCharType="begin"/></w:r>' +
    '<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>' +
    '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>'
  );
}

export function contentTypesXml(withFooter: boolean): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Default Extension="png" ContentType="image/png"/>' +
    '<Default Extension="jpg" ContentType="image/jpeg"/>' +
    '<Default Extension="jpeg" ContentType="image/jpeg"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    (withFooter
      ? '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
      : '') +
    '</Types>'
  );
}

export function packageRelsXml(): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rIdMain" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>'
  );
}

export function documentRelsXml(relationships: string[]): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    relationships.join('') +
    '</Relationships>'
  );
}

export function imageRelationship(id: string, fileName: string): string {
  return `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${fileName}"/>`;
}

export function footerRelationship(id: string): string {
  return `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>`;
}
