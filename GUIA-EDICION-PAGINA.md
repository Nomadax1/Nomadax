# Guía rápida — Editar la página de Nomadax

La página es el archivo **`index.html`**. Es **un solo archivo, 100 % editable**,
sin dependencias externas. Para verla: haz **doble clic** en `index.html` y se
abre en tu navegador.

## Qué puedes editar y dónde

| Quiero cambiar… | Dónde está | Cómo |
|-----------------|-----------|------|
| **Colores y acento** | Bloque `<style>` → `:root` (arriba del todo) | Cambia los valores hex (p. ej. `--beige`) |
| **Textos** | En el HTML, busca los comentarios `<!-- EDITABLE: ... -->` | Edita el texto entre etiquetas |
| **Precio** | Busca `EDITABLE: PRECIO` | Cambia la cifra |
| **Imágenes / renders** | Atributos `src="planos/..."` | Sustituye por tus fotos (`src="mis-fotos/foto.jpg"`) |
| **Botones de compra** | `href="#"` en la sección "comprar" y el nav | Pon tu enlace de Shopify/Amazon |
| **Aerolíneas, FAQ, specs** | Secciones marcadas con comentarios | Edita el contenido |

## Estructura de la página (de arriba a abajo)

1. **Nav** — marca + enlaces + botón comprar
2. **Hero** — titular, subtítulo, CTA, imagen principal
3. **Tira** — aerolíneas compatibles
4. **Diferenciadores** — 3 tarjetas
5. **Características** — 3 bloques con imagen
6. **Galería** — planos / renders del producto
7. **Especificaciones** — tabla técnica
8. **CTA final** — llamada a la compra
9. **FAQ** — preguntas desplegables
10. **Pie**

## Consejos

- **No necesitas saber programar:** todo el texto visible está en el HTML entre
  etiquetas; cámbialo y guarda.
- **Para cambiar toda la estética** sin tocar el resto, edita solo las variables
  de `:root`.
- **Para publicarla online** puedes subir `index.html` + la carpeta `planos/` a
  cualquier hosting estático (GitHub Pages, Netlify, Vercel) o copiar el HTML en
  una página de Shopify.

> Si prefieres editarla en un editor visual (tipo "arrastrar y soltar") en lugar
> de tocar el HTML, dímelo y te preparo una versión para un constructor concreto
> (Shopify, Webflow, etc.).
