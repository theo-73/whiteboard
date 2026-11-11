"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Users, LogIn, ArrowRight, Wand2, FileCode2, 
  History, CheckCircle2,
  Layers, Plus, Clock, Trash2,
  Terminal, ArrowUpRight
} from "lucide-react";
import { nanoid } from "nanoid";
import { motion, AnimatePresence } from "framer-motion";

interface RecentBoard {
  id: string;
  name: string;
  updatedAt: number;
}

export default function LandingPage() {
  const router = useRouter();
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState("");
  const [recentBoards, setRecentBoards] = useState<RecentBoard[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("synapse_recent_boards");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Interactive Live Hero Preview State (DAG node positions for live demo)
  const [previewNodes, setPreviewNodes] = useState([
    { id: "client", label: "Web / Mobile Client", type: "React / Next.js", x: 24, y: 140, layer: 0 },
    { id: "gateway", label: "API Gateway", type: "Envoy / Reverse Proxy", x: 260, y: 90, layer: 1 },
    { id: "auth", label: "Auth Service", type: "JWT / OIDC", x: 260, y: 220, layer: 1 },
    { id: "redis", label: "Redis Session Cache", type: "In-Memory Store", x: 500, y: 40, layer: 2 },
    { id: "db", label: "Postgres Cluster", type: "WAL / Read Replicas", x: 500, y: 180, layer: 2 },
  ]);
  const [isCleaned, setIsCleaned] = useState(false);

  const handleCreateBoard = async (customName?: string) => {
    const boardId = nanoid(10);
    const boardName = customName || `Architecture Board ${boardId.substring(0, 4)}`;
    
    // Save to local recent boards list
    try {
      const updated = [
        { id: boardId, name: boardName, updatedAt: Date.now() },
        ...recentBoards.filter((b) => b.id !== boardId),
      ].slice(0, 8);
      setRecentBoards(updated);
      localStorage.setItem("synapse_recent_boards", JSON.stringify(updated));
    } catch {
      // Storage quota or SSR fallback
    }

    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: boardId,
          name: boardName, 
          isPublic: true 
        }),
      });
      router.push(`/board/${boardId}`);
    } catch {
      router.push(`/board/${boardId}`);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;

    let cleanId = roomIdInput.trim();
    if (cleanId.includes("/board/")) {
      cleanId = cleanId.split("/board/")[1];
    }
    router.push(`/board/${cleanId}`);
  };

  const handleDeleteRecentBoard = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = recentBoards.filter((b) => b.id !== id);
    setRecentBoards(updated);
    try {
      localStorage.setItem("synapse_recent_boards", JSON.stringify(updated));
    } catch {
      // Storage fallback
    }
  };

  const handleTriggerMessCleanup = () => {
    setIsCleaned((prev) => !prev);
    if (!isCleaned) {
      // Clean topological layered coordinates
      setPreviewNodes([
        { id: "client", label: "Web / Mobile Client", type: "React / Next.js", x: 20, y: 130, layer: 0 },
        { id: "gateway", label: "API Gateway", type: "Envoy / Reverse Proxy", x: 250, y: 70, layer: 1 },
        { id: "auth", label: "Auth Service", type: "JWT / OIDC", x: 250, y: 200, layer: 1 },
        { id: "redis", label: "Redis Session Cache", type: "In-Memory Store", x: 490, y: 50, layer: 2 },
        { id: "db", label: "Postgres Cluster", type: "WAL / Read Replicas", x: 490, y: 190, layer: 2 },
      ]);
    } else {
      // Scatter slightly to demonstrate mess
      setPreviewNodes([
        { id: "client", label: "Web / Mobile Client", type: "React / Next.js", x: 40, y: 170, layer: 0 },
        { id: "gateway", label: "API Gateway", type: "Envoy / Reverse Proxy", x: 230, y: 40, layer: 1 },
        { id: "auth", label: "Auth Service", type: "JWT / OIDC", x: 280, y: 240, layer: 1 },
        { id: "redis", label: "Redis Session Cache", type: "In-Memory Store", x: 480, y: 30, layer: 2 },
        { id: "db", label: "Postgres Cluster", type: "WAL / Read Replicas", x: 510, y: 220, layer: 2 },
      ]);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-[var(--background)] text-[var(--text-primary)] font-sans antialiased selection:bg-blue-600/30 selection:text-blue-100">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center text-blue-400 font-mono font-bold text-sm shadow-sm">
              SB
            </div>
            <span className="font-semibold text-base tracking-tight font-mono text-[var(--text-primary)]">
              SynapseBoard
            </span>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border border-[var(--border)] text-[var(--text-secondary)] bg-[var(--surface)]">
              v1.0 Architecture Engine
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowJoinModal(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] border border-transparent hover:border-[var(--border)] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <LogIn size={14} />
              Join Room
            </button>
            <button 
              onClick={() => handleCreateBoard()}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
            >
              <Plus size={14} /> New Board
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 pt-10 pb-20 flex flex-col gap-16 max-w-6xl">
        
        {/* ===================================================
            SECTION 1: ASYMMETRIC PRODUCT-LED HERO
           =================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center pt-4">
          
          {/* Left Column: Engineer-Voice Copy */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-mono font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 w-fit">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Deterministic Architecture Whiteboard
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-[var(--text-primary)] leading-[1.15]">
              Turn system sketches into connected architectures.
            </h1>

            <p className="text-sm md:text-base text-[var(--text-secondary)] leading-relaxed">
              A real-time whiteboard built specifically for system architects. Auto-layout directed DAGs in 350ms, compile Mermaid syntax bi-directionally, and keep code specs permanently bound to canvas shapes.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button 
                onClick={() => handleCreateBoard()}
                className="px-5 py-3 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                Launch Whiteboard <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button 
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] font-semibold text-sm hover:border-[var(--text-secondary)] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Users size={16} className="text-[var(--text-secondary)]" /> Join with Room ID
              </button>
            </div>

            {/* Spec Checks */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-xs font-mono text-[var(--text-secondary)]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" /> 350ms DAG Auto-Layout
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" /> Bi-directional Mermaid
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-400" /> Shape-Bound Context Layer
              </span>
            </div>
          </div>

          {/* Right Column: Live Interactive Product Canvas Preview */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-md overflow-hidden flex flex-col">
              
              {/* Canvas Header */}
              <div className="px-4 py-2.5 border-b border-[var(--border)] bg-[var(--background-secondary)] flex items-center justify-between text-xs font-mono text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/70 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70 inline-block"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70 inline-block"></span>
                  <span className="ml-2 text-[var(--text-primary)] font-semibold">sys/payment-pipeline</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTriggerMessCleanup}
                    className="px-2.5 py-1 rounded bg-[var(--surface)] hover:bg-[var(--surface-hover)] border border-[var(--border)] text-blue-400 hover:text-blue-300 text-[11px] font-semibold active:scale-95 transition-all flex items-center gap-1.5"
                    title="Click to run live 350ms topological DAG layout test"
                  >
                    <Wand2 size={12} /> {isCleaned ? "Scatter Nodes" : "Run Mess Cleanup (350ms)"}
                  </button>
                </div>
              </div>

              {/* Canvas Interactive Surface */}
              <div className="relative w-full h-[320px] bg-[var(--background)] bg-dots-pattern overflow-hidden select-none">
                
                {/* SVG Connectors */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                  {/* Client to Gateway */}
                  <line 
                    x1={previewNodes[0].x + 130} y1={previewNodes[0].y + 24} 
                    x2={previewNodes[1].x} y2={previewNodes[1].y + 24} 
                    stroke="rgba(37, 99, 235, 0.45)" strokeWidth="2" strokeDasharray="4 4"
                  />
                  {/* Client to Auth */}
                  <line 
                    x1={previewNodes[0].x + 130} y1={previewNodes[0].y + 24} 
                    x2={previewNodes[2].x} y2={previewNodes[2].y + 24} 
                    stroke="rgba(37, 99, 235, 0.45)" strokeWidth="2" strokeDasharray="4 4"
                  />
                  {/* Gateway to Redis */}
                  <line 
                    x1={previewNodes[1].x + 130} y1={previewNodes[1].y + 24} 
                    x2={previewNodes[3].x} y2={previewNodes[3].y + 24} 
                    stroke="rgba(16, 185, 129, 0.4)" strokeWidth="2"
                  />
                  {/* Gateway to Postgres */}
                  <line 
                    x1={previewNodes[1].x + 130} y1={previewNodes[1].y + 24} 
                    x2={previewNodes[4].x} y2={previewNodes[4].y + 24} 
                    stroke="rgba(16, 185, 129, 0.4)" strokeWidth="2"
                  />
                </svg>

                {/* Nodes */}
                {previewNodes.map((node) => (
                  <motion.div
                    key={node.id}
                    animate={{ x: node.x, y: node.y }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute w-[130px] p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-sm flex flex-col justify-between z-10 text-left cursor-default hover:border-[var(--accent)] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-[var(--text-primary)] truncate">{node.label}</span>
                    </div>
                    <span className="text-[9px] font-mono text-[var(--text-secondary)]">{node.type}</span>
                    
                    {/* Shape-bound context indicator pill */}
                    {node.id === "gateway" && (
                      <div className="mt-1.5 inline-flex items-center gap-1 text-[8px] font-mono font-medium px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20">
                        <span>API Spec attached</span>
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Topology Layer Marker Tags */}
                <div className="absolute bottom-2 left-4 right-4 flex justify-between pointer-events-none text-[10px] font-mono text-[var(--text-muted)] border-t border-[var(--border-subtle)] pt-1">
                  <span>Layer 0: Ingress</span>
                  <span>Layer 1: Routing & Auth</span>
                  <span>Layer 2: Storage & Cache</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================================================
            SECTION 2: RECENT BOARDS / ROOM DASHBOARD
           =================================================== */}
        <section className="flex flex-col gap-4 border-t border-[var(--border)] pt-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-blue-400" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Your Architecture Boards</h2>
            </div>
            <button
              onClick={() => handleCreateBoard()}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Plus size={14} /> Create Blank Board
            </button>
          </div>

          {recentBoards.length === 0 ? (
            <div className="p-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center flex flex-col items-center justify-center gap-3">
              <Clock size={24} className="text-[var(--text-muted)]" />
              <span className="text-xs font-medium text-[var(--text-secondary)]">No recent architecture boards yet.</span>
              <button
                onClick={() => handleCreateBoard("Primary System Architecture")}
                className="px-3.5 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] active:scale-95 transition-all"
              >
                Create your first board
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentBoards.map((b) => (
                <div
                  key={b.id}
                  onClick={() => router.push(`/board/${b.id}`)}
                  className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--text-secondary)] transition-all cursor-pointer flex flex-col justify-between gap-3 group shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-blue-400 transition-colors line-clamp-1">
                      {b.name}
                    </span>
                    <button
                      onClick={(e) => handleDeleteRecentBoard(e, b.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-red-400 rounded transition-colors"
                      title="Remove from recents"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                    <span>ID: {b.id.substring(0, 8)}</span>
                    <span>{new Date(b.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ===================================================
            SECTION 3: ASYMMETRIC BENTO GRID (ENGINEERING SUITE)
           =================================================== */}
        <section className="flex flex-col gap-6 border-t border-[var(--border)] pt-10">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">
              Built for production architecture specifications.
            </h2>
            <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">
              Zero fluff. Features built to make engineering reviews, RFC diagrams, and topology models clear and permanent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Bento Card 1: Hero Feature (Large 2 cols) */}
            <div className="md:col-span-2 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between gap-6 shadow-sm">
              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Wand2 size={16} />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">350ms DAG Mess Cleanup Engine</h3>
                <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">
                  Drawing boxes during architecture syncs is naturally messy. Click Mess Cleanup to trigger a deterministic topological layer sort. Nodes align into clean hierarchical tiers with zero connector loss and cubic-bezier motion physics.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] font-mono text-xs text-[var(--text-secondary)] flex items-center justify-between">
                <span>Topological Sort: Directed Acyclic Graph</span>
                <span className="text-blue-400 font-semibold tabular-nums">350ms Execution</span>
              </div>
            </div>

            {/* Bento Card 2: Context Layer (1 col) */}
            <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between gap-6 shadow-sm">
              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileCode2 size={16} />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Shape Context Layer</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Attach API contracts, SQL schemas, markdown notes, and external documentation directly to individual diagram nodes. No disconnected Notion pages.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] font-mono text-[11px] text-emerald-400 flex items-center justify-between">
                <span>Shape Metadata</span>
                <span>Persistent</span>
              </div>
            </div>

            {/* Bento Card 3: Bi-directional Mermaid (1 col) */}
            <div className="p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between gap-6 shadow-sm">
              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Terminal size={16} />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Mermaid Import / Export</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Paste Mermaid.js flowchart code to generate an editable whiteboard graph, or export active canvas architectures directly into standard Mermaid syntax.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] font-mono text-[11px] text-cyan-400">
                graph TD; A--&gt;B; B--&gt;C;
              </div>
            </div>

            {/* Bento Card 4: Time Travel Replay (Large 2 cols) */}
            <div className="md:col-span-2 p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between gap-6 shadow-sm">
              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <History size={16} />
                </div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Time-Travel Architecture Replay</h3>
                <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">
                  Scrub backwards and forwards through system evolution. Every shape modification, connector addition, and service redesign is captured in remote snapshot history without polluting your local undo/redo stack.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] font-mono text-xs text-[var(--text-secondary)] flex items-center justify-between">
                <span>Snapshot History: 50 Steps</span>
                <span className="text-amber-400 font-semibold">Protected Undo Stack</span>
              </div>
            </div>

          </div>
        </section>

      </main>

      {/* Clean Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--background-secondary)] py-6 text-xs text-[var(--text-secondary)] font-mono">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>SynapseBoard — Deterministic Architecture Whiteboard Engine.</span>
          <div className="flex items-center gap-6">
            <a 
              href="https://github.com/Tejas3479/whiteboard" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
            >
              GitHub Repository <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </footer>

      {/* ===================================================
          JOIN ROOM MODAL
         =================================================== */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md p-6 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-xl flex flex-col gap-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
                <div className="flex items-center gap-2">
                  <LogIn size={18} className="text-blue-400" />
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Join Whiteboard Session</h3>
                </div>
                <button 
                  onClick={() => setShowJoinModal(false)}
                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-sm font-bold p-1 rounded"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Enter a room ID or paste a full SynapseBoard link to collaborate with your team.
              </p>

              <form onSubmit={handleJoinRoom} className="flex flex-col gap-3">
                <input 
                  type="text"
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  placeholder="e.g. ab12cd34ef or board URL"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-blue-500 transition-all text-xs font-mono"
                  autoFocus
                />

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="px-3.5 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!roomIdInput.trim()}
                    className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[var(--accent-hover)] disabled:opacity-40 transition-all"
                  >
                    Join Session <ArrowRight size={13} />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
