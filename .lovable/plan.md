
## Cambios a realizar

### 1. Corregir SEOHead en Nosotros.tsx
- Cambiar `path="/nosotros"` → `path="/historia"` en el componente SEOHead de `src/pages/Nosotros.tsx` (línea 19)
- La ruta en App.tsx y Navbar ya apuntan correctamente a `/historia`

### 2. WhatsApp CTA en Index.tsx (sección inferior)
- Cambiar el título a: *"¿Querés hacer un pedido o tenés alguna consulta?"*
- Cambiar la descripción a: *"Tortas personalizadas, pedidos especiales o consultas — Escribime por WhatsApp y te respondo lo antes posible."*
- Cambiar el texto del botón de "Pedí por WhatsApp" → **"CHATEAR"** (con ícono de WhatsApp)
- Eliminar el texto de "Producción limitada..." debajo del botón

### 3. Contacto: botón WhatsApp
- Si existe un botón "CHATEÁ CON NOSOTROS", cambiar el texto a solo **"CHATEAR"**
- En el código actual el botón dice "Pedí por WhatsApp" — se cambiará a "Chatear"

### No se modifica nada más
- No se toca el catálogo, la página de pedidos, ni el admin
- No se cambian estilos, colores ni layout
