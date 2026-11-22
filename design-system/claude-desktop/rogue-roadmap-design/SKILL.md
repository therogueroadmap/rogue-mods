---
name: rogue-roadmap-design
description: Aplica el sistema de diseño de The Rogue Roadmap (navy, naranja y crema; tipografía Outfit; el explorador encapuchado y el ciclo del día) a todo lo visual que Claude cree en chats y proyectos — artifacts HTML, React, presentaciones, diagramas, documentos con formato y SVG. Úsala cuando se pida algo "con el estilo de The Rogue Roadmap", "con nuestro brand", "rogue", "roadmap del rogue", o cuando el proyecto lo indique en sus instrucciones.
---

# The Rogue Roadmap · sistema de diseño

Todo lo visual que crees en este proyecto sigue este sistema. Los archivos `tokens.css` y `components.css` de esta skill son la fuente de verdad: cópialos completos dentro del `<style>` del artifact (los artifacts no cargan hojas externas) y construye con sus variables y clases. No inventes colores fuera de los tokens.

## Concepto

Un explorador encapuchado (el *rogue*) recorre un camino sinuoso bajo un sol naranja: explorar agentes de IA más allá del prototipo. El avance se cuenta como un día: **alba** al empezar, **atardecer** cerca del final, **acampar** para cerrar una etapa. Usa esta metáfora para progreso, estados y vacíos, sin forzarla en textos que no la piden.

## Color

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--rr-bg-page` | `#F4EAD6` | `#0A1B35` | Fondo de página |
| `--rr-bg-surface` | `#FCF6EA` | `#0E213F` | Tarjetas |
| `--rr-bg-raised` | `#FFFCF6` | `#152B4D` | Elementos elevados, inputs |
| `--rr-text-primary` | `#0A1B35` | `#FCF3E1` | Texto (≥ 12.8:1) |
| `--rr-text-muted` | `#56627A` | `#AFAA9F` | Texto secundario (≥ 5.1:1) |
| `--rr-accent` | `#F7792C` | `#F7792C` | Rellenos, botones, marcas |
| `--rr-accent-text` | `#A8470F` | `#FB9B57` | Texto en color de acento |
| `--rr-on-accent` | `#0A1B35` | `#0A1B35` | Texto sobre naranja (6.3:1) |

Reglas:

- El naranja `#F7792C` es el sol: rellenos y marcas. **Nunca texto naranja sobre crema** (2.5:1): usa `--rr-accent-text`.
- Sobre naranja el texto va en **navy**, nunca en blanco ni crema.
- Colores planos en la marca: sin degradados en el emblema. Los degradados solo para cielos (`.rr-sky`, ciclo del día).
- Modo oscuro = noche navy, no inversión: el naranja sigue siendo el sol.
- Semánticos: peligro `#C42B3A`/`#FF7A82`, éxito `#2F7D55`/`#5BD49A`, advertencia `#8F5A0F`/`#F5B544`, info `#5A47BF`/`#B3A6FF` (claro/oscuro).

## Ciclo del día

Pon `data-rr-phase="<fase>"` en cualquier contenedor para teñir `--rr-phase-accent` y el cielo (`--rr-sky-top`, `--rr-sky-mid`, `--rr-sky-horizon`). Útil para barras de progreso, roadmaps y timelines.

| Fase | Desde | Acento |
|---|---|---|
| `alba` | 0 % | `#E0708D` |
| `manana` | 15 % | `#F7792C` |
| `mediodia` | 35 % | `#F7792C` |
| `tarde` | 55 % | `#F2672E` |
| `atardecer` | 75 % | `#EC553F` |
| `anochecer` | 90 % | `#8C7BEA` |

## Tipografía

- **Outfit** (Google Fonts, 400/500/600/700) para todo: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">`.
- **JetBrains Mono** para código y números tabulares.
- Escala (tercera mayor): 12 · 14 · 16 · 20 · 25 · 31 · 39 · 49 px. Títulos en 700 con tracking −0.02em; etiquetas en mayúsculas 12 px, 600, tracking 0.08em, color `--rr-accent-text`.
- Un título principal lleva la regla naranja debajo (clase `.rr-rule`), como en los banners del brand.

## Espacio, forma y movimiento

- Espaciado base 4 px: 2 · 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.
- Radios: 4 · 8 · 12 · 18 · 24 y píldora para botones y chips. El emblema usa 18 % del lado.
- Sombras teñidas de navy (`--rr-shadow-sm|md|lg`); foco = anillo naranja (`--rr-shadow-glow`).
- Movimiento lento y con sentido: 120/200/320 ms en la UI, 800 ms el paso del explorador, 4 s la respiración del farol. Respeta `prefers-reduced-motion`.

## Componentes (`components.css`)

`.rr-btn` (`--primary` naranja con texto navy, `--secondary` contorno, `--ghost`, `--sm`) · `.rr-chip` (punto del color de la fase) · `.rr-card` (`--raised`) · `.rr-field` + `.rr-input` · `.rr-road` (progreso como camino: tramo recorrido naranja, por recorrer punteado, `.rr-road__rogue` como marcador y `.rr-road__camp` al final; `data-pace="explora|espera"`) · `.rr-avatar` · `.rr-sky` · `.rr-msg--user|--assistant` · `.rr-toast` · `.rr-code` · tipografía `.rr-display`, `.rr-h1`–`.rr-h4`, `.rr-eyebrow`.

## Iconografía e ilustración

- Glifos en rejilla 24 × 24, trazo 2.6, extremos y uniones redondeados, sin relleno, en navy (sobre naranja) o en el color del texto.
- El explorador: silueta encapuchada con capucha en pico, capa, bufanda naranja, bastón y farol, mirando a la derecha. Navy de día, crema de noche. Camina cuando hay trabajo en curso; se detiene con el farol encendido y un globo de "…" cuando espera a la persona.
- Paisajes: montañas suaves en capas, un camino sinuoso que va de izquierda (inicio) a derecha (meta) y un campamento ▲ al final. Sol que sale por la izquierda y se pone por la derecha.
- No uses el logo, los personajes ni el arte de otras marcas.

## Voz

Español neutro, frases cortas y directas. El vocabulario del camino (rumbo, tramo, etapa, acampar, amanecer) da color a títulos, estados vacíos y avisos; el contenido técnico se dice sin metáforas.

## Plantilla mínima de un artifact

```html
<title>Nombre propio</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
/* pega aquí tokens.css y components.css completos */
body { margin: 0; }
</style>
<main class="rr" data-rr-phase="manana">
  <p class="rr-eyebrow">The Rogue Roadmap</p>
  <h1 class="rr-h1 rr-rule">Título</h1>
</main>
```
