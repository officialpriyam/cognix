# Cognix

[![MCP Supported](https://img.shields.io/badge/MCP-Supported-00c853)](https://modelcontextprotocol.io/introduction)
[![Local First](https://img.shields.io/badge/Local-First-blue)](https://localfirstweb.dev/)
[![Discord](https://img.shields.io/discord/1374047276074537103?label=Discord&logo=discord&color=5865F2)](https://cognixdc.iampriyam.me)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/priyx/cognix&env=BETTER_AUTH_SECRET&env=OPENAI_API_KEY&env=GOOGLE_GENERATIVE_AI_API_KEY&env=ANTHROPIC_API_KEY&envDescription=BETTER_AUTH_SECRET+is+required+(enter+any+secret+value).+At+least+one+LLM+provider+API+key+(OpenAI,+Claude,+or+Google)+is+required,+but+you+can+add+all+of+them.+See+the+link+below+for+details.&envLink=https://github.com/priyx/cognix/blob/main/.env.example&demo-title=cognix&demo-description=An+Open-Source+Chatbot+Template+Built+With+Next.js+and+the+AI+SDK+by+Vercel.&products=[{"type":"integration","protocol":"storage","productSlug":"neon","integrationSlug":"neon"},{"type":"integration","protocol":"storage","productSlug":"upstash-kv","integrationSlug":"upstash"},{"type":"blob"}]>)

🚀 [Live Demo](https://cognix-demo.vercel.app/) | See the experience in action in the [preview](#preview) below!

#### Demo Chats

- MCP Tools Demo: [Chat with Tools](https://cognix-demo.vercel.app/export/a4820921-8012-496b-8a5d-13757050bafe)
- Image Generation Demo: [Chat with Image Generation](https://cognix-demo.vercel.app/export/452ad745-9efb-49ae-9114-10db15f1b827)

---

## Overview

Cognix — an open‑source AI chatbot for individuals and teams.

> Cognix is a powerful, extensible AI chatbot platform inspired by ChatGPT, Claude, Grok, and Gemini. It brings multiple LLM providers, MCP tools, automation, and collaboration into a single, clean interface.

* Multi‑AI Support — OpenAI, Anthropic, Google, xAI, Ollama, OpenRouter, and more
* MCP Tools — Web search, browser automation, code execution, custom MCP servers
* Image Generation — Generate and edit images using supported AI models
* Automation — Custom agents, workflows, and reusable tools
* Collaboration — Share agents, workflows, and MCP configurations
* Voice Assistant — Realtime voice chat with MCP tool execution
* Fast UX — Invoke tools and agents instantly using `@mentions`

Built with Next.js and the Vercel AI SDK.

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

Full support for the *Model Context Protocol (MCP)**
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

* Auto — Model decides when to call tools
* Manual — Ask before tool execution
* None — Disable tools completely

### 🛠️ Built‑in Tools

* Web Search (Exa AI integration)
* JS / Python Executor
* Data Visualization (tables, charts, exports)
* Image Generation & Editing

---

## Getting Started

> This project uses pnpm as the recommended package manager.

```bash
npm install -g pnpm
