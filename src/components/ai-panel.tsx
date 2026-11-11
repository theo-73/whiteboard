'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { X, Sparkles, SendHorizontal, Check, X as XIcon, Eye, ShieldAlert, Cpu, Plus } from 'lucide-react';
import { useAppStore, AISuggestion } from '@/store/app-store';
import { Editor, createShapeId, TLShapeId, TLShapePartial } from 'tldraw';
import { toRichText } from '@tldraw/tlschema';
import { ArchitectureRecommendation, StreamNode, StreamEdge } from '@/types/ai';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiSounds } from '@/lib/use-ui-sounds';

interface AiPanelProps {
  editor?: Editor | null;
}

interface ParsedSuggestionData {
  nodes?: StreamNode[];
  edges?: StreamEdge[];
}

function extractJsonFromLine<T>(line: string): T | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('```') || trimmed.startsWith('//')) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const startIdx = trimmed.indexOf('{');
    const endIdx = trimmed.lastIndexOf('}');
    if (startIdx !== -1 && endIdx > startIdx) {
      try {
        return JSON.parse(trimmed.substring(startIdx, endIdx + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function AiPanel({ editor }: AiPanelProps) {
  const { 
    aiPanelOpen, 
    toggleAiPanel, 
    isAiThinking, 
    setIsAiThinking, 
    aiPrompt, 
    setAiPrompt,
    aiSuggestions,
    addAiSuggestion,
    removeAiSuggestion
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'prompt' | 'assist'>('assist');
  const [recommendations, setRecommendations] = useState<ArchitectureRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiErrorMessage, setAiErrorMessage] = useState<string | null>(null);

  const quickSuggestions = [
    "Auth Flow", "API Architecture", "Database Schema", "AWS Serverless", "Kubernetes Cluster", "Kafka Event Pipeline"
  ];

  const { ghostShapeIds, setGhostShapeIds, clearGhostShapeIds } = useAppStore();
  const { playClick, playHover, playSuccess } = useUiSounds();

  const handlePreviewGhostShapes = useCallback((sugg: AISuggestion) => {
    playClick();
    if (!editor) return;
    const center = editor.getViewportPageBounds().center;
    let parsedData: ParsedSuggestionData = {};

    try {
      if (sugg.code) {
        parsedData = JSON.parse(sugg.code) as ParsedSuggestionData;
      }
    } catch (err) {
      console.error('Failed to parse suggestion code:', err);
    }

    const nodes: StreamNode[] = parsedData.nodes && parsedData.nodes.length > 0 ? parsedData.nodes : [
      { id: '1', label: 'Client App', shape: 'rectangle', x: 0, y: 0 },
      { id: '2', label: 'API Gateway', shape: 'rectangle', x: 220, y: 0 },
      { id: '3', label: 'Database', shape: 'ellipse', x: 440, y: 0 },
    ];

    const createdGhostIds: string[] = [];
    const newGhostShapes: Array<Record<string, unknown>> = [];

    nodes.forEach((n, idx) => {
      const shapeId = createShapeId();
      createdGhostIds.push(shapeId);

      const posX = center.x - 220 + (n.x || idx * 220);
      const posY = center.y - 40 + (n.y || 0);

      newGhostShapes.push({
        id: shapeId,
        type: 'geo',
        x: posX,
        y: posY,
        props: {
          geo: n.shape === 'ellipse' || n.shape === 'cylinder' ? 'ellipse' : 'rectangle',
          w: 160,
          h: 80,
          color: 'grey',
          fill: 'pattern',
          dash: 'dashed',
          richText: toRichText(`Ghost: ${n.label || 'Node'}`),
        },
      });
    });

    const edges: StreamEdge[] = (parsedData.edges && parsedData.edges.length > 0) ? parsedData.edges : [
      { id: 'e-1', source: nodes[0]?.id || '0', target: nodes[1]?.id || '1' },
      { id: 'e-2', source: nodes[1]?.id || '1', target: nodes[2]?.id || '2' },
    ];

    edges.forEach((e, idx) => {
      const arrowId = createShapeId();
      createdGhostIds.push(arrowId);
      const startX = center.x - 60 + idx * 220;
      const startY = center.y;

      newGhostShapes.push({
        id: arrowId,
        type: 'arrow',
        x: startX,
        y: startY,
        props: {
          start: { x: 0, y: 0 },
          end: { x: 90, y: 0 },
          dash: 'dashed',
          color: 'grey',
        },
      });
    });

    editor.createShapes(newGhostShapes as TLShapePartial[]);
    setGhostShapeIds(createdGhostIds);
  }, [editor, setGhostShapeIds, playClick]);

  const handleAcceptSuggestion = useCallback((sugg: AISuggestion) => {
    playSuccess();
    if (editor) {
      if (ghostShapeIds.length > 0) {
        try {
          editor.deleteShapes(ghostShapeIds as TLShapeId[]);
        } catch {
          // ignore
        }
        clearGhostShapeIds();
      }

      const center = editor.getViewportPageBounds().center;
      let parsedData: ParsedSuggestionData = {};

      try {
        if (sugg.code) {
          parsedData = JSON.parse(sugg.code) as ParsedSuggestionData;
        }
      } catch (err) {
        console.error('Failed to parse suggestion code:', err);
      }

      const nodes: StreamNode[] = parsedData.nodes && parsedData.nodes.length > 0 ? parsedData.nodes : [
        { id: '1', label: 'Client App', shape: 'rectangle', x: 0, y: 0 },
        { id: '2', label: 'API Gateway', shape: 'rectangle', x: 220, y: 0 },
        { id: '3', label: 'Database', shape: 'ellipse', x: 440, y: 0 },
      ];

      const shapeMap: Record<string, TLShapeId> = {};
      const newShapes: TLShapePartial[] = [];

      nodes.forEach((n, idx) => {
        const shapeId = createShapeId();
        if (n.id) {
          shapeMap[n.id] = shapeId;
        }
        shapeMap[idx.toString()] = shapeId;

        const posX = center.x - 220 + (n.x || idx * 220);
        const posY = center.y - 40 + (n.y || 0);

        newShapes.push({
          id: shapeId,
          type: 'geo',
          x: posX,
          y: posY,
          props: {
            geo: n.shape === 'ellipse' || n.shape === 'cylinder' ? 'ellipse' : 'rectangle',
            w: 160,
            h: 80,
            color: idx === 0 ? 'blue' : idx === 1 ? 'violet' : 'green',
            fill: 'semi',
            dash: 'draw',
            richText: toRichText(n.label || 'Node'),
          },
        });
      });

      const edges: StreamEdge[] = (parsedData.edges && parsedData.edges.length > 0) ? parsedData.edges : [
        { id: 'e-1', source: nodes[0]?.id || '0', target: nodes[1]?.id || '1' },
        { id: 'e-2', source: nodes[1]?.id || '1', target: nodes[2]?.id || '2' },
      ];

      const bindingsToCreate: Array<{
        type: 'arrow';
        fromId: TLShapeId;
        toId: TLShapeId;
        props: { terminal: 'start' | 'end'; normalizedAnchor: { x: number; y: number }; isExact: boolean; isPrecise: boolean };
      }> = [];

      edges.forEach((e) => {
        const sourceShapeId = e.source ? shapeMap[e.source] : undefined;
        const targetShapeId = e.target ? shapeMap[e.target] : undefined;
        const arrowId = createShapeId();

        newShapes.push({
          id: arrowId,
          type: 'arrow',
          props: {
            start: { x: 0, y: 0 },
            end: { x: 90, y: 0 },
            dash: 'draw',
            color: 'blue',
            richText: toRichText(e.label || ''),
          },
        });

        if (sourceShapeId) {
          bindingsToCreate.push({
            type: 'arrow',
            fromId: arrowId,
            toId: sourceShapeId,
            props: { terminal: 'start', normalizedAnchor: { x: 1, y: 0.5 }, isExact: false, isPrecise: false },
          });
        }
        if (targetShapeId) {
          bindingsToCreate.push({
            type: 'arrow',
            fromId: arrowId,
            toId: targetShapeId,
            props: { terminal: 'end', normalizedAnchor: { x: 0, y: 0.5 }, isExact: false, isPrecise: false },
          });
        }
      });

      editor.createShapes(newShapes);
      if (bindingsToCreate.length > 0) {
        editor.createBindings(bindingsToCreate);
      }
    }
    removeAiSuggestion(sugg.id);
  }, [editor, ghostShapeIds, clearGhostShapeIds, removeAiSuggestion, playSuccess]);

  const handleRejectSuggestion = (suggId: string) => {
    playClick();
    if (editor && ghostShapeIds.length > 0) {
      try {
        editor.deleteShapes(ghostShapeIds as TLShapeId[]);
      } catch {
        // ignore
      }
      clearGhostShapeIds();
    }
    removeAiSuggestion(suggId);
  };

  // Keyboard shortcut: Press Tab to accept top suggestion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab' && aiSuggestions && aiSuggestions.length > 0) {
        e.preventDefault();
        handleAcceptSuggestion(aiSuggestions[0]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aiSuggestions, editor, handleAcceptSuggestion]);

  // Run Architecture Assist Analysis on Canvas Shapes
  const handleRunArchitectureAssist = async () => {
    if (!editor || isAnalyzing) return;
    playClick();
    setIsAnalyzing(true);
    setRecommendations([]);

    try {
      const pageShapes = Array.from(editor.getCurrentPageShapes());
      const shapesData = pageShapes.map((s) => ({
        id: s.id,
        type: s.type,
        props: s.props,
      }));

      const response = await fetch('/api/ai/architecture-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shapes: shapesData }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const errMsg = errData?.error || `Architecture assist failed (${response.status})`;
        setAiErrorMessage(errMsg);
        setIsAnalyzing(false);
        return;
      }
      setAiErrorMessage(null);

      if (!response.body) {
        throw new Error('No streaming response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const recs: ArchitectureRecommendation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const rec = extractJsonFromLine<ArchitectureRecommendation>(line);
          if (rec && rec.title) {
            recs.push(rec);
            setRecommendations([...recs]);
          }
        }
      }

      // Process any trailing un-newline-terminated buffer chunk
      if (buffer.trim()) {
        const rec = extractJsonFromLine<ArchitectureRecommendation>(buffer);
        if (rec && rec.title) {
          recs.push(rec);
          setRecommendations([...recs]);
        }
      }

      if (recs.length > 0) playSuccess();
    } catch (err) {
      console.error('Failed to run architecture assist:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Add suggested component node directly to canvas with smart positioning and connecting arrow
  const handleAddSuggestedNode = (node: { label: string; shape: 'rectangle' | 'ellipse' | 'cylinder'; connectTo?: string }) => {
    playSuccess();
    if (!editor) return;
    const center = editor.getViewportPageBounds().center;
    const existingShapes = Array.from(editor.getCurrentPageShapes());
    const existingCount = existingShapes.length;
    
    // Offset added nodes so they don't stack directly on top of each other
    const col = existingCount % 3;
    const row = Math.floor(existingCount / 3);
    const offsetX = (col - 1) * 200;
    const offsetY = (row % 3) * 120 + 80;

    const newNodeId = createShapeId();
    const targetX = center.x + offsetX;
    const targetY = center.y + offsetY;

    const shapesToCreate: Array<Record<string, unknown>> = [
      {
        id: newNodeId,
        type: 'geo',
        x: targetX,
        y: targetY,
        props: {
          geo: node.shape === 'ellipse' || node.shape === 'cylinder' ? 'ellipse' : 'rectangle',
          w: 160,
          h: 80,
          color: 'blue',
          fill: 'semi',
          richText: toRichText(node.label),
        },
      },
    ];

    // If recommendation specified a connectTo component, find it and create a connecting arrow
    if (node.connectTo) {
      const targetShape = existingShapes.find((s) => {
        const shapeProps = (s.props || {}) as { text?: string };
        const text = (shapeProps.text || '').toLowerCase();
        const search = node.connectTo!.toLowerCase();
        return text.includes(search) || search.includes(text);
      });

      if (targetShape) {
        const arrowId = createShapeId();
        shapesToCreate.push({
          id: arrowId,
          type: 'arrow',
          x: targetShape.x,
          y: targetShape.y,
          props: {
            start: { x: 0, y: 0 },
            end: { x: targetX - targetShape.x, y: targetY - targetShape.y },
            color: 'blue',
            dash: 'draw',
          },
        });
        editor.createShapes(shapesToCreate as TLShapePartial[]);
        editor.createBindings([
          {
            type: 'arrow',
            fromId: arrowId,
            toId: targetShape.id,
            props: { terminal: 'start', normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
          },
          {
            type: 'arrow',
            fromId: arrowId,
            toId: newNodeId,
            props: { terminal: 'end', normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false },
          },
        ]);
        return;
      }
    }

    editor.createShapes(shapesToCreate as TLShapePartial[]);
  };

  const handleSubmitPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim() || isAiThinking) return;

    playClick();
    setIsAiThinking(true);
    const currentPrompt = aiPrompt;
    setAiPrompt('');

    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        const errMsg = errData?.error || `AI suggestion failed (${response.status})`;
        setAiErrorMessage(errMsg);
        addAiSuggestion({
          id: Date.now().toString(),
          title: 'AI Unavailable',
          description: errMsg,
          status: 'rejected',
        });
        setIsAiThinking(false);
        return;
      }
      setAiErrorMessage(null);

      if (!response.body) {
        throw new Error('No streaming response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const nodes: StreamNode[] = [];
      const edges: StreamEdge[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const chunk = extractJsonFromLine<{ type: string; data: StreamNode | StreamEdge }>(line);
          if (chunk) {
            if (chunk.type === 'node' && chunk.data) {
              nodes.push(chunk.data as StreamNode);
            } else if (chunk.type === 'edge' && chunk.data) {
              edges.push(chunk.data as StreamEdge);
            }
          }
        }
      }

      // Process any trailing un-newline-terminated buffer chunk
      if (buffer.trim()) {
        const chunk = extractJsonFromLine<{ type: string; data: StreamNode | StreamEdge }>(buffer);
        if (chunk) {
          if (chunk.type === 'node' && chunk.data) {
            nodes.push(chunk.data as StreamNode);
          } else if (chunk.type === 'edge' && chunk.data) {
            edges.push(chunk.data as StreamEdge);
          }
        }
      }

      addAiSuggestion({
        id: Date.now().toString(),
        title: `Diagram: ${currentPrompt}`,
        description: `Generated ${nodes.length} nodes and ${edges.length} connections. Press Tab or click Accept to add to canvas.`,
        code: JSON.stringify({ nodes, edges }),
      });
    } catch (err) {
      console.error('AI streaming error:', err);
      // Add error suggestion to inform user
      addAiSuggestion({
        id: Date.now().toString(),
        title: 'AI Error',
        description: err instanceof Error ? err.message : 'Failed to generate AI suggestions. Please try again.',
        status: 'rejected',
      });
    } finally {
      setIsAiThinking(false);
      playSuccess();
    }
  };

  return (
    <AnimatePresence>
      {aiPanelOpen && (
        <motion.div 
          initial={{ x: "100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          className="fixed right-0 top-14 bottom-0 w-[380px] glass z-40 flex flex-col border-l shadow-2xl"
          style={{ borderColor: 'var(--border)' }}
        >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm border border-blue-400/30">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>AI Copilot & Architecture Assist</h2>
            <span className="text-[10px] text-blue-400 font-mono">Architecture Intelligence & Diagram Synthesis</span>
          </div>
        </div>
        <button 
          onClick={toggleAiPanel}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-1 p-2 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
        <button
          onClick={() => { playClick(); setActiveTab('assist'); }}
          onMouseEnter={playHover}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'assist' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Cpu size={14} /> Architecture Assist
        </button>

        <button
          onClick={() => { playClick(); setActiveTab('prompt'); }}
          onMouseEnter={playHover}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'prompt' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles size={14} /> Generate Diagram
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {aiErrorMessage && (
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-2 animate-fade-in">
            <ShieldAlert size={16} className="flex-shrink-0 mt-0.5 text-amber-400" />
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-white">AI Service Unavailable</span>
              <span className="text-[11px] text-gray-300 leading-relaxed">{aiErrorMessage}</span>
            </div>
          </div>
        )}

        {/* MODE 1: ARCHITECTURE ASSIST */}
        {activeTab === 'assist' && (
          <div className="flex flex-col gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col gap-2">
              <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                <Cpu size={14} /> Deep Diagram Analysis
              </span>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Click below to analyze your rough whiteboard diagram. AI will inspect your components, find missing services, suggest API protocols & DBMS enhancements, and offer 1-click shape additions!
              </p>
              <button
                onClick={handleRunArchitectureAssist}
                onMouseEnter={playHover}
                disabled={isAnalyzing}
                className="mt-1 w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {isAnalyzing ? (
                  <>
                    <div className="loading-spinner" /> Analyzing Canvas Architecture...
                  </>
                ) : (
                  <>
                    <Cpu size={14} /> Analyze Architecture & Get Insights
                  </>
                )}
              </button>
            </div>

            {/* Recommendations List */}
            <div className="flex flex-col gap-3">
              {recommendations.length === 0 && !isAnalyzing && (
                <div className="text-center py-6 text-gray-400 text-xs flex flex-col items-center gap-3 p-4 rounded-xl border border-white/5 bg-black/20">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <ShieldAlert size={20} />
                  </div>
                  <div className="flex flex-col gap-1 max-w-[260px]">
                    <span className="font-semibold text-white text-xs">Ready for Architecture Review</span>
                    <span className="text-[11px] text-gray-400 leading-relaxed">
                      Draw components on the whiteboard, then click Analyze to evaluate bottlenecks, failure modes, and missing layers.
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 justify-center pt-1">
                    {["Event Bus", "Redis Cache", "Auth Service"].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          setActiveTab('prompt');
                          setAiPrompt(`Add a ${tag} microservice architecture`);
                        }}
                        className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-blue-300 font-mono active:scale-95 transition-all"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isAnalyzing && recommendations.length === 0 && (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3.5 rounded-xl border bg-black/30 flex flex-col gap-3" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between">
                        <div className="h-3 w-16 bg-white/10 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-3/4 bg-white/10 rounded animate-pulse" />
                      <div className="h-10 w-full bg-white/10 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              )}

              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-xl border bg-black/30 flex flex-col gap-2 animate-fade-in-scale"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                      rec.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      rec.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {rec.priority}
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase font-mono">{rec.category.replace('_', ' ')}</span>
                  </div>

                  <h4 className="font-bold text-xs text-white">{rec.title}</h4>
                  <p className="text-[11px] text-gray-300 leading-relaxed overflow-hidden">
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      {rec.description}
                    </motion.span>
                  </p>

                  {rec.suggestedNode && (
                    <button
                      onClick={() => handleAddSuggestedNode(rec.suggestedNode!)}
                      onMouseEnter={playHover}
                      className="mt-1 py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-blue-300 flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Plus size={14} /> Add {rec.suggestedNode.label} to Canvas
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODE 2: GENERATE DIAGRAM */}
        {activeTab === 'prompt' && (
          <div className="flex flex-col gap-4">
            {(!aiSuggestions || aiSuggestions.length === 0) && !isAiThinking && (
              <div className="flex flex-wrap gap-2">
                {quickSuggestions.map((sugg, i) => (
                  <button
                    key={i}
                    onClick={() => { playClick(); setAiPrompt(sugg); }}
                    onMouseEnter={playHover}
                    className="px-3 py-1.5 rounded-full text-xs border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            )}

            {aiSuggestions?.map((sugg: AISuggestion) => (
              <div 
                key={sugg.id} 
                className="p-3 rounded-lg border flex flex-col gap-2 animate-fade-in-scale"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-elevated)' }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{sugg.title}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">Press Tab</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{sugg.description}</p>
                
                <div className="flex items-center gap-2 mt-2">
                  <button 
                    onClick={() => handleAcceptSuggestion(sugg)}
                    onMouseEnter={playHover}
                    className="flex-1 py-1.5 flex items-center justify-center gap-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button 
                    onClick={() => handlePreviewGhostShapes(sugg)}
                    className="py-1.5 px-2 flex items-center justify-center gap-1 rounded border text-xs font-medium transition-colors"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                  >
                    <Eye size={14} /> Ghost
                  </button>
                  <button 
                    onClick={() => handleRejectSuggestion(sugg.id)}
                    className="py-1.5 px-2 rounded border text-xs transition-colors" 
                    style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Form for Prompt Mode */}
      {activeTab === 'prompt' && (
        <div className="p-4 border-t" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          <form onSubmit={handleSubmitPrompt} className="relative">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Describe a diagram..."
              className="w-full pl-4 pr-10 py-3 rounded-lg border bg-transparent outline-none transition-colors focus:border-blue-500 text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              disabled={isAiThinking}
            />
            <button
              type="submit"
              disabled={!aiPrompt.trim() || isAiThinking}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all"
            >
              <SendHorizontal size={16} />
            </button>
          </form>
        </div>
      )}
    </motion.div>
      )}
    </AnimatePresence>
  );
}
