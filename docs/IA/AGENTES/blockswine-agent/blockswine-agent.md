Blockswine Agent
================

Blockswine Agent is a local AI assistant powered by Ollama and Node.js.
It is designed to support multi‑repository workflows, code analysis,
content generation, and project automation across the Blockswine ecosystem.

Purpose
-------

The agent provides a unified interface to:
- read and analyze multiple repositories
- generate documentation, summaries, and reports
- assist with development tasks
- support content creation for Blockswine projects
- offer contextual reasoning using local models

Architecture
------------

The agent is built as a modular Node.js application:

blockswine-agent/
│
├── agent.js              # main agent logic
├── tools/                # custom tools (file readers, analyzers, generators)
├── config/               # system prompts and settings
├── memory/               # optional persistent memory
└── package.json          # project metadata

Requirements
-----------

- Node.js (latest LTS)
- Ollama installed on Windows
- At least one local model (recommended: qwen2.5-coder:3b)

Usage
-----

Run the agent:

node agent.js

Send a message to the agent by modifying the initial call inside agent.js.

Repositories
------------

The agent can operate on multiple repositories.
Paths are defined inside agent.js or in a separate configuration file.

Example:

const repos = {
  core: "C:/Users/maest/Documents/blockswine-core",
  api: "C:/Users/maest/Documents/blockswine-api",
  docs: "C:/Users/maest/Documents/blockswine-docs"
};

Extending the Agent
-------------------

You can add new tools inside the tools/ directory:

- file readers
- code analyzers
- content generators
- project automation scripts

Each tool can be imported and used by the agent depending on the user request.

License
-------

Internal use only.


🟦 2. ¿Cómo arrancar el agente?
En VS Code:

Abre la carpeta blockswine-agent

Abre una terminal dentro del proyecto

Ejecuta:

Código
node agent.js
o si lo montamos así:

Código
node src/index.js
Cuando arranca, verás algo como:

Código
[agent] ready
Ese es el momento en el que puedes pedirle cosas.

🟩 3. ¿Cómo se le piden cosas al agente?
Depende de cómo lo implementamos, pero normalmente:

✔ Método 1 — Por terminal (CLI)
Tu agente escuchaba mensajes desde la terminal:

Código
node agent-magnums.js "resume el repo magnumslocal"
o:

Código
node agent.js "organiza la estructura del proyecto"
o:

Código
node agent.js "lee el archivo src/app.js y dime qué hace"
✔ Método 2 — Por prompt interno
Si el agente abre un prompt interactivo, verás:

Código
> 
Y ahí escribes:

Código
analiza el repositorio blockswine-core
o:

Código
crea un plan de refactorización
o:

Código
resume memory.json
✔ Método 3 — Por API local (si lo montamos)
Si el agente exponía un endpoint:

Código
POST http://localhost:3000/agent
con:

json
{
  "message": "organiza el repo magnumsmaster"
}
🟦 4. ¿Qué cosas puede hacer tu agente?
Tu agente Node.js tenía:

✔ herramientas para leer archivos
✔ herramientas para listar repos
✔ herramientas para modificar código
✔ herramientas para generar documentación
✔ herramientas para crear estructura de carpetas
✔ memoria persistente (memory.json)
✔ contexto de sesión (context.json)
✔ estado (state.json)
✔ integración con Ollama (Qwen como cerebro)
Por eso puedes pedirle:

“Analiza este repo”

“Reorganiza esta carpeta”

“Genera documentación”

“Resume este archivo”

“Crea un plan de trabajo”

“Explica este código”

“Busca errores”

“Genera un README”

“Crea una arquitectura”

“Haz un refactor”

🟩 5. ¿Cómo sabe el agente dónde están tus repos?
Porque en agent.js o en config/ definimos rutas como:

js
const repos = {
  core: "C:/Users/maest/Documents/blockswine-core",
  api: "C:/Users/maest/Documents/blockswine-api",
  docs: "C:/Users/maest/Documents/blockswine-docs",
  magnumslocal: "C:/Users/maest/magnumslocal",
  magnumsmaster: "C:/Users/maest/magnumsmaster"
};
Por eso el agente puede actuar en todos tus repos.

🟥 6. Importante: Copilot NO es tu agente
Copilot:

no usa tu memoria.json

no usa tu contexto.json

no usa tu agente.js

no sabe nada de tu mecánico

solo añade metadatos del navegador

Tu agente es independiente.