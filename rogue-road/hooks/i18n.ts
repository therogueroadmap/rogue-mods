// Los textos de rogue-road en español, inglés y francés. Los comandos quedan
// en inglés en los tres idiomas; lo demás (banda, bitácora, avisos, fondo,
// respuestas y los pedidos al modelo) sigue el ajuste «Idioma».

import type { EntryKind, MarkKind, Weather } from '../types'

export type Lang = 'es' | 'en' | 'fr'

/** El idioma elegido en los ajustes del mod; español si no hay otro. */
export const langOf = (value: unknown): Lang => (value === 'english' ? 'en' : value === 'français' ? 'fr' : 'es')

export type Texts = {
  phases: { name: string; tip: string }[]
  walking: string
  waiting: string
  weather: Record<Weather, { name: string; toast: string }>
  kinds: Record<EntryKind, string>
  marks: Record<MarkKind, string>
  entry: {
    camp: string
    clear: string
    dawn: (phase: string) => string
    enters: (phase: string) => string
    joins: (type: string) => string
    returns: (type: string) => string
    summary: (focus: string) => string
    handoff: (purpose: string) => string
    prOpen: string
  }
  toast: {
    dawn: (phase: string) => string
    night: string
    dusk: string
    phase: (phase: string) => string
    campFail: string
    clearFail: string
    submitFail: (what: string) => string
    stillLight: (percent: number, from: number) => string
    traveler: (head: string, tip: string) => string
    mates: (n: number) => string
  }
  what: { summary: string; handoff: string }
  campFocus: string
  campText: string
  clearText: string
  band: {
    logbook: string
    camp: string
    soundOn: string
    soundOff: string
    more: string
    less: string
    hide: string
    limit: (name: string, percent: number, reset: string) => string
    resets: (clock: string) => string
    limitNames: Record<string, string>
    autocompact: (tokens: string) => string
    cost: (usd: string) => string
  }
  pane: {
    title: string
    day: (n: number) => string
    solo: string
    with: (types: string) => string
    empty: string
    pastDays: string
    noMarks: string
  }
  cmd: {
    rogueRoadMod: string
    makeCamp: string
    logbook: string
    sound: string
    clearTrail: string
    trailLog: string
    trailLogHint: string
    passTheMap: string
    passTheMapHint: string
  }
  reply: {
    soundOn: string
    soundOff: string
    logbookOpen: string
    logbookLater: (reason: string) => string
    summary: string
    handoff: string
    context: string
    unmeasured: string
    surfaces: (list: string, draw: string, sound: string) => string
    none: string
  }
  draw: { painted: string; notPainted: (reason: string) => string; unpainted: string; noReason: string }
  soundNote: { ready: string; off: string; refused: string }
  alt: (phase: string, isWalking: boolean, percent: number, weather: string, marks: number, mates: number) => string
  noEntries: string
  trailLogPrompt: (focus: string, log: string) => string
  passTheMapPrompt: (purpose: string, log: string) => string
}

// ─── Español ─────────────────────────────────────────────────────────

const es: Texts = {
  phases: [
    { name: 'Alba', tip: 'El camino está despejado: contexto fresco y todo por explorar.' },
    { name: 'Mañana', tip: 'Buen ritmo. El explorador avanza con el sol a la espalda.' },
    { name: 'Mediodía', tip: 'Medio camino recorrido. La conversación tiene mucho contexto útil.' },
    { name: 'Tarde', tip: 'Las sombras se alargan: lo más antiguo de la conversación empieza a pesar.' },
    { name: 'Atardecer', tip: 'Queda poca luz. Planea dónde acampar: /make-camp compacta y trae un nuevo amanecer.' },
    { name: 'Anochecer', tip: 'Caminar de noche es arriesgado: el contexto está casi lleno. Acampa con /make-camp.' },
  ],
  walking: 'explorando',
  waiting: 'esperándote',
  weather: {
    despejado: { name: 'despejado', toast: '☼ Se despeja: las herramientas vuelven a responder.' },
    nublado: { name: 'nublado', toast: '☁ Se nubla: un par de herramientas fallaron.' },
    lluvia: { name: 'lluvia', toast: '☂ Llueve: varias herramientas fallaron seguidas. Quizás convenga revisar el rumbo.' },
    tormenta: { name: 'tormenta', toast: '⛈ Tormenta en el horizonte: un límite de uso pasó del 80 %.' },
  },
  kinds: {
    commit: 'commit', tests: 'tests en verde', pr: 'PR', push: 'push', fase: 'fase', amanecer: 'amanecer', clima: 'clima',
    compañero: 'compañero', acampada: 'acampada', limpieza: 'limpieza', resumen: 'resumen', relevo: 'relevo',
  },
  marks: { commit: 'commit', tests: 'tests en verde', pr: 'PR', push: 'push' },
  entry: {
    camp: 'Acampa: la conversación se compacta',
    clear: 'Limpia el sendero: el contexto empieza de cero',
    dawn: p => `Nuevo amanecer: ${p}`,
    enters: p => `Entra en ${p}`,
    joins: type => `Se une ${type}`,
    returns: type => `${type} vuelve con lo que encontró`,
    summary: f => (f === '' ? 'Pide el resumen del día' : `Pide el resumen del día: ${f}`),
    handoff: p => (p === '' ? 'Pasa el mapa a una sesión nueva' : `Pasa el mapa: ${p}`),
    prOpen: 'PR abierto',
  },
  toast: {
    dawn: p => `Nuevo amanecer: ${p}. El campamento quedó atrás y el camino sigue.`,
    night: '☾ Anochecer: el contexto está casi lleno. /make-camp para compactar y amanecer de nuevo.',
    dusk: '◒ Atardecer: queda poca luz. Piensa dónde acampar (/make-camp).',
    phase: p => `${p}: el explorador sigue el camino.`,
    campFail: 'No se pudo acampar. Usa /compact directamente.',
    clearFail: 'No se pudo limpiar el sendero. Usa /clear directamente.',
    submitFail: what => `No se pudo ${what}. Inténtalo de nuevo cuando Claude termine.`,
    stillLight: (p, from) => `⛺ Aún hay luz (${p} %). El campamento espera al atardecer, desde el ${from} %.`,
    traveler: (head, tip) => `${head}. ${tip}`,
    mates: n => `${n} compañeros`,
  },
  what: { summary: 'pedir el resumen', handoff: 'pasar el mapa' },
  campFocus: 'Conserva el rumbo: objetivos, decisiones tomadas, archivos tocados y próximos pasos. Descarta lo explorado sin salida.',
  campText: '⛺ Acampando: la conversación se compacta en cuanto Claude queda libre. Mañana amanece de nuevo.',
  clearText: '⌫ Limpiando el sendero: el contexto se vacía en cuanto Claude queda libre. La bitácora conserva lo recorrido.',
  band: {
    logbook: 'Bitácora',
    camp: '⛺ Acampar',
    soundOn: 'Silenciar el sonido',
    soundOff: 'Activar el sonido',
    more: 'Detalle',
    less: 'Menos',
    hide: 'Ocultar',
    limit: (name, p, reset) => `límite ${name} ${p} %${reset}`,
    resets: c => ` (reinicia ${c})`,
    limitNames: { five_hour: '5 h', seven_day: '7 días', spend_limit: 'gasto' },
    autocompact: n => `autocompacta a ${n}`,
    cost: usd => `≈ US$ ${usd} (estimado)`,
  },
  pane: {
    title: 'Bitácora del viaje',
    day: n => `Día ${n}`,
    solo: 'Viaja solo.',
    with: types => `⚇ Con ${types}`,
    empty: 'El día recién empieza: todavía no hay nada anotado.',
    pastDays: 'Días anteriores',
    noMarks: 'sin hitos',
  },
  cmd: {
    rogueRoadMod: 'Repinta el tema y muestra en qué punto del camino (y del día) va la sesión',
    makeCamp: 'Acampa: compacta la conversación y vuelve a amanecer',
    logbook: 'Abre la bitácora del viaje: hitos, fases, clima y compañeros',
    sound: 'Habilita o deshabilita el sonido ambiental del camino (on | off)',
    clearTrail: 'Limpia el sendero: vacía el contexto (/clear) y empieza de cero',
    trailLog: 'Pide a Claude el resumen de la sesión para cerrar el día',
    trailLogHint: '[foco]',
    passTheMap: 'Pasa el mapa: un handoff para continuar en una sesión nueva (skill handoff)',
    passTheMapHint: '[propósito de la próxima sesión]',
  },
  reply: {
    soundOn: '♪ Sonido habilitado: el camino suena según la fase y el clima. En la app de escritorio, activa también el parlante de la barra de título.',
    soundOff: '♪ Sonido deshabilitado. /sound on lo vuelve a habilitar.',
    logbookOpen: 'Bitácora abierta.',
    logbookLater: r => `La bitácora queda lista para abrirse: ${r}`,
    summary: '✎ Junto a la fogata: Claude escribe el resumen de la sesión.',
    handoff: '⇢ Pasando el mapa: Claude prepara el handoff y te dirá dónde quedó el archivo.',
    context: 'contexto',
    unmeasured: 'sin medir aún',
    surfaces: (list, draw, sound) => `Superficies: ${list} · fondo ${draw} · ${sound}`,
    none: 'ninguna',
  },
  draw: { painted: 'pintado', notPainted: r => `no pintado: ${r}`, unpainted: 'sin pintar aún', noReason: 'sin motivo' },
  soundNote: { ready: 'sonido listo (actívalo con el parlante de la barra de título)', off: 'sonido apagado', refused: 'la app no aceptó el sonido' },
  alt: (phase, isWalking, p, weather, marks, mates) =>
    `${phase}: un explorador encapuchado ${isWalking ? 'camina' : 'espera con su farol'} sobre un camino; ${p} % del contexto recorrido; clima ${weather}; ${marks} hitos en el camino${mates > 0 ? `; ${mates} compañeros` : ''}`,
  noEntries: '- (sin entradas)',
  trailLogPrompt: (focus, log) => `Cierra el día de viaje con un resumen de esta sesión (lo pide /trail-log, del mod rogue-road). Escríbelo en español, breve y fácil de escanear:

1. Objetivo de la sesión.
2. Qué se hizo: cambios concretos, con hashes de commit, ramas y URLs de PR cuando existan.
3. Decisiones tomadas y por qué.
4. Qué quedó pendiente o sin verificar. Márcalo como tal: no des por hecho lo que no comprobaste.
5. Próximos pasos sugeridos.

No hagas cambios ni ejecutes comandos: solo resume lo que ya pasó.${focus === '' ? '' : `\n\nFoco pedido: ${focus}`}

Bitácora del mod (hitos, fases y clima de hoy):
${log}`,
  passTheMapPrompt: (purpose, log) => `Pasa el mapa: prepara un handoff para que una sesión nueva continúe este trabajo (lo pide /pass-the-map, del mod rogue-road).

Propósito de la próxima sesión: ${purpose === '' ? 'continuar el trabajo en curso' : purpose}

Si la skill \`handoff\` está disponible, úsala con ese propósito. Si no lo está, escribe tú el documento con sus mismas reglas:

- Un solo archivo markdown en el directorio temporal del sistema ($TMPDIR, si no /tmp; %TEMP% en Windows), no en el repositorio.
- El hilo vivo: qué está en curso, por qué y qué sigue, orientado al propósito indicado.
- Referencia specs, planes, issues, commits y diffs por ruta o URL; no los copies.
- Una sección «Skills sugeridas» con lo que debería usar el próximo agente.
- Ningún secreto: claves, tokens o contraseñas quedan redactados.
- Distingue lo verificado de lo supuesto: no escribas como hecho algo que no comprobaste.

Al terminar, dime en español la ruta exacta del archivo y recuérdame copiarlo a un lugar duradero si la próxima sesión no empieza pronto o corre en otra máquina. No cambies nada más.

Bitácora del mod (hitos, fases y clima de hoy):
${log}`,
}

// ─── English ─────────────────────────────────────────────────────────

const en: Texts = {
  phases: [
    { name: 'Dawn', tip: 'The road is clear: a fresh context and everything left to explore.' },
    { name: 'Morning', tip: 'Good pace. The explorer walks on with the sun at its back.' },
    { name: 'Noon', tip: 'Halfway there. The conversation holds plenty of useful context.' },
    { name: 'Afternoon', tip: 'Shadows grow long: the oldest part of the conversation starts to weigh.' },
    { name: 'Sunset', tip: 'Little light left. Plan where to camp: /make-camp compacts and brings a new dawn.' },
    { name: 'Nightfall', tip: 'Walking at night is risky: the context is nearly full. Camp with /make-camp.' },
  ],
  walking: 'exploring',
  waiting: 'waiting for you',
  weather: {
    despejado: { name: 'clear', toast: '☼ The sky clears: the tools respond again.' },
    nublado: { name: 'cloudy', toast: '☁ Clouds roll in: a couple of tools failed.' },
    lluvia: { name: 'rain', toast: '☂ Rain: several tools failed in a row. It may be time to check the course.' },
    tormenta: { name: 'storm', toast: '⛈ Storm on the horizon: a usage limit passed 80 %.' },
  },
  kinds: {
    commit: 'commit', tests: 'green tests', pr: 'PR', push: 'push', fase: 'phase', amanecer: 'dawn', clima: 'weather',
    compañero: 'companion', acampada: 'camp', limpieza: 'clear', resumen: 'summary', relevo: 'handoff',
  },
  marks: { commit: 'commit', tests: 'green tests', pr: 'PR', push: 'push' },
  entry: {
    camp: 'Makes camp: the conversation is compacted',
    clear: 'Clears the trail: the context starts from nothing',
    dawn: p => `New dawn: ${p}`,
    enters: p => `Enters ${p}`,
    joins: type => `${type} joins`,
    returns: type => `${type} comes back with what it found`,
    summary: f => (f === '' ? 'Asks for the day’s summary' : `Asks for the day’s summary: ${f}`),
    handoff: p => (p === '' ? 'Passes the map to a new session' : `Passes the map: ${p}`),
    prOpen: 'PR opened',
  },
  toast: {
    dawn: p => `New dawn: ${p}. The camp is behind and the road goes on.`,
    night: '☾ Nightfall: the context is nearly full. /make-camp to compact and see a new dawn.',
    dusk: '◒ Sunset: little light left. Think about where to camp (/make-camp).',
    phase: p => `${p}: the explorer keeps to the road.`,
    campFail: 'Could not make camp. Use /compact directly.',
    clearFail: 'Could not clear the trail. Use /clear directly.',
    submitFail: what => `Could not ${what}. Try again when Claude is done.`,
    stillLight: (p, from) => `⛺ There is still light (${p} %). The camp waits for sunset, from ${from} %.`,
    traveler: (head, tip) => `${head}. ${tip}`,
    mates: n => `${n} companions`,
  },
  what: { summary: 'ask for the summary', handoff: 'pass the map' },
  campFocus: 'Keep the course: goals, decisions made, files touched and next steps. Drop the dead ends.',
  campText: '⛺ Making camp: the conversation is compacted as soon as Claude is free. A new day dawns.',
  clearText: '⌫ Clearing the trail: the context empties as soon as Claude is free. The logbook keeps the road behind.',
  band: {
    logbook: 'Logbook',
    camp: '⛺ Make camp',
    soundOn: 'Mute the sound',
    soundOff: 'Turn the sound on',
    more: 'Details',
    less: 'Less',
    hide: 'Hide',
    limit: (name, p, reset) => `${name} limit ${p} %${reset}`,
    resets: c => ` (resets ${c})`,
    limitNames: { five_hour: '5 h', seven_day: '7-day', spend_limit: 'spend' },
    autocompact: n => `autocompacts at ${n}`,
    cost: usd => `≈ US$ ${usd} (estimate)`,
  },
  pane: {
    title: 'Travel logbook',
    day: n => `Day ${n}`,
    solo: 'Travelling alone.',
    with: types => `⚇ With ${types}`,
    empty: 'The day has just begun: nothing logged yet.',
    pastDays: 'Earlier days',
    noMarks: 'no milestones',
  },
  cmd: {
    rogueRoadMod: 'Repaints the theme and shows where the session is on the road (and in the day)',
    makeCamp: 'Makes camp: compacts the conversation and brings a new dawn',
    logbook: 'Opens the travel logbook: milestones, phases, weather and companions',
    sound: 'Turns the road’s ambient sound on or off (on | off)',
    clearTrail: 'Clears the trail: empties the context (/clear) and starts from nothing',
    trailLog: 'Asks Claude for the session summary to close the day',
    trailLogHint: '[focus]',
    passTheMap: 'Passes the map: a handoff to continue in a new session (handoff skill)',
    passTheMapHint: '[purpose of the next session]',
  },
  reply: {
    soundOn: '♪ Sound on: the road sounds with the phase and the weather. In the desktop app, also turn on the speaker in the title bar.',
    soundOff: '♪ Sound off. /sound on turns it back on.',
    logbookOpen: 'Logbook opened.',
    logbookLater: r => `The logbook is ready to open: ${r}`,
    summary: '✎ By the campfire: Claude writes the session summary.',
    handoff: '⇢ Passing the map: Claude prepares the handoff and will tell you where the file is.',
    context: 'context',
    unmeasured: 'not measured yet',
    surfaces: (list, draw, sound) => `Surfaces: ${list} · backdrop ${draw} · ${sound}`,
    none: 'none',
  },
  draw: { painted: 'painted', notPainted: r => `not painted: ${r}`, unpainted: 'not painted yet', noReason: 'no reason given' },
  soundNote: { ready: 'sound ready (turn on the speaker in the title bar)', off: 'sound off', refused: 'the app did not accept the sound' },
  alt: (phase, isWalking, p, weather, marks, mates) =>
    `${phase}: a hooded explorer ${isWalking ? 'walks' : 'waits with its lantern'} on a road; ${p} % of the context covered; ${weather} weather; ${marks} milestones on the road${mates > 0 ? `; ${mates} companions` : ''}`,
  noEntries: '- (no entries)',
  trailLogPrompt: (focus, log) => `Close the day's journey with a summary of this session (requested by /trail-log, from the rogue-road mod). Write it in English, short and easy to scan:

1. The session's goal.
2. What was done: concrete changes, with commit hashes, branches and PR URLs where they exist.
3. Decisions made and why.
4. What is pending or unverified. Mark it as such: do not present as done what you did not check.
5. Suggested next steps.

Make no changes and run no commands: only summarise what already happened.${focus === '' ? '' : `\n\nRequested focus: ${focus}`}

The mod's logbook (today's milestones, phases and weather):
${log}`,
  passTheMapPrompt: (purpose, log) => `Pass the map: prepare a handoff so a new session can continue this work (requested by /pass-the-map, from the rogue-road mod).

Purpose of the next session: ${purpose === '' ? 'continue the work in progress' : purpose}

If the \`handoff\` skill is available, use it with that purpose. If it is not, write the document yourself by its rules:

- One markdown file in the system's temporary directory ($TMPDIR, else /tmp; %TEMP% on Windows), not in the repository.
- The live thread: what is in flight, why, and what comes next, aimed at the stated purpose.
- Reference specs, plans, issues, commits and diffs by path or URL; do not copy them.
- A "Suggested skills" section naming what the next agent should reach for.
- No secrets: keys, tokens and passwords are redacted.
- Tell what was verified from what was assumed: do not write as fact anything you did not check.

When done, tell me in English the exact path of the file, and remind me to copy it somewhere durable if the next session will not start soon or runs on another machine. Change nothing else.

The mod's logbook (today's milestones, phases and weather):
${log}`,
}

// ─── Français ────────────────────────────────────────────────────────

const fr: Texts = {
  phases: [
    { name: 'Aube', tip: 'Le chemin est dégagé : un contexte neuf et tout à explorer.' },
    { name: 'Matin', tip: 'Bon rythme. L’explorateur avance, le soleil dans le dos.' },
    { name: 'Midi', tip: 'La moitié du chemin est faite. La conversation contient beaucoup de contexte utile.' },
    { name: 'Après-midi', tip: 'Les ombres s’allongent : le plus ancien de la conversation commence à peser.' },
    { name: 'Crépuscule', tip: 'Il reste peu de lumière. Prévoyez où camper : /make-camp compacte et ramène l’aube.' },
    { name: 'Nuit', tip: 'Marcher de nuit est risqué : le contexte est presque plein. Campez avec /make-camp.' },
  ],
  walking: 'en route',
  waiting: 'vous attend',
  weather: {
    despejado: { name: 'dégagé', toast: '☼ Le ciel se dégage : les outils répondent de nouveau.' },
    nublado: { name: 'nuageux', toast: '☁ Le ciel se couvre : deux outils ont échoué.' },
    lluvia: { name: 'pluie', toast: '☂ Il pleut : plusieurs outils ont échoué d’affilée. Il est peut-être temps de revoir le cap.' },
    tormenta: { name: 'orage', toast: '⛈ Orage à l’horizon : une limite d’utilisation a dépassé 80 %.' },
  },
  kinds: {
    commit: 'commit', tests: 'tests au vert', pr: 'PR', push: 'push', fase: 'phase', amanecer: 'aube', clima: 'météo',
    compañero: 'compagnon', acampada: 'campement', limpieza: 'effacement', resumen: 'résumé', relevo: 'relais',
  },
  marks: { commit: 'commit', tests: 'tests au vert', pr: 'PR', push: 'push' },
  entry: {
    camp: 'Installe le camp : la conversation est compactée',
    clear: 'Efface la piste : le contexte repart de zéro',
    dawn: p => `Nouvelle aube : ${p}`,
    enters: p => `Entre dans : ${p}`,
    joins: type => `${type} se joint au voyage`,
    returns: type => `${type} revient avec ce qu’il a trouvé`,
    summary: f => (f === '' ? 'Demande le résumé du jour' : `Demande le résumé du jour : ${f}`),
    handoff: p => (p === '' ? 'Passe la carte à une nouvelle session' : `Passe la carte : ${p}`),
    prOpen: 'PR ouverte',
  },
  toast: {
    dawn: p => `Nouvelle aube : ${p}. Le campement est derrière et le chemin continue.`,
    night: '☾ Nuit : le contexte est presque plein. /make-camp pour compacter et retrouver l’aube.',
    dusk: '◒ Crépuscule : il reste peu de lumière. Pensez à camper (/make-camp).',
    phase: p => `${p} : l’explorateur poursuit son chemin.`,
    campFail: 'Impossible d’installer le camp. Utilisez /compact directement.',
    clearFail: 'Impossible d’effacer la piste. Utilisez /clear directement.',
    submitFail: what => `Impossible de ${what}. Réessayez quand Claude aura terminé.`,
    stillLight: (p, from) => `⛺ Il fait encore jour (${p} %). Le campement attend le crépuscule, à partir de ${from} %.`,
    traveler: (head, tip) => `${head}. ${tip}`,
    mates: n => `${n} compagnons`,
  },
  what: { summary: 'demander le résumé', handoff: 'passer la carte' },
  campFocus: 'Garde le cap : objectifs, décisions prises, fichiers modifiés et prochaines étapes. Écarte les impasses.',
  campText: '⛺ Installation du camp : la conversation est compactée dès que Claude est libre. Une nouvelle aube se lève.',
  clearText: '⌫ Effacement de la piste : le contexte se vide dès que Claude est libre. Le carnet garde le chemin parcouru.',
  band: {
    logbook: 'Carnet',
    camp: '⛺ Camper',
    soundOn: 'Couper le son',
    soundOff: 'Activer le son',
    more: 'Détails',
    less: 'Moins',
    hide: 'Masquer',
    limit: (name, p, reset) => `limite ${name} ${p} %${reset}`,
    resets: c => ` (réinitialisée à ${c})`,
    limitNames: { five_hour: '5 h', seven_day: '7 jours', spend_limit: 'dépenses' },
    autocompact: n => `compactage auto à ${n}`,
    cost: usd => `≈ ${usd} $ US (estimation)`,
  },
  pane: {
    title: 'Carnet de voyage',
    day: n => `Jour ${n}`,
    solo: 'Voyage seul.',
    with: types => `⚇ Avec ${types}`,
    empty: 'La journée commence à peine : rien n’est encore noté.',
    pastDays: 'Jours précédents',
    noMarks: 'aucun jalon',
  },
  cmd: {
    rogueRoadMod: 'Repeint le thème et montre où en est la session sur le chemin (et dans la journée)',
    makeCamp: 'Installe le camp : compacte la conversation et ramène l’aube',
    logbook: 'Ouvre le carnet de voyage : jalons, phases, météo et compagnons',
    sound: 'Active ou coupe le son d’ambiance du chemin (on | off)',
    clearTrail: 'Efface la piste : vide le contexte (/clear) et repart de zéro',
    trailLog: 'Demande à Claude le résumé de la session pour clore la journée',
    trailLogHint: '[axe]',
    passTheMap: 'Passe la carte : un handoff pour continuer dans une nouvelle session (skill handoff)',
    passTheMapHint: '[objectif de la prochaine session]',
  },
  reply: {
    soundOn: '♪ Son activé : le chemin sonne selon la phase et la météo. Dans l’app de bureau, activez aussi le haut-parleur de la barre de titre.',
    soundOff: '♪ Son coupé. /sound on le réactive.',
    logbookOpen: 'Carnet ouvert.',
    logbookLater: r => `Le carnet est prêt à s’ouvrir : ${r}`,
    summary: '✎ Au coin du feu : Claude rédige le résumé de la session.',
    handoff: '⇢ Passage de la carte : Claude prépare le handoff et vous dira où se trouve le fichier.',
    context: 'contexte',
    unmeasured: 'pas encore mesuré',
    surfaces: (list, draw, sound) => `Surfaces : ${list} · fond ${draw} · ${sound}`,
    none: 'aucune',
  },
  draw: { painted: 'peint', notPainted: r => `non peint : ${r}`, unpainted: 'pas encore peint', noReason: 'sans raison' },
  soundNote: { ready: 'son prêt (activez le haut-parleur de la barre de titre)', off: 'son coupé', refused: 'l’app n’a pas accepté le son' },
  alt: (phase, isWalking, p, weather, marks, mates) =>
    `${phase} : un explorateur encapuchonné ${isWalking ? 'marche' : 'attend avec sa lanterne'} sur un chemin ; ${p} % du contexte parcouru ; météo ${weather} ; ${marks} jalons sur le chemin${mates > 0 ? ` ; ${mates} compagnons` : ''}`,
  noEntries: '- (aucune entrée)',
  trailLogPrompt: (focus, log) => `Clos la journée de voyage par un résumé de cette session (demandé par /trail-log, du mod rogue-road). Écris-le en français, bref et facile à parcourir :

1. L'objectif de la session.
2. Ce qui a été fait : changements concrets, avec les hashes de commit, les branches et les URL de PR quand elles existent.
3. Les décisions prises et pourquoi.
4. Ce qui reste en suspens ou non vérifié. Indique-le comme tel : ne présente pas comme fait ce que tu n'as pas vérifié.
5. Les prochaines étapes suggérées.

Ne fais aucun changement et n'exécute aucune commande : résume seulement ce qui s'est passé.${focus === '' ? '' : `\n\nAxe demandé : ${focus}`}

Carnet du mod (jalons, phases et météo du jour) :
${log}`,
  passTheMapPrompt: (purpose, log) => `Passe la carte : prépare un handoff pour qu'une nouvelle session poursuive ce travail (demandé par /pass-the-map, du mod rogue-road).

Objectif de la prochaine session : ${purpose === '' ? 'poursuivre le travail en cours' : purpose}

Si la skill \`handoff\` est disponible, utilise-la avec cet objectif. Sinon, rédige toi-même le document selon ses règles :

- Un seul fichier markdown dans le répertoire temporaire du système ($TMPDIR, sinon /tmp ; %TEMP% sous Windows), pas dans le dépôt.
- Le fil en cours : ce qui est en cours, pourquoi, et la suite, orienté vers l'objectif indiqué.
- Référence les specs, plans, issues, commits et diffs par chemin ou URL ; ne les copie pas.
- Une section « Skills suggérées » avec ce que le prochain agent devrait utiliser.
- Aucun secret : clés, tokens et mots de passe sont masqués.
- Distingue le vérifié du supposé : n'écris pas comme un fait ce que tu n'as pas vérifié.

À la fin, donne-moi en français le chemin exact du fichier et rappelle-moi de le copier dans un endroit durable si la prochaine session ne démarre pas bientôt ou tourne sur une autre machine. Ne change rien d'autre.

Carnet du mod (jalons, phases et météo du jour) :
${log}`,
}

export const TEXT: Record<Lang, Texts> = { es, en, fr }
