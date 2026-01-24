# Cognix

> **Cognix** — an open‑source AI chatbot for individuals and teams.
>
> **Maintained by priyx**

---



---

🚀 **Live Demo:** 

#### Demo Chats

* **MCP Tools Demo:** [https://cognix-demo.vercel.app/export/a4820921-8012-496b-8a5d-13757050bafe](https://cognix-demo.vercel.app/export/a4820921-8012-496b-8a5d-13757050bafe)
* **Image Generation Demo:** [https://cognix-demo.vercel.app/export/452ad745-9efb-49ae-9114-10db15f1b827](https://cognix-demo.vercel.app/export/452ad745-9efb-49ae-9114-10db15f1b827)

---

## Overview

**Cognix** is a powerful, extensible AI chatbot platform inspired by ChatGPT, Claude, Grok, and Gemini. It brings multiple LLM providers, MCP tools, automation, and collaboration into a single, clean interface.

* **Multi‑AI Support** — OpenAI, Anthropic, Google, xAI, Ollama, OpenRouter, and more
* **MCP Tools** — Web search, browser automation, code execution, custom MCP servers
* **Image Generation** — Generate and edit images using supported AI models
* **Automation** — Custom agents, workflows, and reusable tools
* **Collaboration** — Share agents, workflows, and MCP configurations
* **Voice Assistant** — Realtime voice chat with MCP tool execution
* **Fast UX** — Invoke tools and agents instantly using `@mentions`

Built with **Next.js** and the **Vercel AI SDK**.

---

## Table of Contents

* [Overview](#overview)
* [Features](#features)
* [Getting Started](#getting-started)
* [Environment Variables](#environment-variables)
* [Guides](#guides)
* [Roadmap](#roadmap)
* [Contributing](#contributing)
* [Community](#community)

---

## Features

### 🧩 MCP Tools

* Full support for the **Model Context Protocol (MCP)**
* Connect multiple MCP servers
* LLMs can autonomously decide when and how to use tools

### 🔗 Visual Workflows

* Build workflows visually using LLM nodes and tool nodes
* Publish workflows as callable tools
* Reuse complex multi‑step processes

### 🤖 Custom Agents

* Create specialized agents with custom instructions
* Assign tools per agent
* Invoke agents using `@agent_name`

### 🎙️ Realtime Voice Assistant

* Natural voice conversations
* Real‑time tool execution
* MCP‑aware voice interactions

### ⚡ Tool Mentions & Presets

* Use `@toolname` to call tools on demand
* Create tool presets for different tasks
* Reduce token usage and improve accuracy

### 🧭 Tool Choice Mode

* **Auto** — Model decides when to call tools
* **Manual** — Ask before tool execution
* **None** — Disable tools completely

### 🛠️ Built‑in Tools

* **Web Search** (Exa AI integration)
* **JS / Python Executor**
* **Data Visualization** (tables, charts, exports)
* **Image Generation & Editing**

---

## Getting Started

> This project uses **pnpm** as the recommended package manager.

```bash
npm install -g pnpm
```

### Quick Start (Docker Compose)

```bash
pnpm i
pnpm docker-compose:up
```

### Quick Start (Local)

```bash
pnpm i
pnpm docker:pg   # optional local PostgreSQL
pnpm build:local && pnpm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

A `.env` file is generated automatically after installing dependencies.

```dotenv
# LLM Providers (at least one required)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
XAI_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434/api

# Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=

# Database
POSTGRES_URL=

# Tools (optional)
EXA_API_KEY=

# File Storage
FILE_STORAGE_TYPE=vercel-blob
FILE_STORAGE_PREFIX=uploads
BLOB_READ_WRITE_TOKEN=

# OAuth (optional)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

---

## Guides

* **MCP Server Setup & Tool Testing** — `docs/tips-guides/mcp-server-setup-and-tool-testing.md`
* **Docker Hosting Guide** — `docs/tips-guides/docker.md`
* **Vercel Hosting Guide** — `docs/tips-guides/vercel.md`
* **File Storage Drivers** — `docs/tips-guides/file-storage.md`
* **System Prompts & Chat Customization** — `docs/tips-guides/system-prompts-and-customization.md`
* **OAuth Setup** — `docs/tips-guides/oauth.md`
* **Adding OpenAI‑like Providers** — `docs/tips-guides/adding-openAI-like-providers.md`
* **E2E Testing Guide** — `docs/tips-guides/e2e-testing-guide.md`

---

## Roadmap

* [x] File Upload & Storage
* [x] Image Generation
* [ ] Collaborative Document Editing
* [ ] RAG (Retrieval‑Augmented Generation)
* [ ] Web‑based Compute (WebContainers)

---

## Contributing

Contributions are welcome — bug reports, feature requests, and pull requests.

Please read `CONTRIBUTING.md` before submitting PRs.

---

## Community

💬 **Join the Discord:** [https://discord.gg/5b99XppGDV](https://discord.gg/5b99XppGDV)

If you find Cognix useful, please consider starring the repository ⭐
