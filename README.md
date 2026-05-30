# 🚀 KimiProxy

Proxy API local compatível com **OpenAI** que roteia requisições para os modelos do **Kimi (kimi.ai)** via automação de navegador com Playwright. Tenha o poder do Kimi (incluindo modelos de raciocínio) em qualquer ferramenta que aceite o SDK da OpenAI.

[![GitHub license](https://img.shields.io/github/license/riqueandrade/kimiproxy?style=flat-square)](https://github.com/riqueandrade/kimiproxy/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Hono](https://img.shields.io/badge/Hono-4.0-green?style=flat-square)](https://hono.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-1.59-blueviolet?style=flat-square)](https://playwright.dev/)

---

## ✨ Destaques

- 🧠 **Suporte a Reasoning**: Use modelos como `k2d6-thinking` com blocos de pensamento nativos.
- 🛠️ **Execução de Ferramentas**: Sistema de *Function Calling* integrado via Prompt Engineering.
- 🔄 **Auto-Continue**: Detecta automaticamente quando o Kimi pausa respostas longas e continua sozinho.
- 📂 **Sessão Persistente**: Login via navegador com persistência de cookies em `kimi_profile/`.
- 🌐 **Visibilidade de Rede**: Exibe URLs de acesso local e na rede Wi-Fi/LAN.
- 🎨 **Interface Terminal Pro**: Logs coloridos, spinners e banners informativos.
- 🐳 **Docker Ready**: Suporte para execução em containers.

---

## 🏗️ Como Funciona?

O KimiProxy atua como uma ponte. Ele recebe uma chamada de API padrão da OpenAI, abre uma instância silenciosa (headless) do seu navegador para autenticar e extrair os headers necessários do Kimi, e então realiza a comunicação direta com a API gRPC do Kimi para garantir a máxima velocidade de streaming.

---

## 📋 Pré-requisitos

- **Node.js**: v20.x ou superior
- **Navegador**: Chrome, Brave, Edge ou Firefox instalado (ou use os binários do Playwright)

---

## 🚀 Instalação e Setup

1. **Clonar e Instalar:**
   ```bash
   git clone https://github.com/riqueandrade/kimiproxy.git
   cd kimiproxy
   npm install
   ```

2. **Configuração (.env):**
   Crie um arquivo `.env` na raiz:
   ```env
   PORT=3000
   API_KEY=sk-sua-chave-aqui
   BROWSER=chrome
   # Opcional: Aponte para o executável do seu Brave/Chrome/Edge
   # EXECUTABLE_PATH=C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe
   ```

3. **Login (Obrigatório uma única vez):**
   Execute o comando abaixo. Ele abrirá uma janela do navegador:
   ```bash
   npm run login
   ```
   - Faça login na sua conta no site do Kimi.
   - Assim que vir a tela de chat, **feche a janela do navegador**.
   - Sua sessão estará salva em `kimi_profile/`.

---

## 📡 Uso

**Iniciar o Servidor:**
```bash
npm start
```

**Exemplo de integração com OpenAI SDK:**
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:3000/v1',
  apiKey: 'sk-sua-chave-aqui'
});

const response = await openai.chat.completions.create({
  model: 'k2d6-thinking',
  messages: [{ role: 'user', content: 'Qual a raiz quadrada de 144?' }],
  stream: true
});
```

---

## 🛠️ Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia o proxy usando o navegador configurado no `.env`. |
| `npm run login` | Abre o navegador para autenticação manual. |
| `npm test` | Executa a suíte de testes (18 testes integrados). |
| `npm run start:firefox` | Força a execução usando o Firefox. |

---

## ⚠️ Disclaimer

Este projeto é destinado estritamente para fins **educacionais e de pesquisa**. 
- Não incentive ou use para violação dos Termos de Serviço da plataforma Kimi.
- Não utilize para automação em larga escala não autorizada.

**Desenvolvido por Henrique de Andrade Reynaud.**
