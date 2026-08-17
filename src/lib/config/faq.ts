/**
 * Preguntas frecuentes.
 *
 * Viven en un solo lugar porque se usan dos veces: para pintar la sección de
 * la portada y para generar los datos estructurados FAQPage que Google usa
 * para mostrar respuestas desplegables en los resultados de búsqueda.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: '¿Se suben mis imágenes a algún servidor?',
    answer:
      'No. Todo el procesamiento ocurre dentro de tu navegador, en tu propia computadora. Las imágenes no viajan a internet ni quedan guardadas en ningún lado, y al cerrar la pestaña desaparecen.',
  },
  {
    question: '¿Cuántas imágenes puedo poner en una hoja?',
    answer:
      'De 1 a 40 por hoja. La herramienta calcula el tamaño necesario para que quepan todas respetando los márgenes; entre más imágenes pidas, más pequeña saldrá cada una.',
  },
  {
    question: '¿Cuántas imágenes puedo cargar de una vez?',
    answer:
      'Hasta 200 por documento, que a 7 por hoja son unas 28 páginas. El tope existe porque todo el trabajo lo hace tu propia computadora: pasado cierto punto, el navegador tendría que mantener demasiadas fotos abiertas a la vez. A partir de 100 verás un aviso de que la vista previa puede ir más lenta en equipos modestos, aunque la impresión y la descarga siguen funcionando igual.',
  },
  {
    question: '¿Se deforman las fotos al acomodarlas?',
    answer:
      'No. Cada imagen conserva su proporción original, por eso a veces queda algo de espacio en blanco. Si prefieres que llenen todo el espacio disponible, existe la opción de rellenar recortando los bordes.',
  },
  {
    question: '¿Puedo mezclar fotos verticales y horizontales?',
    answer:
      'Sí, y es justo donde más ayuda. El acomodo se calcula a partir de las proporciones reales de tus imágenes, así que puede formar una fila de tres verticales y otra de dos horizontales en vez de forzar una cuadrícula rígida.',
  },
  {
    question: '¿Cómo guardo el resultado en PDF?',
    answer:
      'Pulsa "Imprimir o guardar en PDF" y en el diálogo de tu navegador elige "Guardar como PDF" como destino. Selecciona márgenes "Ninguno" y desactiva los encabezados y pies de página para que la hoja salga exacta.',
  },
  {
    question: '¿El archivo de Word se puede editar después?',
    answer:
      'Sí. El .docx trae las imágenes ya colocadas dentro de tablas sin bordes, así que puedes abrirlo en Word, LibreOffice o Google Docs y agregar títulos, numeración o pies de foto.',
  },
  {
    question: '¿Funciona en el celular?',
    answer:
      'Sí, aunque la vista previa se aprovecha mejor en pantalla grande. Desde el celular puedes cargar fotos de la galería, ajustar todo e imprimir o descargar el documento igual que en computadora.',
  },
  {
    question: '¿Por qué no puede leer mis fotos HEIC del iPhone?',
    answer:
      'Los navegadores no saben abrir el formato HEIC. Conviértelas a JPG antes de cargarlas: en el iPhone, en Ajustes > Cámara > Formatos, puedes elegir "Más compatible" para que tome las fotos directamente en JPG.',
  },
  {
    question: '¿Tiene costo o hay que registrarse?',
    answer:
      'Es gratuita y no pide registro, correo ni datos personales. Tampoco tiene marcas de agua ni límite de imágenes.',
  },
];
