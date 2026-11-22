# The Rogue Roadmap en Claude Desktop (chat y proyectos)

Claude Desktop no permite cambiar los colores de su propia interfaz de chat. Lo que sí se puede es hacer que **todo lo que Claude crea** en tus chats y proyectos (artifacts, presentaciones, diagramas, documentos) salga con el sistema de diseño, y que escriba con la voz del proyecto. Para la interfaz en sí, el mod [`rogue-road`](../../rogue-road/) tematiza las sesiones de Claude Code (en la app de escritorio, en la pestaña Code, y en el móvil).

| Pieza | Qué hace | Dónde se configura |
|---|---|---|
| Skill `rogue-roadmap-design` | Enseña a Claude los tokens, componentes, iconografía y voz, con `tokens.css` y `components.css` listos para pegar | Configuración → Capacidades → Skills → Subir skill |
| `project-instructions.md` | Versión corta del sistema para que un proyecto lo aplique siempre | Proyecto → Instrucciones |
| `style.md` | Estilo de escritura en español neutro con la voz del camino | Configuración → Estilos → Crear estilo |

## Instalar la skill

1. Genera el zip desde la raíz del repositorio:

   ```bash
   design-system/scripts/package-skill.sh
   ```

   Crea `design-system/claude-desktop/rogue-roadmap-design.zip` con la carpeta de la skill dentro.
2. En Claude Desktop: Configuración → Capacidades → activa «Ejecución de código y creación de archivos» si no lo está, y en **Skills** pulsa «Subir skill» y elige el zip.
3. En un chat, pide por ejemplo «Hazme un roadmap del trimestre con el estilo de The Rogue Roadmap».

## Usarlo en un proyecto

1. Crea un proyecto (o abre uno) → **Instrucciones** → pega el contenido de `project-instructions.md`.
2. Opcional: sube `rogue-roadmap-design/tokens.css` y `components.css` a los **Archivos** del proyecto para que estén siempre en el contexto.
3. Opcional: elige el estilo «Rogue Roadmap» en el selector de estilos del chat.

Los nombres de los menús pueden variar entre versiones de la app.
