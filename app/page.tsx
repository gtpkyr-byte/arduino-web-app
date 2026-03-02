'use client'

import React, {
  useState, useEffect, useCallback, useRef,
  createContext, useContext, type ReactNode
} from 'react'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type QuizQuestion = {
  id: string
  question: string
  options: string[]
  correct: number
  explanation: string
}
type ValidationRule = {
  id: string
  description: string
  check: (code: string) => boolean
  hint: string
}
type Mission = {
  id: number
  title: string
  subtitle: string
  icon: string
  duration: string
  points: number
  objective: string
  theory: string[]
  starterCode: string
  type: 'quiz' | 'code' | 'intro'
  quiz?: QuizQuestion[]
  validationRules?: ValidationRule[]
  hints: string[]
  explanation: string
  simulatorMode: 'none' | 'blink' | 'button' | 'traffic' | 'pwm'
  badge: { name: string; description: string }
  successMessage: string
  concepts: { term: string; definition: string }[]
}
type Badge = { missionId: number; name: string; description: string; earnedAt: string }
type StudentInfo = {
  name: string
  authCode: string
  startedAt: string // ISO string
}
type ProgressState = {
  currentMission: number
  completedMissions: number[]
  points: number
  badges: Badge[]
  code: Record<number, string>
  quizAnswers: Record<string, number>
  hintsUsed: Record<number, number>
  quizMistakes: Record<string, number>   // qid -> # wrong attempts
  codeMistakes: Record<number, number>   // missionId -> # failed verifications
  student: StudentInfo | null
  elapsedSeconds: number
  inactiveSeconds: number
  finished: boolean
}

// ─────────────────────────────────────────────
// MISSIONS DATA — 18 misiones (M0–M17)
// ─────────────────────────────────────────────
const MISSIONS: Mission[] = [
  // ── M0: Bienvenida ──────────────────────────
  {
    id: 0, title: 'Bienvenido(a)', subtitle: 'Conoce la plataforma', icon: '★',
    duration: '2–3 min', points: 10, type: 'intro',
    objective: 'Entender cómo funciona esta clase interactiva.',
    theory: [
      'Arduino Lab es una clase donde aprendes a programar sin necesitar hardware físico.',
      'Tienes tres zonas: la lista de misiones (izquierda), el editor de código (centro) y la teoría + simulador (derecha).',
      'En cada misión leerás una explicación corta, luego escribirás código y verás el resultado animado en pantalla.',
      'No te preocupes por equivocarte: ¡los errores son parte de aprender!',
    ],
    starterCode: '', hints: [], explanation: '', simulatorMode: 'none',
    badge: { name: 'Explorador', description: 'Completaste la introducción' },
    successMessage: '¡Bienvenido/a! Ya sabes cómo funciona la clase. ¡Vamos a programar!',
    concepts: [],
    quiz: [
      {
        id: 'q0a',
        question: '¿Necesitas conectar un Arduino real para usar esta plataforma?',
        options: [
          'Sí, siempre necesitas el hardware',
          'No, todo funciona en el navegador',
          'Solo a veces',
          'Depende del ejercicio',
        ],
        correct: 1,
        explanation: 'Arduino Lab funciona completamente en el navegador. No necesitas hardware ni instalar nada.',
      },
      {
        id: 'q0b',
        question: '¿Qué hace el simulador de esta plataforma?',
        options: [
          'Compila código C++ real de Arduino',
          'Anima LEDs en pantalla según tu código',
          'Conecta con un Arduino por Bluetooth',
          'Descarga el programa al microcontrolador',
        ],
        correct: 1,
        explanation: 'El simulador detecta funciones como digitalWrite() y anima los LEDs en pantalla. No compila C++ real.',
      },
    ],
  },

  // ── M1: Anatomía del sketch ──────────────────
  {
    id: 1, title: 'Anatomía del Sketch', subtitle: 'Las dos funciones que todo Arduino necesita', icon: '⬡',
    duration: '8–10 min', points: 20, type: 'quiz',
    objective: 'Identificar setup() y loop() y entender para qué sirve cada una.',
    theory: [
      'Todo programa Arduino tiene DOS funciones obligatorias: setup() y loop().',
      'setup() se ejecuta UNA SOLA VEZ cuando el Arduino se enciende. Aquí se configura el hardware.',
      'loop() se repite PARA SIEMPRE mientras el Arduino tenga energía. Aquí va la lógica del programa.',
      'Los comentarios empiezan con // — el programa los ignora, pero ayudan a entender el código.',
      'Las llaves { } agrupan las instrucciones de cada función. Siempre van en pares: una que abre { y una que cierra }.',
    ],
    starterCode: `// Mi primer sketch de Arduino
// Todo lo que va después de // es un comentario

void setup() {
  // Esta función se ejecuta UNA SOLA VEZ
  // al encender o reiniciar el Arduino
}

void loop() {
  // Esta función se repite PARA SIEMPRE
  // mientras el Arduino tenga energía
}`,
    hints: [
      'setup() = "preparar". Se ejecuta una sola vez.',
      'loop() = "repetir". Se ejecuta una y otra y otra vez.',
      'Los comentarios // no afectan el programa.',
    ],
    explanation: 'setup() prepara el Arduino. loop() contiene el programa principal que corre en bucle infinito.',
    simulatorMode: 'none',
    badge: { name: 'Anatomista', description: 'Dominaste la estructura básica' },
    successMessage: '¡Perfecto! Ya conoces las dos funciones fundamentales de Arduino.',
    concepts: [
      { term: 'sketch', definition: 'Nombre que Arduino da a un programa.' },
      { term: 'void setup()', definition: 'Se ejecuta una sola vez al inicio. Aquí se configura el hardware.' },
      { term: 'void loop()', definition: 'Se repite para siempre. Aquí va la lógica principal.' },
      { term: '// comentario', definition: 'Texto explicativo que el programa ignora.' },
      { term: '{ }', definition: 'Llaves que agrupan las instrucciones de una función.' },
    ],
    validationRules: [],
    quiz: [
      {
        id: 'q1a',
        question: '¿Cuántas veces se ejecuta setup()?',
        options: [
          'Se repite infinitamente, igual que loop()',
          'Solo una vez, al encender el Arduino',
          'Dos veces por segundo',
          'Solo cuando el programador lo decide',
        ],
        correct: 1,
        explanation: 'setup() se ejecuta exactamente una vez: cuando el Arduino se enciende o reinicia. Su trabajo es preparar el hardware.',
      },
      {
        id: 'q1b',
        question: '¿Qué hace esta línea?  →  // LED en el pin 13',
        options: [
          'Conecta el LED al pin 13 automáticamente',
          'Es un comentario — el programa la ignora',
          'Define una variable llamada LED',
          'Produce un error de sintaxis',
        ],
        correct: 1,
        explanation: 'Todo lo que viene después de // es un comentario. El programa lo ignora por completo. Los comentarios son solo para ayudarte a leer el código.',
      },
      {
        id: 'q1c',
        question: '¿Para qué sirven las llaves { } en Arduino?',
        options: [
          'Son decorativas, no tienen función',
          'Agrupan las instrucciones que pertenecen a una función',
          'Solo se usan dentro de comentarios',
          'Definen el nombre del Arduino',
        ],
        correct: 1,
        explanation: 'Las llaves { } marcan el inicio y el fin de una función. Todo lo que está entre ellas pertenece a esa función.',
      },
    ],
  },

  // ── M2: pinMode ──────────────────────────────
  {
    id: 2, title: 'Configura un Pin', subtitle: 'pinMode() le dice al Arduino qué esperar de cada pin', icon: '⚙',
    duration: '8–10 min', points: 30, type: 'code',
    objective: 'Escribir pinMode(13, OUTPUT) dentro de setup() para preparar el LED integrado.',
    theory: [
      'Un Arduino UNO tiene 14 pines digitales. Antes de usarlos, debes decirle al Arduino si van a ENVIAR o RECIBIR señales.',
      'pinMode(pin, modo) es la función para eso.',
      'Si el pin va a encender un LED → usa OUTPUT (salida).',
      'Si el pin va a leer un botón → usa INPUT o INPUT_PULLUP (entrada).',
      'El Arduino UNO tiene un LED integrado en el pin 13. No necesitas conectar nada.',
    ],
    starterCode: `// El LED integrado del Arduino UNO está en el pin 13
void setup() {
  // Escribe aquí: pinMode(13, OUTPUT);
  
}

void loop() {
  // Por ahora lo dejamos vacío
}`,
    hints: [
      'La sintaxis es: pinMode(numero_del_pin, MODO);',
      'El pin del LED integrado es el número 13',
      'El modo para encender LEDs es OUTPUT (siempre en mayúsculas)',
      'La línea completa es: pinMode(13, OUTPUT);',
    ],
    explanation: 'pinMode(13, OUTPUT) le dice al Arduino: "el pin 13 va a enviar electricidad". Por eso va en setup(): solo necesitas configurarlo una vez.',
    simulatorMode: 'none',
    badge: { name: 'Configurador', description: 'Configuraste tu primer pin' },
    successMessage: '¡Excelente! Pin 13 configurado como salida. Ahora podemos encender el LED.',
    concepts: [
      { term: 'pinMode(pin, modo)', definition: 'Configura un pin como OUTPUT (salida) o INPUT (entrada).' },
      { term: 'OUTPUT', definition: 'El pin puede enviar electricidad para encender LEDs u otros dispositivos.' },
      { term: 'INPUT', definition: 'El pin puede recibir señales de sensores o botones.' },
      { term: 'Pin 13', definition: 'El Arduino UNO tiene un LED integrado en este pin. No necesitas conectar nada.' },
    ],
    validationRules: [
      {
        id: 'has_setup',
        description: 'Tiene la función setup()',
        check: (c) => /void\s+setup\s*\(\s*\)/.test(c),
        hint: 'Necesitas escribir: void setup() { ... }',
      },
      {
        id: 'has_pinmode',
        description: 'Usa pinMode() en el código',
        check: (c) => /pinMode\s*\(/.test(c),
        hint: 'Escribe pinMode() dentro de las llaves de setup()',
      },
      {
        id: 'pinmode_13',
        description: 'pinMode usa el pin 13',
        check: (c) => /pinMode\s*\(\s*13\s*,/.test(c),
        hint: 'El LED integrado del Arduino UNO está en el pin 13',
      },
      {
        id: 'pinmode_output',
        description: 'El modo es OUTPUT',
        check: (c) => /pinMode\s*\(\s*13\s*,\s*OUTPUT\s*\)/.test(c),
        hint: 'El modo debe ser OUTPUT (en mayúsculas). Ejemplo: pinMode(13, OUTPUT);',
      },
      {
        id: 'pinmode_in_setup',
        description: 'pinMode está dentro de setup()',
        check: (c) => {
          const m = c.match(/void\s+setup\s*\(\s*\)\s*\{([^}]*)\}/s)
          return m ? /pinMode/.test(m[1]) : false
        },
        hint: 'Asegúrate de escribir pinMode() entre las llaves { } de setup()',
      },
    ],
  },

  // ── M3: Blink ────────────────────────────────
  {
    id: 3, title: 'Haz Parpadear el LED', subtitle: 'digitalWrite y delay — el "Hola Mundo" de Arduino', icon: '◉',
    duration: '10 min', points: 40, type: 'code',
    objective: 'Completar el código Blink clásico: encender → esperar → apagar → esperar.',
    theory: [
      'digitalWrite(pin, valor) envía electricidad a un pin. HIGH = encendido, LOW = apagado.',
      'delay(milisegundos) pausa el programa. delay(1000) espera exactamente 1 segundo.',
      'El patrón del Blink es: encender → esperar → apagar → esperar → (repite forever).',
      'Como loop() se repite para siempre, el LED parpadeará indefinidamente.',
    ],
    starterCode: `void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  // Paso 1: Enciende el LED
  digitalWrite(13, HIGH);
  
  // Paso 2: Espera 1 segundo (1000 milisegundos)
  delay(1000);
  
  // Paso 3: Apaga el LED
  // → Escribe aquí el digitalWrite para APAGAR
  
  
  // Paso 4: Espera otro segundo
  // → Escribe aquí el delay de 1000
  
}`,
    hints: [
      'Para apagar el LED escribe: digitalWrite(13, LOW);',
      'Para esperar 1 segundo escribe: delay(1000);',
      'HIGH = encendido, LOW = apagado',
      'El patrón completo: HIGH → delay → LOW → delay',
    ],
    explanation: 'digitalWrite(13, HIGH) enciende el LED. delay(1000) espera 1 segundo. Luego LOW lo apaga. loop() lo repite para siempre.',
    simulatorMode: 'blink',
    badge: { name: 'Blink Master', description: '¡Hiciste parpadear tu primer LED!' },
    successMessage: '¡El LED está parpadeando! Este es el "Hola Mundo" de Arduino. ¡Lo lograste!',
    concepts: [
      { term: 'digitalWrite(pin, valor)', definition: 'Envía HIGH (encendido) o LOW (apagado) a un pin de salida.' },
      { term: 'HIGH', definition: 'Voltaje alto = 5V = LED encendido.' },
      { term: 'LOW', definition: 'Voltaje bajo = 0V = LED apagado.' },
      { term: 'delay(ms)', definition: 'Pausa el programa. 1000 ms = 1 segundo.' },
    ],
    validationRules: [
      {
        id: 'has_setup_pinmode',
        description: 'setup() tiene pinMode(13, OUTPUT)',
        check: (c) => /void\s+setup\s*\(\s*\)/.test(c) && /pinMode\s*\(\s*13\s*,\s*OUTPUT\s*\)/.test(c),
        hint: 'Necesitas setup() con pinMode(13, OUTPUT) — ya está en el código base',
      },
      {
        id: 'has_loop',
        description: 'Tiene la función loop()',
        check: (c) => /void\s+loop\s*\(\s*\)/.test(c),
        hint: 'Necesitas void loop() { ... }',
      },
      {
        id: 'has_high',
        description: 'Enciende el LED con HIGH',
        check: (c) => /digitalWrite\s*\(\s*13\s*,\s*HIGH\s*\)/.test(c),
        hint: 'Usa digitalWrite(13, HIGH) para encender el LED',
      },
      {
        id: 'has_low',
        description: 'Apaga el LED con LOW',
        check: (c) => /digitalWrite\s*\(\s*13\s*,\s*LOW\s*\)/.test(c),
        hint: 'Usa digitalWrite(13, LOW) para apagar el LED',
      },
      {
        id: 'has_two_delays',
        description: 'Tiene dos delay() en loop()',
        check: (c) => {
          const m = c.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*)\}/s)
          return m ? (m[1].match(/delay\s*\(/g) ?? []).length >= 2 : false
        },
        hint: 'El Blink necesita dos delay(): uno después de HIGH y uno después de LOW',
      },
    ],
  },

  // ── M4: Variables y constantes ───────────────
  {
    id: 4, title: 'Variables y Constantes', subtitle: 'Dale nombre a los valores para leer el código más fácil', icon: '▣',
    duration: '8–10 min', points: 30, type: 'code',
    objective: 'Declarar const int LED_PIN = 13 y usarla en lugar del número 13.',
    theory: [
      'Una constante es un nombre que representa un número. En vez de escribir "13" cada vez, escribes "LED_PIN".',
      'La sintaxis es: const int NOMBRE = valor;',
      'const significa que el valor no puede cambiar. int significa que es un número entero.',
      'Ventaja: si cambias de pin, solo editas UNA línea al inicio, no buscas todos los "13" en el código.',
      'Las constantes se declaran FUERA de las funciones, al inicio del sketch.',
    ],
    starterCode: `// Declara la constante aquí, antes de setup()
// Ejemplo: const int LED_PIN = 13;


void setup() {
  pinMode(13, OUTPUT);   // Cambia el 13 por LED_PIN
}

void loop() {
  digitalWrite(13, HIGH);  // Cambia el 13 por LED_PIN
  delay(1000);
  digitalWrite(13, LOW);   // Cambia el 13 por LED_PIN
  delay(1000);
}`,
    hints: [
      'Antes de setup() escribe: const int LED_PIN = 13;',
      'Luego cambia cada "13" por el nombre LED_PIN',
      'Recuerda: la constante va fuera de las funciones, al inicio del archivo',
      'Código completo: const int LED_PIN = 13; y luego usar LED_PIN en todo el código',
    ],
    explanation: 'const int LED_PIN = 13 crea un nombre para el número 13. Al escribir LED_PIN el código es más fácil de entender y mantener.',
    simulatorMode: 'blink',
    badge: { name: 'Refactorizador', description: 'Tu código usa constantes' },
    successMessage: '¡Código profesional! Usar nombres descriptivos hace el código mucho más claro.',
    concepts: [
      { term: 'const', definition: 'El valor no puede cambiar durante el programa.' },
      { term: 'int', definition: 'Tipo de dato: número entero (sin decimales).' },
      { term: 'LED_PIN', definition: 'Nombre que le damos a la constante. Por convención se escribe en MAYÚSCULAS.' },
      { term: 'variable global', definition: 'Declarada fuera de funciones; se puede usar en todo el sketch.' },
    ],
    validationRules: [
      {
        id: 'has_const',
        description: 'Declara const int con valor 13',
        check: (c) => /const\s+int\s+\w+\s*=\s*13\s*;/.test(c),
        hint: 'Antes de setup() escribe: const int LED_PIN = 13;',
      },
      {
        id: 'no_raw_13_setup',
        description: 'No usa el número 13 directamente en pinMode',
        check: (c) => {
          const m = c.match(/void\s+setup\s*\(\s*\)\s*\{([^}]*)\}/s)
          return m ? !/pinMode\s*\(\s*13\s*,/.test(m[1]) : true
        },
        hint: 'Dentro de pinMode() usa tu constante (ej: LED_PIN), no el número 13',
      },
      {
        id: 'uses_const_in_loop',
        description: 'Usa la constante en digitalWrite()',
        check: (c) => {
          const cm = c.match(/const\s+int\s+(\w+)\s*=\s*13/)
          if (!cm) return false
          const v = cm[1]
          return new RegExp(`digitalWrite\\s*\\(\\s*${v}\\s*,\\s*HIGH\\s*\\)`).test(c)
            && new RegExp(`digitalWrite\\s*\\(\\s*${v}\\s*,\\s*LOW\\s*\\)`).test(c)
        },
        hint: 'Usa tu constante (ej: LED_PIN) en los dos digitalWrite() dentro de loop()',
      },
    ],
  },

  // ── M5: digitalRead ──────────────────────────
  {
    id: 5, title: 'Lee un Botón', subtitle: 'digitalRead() y la estructura if/else', icon: '◎',
    duration: '8–10 min', points: 40, type: 'code',
    objective: 'Leer el estado del botón y encender el LED mientras esté presionado.',
    theory: [
      'digitalRead(pin) lee si un pin tiene electricidad (HIGH) o no (LOW).',
      'Con INPUT_PULLUP el pin lee HIGH cuando el botón está suelto, y LOW cuando está presionado.',
      'La estructura if/else toma una decisión: "si ocurre esto → haz esto; si no → haz esto otro".',
      'Presiona el botón virtual en el simulador para ver el LED responder.',
    ],
    starterCode: `const int LED_PIN = 13;
const int BTN_PIN = 2;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(BTN_PIN, INPUT_PULLUP);
}

void loop() {
  int estadoBoton = digitalRead(BTN_PIN);
  
  if (estadoBoton == LOW) {
    // El botón está PRESIONADO → Enciende el LED
    // Escribe aquí: digitalWrite(LED_PIN, HIGH);
    
  } else {
    // El botón está SUELTO → Apaga el LED
    // Escribe aquí: digitalWrite(LED_PIN, LOW);
    
  }
}`,
    hints: [
      'Dentro del if escribe: digitalWrite(LED_PIN, HIGH);',
      'Dentro del else escribe: digitalWrite(LED_PIN, LOW);',
      'Con INPUT_PULLUP: presionado = LOW, suelto = HIGH',
      'La estructura if/else ya está lista, solo agrega las instrucciones adentro',
    ],
    explanation: 'digitalRead lee el botón. Con INPUT_PULLUP, LOW = presionado. El if/else decide encender o apagar el LED según el estado.',
    simulatorMode: 'button',
    badge: { name: 'Interactor', description: 'Tu código responde a entradas' },
    successMessage: '¡Excelente! El LED responde al botón. Esta es la base de todos los proyectos con sensores.',
    concepts: [
      { term: 'digitalRead(pin)', definition: 'Lee el estado de un pin: HIGH (5V) o LOW (0V).' },
      { term: 'INPUT_PULLUP', definition: 'Modo de entrada con resistencia interna. Suelto = HIGH, Presionado = LOW.' },
      { term: 'if / else', definition: 'Estructura de decisión: ejecuta un bloque u otro según la condición.' },
      { term: '== LOW', definition: 'Compara si el valor es igual a LOW (presionado en INPUT_PULLUP).' },
    ],
    validationRules: [
      {
        id: 'has_digitalread',
        description: 'Usa digitalRead()',
        check: (c) => /digitalRead\s*\(/.test(c),
        hint: 'Necesitas digitalRead() para leer el estado del botón',
      },
      {
        id: 'has_if_else',
        description: 'Tiene estructura if/else',
        check: (c) => /if\s*\(/.test(c) && /else/.test(c),
        hint: 'Necesitas if/else para decidir encender o apagar según el botón',
      },
      {
        id: 'has_led_high',
        description: 'Enciende el LED en algún caso',
        check: (c) => /digitalWrite\s*\(\s*\w+\s*,\s*HIGH\s*\)/.test(c),
        hint: 'Agrega digitalWrite(LED_PIN, HIGH) dentro del if',
      },
      {
        id: 'has_led_low',
        description: 'Apaga el LED en el otro caso',
        check: (c) => /digitalWrite\s*\(\s*\w+\s*,\s*LOW\s*\)/.test(c),
        hint: 'Agrega digitalWrite(LED_PIN, LOW) dentro del else',
      },
    ],
  },

  // ── M6: Semáforo ─────────────────────────────
  {
    id: 6, title: 'Semáforo', subtitle: 'Tres LEDs en secuencia — reto final básico', icon: '▲',
    duration: '8–10 min', points: 60, type: 'code',
    objective: 'Programar un semáforo con los pines 11 (rojo), 12 (amarillo) y 13 (verde).',
    theory: [
      'Un semáforo enciende un LED a la vez en este orden: rojo (3s) → verde (3s) → amarillo (1s) → repite.',
      'Necesitas tres constantes: una para cada pin.',
      'En setup() configuras los tres pines como OUTPUT.',
      'En loop() escribes la secuencia: encender → delay → apagar para cada LED.',
    ],
    starterCode: `// Pines: 11=Rojo, 12=Amarillo, 13=Verde
const int LED_ROJO     = 11;
const int LED_AMARILLO = 12;
const int LED_VERDE    = 13;

void setup() {
  pinMode(LED_ROJO, OUTPUT);
  // Agrega también LED_AMARILLO y LED_VERDE aquí
  
}

void loop() {
  // ROJO: 3 segundos
  digitalWrite(LED_ROJO, HIGH);
  delay(3000);
  digitalWrite(LED_ROJO, LOW);
  
  // VERDE: 3 segundos
  // Escribe la secuencia del LED verde aquí
  
  
  // AMARILLO: 1 segundo
  // Escribe la secuencia del LED amarillo aquí
  
}`,
    hints: [
      'En setup() agrega: pinMode(LED_AMARILLO, OUTPUT); y pinMode(LED_VERDE, OUTPUT);',
      'Secuencia verde: digitalWrite(LED_VERDE, HIGH); delay(3000); digitalWrite(LED_VERDE, LOW);',
      'Secuencia amarillo: digitalWrite(LED_AMARILLO, HIGH); delay(1000); digitalWrite(LED_AMARILLO, LOW);',
      'Solo un LED debe estar encendido a la vez. Apaga el anterior antes de encender el siguiente.',
    ],
    explanation: 'El semáforo usa tres constantes para los pines. loop() repite la secuencia encendiendo y apagando cada LED con delay() entre ellos.',
    simulatorMode: 'traffic',
    badge: { name: 'Semáforo Pro', description: 'Construiste un semáforo completo' },
    successMessage: '¡Increíble! Completaste el reto del semáforo. ¡Eres un programador Arduino!',
    concepts: [
      { term: 'secuencia', definition: 'Instrucciones que se ejecutan una tras otra en orden.' },
      { term: 'múltiples pines', definition: 'El Arduino UNO tiene 14 pines digitales (0–13) que puedes usar a la vez.' },
      { term: 'timing', definition: 'Control del tiempo con delay() para crear ritmos y patrones.' },
    ],
    validationRules: [
      {
        id: 'has_three_pinmode',
        description: 'Configura los 3 pines en setup()',
        check: (c) => {
          const m = c.match(/void\s+setup\s*\(\s*\)\s*\{([\s\S]*?)\}/s)
          return m ? (m[1].match(/pinMode\s*\(/g) ?? []).length >= 3 : false
        },
        hint: 'Necesitas tres llamadas a pinMode() en setup(), una por cada LED',
      },
      {
        id: 'has_red_seq',
        description: 'Secuencia completa del LED rojo',
        check: (c) => /digitalWrite\s*\(\s*(LED_ROJO|11)\s*,\s*HIGH\s*\)/.test(c) && /digitalWrite\s*\(\s*(LED_ROJO|11)\s*,\s*LOW\s*\)/.test(c),
        hint: 'El LED rojo necesita: HIGH → delay() → LOW',
      },
      {
        id: 'has_green_seq',
        description: 'Secuencia completa del LED verde',
        check: (c) => /digitalWrite\s*\(\s*(LED_VERDE|13)\s*,\s*HIGH\s*\)/.test(c) && /digitalWrite\s*\(\s*(LED_VERDE|13)\s*,\s*LOW\s*\)/.test(c),
        hint: 'Agrega la secuencia completa para el LED verde: HIGH → delay(3000) → LOW',
      },
      {
        id: 'has_yellow_seq',
        description: 'Secuencia completa del LED amarillo',
        check: (c) => /digitalWrite\s*\(\s*(LED_AMARILLO|12)\s*,\s*HIGH\s*\)/.test(c) && /digitalWrite\s*\(\s*(LED_AMARILLO|12)\s*,\s*LOW\s*\)/.test(c),
        hint: 'Agrega la secuencia completa para el LED amarillo: HIGH → delay(1000) → LOW',
      },
      {
        id: 'has_three_delays',
        description: 'Al menos 3 delay() en loop()',
        check: (c) => {
          const m = c.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*)\}/s)
          return m ? (m[1].match(/delay\s*\(/g) ?? []).length >= 3 : false
        },
        hint: 'Necesitas un delay() después de encender cada LED',
      },
    ],
  },

  // ── M7: BONUS analogWrite ────────────────────
  {
    id: 7, title: 'BONUS: Brillo Suave', subtitle: 'analogWrite() y PWM — control de intensidad', icon: '◈',
    duration: '5–8 min', points: 50, type: 'code',
    objective: 'Usar analogWrite() para hacer que el LED suba y baje de brillo suavemente.',
    theory: [
      'analogWrite(pin, valor) controla cuánta electricidad recibe el LED. Valor: 0 = apagado, 255 = máximo brillo.',
      'Esto se llama PWM (modulación por ancho de pulso). No es voltaje real, son pulsos muy rápidos.',
      'Solo funciona en pines PWM del Arduino UNO: 3, 5, 6, 9, 10, 11 (tienen una ~ en la placa).',
      'Un bucle for() cuenta de un número a otro, ejecutando instrucciones cada vez.',
    ],
    starterCode: `const int LED_PWM = 9;  // Pin 9 tiene PWM (~)

void setup() {
  pinMode(LED_PWM, OUTPUT);
}

void loop() {
  // Sube el brillo de 0 a 255
  for (int brillo = 0; brillo <= 255; brillo++) {
    analogWrite(LED_PWM, brillo);
    delay(8);
  }
  
  // Baja el brillo de 255 a 0
  // Escribe aquí el for() que baja el brillo
  
}`,
    hints: [
      'El for() que baja es: for (int brillo = 255; brillo >= 0; brillo--)',
      'Dentro del for descendente: analogWrite(LED_PWM, brillo); delay(8);',
      'brillo-- reduce el valor en 1 cada vuelta del bucle',
      'El resultado: LED que respira suavemente',
    ],
    explanation: 'analogWrite(pin, 0-255) controla el brillo. El for() cuenta. brillo++ sube, brillo-- baja. El loop() repite el ciclo de brillo.',
    simulatorMode: 'pwm',
    badge: { name: 'PWM Guru', description: 'Dominaste el control de brillo' },
    successMessage: '¡Experto! El LED respira suavemente. Completaste el BONUS.',
    concepts: [
      { term: 'analogWrite(pin, valor)', definition: 'Controla el brillo/velocidad via PWM. Valor de 0 a 255.' },
      { term: 'PWM', definition: 'Pulsos rápidos que simulan un voltaje variable. Solo en pines con ~.' },
      { term: 'for(inicio; condición; incremento)', definition: 'Bucle que se repite mientras se cumple la condición.' },
      { term: 'brillo++', definition: 'Incrementa la variable brillo en 1 cada vuelta del bucle.' },
    ],
    validationRules: [
      {
        id: 'has_analogwrite',
        description: 'Usa analogWrite()',
        check: (c) => /analogWrite\s*\(/.test(c),
        hint: 'Necesitas analogWrite(pin, valor) para controlar el brillo',
      },
      {
        id: 'has_for_up',
        description: 'Tiene bucle for ascendente (sube brillo)',
        check: (c) => /brillo\+\+/.test(c) || /for\s*\(.*<=.*255/.test(c),
        hint: 'El bucle que sube ya está en el starter. Asegúrate de no borrarlo.',
      },
      {
        id: 'has_for_down',
        description: 'Tiene bucle for descendente (baja brillo)',
        check: (c) => /brillo--/.test(c) || /for\s*\(.*>=\s*0/.test(c),
        hint: 'Escribe: for (int brillo = 255; brillo >= 0; brillo--) { ... }',
      },
    ],
  },

  // ── M8: Blink con variable de tiempo ─────────
  {
    id: 8, title: 'Velocidad Ajustable', subtitle: 'Usa una variable para controlar la velocidad del parpadeo', icon: '⚡',
    duration: '6–8 min', points: 35, type: 'code',
    objective: 'Guardar el tiempo de espera en una variable y usarla en delay().',
    theory: [
      'Puedes guardar números en variables para usarlos fácilmente en el código.',
      'int velocidad = 500; crea una variable entera llamada "velocidad" con valor 500.',
      'Luego escribes delay(velocidad) en vez de delay(500).',
      'Si quieres cambiar la velocidad, solo cambias el número en una sola línea.',
    ],
    starterCode: `const int LED_PIN = 13;
int velocidad = 500;  // Tiempo de espera en milisegundos

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(velocidad);       // Usa la variable aquí
  digitalWrite(LED_PIN, LOW);
  // Escribe aquí: delay(velocidad);
  
}`,
    hints: [
      'En el Paso 4 escribe: delay(velocidad);',
      'La variable "velocidad" ya tiene el valor 500 (medio segundo)',
      'Puedes cambiar el 500 por cualquier número para cambiar la velocidad',
    ],
    explanation: 'int velocidad = 500 guarda el tiempo en una variable. delay(velocidad) usa ese valor. Cambiar el 500 cambia la velocidad en todo el programa.',
    simulatorMode: 'blink',
    badge: { name: 'Variable Pro', description: 'Usaste variables para controlar el tiempo' },
    successMessage: '¡Genial! Ahora el código es fácil de ajustar cambiando un solo número.',
    concepts: [
      { term: 'int velocidad = 500', definition: 'Crea una variable entera llamada "velocidad" con valor inicial 500.' },
      { term: 'variable vs constante', definition: 'const = no cambia. int sin const = puede cambiar durante el programa.' },
    ],
    validationRules: [
      {
        id: 'has_int_var',
        description: 'Declara una variable int para el tiempo',
        check: (c) => /int\s+\w+\s*=\s*\d+\s*;/.test(c),
        hint: 'Declara: int velocidad = 500;',
      },
      {
        id: 'uses_var_in_delay',
        description: 'Usa la variable dentro de delay()',
        check: (c) => {
          const m = c.match(/int\s+(\w+)\s*=\s*\d+/)
          if (!m) return false
          const v = m[1]
          const delays = (c.match(new RegExp(`delay\\s*\\(\\s*${v}\\s*\\)`, 'g')) ?? []).length
          return delays >= 2
        },
        hint: 'Usa la variable dos veces: delay(velocidad); después de HIGH y después de LOW',
      },
      {
        id: 'has_blink_pattern',
        description: 'Tiene el patrón HIGH → delay → LOW → delay',
        check: (c) => /digitalWrite\s*\(\s*\w+\s*,\s*HIGH\s*\)/.test(c) && /digitalWrite\s*\(\s*\w+\s*,\s*LOW\s*\)/.test(c),
        hint: 'Necesitas digitalWrite HIGH y LOW dentro de loop()',
      },
    ],
  },

  // ── M9: Dos LEDs alternados ───────────────────
  {
    id: 9, title: 'Dos LEDs Alternados', subtitle: 'Mientras uno enciende, el otro apaga', icon: '⟡',
    duration: '6–8 min', points: 35, type: 'code',
    objective: 'Hacer que dos LEDs parpadeen alternadamente: cuando uno enciende, el otro apaga.',
    theory: [
      'Puedes controlar múltiples LEDs con diferentes pines de OUTPUT.',
      'Para alternar: cuando el LED del pin 12 está encendido, el del pin 13 está apagado.',
      'Solo necesitas dos pares de digitalWrite() y un delay entre ellos.',
      'Esto simula una luz de policía o aviso intermitente.',
    ],
    starterCode: `const int LED_A = 12;
const int LED_B = 13;

void setup() {
  pinMode(LED_A, OUTPUT);
  pinMode(LED_B, OUTPUT);
}

void loop() {
  // Turno 1: LED_A encendido, LED_B apagado
  digitalWrite(LED_A, HIGH);
  digitalWrite(LED_B, LOW);
  delay(400);
  
  // Turno 2: LED_A apagado, LED_B encendido
  // Escribe aquí los dos digitalWrite y un delay
  
  
  
}`,
    hints: [
      'Para el turno 2: digitalWrite(LED_A, LOW); y digitalWrite(LED_B, HIGH);',
      'Luego agrega: delay(400);',
      'El patrón completo alterna entre encender A/apagar B y encender B/apagar A',
    ],
    explanation: 'Los dos LEDs siempre están en estados opuestos. Cuando A=HIGH entonces B=LOW y viceversa. El delay controla la velocidad del destello.',
    simulatorMode: 'blink',
    badge: { name: 'Alternador', description: 'Dos LEDs perfectamente coordinados' },
    successMessage: '¡Luz de policía lista! Aprendiste a coordinar múltiples salidas.',
    concepts: [
      { term: 'múltiples salidas', definition: 'Puedes usar varios pines OUTPUT al mismo tiempo.' },
      { term: 'estados opuestos', definition: 'Cuando uno es HIGH el otro es LOW y viceversa.' },
    ],
    validationRules: [
      {
        id: 'has_two_pinmodes',
        description: 'Configura dos pines como OUTPUT',
        check: (c) => (c.match(/pinMode\s*\(/g) ?? []).length >= 2,
        hint: 'Necesitas dos pinMode() en setup()',
      },
      {
        id: 'has_four_digitalwrites',
        description: 'Tiene al menos cuatro digitalWrite()',
        check: (c) => {
          const m = c.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*)\}/s)
          return m ? (m[1].match(/digitalWrite\s*\(/g) ?? []).length >= 4 : false
        },
        hint: 'Necesitas 4 digitalWrite(): 2 para el turno 1 y 2 para el turno 2',
      },
      {
        id: 'has_two_delays',
        description: 'Tiene dos delay() en loop()',
        check: (c) => {
          const m = c.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*)\}/s)
          return m ? (m[1].match(/delay\s*\(/g) ?? []).length >= 2 : false
        },
        hint: 'Necesitas un delay() después de cada par de digitalWrite()',
      },
    ],
  },

  // ── M10: Contador de parpadeos ────────────────
  {
    id: 10, title: 'Contador de Parpadeos', subtitle: 'Haz que el LED parpadee exactamente N veces', icon: '↺',
    duration: '6–8 min', points: 40, type: 'code',
    objective: 'Usar un bucle for() para que el LED parpadee exactamente 5 veces, luego espere.',
    theory: [
      'El bucle for() repite instrucciones un número exacto de veces.',
      'Sintaxis: for (int i = 0; i < N; i++) { ... } — repite N veces.',
      'i = 0 es el inicio. i < 5 es la condición de parada. i++ suma 1 cada vuelta.',
      'Después del for, puedes agregar un delay() largo para hacer una pausa antes de repetir.',
    ],
    starterCode: `const int LED_PIN = 13;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  // Parpadea 5 veces seguidas
  for (int i = 0; i < 5; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    // Escribe aquí: apagar el LED y esperar 200ms
    
    
  }
  
  // Pausa larga antes de repetir el ciclo
  delay(2000);
}`,
    hints: [
      'Dentro del for() escribe: digitalWrite(LED_PIN, LOW);',
      'Luego: delay(200);',
      'El resultado: 5 destellos rápidos, pausa de 2 segundos, repite',
    ],
    explanation: 'for (int i = 0; i < 5; i++) repite el cuerpo 5 veces. Dentro va el parpadeo. El delay(2000) al final hace la pausa entre ciclos.',
    simulatorMode: 'blink',
    badge: { name: 'Contador', description: 'Controlaste ciclos con for()' },
    successMessage: '¡El LED parpadea exactamente 5 veces! El bucle for() es muy útil.',
    concepts: [
      { term: 'for (int i = 0; i < 5; i++)', definition: 'Repite el bloque exactamente 5 veces.' },
      { term: 'i', definition: 'Variable de control del bucle. Empieza en 0, sube hasta 4 (5 veces total).' },
      { term: 'i++', definition: 'Incrementa i en 1 cada vez que termina una vuelta.' },
    ],
    validationRules: [
      {
        id: 'has_for_loop',
        description: 'Tiene un bucle for()',
        check: (c) => /for\s*\(/.test(c),
        hint: 'Necesitas un bucle for() para repetir el parpadeo un número exacto de veces',
      },
      {
        id: 'has_high_in_for',
        description: 'Enciende y apaga dentro del for()',
        check: (c) => /digitalWrite\s*\(\s*\w+\s*,\s*HIGH\s*\)/.test(c) && /digitalWrite\s*\(\s*\w+\s*,\s*LOW\s*\)/.test(c),
        hint: 'Dentro del for() necesitas encender y apagar el LED',
      },
      {
        id: 'has_pause_after_for',
        description: 'Tiene una pausa después del for()',
        check: (c) => {
          const after = c.replace(/for\s*\([^)]*\)\s*\{[\s\S]*?\}/s, '')
          return /delay\s*\(\s*\d+\s*\)/.test(after)
        },
        hint: 'Agrega un delay() largo después del for() para hacer la pausa entre ciclos',
      },
    ],
  },

  // ── M11: SOS ─────────────────────────────────
  {
    id: 11, title: 'Señal SOS', subtitle: 'Código Morse básico con tiempos diferentes', icon: '···',
    duration: '8–10 min', points: 45, type: 'code',
    objective: 'Programar la señal SOS en código Morse: ··· — — — ··· con el LED.',
    theory: [
      'El código Morse usa puntos (·) y rayas (—) para representar letras.',
      'SOS = ··· — — — ···  (3 destellos cortos, 3 largos, 3 cortos)',
      'Punto (·) = 200ms encendido. Raya (—) = 600ms encendido. Pausa entre letras = 600ms apagado.',
      'Puedes usar constantes para definir los tiempos y hacer el código más claro.',
    ],
    starterCode: `const int LED_PIN = 13;
const int PUNTO = 200;   // Duración de un punto
const int RAYA  = 600;   // Duración de una raya
const int PAUSA = 200;   // Pausa entre destellos

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  // S = tres puntos (···)
  digitalWrite(LED_PIN, HIGH); delay(PUNTO); digitalWrite(LED_PIN, LOW); delay(PAUSA);
  digitalWrite(LED_PIN, HIGH); delay(PUNTO); digitalWrite(LED_PIN, LOW); delay(PAUSA);
  digitalWrite(LED_PIN, HIGH); delay(PUNTO); digitalWrite(LED_PIN, LOW); delay(PAUSA);
  
  delay(RAYA);  // Pausa entre letras
  
  // O = tres rayas (— — —)
  // Escribe aquí las 3 rayas (igual que arriba pero con RAYA en vez de PUNTO)
  
  
  delay(RAYA);  // Pausa entre letras
  
  // S = tres puntos (···)
  // Escribe aquí los 3 puntos igual que al inicio
  
  
  delay(2000);  // Pausa larga antes de repetir
}`,
    hints: [
      'Cada raya es: digitalWrite(LED_PIN, HIGH); delay(RAYA); digitalWrite(LED_PIN, LOW); delay(PAUSA);',
      'Copia la sección "O" tres veces para las 3 rayas',
      'La sección "S" final es igual que la del principio (3 puntos)',
    ],
    explanation: 'El SOS usa constantes PUNTO y RAYA para los tiempos. Cada símbolo Morse es encender → delay → apagar → pausa.',
    simulatorMode: 'blink',
    badge: { name: 'Morse', description: 'Enviaste el SOS en código Morse' },
    successMessage: '¡SOS enviado! Aprendiste a controlar tiempos con precisión.',
    concepts: [
      { term: 'código Morse', definition: 'Sistema de comunicación con señales cortas (·) y largas (—).' },
      { term: 'constantes de tiempo', definition: 'Usar nombres como PUNTO y RAYA hace el código más legible.' },
    ],
    validationRules: [
      {
        id: 'has_sos_structure',
        description: 'Tiene al menos 9 pares de encendido/apagado',
        check: (c) => {
          const highs = (c.match(/digitalWrite\s*\(\s*\w+\s*,\s*HIGH\s*\)/g) ?? []).length
          return highs >= 9
        },
        hint: 'SOS necesita 9 destellos: 3 puntos + 3 rayas + 3 puntos = 9 veces encendido',
      },
      {
        id: 'has_different_delays',
        description: 'Usa al menos dos valores distintos en delay()',
        check: (c) => {
          const delays = [...c.matchAll(/delay\s*\(\s*(\w+)\s*\)/g)].map(m => m[1])
          const unique = new Set(delays)
          return unique.size >= 2
        },
        hint: 'Debes usar PUNTO (200ms) y RAYA (600ms) como tiempos diferentes',
      },
      {
        id: 'has_long_pause',
        description: 'Tiene una pausa larga al final del loop()',
        check: (c) => /delay\s*\(\s*[12]\d{3}\s*\)/.test(c) || /delay\s*\(\s*2000\s*\)/.test(c),
        hint: 'Agrega delay(2000) al final del loop() para pausar entre repeticiones',
      },
    ],
  },

  // ── M12: variables boolean ────────────────────
  {
    id: 12, title: 'Botón Tipo Interruptor', subtitle: 'Un clic enciende, otro clic apaga', icon: '⊙',
    duration: '6–8 min', points: 45, type: 'code',
    objective: 'Usar una variable boolean para que el botón funcione como interruptor toggle.',
    theory: [
      'boolean es un tipo de dato que solo tiene dos valores: true (verdadero) o false (falso).',
      'Puedes usarlo para guardar el estado del LED: encendido o apagado.',
      'El operador ! invierte el valor: !true = false, !false = true.',
      'Un "toggle" cambia de estado cada vez que presionas el botón.',
    ],
    starterCode: `const int LED_PIN = 13;
const int BTN_PIN = 2;

boolean ledEncendido = false;  // Estado inicial: apagado
int estadoAnterior = HIGH;      // Para detectar solo el momento del clic

void setup() {
  pinMode(LED_PIN, OUTPUT);
  pinMode(BTN_PIN, INPUT_PULLUP);
}

void loop() {
  int estadoActual = digitalRead(BTN_PIN);
  
  // Detecta cuando el botón pasa de suelto a presionado
  if (estadoActual == LOW && estadoAnterior == HIGH) {
    ledEncendido = !ledEncendido;  // Invierte el estado
    // Escribe aquí: aplica el estado al LED con digitalWrite
    
  }
  
  estadoAnterior = estadoActual;
  delay(50);
}`,
    hints: [
      'Dentro del if escribe: digitalWrite(LED_PIN, ledEncendido);',
      'ledEncendido es true o false. digitalWrite acepta true/false igual que HIGH/LOW.',
      'El ! invierte: si era true pasa a false, si era false pasa a true.',
    ],
    explanation: 'boolean guarda true/false. !ledEncendido invierte el estado. digitalWrite(pin, true) = HIGH. Así el botón funciona como interruptor.',
    simulatorMode: 'button',
    badge: { name: 'Toggle Master', description: 'Programaste un interruptor real' },
    successMessage: '¡Perfecto! El botón ahora funciona como un interruptor de luz real.',
    concepts: [
      { term: 'boolean', definition: 'Tipo de dato con solo dos valores: true o false.' },
      { term: '! (NOT)', definition: 'Invierte un valor boolean: !true = false y !false = true.' },
      { term: 'toggle', definition: 'Cambiar entre dos estados alternadamente.' },
    ],
    validationRules: [
      {
        id: 'has_boolean',
        description: 'Declara una variable boolean',
        check: (c) => /boolean\s+\w+/.test(c) || /bool\s+\w+/.test(c),
        hint: 'Declara: boolean ledEncendido = false;',
      },
      {
        id: 'has_toggle',
        description: 'Usa el operador ! para invertir',
        check: (c) => /!\s*\w+/.test(c),
        hint: 'Usa el operador ! para invertir el estado: ledEncendido = !ledEncendido;',
      },
      {
        id: 'has_digitalwrite_bool',
        description: 'Aplica el estado boolean al LED',
        check: (c) => /digitalWrite\s*\(\s*\w+\s*,\s*\w+\s*\)/.test(c) && /boolean/.test(c),
        hint: 'Escribe: digitalWrite(LED_PIN, ledEncendido);',
      },
    ],
  },

  // ── M13: Serial Monitor ───────────────────────
  {
    id: 13, title: 'Mensajes por Serial', subtitle: 'Haz que el Arduino "hable" por el monitor serie', icon: '⌨',
    duration: '6–8 min', points: 35, type: 'code',
    objective: 'Usar Serial.begin() y Serial.println() para enviar mensajes desde el Arduino.',
    theory: [
      'El monitor serie permite ver mensajes que el Arduino envía a la computadora.',
      'Serial.begin(9600) inicia la comunicación serie a 9600 bits por segundo (va en setup()).',
      'Serial.println("mensaje") envía una línea de texto al monitor serie.',
      'Puedes enviar texto, números, o el estado de sensores para depurar tu código.',
    ],
    starterCode: `const int LED_PIN = 13;
int contador = 0;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  // Inicia la comunicación serie a 9600 bps
  // Escribe aquí: Serial.begin(9600);
  
}

void loop() {
  contador++;
  
  // Envía el número de parpadeo al monitor serie
  // Escribe aquí: Serial.println(contador);
  
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
}`,
    hints: [
      'En setup() escribe: Serial.begin(9600);',
      'En loop() escribe: Serial.println(contador);',
      'Serial.println() envía el valor seguido de un salto de línea',
    ],
    explanation: 'Serial.begin(9600) abre el puerto serie. Serial.println(valor) envía datos. El monitor serie muestra cada parpadeo numerado.',
    simulatorMode: 'blink',
    badge: { name: 'Comunicador', description: 'El Arduino habla por Serial' },
    successMessage: '¡El Arduino ahora puede enviar mensajes! El Serial es esencial para depurar.',
    concepts: [
      { term: 'Serial.begin(9600)', definition: 'Inicia la comunicación serie a 9600 baudios. Siempre en setup().' },
      { term: 'Serial.println()', definition: 'Envía un valor al monitor serie seguido de nueva línea.' },
      { term: 'baudios', definition: 'Velocidad de la comunicación serie. 9600 es el más común.' },
    ],
    validationRules: [
      {
        id: 'has_serial_begin',
        description: 'Tiene Serial.begin() en setup()',
        check: (c) => /Serial\s*\.\s*begin\s*\(/.test(c),
        hint: 'Escribe Serial.begin(9600); dentro de setup()',
      },
      {
        id: 'has_serial_print',
        description: 'Tiene Serial.println() en loop()',
        check: (c) => /Serial\s*\.\s*print(ln)?\s*\(/.test(c),
        hint: 'Escribe Serial.println(contador); dentro de loop()',
      },
      {
        id: 'has_blink',
        description: 'Mantiene el parpadeo del LED',
        check: (c) => /digitalWrite\s*\(\s*\w+\s*,\s*HIGH\s*\)/.test(c) && /digitalWrite\s*\(\s*\w+\s*,\s*LOW\s*\)/.test(c),
        hint: 'No borres el código del blink. El LED debe seguir parpadeando.',
      },
    ],
  },

  // ── M14: if con comparación ───────────────────
  {
    id: 14, title: 'Comparar Valores', subtitle: 'Toma decisiones con if, ==, > y <', icon: '⚖',
    duration: '6–8 min', points: 40, type: 'code',
    objective: 'Usar if con comparaciones para encender el LED según el valor de una variable.',
    theory: [
      'El if() puede comparar números con operadores: == (igual), != (diferente), > (mayor), < (menor).',
      'Puedes encadenar condiciones con else if para múltiples casos.',
      'Ejemplo: si velocidad > 100, hacer algo; si no, hacer otra cosa.',
      'Las variables pueden cambiar de valor durante el programa con operaciones como ++.',
    ],
    starterCode: `const int LED_PIN = 13;
int nivel = 0;  // Nivel va de 0 a 3

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  nivel = nivel + 1;  // Aumenta el nivel cada vuelta
  
  if (nivel > 3) {
    nivel = 0;  // Reinicia el contador
  }
  
  // Si el nivel es mayor a 1, enciende el LED
  if (nivel > 1) {
    // Escribe aquí: encender el LED
    
  } else {
    // Escribe aquí: apagar el LED
    
  }
  
  delay(800);
}`,
    hints: [
      'Para encender: digitalWrite(LED_PIN, HIGH);',
      'Para apagar: digitalWrite(LED_PIN, LOW);',
      'El LED encenderá cuando nivel sea 2 o 3, y apagará cuando sea 0 o 1',
    ],
    explanation: 'nivel > 1 es la condición. Si es verdadera, enciende. Si es falsa (nivel es 0 o 1), apaga. El LED parpadea en un patrón 2 apagados y 2 encendidos.',
    simulatorMode: 'blink',
    badge: { name: 'Comparador', description: 'Tomaste decisiones con comparaciones' },
    successMessage: '¡Decisiones lógicas dominadas! Comprender if/else es fundamental en programación.',
    concepts: [
      { term: '> (mayor que)', definition: 'Verdadero si el valor de la izquierda es mayor que el de la derecha.' },
      { term: '< (menor que)', definition: 'Verdadero si el valor de la izquierda es menor que el de la derecha.' },
      { term: '== (igual)', definition: 'Verdadero si ambos valores son iguales. Usa == para comparar, no =.' },
      { term: 'else if', definition: 'Comprueba otra condición si la primera era falsa.' },
    ],
    validationRules: [
      {
        id: 'has_comparison',
        description: 'Usa un operador de comparación en if()',
        check: (c) => /if\s*\([^)]*[><=!][^)]*\)/.test(c),
        hint: 'Usa operadores como >, <, == dentro del if()',
      },
      {
        id: 'has_high',
        description: 'Enciende el LED en una condición',
        check: (c) => /digitalWrite\s*\(\s*\w+\s*,\s*HIGH\s*\)/.test(c),
        hint: 'Dentro de uno de los bloques if, escribe: digitalWrite(LED_PIN, HIGH);',
      },
      {
        id: 'has_low',
        description: 'Apaga el LED en la otra condición',
        check: (c) => /digitalWrite\s*\(\s*\w+\s*,\s*LOW\s*\)/.test(c),
        hint: 'Dentro del else, escribe: digitalWrite(LED_PIN, LOW);',
      },
    ],
  },

  // ── M15: while loop ───────────────────────────
  {
    id: 15, title: 'Bucle while()', subtitle: 'Repite mientras la condición sea verdadera', icon: '∞',
    duration: '6–8 min', points: 40, type: 'code',
    objective: 'Usar while() para parpadear el LED mientras un contador no llegue a cierto valor.',
    theory: [
      'while(condición) { ... } repite el bloque mientras la condición sea verdadera.',
      'Es similar a for(), pero con while tú controlas manualmente el contador.',
      'Debes asegurarte de que la condición eventualmente sea falsa, ¡o el programa se queda pegado!',
      'Útil cuando no sabes cuántas veces necesitas repetir algo de antemano.',
    ],
    starterCode: `const int LED_PIN = 13;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int veces = 0;
  
  // Parpadea mientras veces sea menor que 3
  while (veces < 3) {
    digitalWrite(LED_PIN, HIGH);
    delay(300);
    // Escribe aquí: apagar el LED
    
    delay(300);
    // Escribe aquí: aumentar veces en 1 (veces = veces + 1 o veces++)
    
  }
  
  // Pausa de 1 segundo entre grupos de 3 parpadeos
  delay(1000);
}`,
    hints: [
      'Para apagar: digitalWrite(LED_PIN, LOW);',
      'Para aumentar el contador: veces++;  (o veces = veces + 1;)',
      'Si no incrementas veces, el while nunca termina. ¡Siempre incrementa el contador!',
    ],
    explanation: 'while (veces < 3) repite mientras veces sea 0, 1 o 2. Al llegar a 3 la condición es falsa y sale del bucle. El delay(1000) pausa entre grupos.',
    simulatorMode: 'blink',
    badge: { name: 'While Loop', description: 'Dominaste el bucle while()' },
    successMessage: '¡Excelente! El bucle while() es una herramienta muy poderosa.',
    concepts: [
      { term: 'while(condición)', definition: 'Repite el bloque mientras la condición sea verdadera.' },
      { term: 'veces++', definition: 'Incrementa la variable veces en 1. Equivale a: veces = veces + 1.' },
      { term: 'bucle infinito', definition: 'Ocurre cuando la condición del while nunca se vuelve falsa. ¡Peligro!' },
    ],
    validationRules: [
      {
        id: 'has_while',
        description: 'Tiene un bucle while()',
        check: (c) => /while\s*\(/.test(c),
        hint: 'Necesitas un bucle while() con su condición',
      },
      {
        id: 'has_increment',
        description: 'Incrementa el contador dentro del while()',
        check: (c) => /veces\+\+/.test(c) || /veces\s*=\s*veces\s*\+\s*1/.test(c) || /veces\s*\+=/.test(c),
        hint: 'Dentro del while() debes incrementar el contador: veces++;',
      },
      {
        id: 'has_blink_in_while',
        description: 'Parpadea dentro del while()',
        check: (c) => /digitalWrite\s*\(\s*\w+\s*,\s*HIGH\s*\)/.test(c) && /digitalWrite\s*\(\s*\w+\s*,\s*LOW\s*\)/.test(c),
        hint: 'Dentro del while() necesitas: HIGH → delay → LOW → delay → incrementar',
      },
    ],
  },

  // ── M16: Array de LEDs ────────────────────────
  {
    id: 16, title: 'Arreglo de LEDs', subtitle: 'Guarda los pines en un array y recórrelos con for()', icon: '▤',
    duration: '8–10 min', points: 50, type: 'code',
    objective: 'Crear un array con los pines de 3 LEDs y encenderlos en secuencia con un bucle for().',
    theory: [
      'Un array es una lista de valores del mismo tipo guardados en una sola variable.',
      'Sintaxis: int pines[] = {11, 12, 13}; — crea una lista con tres números.',
      'Para acceder a un elemento usas el índice: pines[0] = 11, pines[1] = 12, pines[2] = 13.',
      'Combinando for() con un array puedes repetir operaciones en muchos pines con pocas líneas.',
    ],
    starterCode: `// Array con los 3 pines
int pines[] = {11, 12, 13};
int cantidadLEDs = 3;

void setup() {
  // Configura todos los pines con un bucle
  for (int i = 0; i < cantidadLEDs; i++) {
    // Escribe aquí: pinMode(pines[i], OUTPUT);
    
  }
}

void loop() {
  // Enciende los LEDs uno a uno
  for (int i = 0; i < cantidadLEDs; i++) {
    // Escribe aquí: encender pines[i]
    
    delay(300);
  }
  
  // Apaga todos los LEDs con otro bucle
  for (int i = 0; i < cantidadLEDs; i++) {
    // Escribe aquí: apagar pines[i]
    
  }
  
  delay(500);
}`,
    hints: [
      'En setup(): pinMode(pines[i], OUTPUT);',
      'Para encender: digitalWrite(pines[i], HIGH);',
      'Para apagar: digitalWrite(pines[i], LOW);',
      'pines[i] accede al elemento i del array. Cuando i=0 → pin 11, i=1 → pin 12, i=2 → pin 13',
    ],
    explanation: 'int pines[] crea el array. pines[i] accede al elemento i. El for() recorre todos los elementos automáticamente con pocas líneas de código.',
    simulatorMode: 'traffic',
    badge: { name: 'Array Master', description: 'Usaste arrays para controlar múltiples LEDs' },
    successMessage: '¡Los LEDs en secuencia! Con arrays y for() puedes controlar cientos de LEDs con pocas líneas.',
    concepts: [
      { term: 'int pines[]', definition: 'Array de enteros. Guarda múltiples valores en una sola variable.' },
      { term: 'pines[0]', definition: 'Accede al primer elemento del array. Los índices empiezan en 0.' },
      { term: 'cantidadLEDs', definition: 'Variable que guarda el tamaño del array para usarla en el for().' },
    ],
    validationRules: [
      {
        id: 'has_array',
        description: 'Declara un array de pines',
        check: (c) => /int\s+\w+\s*\[\s*\]\s*=\s*\{/.test(c),
        hint: 'Declara: int pines[] = {11, 12, 13};',
      },
      {
        id: 'uses_array_index',
        description: 'Accede al array con índice [i]',
        check: (c) => /\w+\s*\[\s*i\s*\]/.test(c),
        hint: 'Usa pines[i] para acceder a cada pin dentro del for()',
      },
      {
        id: 'has_setup_for',
        description: 'Configura los pines con un for() en setup()',
        check: (c) => {
          const m = c.match(/void\s+setup\s*\(\s*\)\s*\{([\s\S]*?)\}/s)
          return m ? /for\s*\(/.test(m[1]) && /pinMode/.test(m[1]) : false
        },
        hint: 'En setup() usa for() con pines[i] para configurar todos los pines',
      },
      {
        id: 'has_loop_for',
        description: 'Enciende y apaga con for() en loop()',
        check: (c) => {
          const m = c.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*)\}/s)
          return m ? /for\s*\(/.test(m[1]) && /digitalWrite/.test(m[1]) : false
        },
        hint: 'En loop() usa for() con pines[i] para encender y apagar los LEDs',
      },
    ],
  },

  // ── M17: Reto libre ───────────────────────────
  {
    id: 17, title: 'Reto Libre', subtitle: 'Combina todo lo aprendido en tu propio proyecto', icon: '♦',
    duration: '10–15 min', points: 80, type: 'code',
    objective: 'Crear un programa que use setup(), loop(), constantes, digitalWrite y al menos un delay().',
    theory: [
      '¡Llegaste al reto final! Ahora creas tu propio programa desde cero.',
      'Tu programa debe tener la estructura correcta (setup + loop), al menos una constante, y controlar un LED.',
      'Puedes hacer lo que quieras: un patrón de luces, una alarma, una secuencia creativa, etc.',
      'Sé creativo/a. No hay una respuesta "correcta" — solo los requisitos mínimos son obligatorios.',
    ],
    starterCode: `// Tu programa libre aquí
// Requisitos: setup(), loop(), const int, digitalWrite, delay()

// Paso 1: Declara al menos una constante
const int LED_PIN = 13;

void setup() {
  // Paso 2: Configura tus pines
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  // Paso 3: Escribe tu propio patrón o secuencia
  // Sé creativo/a!
  
}`,
    hints: [
      'Empieza con algo sencillo: un patrón de parpadeos que te guste',
      'Puedes cambiar la velocidad, agregar más LEDs, o crear una secuencia única',
      'Recuerda: setup() una vez, loop() se repite para siempre',
    ],
    explanation: 'Un programa válido de Arduino siempre tiene: al menos una constante, setup() con pinMode(), y loop() con la lógica del programa.',
    simulatorMode: 'blink',
    badge: { name: 'Creador', description: 'Creaste tu propio programa Arduino' },
    successMessage: '¡FELICITACIONES! Completaste TODAS las misiones de Arduino Lab. ¡Eres un programador Arduino!',
    concepts: [],
    validationRules: [
      {
        id: 'has_const',
        description: 'Declara al menos una constante',
        check: (c) => /const\s+int\s+\w+\s*=\s*\d+/.test(c),
        hint: 'Declara al menos: const int LED_PIN = 13;',
      },
      {
        id: 'has_setup_pinmode',
        description: 'setup() con pinMode()',
        check: (c) => /void\s+setup\s*\(\s*\)/.test(c) && /pinMode\s*\(/.test(c),
        hint: 'En setup() agrega: pinMode(LED_PIN, OUTPUT);',
      },
      {
        id: 'has_loop_logic',
        description: 'loop() tiene instrucciones',
        check: (c) => {
          const m = c.match(/void\s+loop\s*\(\s*\)\s*\{([\s\S]*)\}/s)
          return m ? m[1].trim().replace(/\/\/[^\n]*/g, '').trim().length > 10 : false
        },
        hint: 'Agrega instrucciones dentro de loop() — al menos un digitalWrite y un delay',
      },
      {
        id: 'has_digitalwrite',
        description: 'Usa digitalWrite()',
        check: (c) => /digitalWrite\s*\(/.test(c),
        hint: 'Usa digitalWrite() para controlar un LED',
      },
      {
        id: 'has_delay',
        description: 'Usa delay()',
        check: (c) => /delay\s*\(\s*\d+\s*\)/.test(c),
        hint: 'Usa delay() para que los cambios sean visibles',
      },
    ],
  },
]

const MOTIVATIONAL = [
  'Cada línea de código te acerca más a ser un maker.',
  'Los errores son parte del aprendizaje.',
  'Increíble progreso. ¡Sigue así!',
  'Los programadores se hacen con práctica.',
  'Esta habilidad te abrirá muchas puertas.',
  'Cada misión completada te hace más fuerte.',
  'Ya dominas más Arduino que el 90% de la gente.',
  '¡Casi lo tienes! No te rindas ahora.',
]

// ─────────────────────────────────────────────
// PROGRESS CONTEXT
// ─────────────────────────────────────────────
const STORAGE_KEY = 'arduino_lab_v4'
const DEFAULT: ProgressState = {
  currentMission: 0, completedMissions: [], points: 0, badges: [],
  code: {}, quizAnswers: {}, hintsUsed: {},
  quizMistakes: {}, codeMistakes: {},
  student: null, elapsedSeconds: 0, inactiveSeconds: 0, finished: false,
}

type Ctx = {
  progress: ProgressState; isLoaded: boolean
  setCurrentMission: (id: number) => void
  completeMission: (id: number, pts: number, badge: { name: string; description: string }) => void
  saveCode: (id: number, code: string) => void
  saveQuizAnswer: (qid: string, ans: number) => void
  incrementHints: (id: number) => void
  addQuizMistake: (qid: string) => void
  addCodeMistake: (missionId: number) => void
  resetProgress: () => void
  isMissionCompleted: (id: number) => boolean
  isMissionUnlocked: (id: number) => boolean
  setStudent: (s: StudentInfo) => void
  addElapsed: (secs: number) => void
  addInactive: (secs: number) => void
  setFinished: (v: boolean) => void
  pct: number
}

const Ctx = createContext<Ctx | null>(null)
function useP() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useP outside provider')
  return c
}

function PProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<ProgressState>(DEFAULT)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const d = JSON.parse(raw)
        setP({ ...DEFAULT, ...d, code: d.code ?? {}, quizAnswers: d.quizAnswers ?? {}, hintsUsed: d.hintsUsed ?? {}, completedMissions: d.completedMissions ?? [], badges: d.badges ?? [], student: d.student ?? null, elapsedSeconds: d.elapsedSeconds ?? 0, inactiveSeconds: d.inactiveSeconds ?? 0, quizMistakes: d.quizMistakes ?? {}, codeMistakes: d.codeMistakes ?? {}, finished: d.finished ?? false })
      }
    } catch { /* ignore */ }
    setLoaded(true)
  }, [])

  const upd = useCallback((fn: (s: ProgressState) => ProgressState) => {
    setP(prev => {
      const next = fn(prev)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }, [])

  const val: Ctx = {
    progress: p, isLoaded: loaded,
    setCurrentMission: useCallback((id) => upd(s => ({ ...s, currentMission: id })), [upd]),
    completeMission: useCallback((id, pts, badge) => upd(s => {
      if (s.completedMissions.includes(id)) return s
      return { ...s, completedMissions: [...s.completedMissions, id], points: s.points + pts, badges: [...s.badges, { missionId: id, name: badge.name, description: badge.description, earnedAt: new Date().toISOString() }], currentMission: id + 1 }
    }), [upd]),
    saveCode: useCallback((id, code) => upd(s => ({ ...s, code: { ...s.code, [id]: code } })), [upd]),
    saveQuizAnswer: useCallback((qid, ans) => upd(s => ({ ...s, quizAnswers: { ...s.quizAnswers, [qid]: ans } })), [upd]),
    incrementHints: useCallback((id) => upd(s => ({ ...s, hintsUsed: { ...s.hintsUsed, [id]: (s.hintsUsed[id] ?? 0) + 1 } })), [upd]),
    addQuizMistake: useCallback((qid: string) => upd(s => ({ ...s, quizMistakes: { ...s.quizMistakes, [qid]: (s.quizMistakes[qid] ?? 0) + 1 } })), [upd]),
    addCodeMistake: useCallback((mid: number) => upd(s => ({ ...s, codeMistakes: { ...s.codeMistakes, [mid]: (s.codeMistakes[mid] ?? 0) + 1 } })), [upd]),
    resetProgress: useCallback(() => { try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ } setP(DEFAULT) }, []),
    isMissionCompleted: useCallback((id) => p.completedMissions.includes(id), [p.completedMissions]),
    isMissionUnlocked: useCallback((id) => id === 0 || p.completedMissions.includes(id - 1) || p.currentMission >= id, [p.completedMissions, p.currentMission]),
    setStudent: useCallback((s: StudentInfo) => upd(st => ({ ...st, student: s })), [upd]),
    addElapsed: useCallback((secs: number) => upd(st => ({ ...st, elapsedSeconds: st.elapsedSeconds + secs })), [upd]),
    addInactive: useCallback((secs: number) => upd(st => ({ ...st, inactiveSeconds: st.inactiveSeconds + secs })), [upd]),
    setFinished: useCallback((v: boolean) => upd(st => ({ ...st, finished: v })), [upd]),
    pct: Math.round((p.completedMissions.length / MISSIONS.length) * 100),
  }

  return <Ctx.Provider value={val}>{children}</Ctx.Provider>
}

// ─────────────────────────────────────────────
// SIMULATOR ENGINE
// ─────────────────────────────────────────────
function resolveConsts(code: string) {
  const m = new Map<string, number>()
  const r = /const\s+int\s+(\w+)\s*=\s*(\d+)\s*;/g
  let x; while ((x = r.exec(code))) m.set(x[1], parseInt(x[2]))
  return m
}
function resolveVal(v: string, m: Map<string, number>) {
  const n = parseInt(v); return isNaN(n) ? (m.get(v.trim()) ?? -1) : n
}
function extractBody(code: string, fn: 'setup' | 'loop') {
  const pat = fn === 'setup' ? /void\s+setup\s*\(\s*\)\s*\{([\s\S]*?)\}/s : /void\s+loop\s*\(\s*\)\s*\{([\s\S]*)\}/s
  return code.match(pat)?.[1] ?? ''
}
type Step = { type: 'dw' | 'aw' | 'dl'; pin?: number; val?: number; ms?: number }
function parseSteps(block: string, consts: Map<string, number>, max = 80): Step[] {
  const steps: Step[] = []
  let expanded = block
  const fRe = /for\s*\(\s*int\s+(\w+)\s*=\s*(\d+)\s*;\s*\w+\s*([<>]=?)\s*(\d+)\s*;\s*\w+(\+\+|--)\s*\)\s*\{([\s\S]*?)\}/g
  let fm; const reps: [string, string][] = []
  while ((fm = fRe.exec(block))) {
    const [full, vn, s, op, e, dir, body] = fm
    const st = parseInt(s), en = parseInt(e); const vs: number[] = []
    if (dir === '++') { for (let i = st; op.includes('=') ? i <= en : i < en; i++) { if (vs.length > 300) break; vs.push(i) } }
    else { for (let i = st; op.includes('=') ? i >= en : i > en; i--) { if (vs.length > 300) break; vs.push(i) } }
    reps.push([full, vs.map(v => body.replace(new RegExp(`\\b${vn}\\b`, 'g'), String(v))).join('\n')])
  }
  reps.forEach(([f, t]) => { expanded = expanded.replace(f, t) })
  for (const line of expanded.split('\n')) {
    if (steps.length >= max) break
    const t = line.trim()
    if (t.startsWith('if') || t.startsWith('else') || t === '{' || t === '}') continue
    const dw = t.match(/digitalWrite\s*\(\s*(\w+)\s*,\s*(HIGH|LOW|\w+)\s*\)/)
    if (dw) { const pin = resolveVal(dw[1], consts); if (pin >= 0) steps.push({ type: 'dw', pin, val: dw[2] === 'HIGH' ? 1 : dw[2] === 'LOW' ? 0 : resolveVal(dw[2], consts) }); continue }
    const aw = t.match(/analogWrite\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)/)
    if (aw) { const pin = resolveVal(aw[1], consts); const val = resolveVal(aw[2], consts); if (pin >= 0) steps.push({ type: 'aw', pin, val }); continue }
    const dl = t.match(/delay\s*\(\s*(\w+)\s*\)/)
    if (dl) { const ms = resolveVal(dl[1], consts); if (ms >= 0) steps.push({ type: 'dl', ms: Math.min(ms, 5000) }); continue }
  }
  return steps
}
function setupPins(code: string) {
  const consts = resolveConsts(code)
  const setup = extractBody(code, 'setup')
  const pins: Record<number, { pin: number; mode: string }> = {}
  const r = /pinMode\s*\(\s*(\w+)\s*,\s*(OUTPUT|INPUT|INPUT_PULLUP)\s*\)/g
  let m; while ((m = r.exec(setup))) { const pin = resolveVal(m[1], consts); if (pin >= 0) pins[pin] = { pin, mode: m[2] } }
  return pins
}
function btnBranches(code: string) {
  const consts = resolveConsts(code)
  const lb = extractBody(code, 'loop')
  const drM = lb.match(/digitalRead\s*\(\s*(\w+)\s*\)/)
  const btnPin = drM ? resolveVal(drM[1], consts) : null
  const ieM = lb.match(/if\s*\([^)]*\)\s*\{([\s\S]*?)\}\s*else\s*\{([\s\S]*?)\}/s)
  if (!ieM) return { btnPin, lowSteps: [] as Step[], highSteps: [] as Step[] }
  const cond = lb.match(/if\s*\(([^)]*)\)/)?.[1] ?? ''
  const isLow = cond.includes('LOW') || cond.includes('== 0')
  return { btnPin, lowSteps: parseSteps(isLow ? ieM[1] : ieM[2], consts, 10), highSteps: parseSteps(isLow ? ieM[2] : ieM[1], consts, 10) }
}
function hasBtn(code: string) { return /digitalRead\s*\(/.test(code) && /if\s*\(/.test(code) }

// ─────────────────────────────────────────────
// SIMULATOR COMPONENT
// ─────────────────────────────────────────────
type LedS = { pin: number; on: boolean; brightness: number; color: string; label: string }
const P_COLORS: Record<number, string> = { 13: '#00d4ff', 11: '#ff4444', 12: '#ffbb00', 9: '#00d4ff', 2: '#00ff88' }
const P_LABELS: Record<number, string> = { 13: 'LED pin 13', 11: 'ROJO pin 11', 12: 'AMARILLO pin 12', 9: 'LED PWM pin 9' }

function Simulator({ code, mode, isValid }: { code: string; mode: Mission['simulatorMode']; isValid: boolean }) {
  const [running, setRunning] = useState(false)
  const [leds, setLeds] = useState<LedS[]>([])
  const [btnPressed, setBtnPressed] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idxRef = useRef(0)
  const stepsRef = useRef<Step[]>([])
  const btnRef = useRef(false)

  useEffect(() => { btnRef.current = btnPressed }, [btnPressed])
  const addLog = useCallback((msg: string) => setLog(prev => [...prev.slice(-14), msg]), [])

  const initLeds = useCallback(() => {
    const pins = setupPins(code)
    const active = Object.values(pins).filter(p => p.mode === 'OUTPUT').map(p => ({
      pin: p.pin, on: false, brightness: 0,
      color: P_COLORS[p.pin] ?? '#00d4ff',
      label: P_LABELS[p.pin] ?? `LED pin ${p.pin}`,
    }))
    setLeds(active.length > 0 ? active : [{ pin: 13, on: false, brightness: 0, color: '#00d4ff', label: 'LED pin 13' }])
  }, [code])

  const setLed = useCallback((pin: number, on: boolean, brightness?: number) => {
    setLeds(prev => prev.map(l => l.pin === pin ? { ...l, on, brightness: brightness !== undefined ? brightness : on ? 255 : 0 } : l))
  }, [])

  const stopSim = useCallback(() => {
    setRunning(false)
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setLeds(prev => prev.map(l => ({ ...l, on: false, brightness: 0 })))
    setLog([]); idxRef.current = 0
  }, [])

  const runLoop = useCallback(() => {
    if (!stepsRef.current.length) return
    const step = stepsRef.current[idxRef.current % stepsRef.current.length]
    idxRef.current++
    if (step.type === 'dw' && step.pin !== undefined) { setLed(step.pin, step.val === 1); addLog(`digitalWrite(${step.pin}, ${step.val === 1 ? 'HIGH' : 'LOW'})`) }
    else if (step.type === 'aw' && step.pin !== undefined && step.val !== undefined) { const b = Math.min(255, Math.max(0, step.val)); setLed(step.pin, b > 0, b); addLog(`analogWrite(${step.pin}, ${b})`) }
    const nd = step.type === 'dl' && step.ms ? Math.max(80, Math.min(step.ms, 3000)) : 80
    if (idxRef.current >= stepsRef.current.length) idxRef.current = 0
    timerRef.current = setTimeout(runLoop, nd)
  }, [setLed, addLog])

  const runBtn = useCallback(() => {
    const { lowSteps, highSteps } = btnBranches(code)
    const pressed = btnRef.current
    const steps = pressed ? lowSteps : highSteps
    for (const s of steps) {
      if (s.type === 'dw' && s.pin !== undefined) { setLed(s.pin, s.val === 1); addLog(`btn=${pressed ? 'LOW' : 'HIGH'} → digital Write(${s.pin},${s.val === 1 ? 'HIGH' : 'LOW'})`) }
    }
    timerRef.current = setTimeout(runBtn, 100)
  }, [code, setLed, addLog])

  const startSim = useCallback(() => {
    if (!isValid) { addLog('Completa el ejercicio primero.'); return }
    initLeds(); setRunning(true); setLog([]); idxRef.current = 0
    addLog('Simulación iniciada...')
    if (mode === 'button' || hasBtn(code)) {
      addLog('Modo botón activo — usa el botón de abajo.')
      timerRef.current = setTimeout(runBtn, 150)
    } else {
      const steps = parseSteps(extractBody(code, 'loop'), resolveConsts(code))
      stepsRef.current = steps
      addLog(`${steps.length} pasos detectados en loop()`)
      timerRef.current = setTimeout(runLoop, 150)
    }
  }, [isValid, initLeds, mode, code, runBtn, runLoop, addLog])

  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setRunning(false); setLog([]); idxRef.current = 0; initLeds()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const showBtn = mode === 'button' || (running && hasBtn(code))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn('w-2.5 h-2.5 rounded-full transition-all', running ? 'bg-green-400 animate-pulse' : 'bg-zinc-600')} />
          <span className="text-sm font-semibold text-foreground">Simulador</span>
        </div>
        <div className="flex gap-2">
          {!running ? (
            <button onClick={startSim} disabled={!isValid}
              className={cn('px-4 py-2 rounded-lg text-sm font-bold transition-all', isValid ? 'bg-green-500 text-white hover:bg-green-400 shadow-lg shadow-green-500/20' : 'bg-secondary text-muted-foreground cursor-not-allowed')}>
              ▶ Ejecutar
            </button>
          ) : (
            <button onClick={stopSim} className="px-4 py-2 rounded-lg text-sm font-bold bg-red-500 text-white hover:bg-red-400 transition-all">
              ■ Detener
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Arduino board */}
        <div className="rounded-xl border border-zinc-700 bg-[#0a0f1a] p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className={cn('w-2 h-2 rounded-full', running ? 'bg-green-400 animate-pulse' : 'bg-zinc-600')} />
            <span className="text-xs font-mono text-zinc-500 tracking-wider">ARDUINO UNO R3</span>
          </div>
          <div className="flex flex-wrap gap-8 justify-center py-2 min-h-[80px] items-center">
            {leds.map(led => (
              <div key={led.pin} className="flex flex-col items-center gap-3">
                <div style={{ filter: led.on ? `drop-shadow(0 0 ${8 + (led.brightness / 255) * 16}px ${led.color})` : 'none', transition: 'filter 0.1s' }}>
                  <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-100"
                    style={{ borderColor: led.color, backgroundColor: led.on ? led.color : 'transparent', opacity: led.on ? 0.5 + (led.brightness / 255) * 0.5 : 0.8 }}>
                    <div className="w-6 h-6 rounded-full transition-all duration-100"
                      style={{ backgroundColor: led.on ? led.color : 'transparent', opacity: led.on ? 0.7 : 0.15 }} />
                  </div>
                  <div className="flex justify-center gap-3 mt-1">
                    <div className="w-0.5 h-4 bg-zinc-600" />
                    <div className="w-0.5 h-5 bg-zinc-600" />
                  </div>
                </div>
                <span className="text-xs text-zinc-400 text-center font-mono">{led.label}</span>
                {led.on && led.brightness < 255 && (
                  <span className="text-xs font-mono font-bold" style={{ color: led.color }}>{Math.round((led.brightness / 255) * 100)}%</span>
                )}
              </div>
            ))}
            {leds.length === 0 && (
              <p className="text-xs text-zinc-400 text-center">Ejecuta el codigo para ver los LEDs</p>
            )}
          </div>

          {showBtn && (
            <div className="mt-5 flex flex-col items-center gap-3 border-t border-zinc-700 pt-4">
              <span className="text-xs font-mono text-zinc-500">PIN 2 — BOTÓN</span>
              <button
                onMouseDown={() => setBtnPressed(true)} onMouseUp={() => setBtnPressed(false)}
                onMouseLeave={() => setBtnPressed(false)}
                onTouchStart={(e) => { e.preventDefault(); setBtnPressed(true) }}
                onTouchEnd={() => setBtnPressed(false)}
                className={cn(
                  'w-16 h-16 rounded-full border-2 font-bold text-xs select-none transition-all duration-100',
                  btnPressed ? 'bg-primary/40 border-primary scale-90 shadow-lg shadow-primary/30' : 'bg-zinc-800 border-zinc-600 hover:border-primary/50 active:scale-90'
                )}>
                {btnPressed ? 'LOW' : 'HIGH'}
              </button>
              <span className="text-xs text-zinc-400">{btnPressed ? 'Presionado (LOW)' : 'Suéltalo o presiona'}</span>
            </div>
          )}
        </div>

        {/* Serial log */}
        {log.length > 0 && (
          <div className="rounded-lg border border-border bg-[#080d17] overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-xs font-mono text-zinc-500">Monitor serie</span>
            </div>
            <div className="p-3 max-h-28 overflow-y-auto space-y-1">
              {log.map((l, i) => (
                <div key={i} className="text-xs font-mono text-zinc-400">
                  <span className="text-primary/40 mr-2">{'>>'}</span>{l}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status hint */}
        {!running && mode !== 'none' && (
          <div className={cn('rounded-lg border p-3', isValid ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-secondary/30')}>
            <p className="text-sm text-muted-foreground">
              {isValid ? '¡Código listo! Presiona "Ejecutar" para ver la simulación.' : 'Completa el ejercicio correctamente para habilitar la simulación.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// CODE EDITOR
// ─────────────────────────────────────────────
function tokenize(code: string) {
  const kw = ['void', 'int', 'const', 'if', 'else', 'for', 'while', 'return', 'boolean', 'bool', 'char', 'float', 'long', 'byte', 'true', 'false']
  const fn = ['setup', 'loop', 'pinMode', 'digitalWrite', 'digitalRead', 'analogWrite', 'analogRead', 'delay', 'Serial', 'millis', 'map', 'abs']
  const cn = ['HIGH', 'LOW', 'INPUT', 'OUTPUT', 'INPUT_PULLUP', 'LED_BUILTIN']
  let h = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  h = h.replace(/(\/\/[^\n]*)/g, '<span class="tk-c">$1</span>')
  h = h.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="tk-s">$1</span>')
  h = h.replace(/\b(\d+)\b/g, '<span class="tk-n">$1</span>')
  cn.forEach(c => { h = h.replace(new RegExp(`\\b(${c})\\b`, 'g'), '<span class="tk-k2">$1</span>') })
  kw.forEach(k => { h = h.replace(new RegExp(`\\b(${k})\\b`, 'g'), '<span class="tk-kw">$1</span>') })
  fn.forEach(f => { h = h.replace(new RegExp(`\\b(${f})\\b(?=\\s*[({])`, 'g'), '<span class="tk-fn">$1</span>') })
  return h
}

function CodeEditor({ value, onChange, readOnly = false, placeholder, className }: {
  value: string; onChange: (v: string) => void; readOnly?: boolean; placeholder?: string; className?: string
}) {
  const taRef = useRef<HTMLTextAreaElement>(null)
  const hlRef = useRef<HTMLDivElement>(null)
  const lines = value.split('\n').length

  useEffect(() => { if (hlRef.current) hlRef.current.innerHTML = tokenize(value) + '\n' }, [value])

  const syncScroll = () => {
    if (taRef.current && hlRef.current) {
      hlRef.current.scrollTop = taRef.current.scrollTop
      hlRef.current.scrollLeft = taRef.current.scrollLeft
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return
    const ta = e.currentTarget
    const { selectionStart: ss, selectionEnd: se, value: v } = ta
    if (e.key === 'Tab') {
      e.preventDefault()
      onChange(v.slice(0, ss) + '  ' + v.slice(se))
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = ss + 2 })
    } else if (e.key === '{') {
      e.preventDefault()
      onChange(v.slice(0, ss) + '{}' + v.slice(se))
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = ss + 1 })
    } else if (e.key === 'Enter') {
      const before = v.slice(0, ss)
      const lastLine = before.split('\n').pop() ?? ''
      const indent = lastLine.match(/^(\s*)/)?.[1] ?? ''
      const extra = lastLine.trimEnd().endsWith('{') ? '  ' : ''
      e.preventDefault()
      const ins = '\n' + indent + extra
      onChange(v.slice(0, ss) + ins + v.slice(se))
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = ss + ins.length })
    }
  }

  return (
    <div className={cn('relative flex rounded-lg overflow-hidden border border-border font-mono text-base', className)} style={{ background: '#0a0f1a' }}>
      <div className="select-none text-right pr-3 pl-3 pt-3 text-zinc-600 border-r border-border min-w-[3rem] text-sm leading-7" style={{ background: '#070c16' }} aria-hidden="true">
        {Array.from({ length: Math.max(lines, 1) }, (_, i) => <div key={i} className="h-7 leading-7">{i + 1}</div>)}
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div ref={hlRef} aria-hidden="true" className="absolute inset-0 p-3 overflow-auto whitespace-pre leading-7 pointer-events-none hl-layer" />
        <textarea ref={taRef} value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKeyDown} onScroll={syncScroll}
          readOnly={readOnly} placeholder={placeholder} spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off"
          onPaste={e => { if (!readOnly) e.preventDefault() }}
          onCopy={e => e.preventDefault()}
          onCut={e => e.preventDefault()}
          onContextMenu={e => e.preventDefault()}
          className={cn('relative w-full h-full min-h-[200px] resize-none p-3 leading-7 bg-transparent text-transparent caret-cyan-400 outline-none border-none placeholder:text-zinc-700', readOnly && 'cursor-default')}
          aria-label="Editor de codigo Arduino" />
      </div>
      <style>{`.tk-kw{color:#c084fc}.tk-fn{color:#22d3ee}.tk-k2{color:#fbbf24}.tk-c{color:#52525b;font-style:italic}.tk-s{color:#4ade80}.tk-n{color:#fb923c}.hl-layer{color:#cbd5e1;font-size:1rem;line-height:1.75rem}`}</style>
    </div>
  )
}

// ─────────────────────────────────────────────
// QUIZ PANEL
// ─────────────────────────────────────────────
function QuizPanel({ questions, savedAnswers, onAnswer, onComplete }: {
  questions: QuizQuestion[]
  savedAnswers: Record<string, number>
  onAnswer: (qid: string, ans: number) => void
  onComplete: () => void
}) {
  const { progress, addQuizMistake } = useP()
  const [cur, setCur] = useState(0)
  const [sel, setSel] = useState<number | null>(null)
  // correctAnswered: set of qids the student has gotten right at least once
  const [correctAnswered, setCorrectAnswered] = useState<Set<string>>(() => {
    const s = new Set<string>()
    questions.forEach(q => { if (savedAnswers[q.id] === q.correct) s.add(q.id) })
    return s
  })
  const [lastWrong, setLastWrong] = useState(false)

  const q = questions[cur]
  if (!q) return null
  const isLast = cur === questions.length - 1
  const alreadyRight = correctAnswered.has(q.id)

  const handleSel = (idx: number) => {
    if (alreadyRight) return // already passed this question, can't re-answer
    setSel(idx)
    const correct = idx === q.correct
    if (correct) {
      onAnswer(q.id, idx)
      setCorrectAnswered(prev => new Set(prev).add(q.id))
      setLastWrong(false)
    } else {
      addQuizMistake(q.id)
      setLastWrong(true)
      setSel(null) // reset immediately so they can try again
    }
  }

  const handleNext = () => {
    if (!alreadyRight && !correctAnswered.has(q.id)) return // must pass first
    setLastWrong(false)
    setSel(null)
    if (isLast) {
      onComplete()
    } else {
      const n = cur + 1
      setCur(n)
    }
  }

  const totalMistakes = questions.reduce((acc, qq) => acc + (progress.quizMistakes[qq.id] ?? 0), 0)

  return (
    <div className="space-y-5">
      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {questions.map((qq, i) => (
          <div key={qq.id} className={cn('flex-1 h-2.5 rounded-full transition-all',
            correctAnswered.has(qq.id) ? 'bg-green-500' : i === cur ? 'bg-primary' : 'bg-zinc-700')} />
        ))}
        <span className="text-sm text-zinc-300 font-medium">{cur + 1}/{questions.length}</span>
      </div>

      {/* Question */}
      <div className="rounded-xl border border-zinc-600 bg-zinc-800 p-5">
        <p className="text-base font-semibold text-zinc-100 leading-relaxed">{q.question}</p>
      </div>

      {/* Wrong answer banner */}
      {lastWrong && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/8 px-5 py-3 flex items-center gap-3">
          <span className="text-red-400 font-bold text-lg shrink-0">✗</span>
          <div>
            <p className="text-base font-bold text-red-300">Respuesta incorrecta</p>
            <p className="text-sm text-zinc-300">Intenta de nuevo — puedes seleccionar otra opcion.</p>
          </div>
        </div>
      )}

      {/* Correct answer banner */}
      {alreadyRight && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/8 px-5 py-3 flex items-center gap-3">
          <span className="text-green-400 font-bold text-lg shrink-0">✓</span>
          <div>
            <p className="text-base font-bold text-green-300">¡Correcto!</p>
            <p className="text-sm text-zinc-300">{q.explanation}</p>
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-3">
        {q.options.map((opt, idx) => {
          const isCor = idx === q.correct
          return (
            <button key={idx}
              onClick={() => handleSel(idx)}
              disabled={alreadyRight}
              className={cn('w-full text-left rounded-xl border px-5 py-4 text-base flex items-center gap-4 transition-all',
                alreadyRight && isCor ? 'border-green-500 bg-green-500/10 cursor-default' : '',
                alreadyRight && !isCor ? 'border-zinc-700 bg-zinc-800/40 opacity-40 cursor-default' : '',
                !alreadyRight ? 'border-zinc-600 bg-zinc-800 hover:border-primary/60 hover:bg-primary/10 cursor-pointer active:scale-95' : '',
              )}>
              <span className={cn('shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold',
                alreadyRight && isCor ? 'border-green-500 text-green-400' : 'border-zinc-600 text-zinc-300')}>
                {alreadyRight && isCor ? '✓' : String.fromCharCode(65 + idx)}
              </span>
              <span className="leading-relaxed text-zinc-200">{opt}</span>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-sm text-zinc-400">
          Correctas: <span className="text-green-400 font-bold">{correctAnswered.size}/{questions.length}</span>
          {totalMistakes > 0 && <span className="ml-3 text-zinc-500">Intentos fallidos: <span className="text-red-400 font-bold">{totalMistakes}</span></span>}
        </span>
        {alreadyRight && (
          <button onClick={handleNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-base font-bold hover:opacity-90 transition-all active:scale-95">
            {isLast ? 'Completar mision' : 'Siguiente'} →
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// VALIDATION FEEDBACK
// ─────────────────────────────────────────────
function ValidationFeedback({ rules, code, attempted }: { rules: ValidationRule[]; code: string; attempted: boolean }) {
  if (!attempted || !rules.length) return null
  const res = rules.map(r => ({ ...r, passed: r.check(code) }))
  const n = res.filter(r => r.passed).length
  const allOk = n === rules.length
  return (
    <div className={cn('rounded-xl border p-4 space-y-3', allOk ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5')}>
      <p className={cn('text-base font-bold', allOk ? 'text-green-400' : 'text-yellow-400')}>
        {allOk ? '¡Todo correcto!' : `${n} de ${rules.length} requisitos cumplidos`}
      </p>
      {res.map(r => (
        <div key={r.id} className="flex items-start gap-3">
          <span className={cn('text-base shrink-0 mt-0.5 font-bold', r.passed ? 'text-green-400' : 'text-red-400')}>{r.passed ? '✓' : '✗'}</span>
          <div>
            <span className={cn('text-sm', r.passed ? 'text-muted-foreground line-through' : 'text-foreground font-medium')}>{r.description}</span>
            {!r.passed && <p className="text-sm text-yellow-400/80 mt-1">Pista: {r.hint}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// CELEBRATION OVERLAY
// ─────────────────────────────────────────────
function CelebrationOverlay({ visible, title, badge, msg, pts, onContinue }: {
  visible: boolean; title: string; badge: string; msg: string; pts: number; onContinue: () => void
}) {
  // Two-step: first show a "observe the simulator" banner, then show the full celebration card
  const [step, setStep] = useState<'observe' | 'celebrate'>('observe')

  useEffect(() => {
    if (visible) setStep('observe')
  }, [visible])

  if (!visible) return null

  if (step === 'observe') {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center pb-10 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-lg mx-4 rounded-2xl border border-green-500/50 bg-zinc-900/95 backdrop-blur-sm shadow-2xl overflow-hidden animate-slide-in-from-bottom-4">
          <div className="h-1 bg-gradient-to-r from-green-500 via-primary to-green-500" />
          <div className="px-6 py-5 flex items-center gap-5">
            <div className="w-12 h-12 rounded-full bg-green-500/20 border-2 border-green-500/50 flex items-center justify-center shrink-0">
              <span className="text-green-400 text-xl font-bold">✓</span>
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-green-300">¡Codigo correcto!</p>
              <p className="text-sm text-zinc-300 mt-0.5">Observa el simulador — ve como se ejecuta tu programa. Cuando termines, presiona continuar.</p>
            </div>
            <button
              onClick={() => setStep('celebrate')}
              className="shrink-0 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 active:scale-95 transition-all">
              Continuar →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm" role="dialog" aria-modal="true">
        <div className="relative w-full max-w-md mx-4 rounded-2xl border border-primary/40 bg-card shadow-2xl animate-zoom-in-90 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="p-8 text-center space-y-5">
          <div className="mx-auto w-20 h-20 rounded-full bg-accent/15 border-2 border-accent/40 flex items-center justify-center text-4xl">★</div>
          <div>
            <p className="text-sm font-bold text-primary uppercase tracking-widest mb-2">Mision completada</p>
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          </div>
          <p className="text-base text-zinc-200 leading-relaxed">{msg}</p>
          <div className="flex items-center justify-center gap-3 py-3 rounded-xl bg-accent/10 border border-accent/25">
            <span className="text-2xl font-bold text-accent">+{pts} puntos</span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/15 border border-primary/30">
            <span className="text-sm font-bold text-primary">Insignia obtenida: {badge}</span>
          </div>
          <button onClick={onContinue}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 active:scale-98 transition-all">
            Siguiente mision →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MISSION SIDEBAR
// ─────────────────────────────────────────────
function MissionSidebar({ activeMission, onSelect, teacherMode }: {
  activeMission: number; onSelect: (id: number) => void; teacherMode: boolean
}) {
  const { progress, isMissionCompleted, isMissionUnlocked, pct } = useP()
  return (
    <aside className="flex flex-col h-full border-r border-border overflow-hidden" style={{ background: '#0d1117' }}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold text-base">A</div>
          <div>
            <p className="text-base font-bold text-foreground">Arduino Lab</p>
            <p className="text-xs text-zinc-400">Clase interactiva</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-300">Progreso</span>
            <span className="font-bold text-primary">{pct}%</span>
          </div>
          <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <div className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-accent">{progress.points}</p>
            <p className="text-xs text-zinc-300">puntos</p>
          </div>
          <div className="flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-center">
            <p className="text-lg font-bold text-green-400">{progress.completedMissions.length}</p>
            <p className="text-xs text-zinc-300">hechas</p>
          </div>
        </div>
      </div>

      {/* Mission list */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {MISSIONS.map(m => {
          const done = isMissionCompleted(m.id)
          const open = teacherMode || isMissionUnlocked(m.id)
          const active = activeMission === m.id
          return (
            <button key={m.id} onClick={() => open && onSelect(m.id)} disabled={!open}
              className={cn('w-full text-left rounded-xl px-3 py-3 flex items-start gap-3 transition-all',
                active ? 'bg-primary/15 border border-primary/40' :
                  open ? 'hover:bg-zinc-800 border border-transparent hover:border-zinc-700 cursor-pointer' :
                    'opacity-40 cursor-not-allowed border border-transparent')}>
              <span className={cn('mt-0.5 text-base shrink-0 w-5 text-center', done ? 'text-green-400' : active ? 'text-primary' : 'text-zinc-600')}>
                {done ? '✓' : !open ? '🔒' : active ? '▶' : '○'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-xs font-bold', active ? 'text-primary' : done ? 'text-green-400' : 'text-zinc-500')}>
                    {m.id >= 8 ? `M${m.id}` : m.id === 7 ? 'BONUS' : `M${m.id}`}
                  </span>
                  <span className={cn('text-sm font-semibold truncate', active ? 'text-foreground' : 'text-zinc-300')}>{m.title}</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{m.subtitle}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs text-zinc-400">{m.duration}</span>
                  <span className="text-xs text-accent font-semibold">+{m.points}pts</span>
                </div>
              </div>
            </button>
          )
        })}
      </nav>

      {/* Badges */}
      {progress.badges.length > 0 && (
        <div className="border-t border-border p-3 shrink-0">
          <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2">Insignias</p>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            {progress.badges.map(b => (
              <span key={b.missionId} title={b.description}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs text-accent font-semibold whitespace-nowrap">
                ★ {b.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}

// ─────────────────────────────────────────────
// EXPLANATION PANEL
// ─────────────────────────────────────────────
// Prevent copying content from theory/explanation panels
const noCopy = {
  onCopy: (e: React.ClipboardEvent) => e.preventDefault(),
  onCut: (e: React.ClipboardEvent) => e.preventDefault(),
  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
}

function ExplanationPanel({ mission, hintsUsed, onUseHint }: {
  mission: Mission; hintsUsed: number; onUseHint: () => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <div className="space-y-6" {...noCopy} style={{ userSelect: 'none' }}>
      {/* Theory */}
      {mission.theory.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-primary uppercase tracking-widest">Teoria</p>
          {mission.theory.map((t, i) => (
            <div key={i} className="flex gap-4 rounded-xl border border-zinc-600 bg-zinc-800 p-5">
              <div className="w-8 h-8 rounded-full bg-primary/25 flex items-center justify-center shrink-0 text-base font-bold text-primary">{i + 1}</div>
              <p className="text-base text-zinc-100 leading-loose">{t}</p>
            </div>
          ))}
        </div>
      )}

      {/* Concepts */}
      {mission.concepts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-accent uppercase tracking-widest">Conceptos clave</p>
          {mission.concepts.map(c => (
            <div key={c.term} className="rounded-xl border border-zinc-600 overflow-hidden">
              <button onClick={() => setExpanded(expanded === c.term ? null : c.term)}
                className="w-full flex items-center justify-between px-4 py-4 bg-zinc-700 hover:bg-zinc-600/80 transition-colors text-left">
                <code className="text-base font-mono font-bold text-primary">{c.term}</code>
                <span className="text-zinc-300 text-base">{expanded === c.term ? '▲' : '▼'}</span>
              </button>
              {expanded === c.term && (
                <div className="px-5 py-4 bg-zinc-800 border-t border-zinc-600">
                  <p className="text-base text-zinc-200 leading-relaxed">{c.definition}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Explanation */}
      {mission.type === 'code' && mission.explanation && (
        <div className="rounded-xl bg-primary/10 border border-primary/30 p-5">
          <p className="text-base font-bold text-zinc-100 mb-2">¿Qué significa esto?</p>
          <p className="text-base text-zinc-200 leading-relaxed">{mission.explanation}</p>
        </div>
      )}

      {/* Hints */}
      {mission.hints.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-base font-bold text-zinc-100">Pistas</p>
            {hintsUsed < mission.hints.length && (
              <button onClick={onUseHint}
                className="text-sm text-accent hover:underline font-semibold bg-accent/10 px-4 py-2 rounded-lg hover:bg-accent/20 transition-all">
                Ver pista {hintsUsed + 1}/{mission.hints.length}
              </button>
            )}
          </div>
          {hintsUsed === 0 ? (
            <div className="rounded-xl border border-zinc-600 bg-zinc-800 p-5 text-center">
              <p className="text-base text-zinc-300">¿Necesitas ayuda? Haz clic en "Ver pista".</p>
            </div>
          ) : (
            <div className="space-y-2">
              {mission.hints.slice(0, hintsUsed).map((h, i) => (
                <div key={i} className={cn('flex gap-3 rounded-xl border px-5 py-4 text-base',
                  i === hintsUsed - 1 ? 'border-accent/50 bg-accent/10 text-zinc-100' : 'border-zinc-600 bg-zinc-800 text-zinc-300')}>
                  <span className="text-accent font-bold shrink-0">{i + 1}.</span>
                  <span className="leading-relaxed">{h}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// TEACHER PANEL
// ─────────────────────────────────────────────
function TeacherPanel({ onClose, onShowResults }: { onClose: () => void; onShowResults?: () => void }) {
  const { progress, resetProgress } = useP()
  const [confirm, setConfirm] = useState(false)
  const done = progress.completedMissions.length
  const pct = Math.round((done / MISSIONS.length) * 100)
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-4 rounded-2xl border border-border bg-card shadow-2xl animate-zoom-in-90 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border shrink-0">
          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-lg">D</div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Modo Docente</h2>
            <p className="text-sm text-zinc-300">Gestion y monitoreo del progreso</p>
          </div>
          <button onClick={onClose} className="ml-auto text-zinc-300 hover:text-foreground text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Student info */}
          {progress.student && (
            <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                {progress.student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{progress.student.name}</p>
                <p className="text-xs text-zinc-300">Codigo: <code className="text-primary">{progress.student.authCode}</code> · Tiempo: <span className="text-zinc-100 font-mono">{formatTime(progress.elapsedSeconds)}</span></p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{done}</p>
              <p className="text-sm text-zinc-300">Misiones completadas</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-2xl font-bold text-accent">{progress.points}</p>
              <p className="text-sm text-zinc-300">Puntos totales</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-300">Progreso general</span>
              <span className="font-bold text-primary">{pct}%</span>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {MISSIONS.map(m => {
              const d = progress.completedMissions.includes(m.id)
              return (
                <div key={m.id} className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border', d ? 'border-green-500/25 bg-green-500/5' : 'border-border bg-secondary/30')}>
                  <span className={cn('text-base', d ? 'text-green-400' : 'text-zinc-500')}>{d ? '✓' : '○'}</span>
                  <span className="text-sm font-bold text-zinc-300 w-12 shrink-0">{m.id === 7 ? 'BONUS' : `M${m.id}`}</span>
                  <span className="text-sm text-zinc-200 flex-1 truncate">{m.title}</span>
                  <span className="text-xs text-zinc-400 shrink-0">{m.duration}</span>
                </div>
              )
            })}
          </div>
          {progress.badges.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {progress.badges.map(b => (
                <span key={b.missionId} className="px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-sm text-accent font-semibold">{b.name}</span>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-border p-6 space-y-3 shrink-0">
          {confirm && (
            <p className="text-sm text-red-300 rounded-xl bg-red-500/10 border border-red-500/30 p-4">
              Esto eliminará TODO el progreso guardado. Esta acción no se puede deshacer.
            </p>
          )}
          {onShowResults && (
            <button onClick={() => { onClose(); onShowResults() }}
              className="w-full px-4 py-3 rounded-xl border border-green-500/30 bg-green-500/8 text-green-400 text-sm font-bold hover:bg-green-500/15 transition-all">
              Ver resultados del estudiante
            </button>
          )}
          <div className="flex gap-3">
            {confirm && (
              <button onClick={() => setConfirm(false)} className="flex-1 px-4 py-3 rounded-xl border border-border bg-secondary text-sm font-semibold hover:bg-zinc-700 transition-all">
                Cancelar
              </button>
            )}
            <button onClick={() => { if (confirm) { resetProgress(); onClose() } else setConfirm(true) }}
              className={cn('flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all', confirm ? 'bg-red-500 text-white hover:bg-red-400' : 'border border-red-500/40 text-red-400 hover:bg-red-500/10')}>
              ↺ {confirm ? 'Confirmar reinicio' : 'Reiniciar progreso'}
            </button>
          </div>
          <button onClick={onClose} className="w-full px-4 py-3 rounded-xl bg-secondary text-sm font-semibold hover:bg-zinc-700 transition-all">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MISSION VIEW
// ─────────────────────────────────────────────
type MTab = 'editor' | 'theory' | 'simulator'

function MissionView({ mission, onNext }: { mission: Mission; onNext: () => void }) {
  const { progress, isMissionCompleted, completeMission, saveCode, saveQuizAnswer, incrementHints, addCodeMistake } = useP()
  const [code, setCode] = useState((progress.code ?? {})[mission.id] ?? mission.starterCode)
  const [attempted, setAttempted] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [tab, setTab] = useState<MTab>('editor')
  const [showTheory, setShowTheory] = useState(true)
  const isCompleted = isMissionCompleted(mission.id)
  const hintsUsed = progress.hintsUsed[mission.id] ?? 0
  const codeMistakes = progress.codeMistakes[mission.id] ?? 0

  useEffect(() => {
    setCode((progress.code ?? {})[mission.id] ?? mission.starterCode)
    setAttempted(false); setTab('editor'); setShowTheory(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mission.id])

  const handleCode = (v: string) => {
    setCode(v)
    saveCode(mission.id, v)
    // Keep 'attempted' true so the validation panel stays visible while the student edits.
    // The feedback will live-update as rules re-evaluate against the new code.
  }
  const allPassed = mission.validationRules ? mission.validationRules.every(r => r.check(code)) : true

  const handleValidate = () => {
    setAttempted(true)
    const passes = !mission.validationRules || mission.validationRules.every(r => r.check(code))
    if (passes && !isCompleted) {
      setTimeout(() => setShowCelebration(true), 350)
    } else if (!passes) {
      addCodeMistake(mission.id)
    }
  }
  const handleCelebrationContinue = () => {
    setShowCelebration(false)
    completeMission(mission.id, mission.points, mission.badge)
    onNext()
  }
  const handleQuizComplete = () => { if (!isCompleted) setTimeout(() => setShowCelebration(true), 400) }
  const handleReset = () => { setCode(mission.starterCode); saveCode(mission.id, mission.starterCode); setAttempted(false) }

  const TABS: { id: MTab; label: string }[] = [
    { id: 'editor', label: 'Editor' },
    { id: 'theory', label: 'Teoría' },
    { id: 'simulator', label: 'Simulador' },
  ]

  return (
    <>
      <CelebrationOverlay visible={showCelebration} title={mission.title} badge={mission.badge.name} msg={mission.successMessage} pts={mission.points} onContinue={handleCelebrationContinue} />

      {/* Mobile tabs */}
      <div className="lg:hidden flex border-b border-border bg-card shrink-0">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex-1 py-3.5 text-sm font-semibold transition-colors border-b-2',
              tab === id ? 'border-primary text-primary' : 'border-transparent text-zinc-300 hover:text-foreground')}>
            {label}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex-1 overflow-hidden flex flex-col lg:grid lg:grid-cols-[1fr_380px]">

        {/* LEFT: editor / quiz / intro */}
        <div className={cn('flex flex-col overflow-hidden border-r border-border', tab !== 'editor' && 'hidden lg:flex')}>
          {/* Mission header */}
          <div className="px-5 pt-5 pb-4 border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
                    {mission.id === 7 ? 'BONUS' : `Misión ${mission.id}`}
                  </span>
                  <span className="text-xs text-accent font-semibold">+{mission.points} pts</span>
                  {isCompleted && <span className="text-xs text-green-400 font-bold">✓ Completada</span>}
                </div>
                <h2 className="text-xl font-bold text-foreground mb-1">{mission.title}</h2>
                <p className="text-sm text-zinc-300">{mission.subtitle}</p>
              </div>
              <div className="text-3xl leading-none mt-1" aria-hidden="true">{mission.icon}</div>
            </div>
            <div className="mt-3 flex items-start gap-3 rounded-xl bg-secondary/60 px-4 py-3 border border-border">
              <span className="text-primary text-sm mt-0.5 shrink-0 font-bold">▸</span>
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-bold text-primary">Objetivo: </span>{mission.objective}
              </p>
            </div>
          </div>

          {/* INTRO type */}
          {mission.type === 'intro' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4" {...noCopy} style={{ userSelect: 'none' }}>
              {mission.theory.map((t, i) => (
                <div key={i} className="flex gap-4 rounded-xl border border-zinc-600 bg-zinc-800 p-4">
                  <div className="w-8 h-8 rounded-full bg-primary/25 flex items-center justify-center shrink-0 text-sm font-bold text-primary">{i + 1}</div>
                  <p className="text-sm text-zinc-100 leading-relaxed">{t}</p>
                </div>
              ))}
              {mission.quiz && !isCompleted && (
                <div className="space-y-3 pt-2">
                  <p className="text-base font-bold text-foreground">Comprueba tu comprensión</p>
                  <QuizPanel questions={mission.quiz} savedAnswers={progress.quizAnswers} onAnswer={saveQuizAnswer} onComplete={handleQuizComplete} />
                </div>
              )}
              {isCompleted && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6 text-center space-y-3">
                  <p className="text-green-400 font-bold text-3xl">✓</p>
                  <p className="text-base font-bold text-green-400">¡Misión completada!</p>
                  <button onClick={onNext} className="mx-auto flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-base font-bold hover:opacity-90 transition-all">
                    Siguiente misión →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* QUIZ type */}
          {mission.type === 'quiz' && (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-xl border border-zinc-600 overflow-hidden">
                <button onClick={() => setShowTheory(!showTheory)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-zinc-700 hover:bg-zinc-600/80 transition-colors text-left">
                  <span className="text-base font-bold text-zinc-100">Lee la teoria primero</span>
                  <span className="text-zinc-300">{showTheory ? '▲' : '▼'}</span>
                </button>
                {showTheory && (
                  <div className="p-5 space-y-3 bg-zinc-800" {...noCopy} style={{ userSelect: 'none' }}>
                    {mission.theory.map((t, i) => (
                      <div key={i} className="flex gap-3 text-sm text-zinc-200 leading-relaxed">
                        <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {mission.starterCode && (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Codigo de referencia</p>
                  <CodeEditor value={mission.starterCode} onChange={() => {}} readOnly className="max-h-56" />
                </div>
              )}
              {mission.quiz && !isCompleted && (
                <QuizPanel questions={mission.quiz} savedAnswers={progress.quizAnswers} onAnswer={saveQuizAnswer} onComplete={handleQuizComplete} />
              )}
              {isCompleted && (
                <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6 text-center space-y-3">
                  <p className="text-green-400 font-bold text-3xl">✓</p>
                  <p className="text-base font-bold text-green-400">¡Misión completada!</p>
                  <button onClick={onNext} className="mx-auto flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground text-base font-bold hover:opacity-90 transition-all">
                    Siguiente misión →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* CODE type */}
          {mission.type === 'code' && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Editor toolbar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-zinc-800/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="text-sm text-zinc-500 font-mono">sketch.ino</span>
                </div>
                <button onClick={handleReset} className="text-sm text-zinc-500 hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-zinc-700">
                  ↺ Reiniciar código
                </button>
              </div>
              {/* Code area */}
              <div className="flex-1 overflow-hidden p-3">
                <CodeEditor value={code} onChange={handleCode} placeholder="// Escribe tu código Arduino aquí..." className="h-full min-h-[200px]" />
              </div>
              {/* Validation */}
              <div className="px-4 pb-2 shrink-0">
                {mission.validationRules && (
                  <ValidationFeedback rules={mission.validationRules} code={code} attempted={attempted} />
                )}
              </div>
              {/* Action buttons */}
              <div className="flex flex-col gap-2 px-4 py-4 border-t border-border shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { incrementHints(mission.id); setTab('theory') }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-secondary text-sm font-semibold hover:border-accent/50 hover:bg-zinc-700 transition-all">
                    Pista {hintsUsed}/{mission.hints.length}
                  </button>
                  <button onClick={handleValidate} disabled={isCompleted}
                    className={cn('flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-bold transition-all',
                      isCompleted ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default' : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95 shadow-lg shadow-primary/20')}>
                    {isCompleted ? '✓ Completada' : attempted && !allPassed ? 'Volver a verificar' : 'Verificar y ejecutar'}
                  </button>
                  {isCompleted && (
                    <button onClick={onNext} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-secondary text-sm font-semibold hover:bg-zinc-700 transition-all">
                      Siguiente →
                    </button>
                  )}
                </div>
                {codeMistakes > 0 && !isCompleted && (
                  <p className="text-xs text-red-400 text-center">
                    Intentos fallidos: <span className="font-bold">{codeMistakes}</span> — corrige el codigo y vuelve a verificar
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: theory + simulator */}
        <div className={cn('flex flex-col overflow-hidden bg-card', tab === 'editor' ? 'hidden lg:flex' : 'flex')}>
          {/* Theory/Explanation */}
          <div className={cn('overflow-y-auto',
            mission.simulatorMode !== 'none' ? 'lg:flex-1 border-b border-border' : 'flex-1',
            tab === 'simulator' ? 'hidden lg:block' : 'block')}>
            <div className="p-5">
              <ExplanationPanel mission={mission} hintsUsed={hintsUsed} onUseHint={() => incrementHints(mission.id)} />
            </div>
          </div>
          {/* Simulator */}
          {mission.simulatorMode !== 'none' && (
            <div className={cn('lg:flex-1 overflow-hidden min-h-[320px]',
              tab === 'theory' ? 'hidden lg:block' : 'block')}>
              <Simulator code={code} mode={mission.simulatorMode} isValid={allPassed || isCompleted} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────
const VALID_CODES = ['ARDUINO2024', 'LAB001']

function LoginScreen({ onLogin }: { onLogin: (s: StudentInfo) => void }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (name.trim().length < 3) { setError('Escribe tu nombre completo (mínimo 3 letras).'); return }
    if (!VALID_CODES.includes(code.trim().toUpperCase())) { setError('Código de autorización incorrecto. Pídele el código a tu docente.'); return }
    setLoading(true)
    setTimeout(() => {
      onLogin({ name: name.trim(), authCode: code.trim().toUpperCase(), startedAt: new Date().toISOString() })
    }, 600)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="mx-auto mb-5 w-20 h-20 rounded-2xl bg-primary/15 border-2 border-primary/30 flex items-center justify-center">
            <span className="text-4xl font-bold text-primary">A</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Arduino Lab</h1>
          <p className="text-base text-zinc-300 mt-2">Clase interactiva de programacion</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-8 space-y-6 shadow-2xl">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-1">Ingresa tus datos</h2>
            <p className="text-sm text-zinc-300">Tu docente te dara el codigo de autorizacion antes de empezar.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-foreground" htmlFor="student-name">
              Nombre completo
            </label>
            <input
              id="student-name"
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError('') }}
              placeholder="Ej: Juan Pérez González"
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              autoFocus
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-base font-semibold text-foreground" htmlFor="auth-code">
              Código de autorización
            </label>
            <input
              id="auth-code"
              type="text"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
              placeholder="Escribe el código aquí"
              className="w-full rounded-xl border border-border bg-secondary px-4 py-3.5 text-base text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all uppercase"
              autoComplete="off"
            />
            <p className="text-sm text-zinc-300">El codigo lo da el docente antes de iniciar la clase.</p>
          </div>

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3">
              <span className="text-red-400 font-bold text-lg shrink-0">!</span>
              <p className="text-sm text-red-300 leading-relaxed">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              'w-full py-4 rounded-xl text-base font-bold transition-all',
              loading
                ? 'bg-primary/40 text-primary-foreground/60 cursor-wait'
                : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95 shadow-lg shadow-primary/20'
            )}
          >
            {loading ? 'Ingresando...' : 'Ingresar a la clase →'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400 mt-6">
          Pide el codigo de autorizacion a tu docente antes de ingresar.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// TIMER UTILITIES
// ─────────────────────────────────────────────
function formatTime(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// INACTIVITY IDLE COUNTER — shown in header
// Counts seconds of inactivity (resets on any mouse/key/scroll event)
// After 30s idle, shows a visible red counter that accumulates.
// Idle time is persisted to progress.inactiveSeconds.
const IDLE_THRESHOLD = 30 // seconds before we count as inactive

function InactivityTimer() {
  const { addInactive } = useP()
  // idleSecs: how long user has been idle RIGHT NOW (resets on activity)
  const [idleSecs, setIdleSecs] = useState(0)
  const [isIdle, setIsIdle] = useState(false)
  const idleTickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const idleCountRef = useRef(0) // accumulated since last persist to context

  const resetIdle = useCallback(() => {
    if (idleSecs > 0 || isIdle) {
      // Flush any accumulated idle time before resetting
      if (idleCountRef.current > 0) {
        addInactive(idleCountRef.current)
        idleCountRef.current = 0
      }
      setIdleSecs(0)
      setIsIdle(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleSecs, isIdle])

  // Global activity listeners
  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach(ev => window.addEventListener(ev, resetIdle, { passive: true }))
    return () => events.forEach(ev => window.removeEventListener(ev, resetIdle))
  }, [resetIdle])

  // Idle tick
  useEffect(() => {
    idleTickRef.current = setInterval(() => {
      setIdleSecs(prev => {
        const next = prev + 1
        if (next >= IDLE_THRESHOLD) {
          setIsIdle(true)
          // Count every second over threshold as idle, persist every 10s
          idleCountRef.current += 1
          if (idleCountRef.current >= 10) {
            addInactive(idleCountRef.current)
            idleCountRef.current = 0
          }
        }
        return next
      })
    }, 1000)
    return () => {
      if (idleTickRef.current) clearInterval(idleTickRef.current)
      if (idleCountRef.current > 0) {
        addInactive(idleCountRef.current)
        idleCountRef.current = 0
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!isIdle) return null

  const idleDisplay = Math.max(0, idleSecs - IDLE_THRESHOLD)
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-red-500/50 bg-red-500/12 font-mono text-sm font-bold text-red-400 animate-pulse">
      <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
      Inactivo {formatTime(idleDisplay)}
    </div>
  )
}

// ─────────────────────────────────────────────
// RESULTS SCREEN
// ─────────────────────────────────────────────
function ResultsScreen({ onClose }: { onClose: () => void }) {
  const { progress } = useP()
  const [copied, setCopied] = useState(false)

  const student = progress.student
  const done = progress.completedMissions.length
  const total = MISSIONS.length
  const pct = Math.round((done / total) * 100)
  const time = formatTime(progress.elapsedSeconds)

  const completedList = MISSIONS.filter(m => progress.completedMissions.includes(m.id))
  const pendingList = MISSIONS.filter(m => !progress.completedMissions.includes(m.id))

  const resultText = [
    '============================',
    '   RESULTADOS - ARDUINO LAB',
    '============================',
    `Estudiante : ${student?.name ?? 'Sin nombre'}`,
    `Código     : ${student?.authCode ?? '-'}`,
    `Fecha      : ${new Date().toLocaleString('es-CR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    `Tiempo total     : ${time}`,
    `Tiempo inactivo  : ${formatTime(progress.inactiveSeconds ?? 0)}`,
    `Progreso         : ${done}/${total} misiones (${pct}%)`,
    `Intentos fallidos quiz : ${Object.values(progress.quizMistakes ?? {}).reduce((a, b) => a + b, 0)}`,
    `Intentos fallidos codigo : ${Object.values(progress.codeMistakes ?? {}).reduce((a, b) => a + b, 0)}`,
    `Puntos     : ${progress.points}`,
    `Insignias  : ${progress.badges.map(b => b.name).join(', ') || 'Ninguna'}`,
    '',
    '--- MISIONES COMPLETADAS ---',
    ...completedList.map(m => `  [✓] M${m.id}: ${m.title} (+${m.points} pts)`),
    '',
    '--- MISIONES PENDIENTES ---',
    ...pendingList.map(m => `  [ ] M${m.id}: ${m.title}`),
    '',
    '============================',
  ].join('\n')

  const handleCopy = () => {
    navigator.clipboard.writeText(resultText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }).catch(() => {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = resultText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 px-7 py-6 border-b border-border shrink-0" style={{ background: 'linear-gradient(135deg, oklch(0.20 0.02 240), oklch(0.17 0.015 240))' }}>
          <div className="flex-1">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Resultado final</p>
            <h2 className="text-2xl font-bold text-foreground">{student?.name ?? 'Estudiante'}</h2>
            <p className="text-sm text-zinc-300 mt-0.5">Codigo: <code className="text-primary font-mono">{student?.authCode}</code></p>
          </div>
          <button onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-secondary hover:bg-zinc-700 text-muted-foreground hover:text-foreground text-2xl transition-colors"
            aria-label="Cerrar resultados">
            ×
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-7 py-5 border-b border-border shrink-0">
          <div className="rounded-xl bg-secondary p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{done}/{total}</p>
            <p className="text-xs text-zinc-300 mt-1">Misiones</p>
          </div>
          <div className="rounded-xl bg-secondary p-4 text-center">
            <p className="text-2xl font-bold text-accent">{progress.points}</p>
            <p className="text-xs text-zinc-300 mt-1">Puntos</p>
          </div>
          <div className="rounded-xl bg-secondary p-4 text-center">
            <p className="text-2xl font-bold text-primary">{pct}%</p>
            <p className="text-xs text-zinc-300 mt-1">Completado</p>
          </div>
          <div className="rounded-xl bg-secondary p-4 text-center">
            <p className="text-2xl font-bold text-foreground font-mono">{time}</p>
            <p className="text-xs text-zinc-300 mt-1">Tiempo total</p>
          </div>
        </div>

        {/* Mistakes summary */}
        {(() => {
          const totalQuizMistakes = Object.values(progress.quizMistakes ?? {}).reduce((a, b) => a + b, 0)
          const totalCodeMistakes = Object.values(progress.codeMistakes ?? {}).reduce((a, b) => a + b, 0)
          if (totalQuizMistakes === 0 && totalCodeMistakes === 0) return null
          return (
            <div className="grid grid-cols-2 gap-3 px-7 pt-4 shrink-0">
              {totalQuizMistakes > 0 && (
                <div className="rounded-xl bg-red-500/8 border border-red-500/25 p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">{totalQuizMistakes}</p>
                  <p className="text-xs text-zinc-300 mt-1">Intentos fallidos quiz</p>
                </div>
              )}
              {totalCodeMistakes > 0 && (
                <div className="rounded-xl bg-orange-500/8 border border-orange-500/25 p-4 text-center">
                  <p className="text-2xl font-bold text-orange-400">{totalCodeMistakes}</p>
                  <p className="text-xs text-zinc-300 mt-1">Intentos fallidos codigo</p>
                </div>
              )}
            </div>
          )
        })()}

        {/* Idle time warning */}
        {(progress.inactiveSeconds ?? 0) > 0 && (
          <div className="mx-7 mt-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/8 px-5 py-3 shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-red-300">Tiempo inactivo registrado: <span className="font-mono">{formatTime(progress.inactiveSeconds ?? 0)}</span></p>
              <p className="text-xs text-zinc-400">El sistema detectó periodos sin actividad de más de 30 segundos.</p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="px-7 py-4 border-b border-border shrink-0">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-300">Progreso general</span>
            <span className="font-bold text-primary">{pct}%</span>
          </div>
          <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Mission list */}
        <div className="flex-1 overflow-y-auto px-7 py-4 space-y-2">
          <p className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3">Detalle por mision</p>
          {MISSIONS.map(m => {
            const isDone = progress.completedMissions.includes(m.id)
            return (
              <div key={m.id} className={cn('flex items-center gap-4 px-4 py-3 rounded-xl border transition-colors',
                isDone ? 'border-green-500/25 bg-green-500/5' : 'border-border bg-secondary/30 opacity-70')}>
                <span className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
                  isDone ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-400')}>
                  {isDone ? '✓' : '○'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-zinc-400">{m.id === 7 ? 'BONUS' : `M${m.id}`}</span>
                    <span className="text-sm font-semibold text-foreground truncate">{m.title}</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5 truncate">{m.subtitle}</p>
                </div>
                <div className="shrink-0 text-right space-y-0.5">
                  <span className={cn('text-sm font-bold block', isDone ? 'text-green-400' : 'text-zinc-600')}>
                    {isDone ? `+${m.points} pts` : `— pts`}
                  </span>
                  {(progress.codeMistakes?.[m.id] ?? 0) > 0 && (
                    <span className="text-xs text-orange-400 block">
                      {progress.codeMistakes[m.id]} {progress.codeMistakes[m.id] === 1 ? 'intento fallido' : 'intentos fallidos'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}

          {/* Badges */}
          {progress.badges.length > 0 && (
            <div className="pt-3">
              <p className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-2">Insignias ganadas</p>
              <div className="flex flex-wrap gap-2">
                {progress.badges.map(b => (
                  <span key={b.missionId} title={b.description} className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-accent/15 border border-accent/30 text-sm text-accent font-semibold whitespace-nowrap">{'★'} {b.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>{/* end flex-1 overflow-y-auto mission list */}

        {/* Actions */}
        <div className="px-7 py-5 border-t border-border shrink-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCopy}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-base transition-all',
              copied
                ? 'bg-green-500 text-white'
                : 'bg-primary text-primary-foreground hover:opacity-90 active:scale-95 shadow-lg shadow-primary/20'
            )}
          >
            {copied ? '✓ ¡Copiado!' : 'Copiar resultados'}
          </button>
          <button onClick={onClose}
            className="flex-1 py-3.5 rounded-xl border border-border bg-secondary text-base font-semibold hover:bg-zinc-700 transition-all">
            Volver a la clase
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
function TeacherPasswordModal({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd === '2026') { onSuccess() }
    else { setError(true); setPwd(''); setTimeout(() => setError(false), 2000) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-8 space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-2xl font-bold text-primary">D</div>
          <h2 className="text-xl font-bold text-foreground">Area del Docente</h2>
          <p className="text-sm text-zinc-400 mt-1">Ingresa la clave de acceso para continuar.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            value={pwd}
            onChange={e => { setPwd(e.target.value); setError(false) }}
            placeholder="Clave del docente"
            className={cn(
              'w-full rounded-xl border px-4 py-3.5 text-base text-foreground bg-secondary focus:outline-none focus:ring-2 transition-all text-center tracking-widest font-mono',
              error ? 'border-red-500 focus:ring-red-500/20' : 'border-border focus:border-primary focus:ring-primary/20'
            )}
          />
          {error && <p className="text-sm text-red-400 text-center">Clave incorrecta. Intenta de nuevo.</p>}
          <button type="submit"
            className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:opacity-90 transition-all">
            Ingresar
          </button>
          <button type="button" onClick={onCancel}
            className="w-full py-3 rounded-xl border border-border bg-secondary text-sm font-semibold text-muted-foreground hover:text-foreground transition-all">
            Cancelar
          </button>
        </form>
      </div>
    </div>
  )
}

function AppInner() {
  const { progress, isLoaded, setCurrentMission, setStudent, setFinished } = useP()
  const [showTeacherPwd, setShowTeacherPwd] = useState(false)
  const [showTeacher, setShowTeacher] = useState(false)
  const [teacherMode, setTeacherMode] = useState(false)
  const [mobileSidebar, setMobileSidebar] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const activeId = Math.min(Math.max(0, progress.currentMission ?? 0), MISSIONS.length - 1)
  const activeMission = MISSIONS[activeId] ?? MISSIONS[0]
  const motMsg = MOTIVATIONAL[progress.completedMissions.length % MOTIVATIONAL.length]
  const handleNext = () => { const n = activeId + 1; if (n < MISSIONS.length) setCurrentMission(n) }
  const handleFinish = () => { setFinished(true); setShowResults(true) }
  const handleTeacherClick = () => {
    if (teacherMode) { setShowTeacher(true) }
    else { setShowTeacherPwd(true) }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-base text-muted-foreground">Cargando Arduino Lab...</p>
        </div>
      </div>
    )
  }

  // Show login if no student registered
  if (!progress.student) {
    return <LoginScreen onLogin={(s) => setStudent(s)} />
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Professor credit bar */}
      <div className="shrink-0 flex items-center justify-center px-4 py-1.5 bg-zinc-900 border-b border-zinc-700/60">
        <p className="text-xs sm:text-sm font-semibold tracking-wide text-zinc-300">
          Programa desarrollado por el{' '}
          <span className="text-primary font-bold" style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.03em' }}>
            Prof. Rodolfo Solano V.
          </span>
        </p>
      </div>
      {/* Header */}
      <header className="h-14 shrink-0 flex items-center justify-between px-4 border-b border-border bg-card/80 backdrop-blur-sm z-30">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileSidebar(!mobileSidebar)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-lg"
            aria-label="Menú">
            {mobileSidebar ? '×' : '≡'}
          </button>
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex w-7 h-7 rounded-lg bg-primary/20 items-center justify-center text-primary text-sm font-bold">A</div>
            <span className="font-bold text-foreground text-base">Arduino Lab</span>
            <span className="hidden sm:inline text-sm text-zinc-300 truncate max-w-[160px]">— {progress.student.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Inactivity timer — only shown when student is idle */}
          <InactivityTimer />

          {/* Points */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/25">
            <span className="text-sm font-bold text-accent">{progress.points}</span>
            <span className="text-xs text-zinc-300">pts</span>
          </div>

          {/* Results button */}
          <button
            onClick={() => setShowResults(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all border border-green-500/40 bg-green-500/10 text-green-300 hover:bg-green-500/20">
            <span className="hidden sm:inline">Ver resultados</span>
            <span className="sm:hidden">✓</span>
          </button>

          {/* Teacher mode — password protected */}
          <button
            onClick={handleTeacherClick}
            className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all border',
              teacherMode ? 'bg-primary/15 border-primary/40 text-primary' : 'border-border bg-secondary text-zinc-300 hover:text-foreground hover:border-primary/30')}>
            ◉ <span className="hidden sm:inline">Docente</span>
          </button>
        </div>
      </header>

      {/* Motivational strip */}
      {progress.completedMissions.length > 0 && (
        <div className="shrink-0 bg-primary/5 border-b border-primary/15 px-4 py-1.5 flex items-center justify-center gap-3">
          <p className="text-sm text-primary/80 italic">{motMsg}</p>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex relative">
        {mobileSidebar && (
          <div className="lg:hidden fixed inset-0 bg-background/60 backdrop-blur-sm z-20" onClick={() => setMobileSidebar(false)} />
        )}
        <div className={cn(
          'shrink-0 z-30 transition-all duration-300 lg:relative lg:w-64 lg:translate-x-0 fixed top-[calc(2.5rem+3.5rem)] bottom-0 left-0 w-72',
          mobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}>
          <MissionSidebar
            activeMission={activeId}
            onSelect={(id) => { setCurrentMission(id); setMobileSidebar(false) }}
            teacherMode={teacherMode}
          />
        </div>
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          <MissionView key={activeId} mission={activeMission} onNext={handleNext} />
        </main>
      </div>

      {/* Finish button when all done */}
      {progress.completedMissions.length === MISSIONS.length && !progress.finished && (
        <div className="shrink-0 border-t border-green-500/30 bg-green-500/8 px-4 py-3 flex items-center justify-center gap-4">
          <p className="text-base font-bold text-green-400">¡Completaste todas las misiones!</p>
          <button onClick={handleFinish}
            className="px-6 py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-400 transition-all">
            Finalizar y ver resultados →
          </button>
        </div>
      )}

      {/* Teacher password gate */}
      {showTeacherPwd && (
        <TeacherPasswordModal
          onSuccess={() => { setShowTeacherPwd(false); setTeacherMode(true); setShowTeacher(true) }}
          onCancel={() => setShowTeacherPwd(false)}
        />
      )}

      {/* Teacher modal */}
      {showTeacher && <TeacherPanel onClose={() => setShowTeacher(false)} onShowResults={() => setShowResults(true)} />}

      {/* Results screen */}
      {showResults && <ResultsScreen onClose={() => setShowResults(false)} />}

      {/* Footer */}
      <div className="hidden lg:flex h-8 shrink-0 items-center justify-center bg-card/50 border-t border-border">
        <p className="text-xs text-zinc-500">
          Simulación por reglas — soporta: pinMode · digitalWrite · digitalRead · delay · analogWrite · if/else · for() · while()
        </p>
      </div>
    </div>
  )
}

export default function ArduinoLabPage() {
  return (
    <PProvider>
      <AppInner />
    </PProvider>
  )
}
