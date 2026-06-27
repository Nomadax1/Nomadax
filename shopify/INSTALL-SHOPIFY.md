# NOMADAX en Shopify — página 100 % editable desde el editor de temas

Esta carpeta contiene la página de Nomadax convertida en **secciones nativas de
Shopify**. Cada parte se edita **una por una** desde *Tienda online →
Personalizar*, el **vídeo del hero se cambia** con un selector, y el **carrusel
se mueve** (animación en bucle, ya no se queda fijo).

## Qué incluye

```
shopify/
├── sections/
│   ├── nomadax-hero.liquid           ← Hero con VÍDEO editable + efecto flotante
│   ├── nomadax-marquee.liquid        ← Carrusel EN MOVIMIENTO (ítems como bloques)
│   ├── nomadax-diferenciadores.liquid← Tarjetas (bloques)
│   ├── nomadax-feature.liquid        ← Característica texto+imagen/vídeo (repetible)
│   ├── nomadax-galeria.liquid        ← Galería de imágenes (bloques)
│   ├── nomadax-specs.liquid          ← Tabla de especificaciones (filas como bloques)
│   ├── nomadax-faq.liquid            ← Preguntas frecuentes (bloques)
│   └── nomadax-cta.liquid            ← Llamada a la compra
└── templates/
    └── page.nomadax.json             ← Une todas las secciones en una página
```

## Cómo instalarlo (2 opciones)

### Opción A — Subida automática (si me das acceso)
Cuando apruebes la conexión de Shopify, yo subo estos archivos a una **copia no
publicada de tu tema** (Shopify no permite escribir directamente sobre el tema
publicado). Después solo tienes que previsualizar y, si te gusta, publicar.

### Opción B — Manual (5 minutos, sin permisos)
1. En Shopify: **Tienda online → Temas → … (en tu tema) → Editar código**.
2. En **Sections**, pulsa *Añadir una sección nueva* y crea cada archivo
   `nomadax-*.liquid` pegando el contenido de esta carpeta (sin la extensión:
   p. ej. nombre `nomadax-hero`).
3. En **Templates**, *Añadir plantilla nueva* → tipo **page** → nombre
   `nomadax` (formato JSON) y pega el contenido de `templates/page.nomadax.json`.
4. Ve a **Páginas**, crea/edita una página (p. ej. "NOMADAX VANTA 40") y en
   *Plantilla de tema* elige **page.nomadax**.
5. Abre **Personalizar** sobre esa página: ya puedes editar todo visualmente.

## Qué puedes editar en "Personalizar"

- **Hero:** cambiar el **vídeo** (subido a Shopify, o URL de YouTube/Vimeo),
  activar/desactivar el **efecto flotante** y su velocidad/amplitud, textos,
  botones y precio.
- **Carrusel:** velocidad, dirección, pausa al pasar el ratón, separador, y
  **añadir/quitar/reordenar cada ítem** como bloque.
- **Resto de secciones:** cada una aparece por separado en la lista lateral;
  puedes **reordenarlas arrastrando**, ocultarlas (👁) y editar sus bloques.
- **Colores** de cada sección (fondo, texto, acento) con selector de color.

## Notas

- Las imágenes de la galería: súbelas desde el selector de imagen de cada
  bloque. Puedes usar como punto de partida los planos SVG del repo (`/planos`).
- El carrusel duplica internamente los ítems para que el bucle sea **continuo y
  sin saltos**. Respeta `prefers-reduced-motion` (accesibilidad).
- Todo el código es estándar de Shopify (Liquid + schema), compatible con temas
  Online Store 2.0 (Dawn y similares).
