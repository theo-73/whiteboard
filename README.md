# SynapseBoard ⚡

> **Think Together. Draw Smarter.**
> Production-grade, real-time collaborative architecture whiteboard powered by AI diagram intelligence, Mess Cleanup auto-align layout engine, Deep Architecture Assist, Executable Context Layer, Liveblocks multiplayer presence, tldraw canvas engine, and Supabase persistent storage.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

---

## 🌟 Key Features

### 🧹 1. Mess Cleanup (Auto-Align & Animated Layout Engine)
- **Automatic Graph & Topology Analysis:** Scans all canvas shapes (`geo`, `text`, `note`) and extracts explicit and implicit arrow connector topologies using spatial proximity heuristics.
- **Hierarchical DAG Layering:** Computes an optimized directed acyclic graph layout (longest-path layering) with balanced horizontal and vertical spacing centered around the user's active viewport.
- **Smooth 350ms Animated Physics:** Features a custom `requestAnimationFrame` physics loop with cubic-bezier easing (`easeOutCubic`) so shapes and connecting arrows fly smoothly into position.

### 🏗️ 2. Architecture Assist (Deep Canvas Diagram Analysis)
- **Canvas Serialization:** Serializes real-time canvas shapes and connector pairs, transmitting active diagram topology to a specialized Systems Architect AI engine (`POST /api/ai/architecture-assist`).
- **Structured Architectural Recommendations:** Evaluates diagrams across 4 critical enterprise categories:
  - **Missing Components:** e.g. *Redis Caching Layer*
  - **API Gateway Suggestions:** e.g. *NGINX / AWS ALB Ingress & Rate Limiting*
  - **DBMS Guidance:** e.g. *PostgreSQL Primary & Read-Replica Partitioning*
  - **Scalability & Observability:** e.g. *Kafka/RabbitMQ Queues & OpenTelemetry/Prometheus*
- **1-Click Canvas Insertion:** Actionable cards feature a **"+ Add [Node Label] to Canvas"** button that automatically creates and offsets missing services directly on your whiteboard.

### 📎 3. Shape Context Layer & Visual On-Canvas Badges
- **Per-Element Context Attachment:** Attach comprehensive metadata to any element on the canvas:
  - **Plain Text Architecture Notes:** Architectural specifications, API contracts, and schema definitions with live auto-save indicators.
  - **Reference Links:** URL manager for Swagger docs, Figma mockups, and GitHub repositories.
  - **Code Snippets:** Code editor blocks supporting `TypeScript`, `SQL Schema`, `JSON Payload`, `Python`, and `Bash`.
  - **File Attachments:** Drag-and-drop file uploader supporting images, PDFs, and spec documents.
- **On-Canvas Visual Badges:** Projects interactive badges (`FileText`, `Link`, `Code2`, `Paperclip`) with item counters directly over shape viewport coordinates. Clicking any shape badge launches its Context Panel.

### 🤖 4. AI Copilot & On-Canvas "Ghost Shapes"
- **AI Diagram Streaming:** Describe any cloud or software system (e.g. *"AWS Serverless Architecture with CloudFront, Lambda, and DynamoDB"*) to stream structured architecture nodes and edges in real-time.
- **On-Canvas Ghost Shapes:** Renders semi-transparent (`opacity: 0.45`, dashed grey) ghost shapes directly at target coordinates on the canvas before committing.
- **1-Key Tab Commit:** Press **Tab** or click **Accept** to instantly convert ghost shapes into solid, synced tldraw canvas shapes with bound arrows.

### 🧬 5. Mermaid-to-Canvas Compiler (Two-Way Sync)
- **Import Mermaid Markdown:** Paste any standard Mermaid syntax (e.g. from ChatGPT or GitHub docs) to compile it into interactive, movable tldraw shapes.
- **Shape Support:** Recognizes rectangular services `[Node]`, rounded endpoints `(API)`, databases `[(DB)]`, and decision nodes `{Router}` with labeled connecting arrows `-->|HTTPS|`.
- **Export Formats:** 1-click export of active canvas diagrams to Mermaid.js code syntax, high-res **PNG** images, or vector **SVG** files.

### 👥 6. Multiplayer & Teammate "Follow Mode"
- **Live Cursors & Presence:** Synchronized multi-user cursors with customized user names, avatars, and distinct colors powered by `@liveblocks/react`.
- **Continuous Follow Mode:** Click any teammate's avatar in the top bar to lock your camera to theirs, smoothly tracking their screen as they present or navigate around the canvas.

### ⏳ 7. Time-Travel Diagram Replay
- **Historical Timeline:** Automatically records step-by-step canvas snapshots as your architecture evolves.
- **Interactive Replay Bar:** Scrub backward and forward using a bottom playback slider, complete with **Play/Pause**, **Step Back**, **Step Forward**, and automatic live state restoration.

### 💾 8. Supabase Postgres Room & Snapshot Persistence
- **Persistent Rooms:** Database storage backed by Supabase Postgres with Row Level Security (RLS) policies for room titles, access states, and canvas state snapshots across server restarts.
- **Honest State Handling:** Returns true 404 responses for deleted or non-existent rooms with 1-click initialization, enforces a 5MB payload ceiling on snapshots, and flushes canvas updates via `sendBeacon` on tab close.

---

## 🏗️ Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16 (App Router)](https://nextjs.org/) | Core application framework & API routes |
| **Canvas Engine** | [tldraw v5](https://tldraw.dev/) | Infinite vector canvas drawing engine |
| **Auto-Layout Engine** | Custom DAG & Topology Compiler | Hierarchical graph layering & 350ms easing transitions |
| **Context Store** | Zustand & Local Storage | Shape-level Notes, Links, Code, Files & Canvas Overlay Badges |
| **Multiplayer Sync** | [Liveblocks](https://liveblocks.io/) | Real-time presence, Yjs synchronization, and user state |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) | Global UI state, AI suggestions, context layer, and follow mode |
| **Persistence** | [Supabase Postgres](https://supabase.com/) | Room metadata & canvas snapshot storage |
| **AI Stream Engine** | [Vercel AI SDK](https://sdk.vercel.ai/) & OpenAI | Streaming NDJSON diagram generation & Architecture Assist |
| **Styling** | Vanilla CSS Tokens & TailwindCSS v4 | Modern glassmorphism UI & responsive layouts |

---

## 🎯 Key Technical Highlights

### 1. **Type-Safe Architecture**
- Comprehensive TypeScript interfaces for all shape types
- Proper type guards instead of unsafe type assertions
- Strict type checking across all components

### 2. **Error Resilience**
- React Error Boundaries for graceful error handling
- Fallback loading states and error messages
- Graceful degradation when external services are unavailable

### 3. **Performance Optimized**
- Dynamic imports for code splitting
- Optimized rendering with React.memo where appropriate
- Efficient state management with Zustand

### 4. **Responsive Design**
- Mobile-first approach with breakpoints
- Touch-friendly interface adaptations
- Adaptive layouts for different screen sizes

---

## 📁 Project Structure

```
whiteboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── ai/           # AI endpoints
│   │   │   ├── export/       # Export functionality
│   │   │   └── rooms/        # Room management
│   │   ├── board/[id]/       # Board page
│   │   ├── layout.tsx        # Root layout
│   │   ├── page.tsx          # Landing page
│   │   └── globals.css       # Global styles
│   ├── components/           # React components
│   │   ├── ai-panel.tsx      # AI assistant panel
│   │   ├── canvas-wrapper.tsx # tldraw wrapper
│   │   ├── context-panel.tsx  # Context layer panel
│   │   ├── error-boundary.tsx # Error handling
│   │   ├── liveblocks-provider.tsx # Multiplayer
│   │   ├── presence-cursors.tsx # User cursors
│   │   ├── time-travel-replay.tsx # History replay
│   │   ├── toolbar.tsx       # Drawing tools
│   │   └── top-bar.tsx       # Top navigation
│   ├── lib/                  # Utility libraries
│   │   ├── auto-layout.ts    # DAG layout algorithm
│   │   ├── mermaid-compiler.ts # Mermaid parser
│   │   └── supabase.ts       # Database client
│   └── store/                # State management
│       ├── app-store.ts      # Global app state
│       └── context-store.ts  # Context layer state
├── supabase/
│   └── schema.sql            # Database schema
├── public/                   # Static assets
└── package.json             # Dependencies
```

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Database Setup

For Supabase persistence, run the SQL migration script:

```bash
# Apply the schema to your Supabase project
# Copy contents of supabase/schema.sql to your Supabase SQL editor
```

---

## 📚 Documentation

- [📁 Technical Architecture Guide (`ARCHITECTURE.md`)](./ARCHITECTURE.md) - Deep dive into system design
- [📁 REST API Reference (`API.md`)](./API.md) - Complete API documentation
- [📁 Contributing Guidelines (`CONTRIBUTING.md`)](./CONTRIBUTING.md) - How to contribute

---

## 🎨 Features Showcase

### 🧹 Mess Cleanup (Auto-Align)
- Automatic graph topology analysis
- Hierarchical DAG layering algorithm
- Smooth 350ms animated transitions
- Intelligent arrow routing

### 🤖 AI Architecture Assist
- Deep canvas analysis
- Intelligent component suggestions
- One-click canvas insertion
- Fallback to built-in patterns

### 📎 Executable Context Layer
- Per-element metadata attachment
- Rich text notes with auto-save
- Reference links management
- Code snippets with syntax highlighting
- File attachments support

### 👥 Real-time Collaboration
- Live cursor presence
- Follow mode for presentations
- Multi-user editing
- Conflict resolution

### ⏳ Time-Travel Replay
- Step-by-step diagram history
- Interactive playback controls
- Live state restoration
- History scrubbing

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
- **Node.js**: `v18.x` or higher
- **npm**: `v9.x` or higher

### 2. Clone & Install
```bash
git clone https://github.com/Tejas3479/whiteboard.git
cd whiteboard
npm install
```

### 3. Environment Variables (Optional)
Create a `.env.local` file in the root directory:
```env
# OpenAI API Key for live AI diagram generation & Architecture Assist
OPENAI_API_KEY=your_openai_api_key_here

# Liveblocks API Key for real-time collaboration
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=your_liveblocks_public_key_here

# Supabase Postgres Persistence (Optional - falls back to local memory if omitted)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## 🗄️ Supabase Database Migration Setup

To configure Supabase Postgres persistence, run the SQL migration script located in [`supabase/schema.sql`](./supabase/schema.sql):

```sql
CREATE TABLE IF NOT EXISTS rooms (
  id VARCHAR(32) PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled Architecture Board',
  is_public BOOLEAN DEFAULT true,
  snapshot_data TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public rooms are readable by everyone" ON rooms FOR SELECT USING (is_public = true);
CREATE POLICY "Anyone can create a room" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update room snapshots" ON rooms FOR UPDATE USING (true);
```

---

## ⌨️ Keyboard Shortcuts & Quick Controls

| Control / Shortcut | Feature / Action |
| :--- | :--- |
| **Wand Icon (`Mess Cleanup`)** | Trigger 350ms smooth animated auto-alignment of diagram topology |
| **`Architecture Assist` Tab** | Run AI deep canvas analysis & inspect missing service recommendations |
| **`Context Layer` Icon / Badge** | Open element context panel to edit Notes, Links, Code, & Files |
| **Click Canvas Shape Badge** | Directly open attached Context Layer for selected element |
| **Tab** | Instantly commit top AI suggestion / ghost shape on canvas |
| **Ctrl+Z / Ctrl+Shift+Z** | Undo / Redo canvas actions |
| **Click Teammate Avatar** | Toggle continuous camera **Follow Mode** |
| **Time-Travel Button** | Toggle step-by-step diagram history replay slider |

---

## 📚 Documentation Suite

For deeper technical specifications and project guidelines, see:
- [📁 Technical Architecture Guide (`ARCHITECTURE.md`)](./ARCHITECTURE.md)
- [📁 REST API Reference (`API.md`)](./API.md)
- [📁 Contribution Guidelines (`CONTRIBUTING.md`)](./CONTRIBUTING.md)
- [📁 Security Policy (`SECURITY.md`)](./SECURITY.md)
- [📁 Code of Conduct (`CODE_OF_CONDUCT.md`)](./CODE_OF_CONDUCT.md)
- [📁 AI Agent Guidelines (`AGENTS.md`)](./AGENTS.md)

---

## 📄 License

Distributed under the [MIT License](./LICENSE). Built with ❤️ for developers and system architects.
