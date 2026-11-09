'use client';

import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Link as LinkIcon, 
  Code2, 
  Paperclip, 
  Plus, 
  Trash2, 
  ExternalLink,
  Upload,
  Check
} from 'lucide-react';
import { useContextStore } from '@/store/context-store';
import { motion, AnimatePresence } from 'framer-motion';

export function ContextPanel() {
  const { 
    isContextPanelOpen, 
    closeContextPanel, 
    activeShapeId, 
    activeShapeLabel,
    getShapeContext,
    updateNotes,
    addLink,
    removeLink,
    addCodeSnippet,
    removeCodeSnippet,
    addFile,
    removeFile
  } = useContextStore();

  const [activeTab, setActiveTab] = useState<'notes' | 'links' | 'code' | 'files'>('notes');

  // Form states
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  const [newCodeLang, setNewCodeLang] = useState('typescript');
  const [newCodeSnippet, setNewCodeSnippet] = useState('');

  const [savedNotesNotice, setSavedNotesNotice] = useState(false);

  const currentCtx = getShapeContext(activeShapeId || '');

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeShapeId) return;
    updateNotes(activeShapeId, e.target.value);
    setSavedNotesNotice(true);
    setTimeout(() => setSavedNotesNotice(false), 1500);
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShapeId || !newLinkUrl.trim()) return;

    let formattedUrl = newLinkUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    addLink(activeShapeId, {
      title: newLinkTitle.trim() || formattedUrl,
      url: formattedUrl,
    });

    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleAddCodeSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShapeId || !newCodeSnippet.trim()) return;

    addCodeSnippet(activeShapeId, {
      language: newCodeLang,
      code: newCodeSnippet,
    });

    setNewCodeSnippet('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!activeShapeId || !files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!activeShapeId) return;
        addFile(activeShapeId, {
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isContextPanelOpen && activeShapeId && (
        <motion.div 
          initial={{ x: -100, opacity: 0, scale: 0.95 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: -100, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          role="dialog"
          aria-label="Context Layer"
          className="fixed left-4 top-16 bottom-20 w-[calc(100vw-2rem)] max-w-md glass z-50 rounded-2xl border shadow-2xl flex flex-col overflow-hidden md:left-20 md:top-20 md:bottom-24 md:w-[400px]"
          style={{ borderColor: 'var(--border)' }}
        >
      {/* Panel Header */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-elevated)' }}>
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <FileText size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-purple-400 block font-semibold">Executable Context Layer</span>
            <h3 className="font-bold text-sm truncate max-w-[240px]" style={{ color: 'var(--text-primary)' }}>
              {activeShapeLabel || 'Component'}
            </h3>
          </div>
        </div>

        <button 
          onClick={closeContextPanel}
          className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-gray-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>

      {/* Tabs Switcher */}
      <div 
        role="tablist" 
        aria-label="Context Tabs"
        className="flex items-center gap-1 p-2 border-b" 
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'notes'}
          onClick={() => setActiveTab('notes')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'notes' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          <FileText size={14} /> Notes
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'links'}
          onClick={() => setActiveTab('links')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all relative ${
            activeTab === 'links' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          <LinkIcon size={14} /> Links ({currentCtx.links.length})
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'code'}
          onClick={() => setActiveTab('code')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'code' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Code2 size={14} /> Code ({currentCtx.codeSnippets.length})
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'files'}
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'files' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Paperclip size={14} /> Files ({currentCtx.files.length})
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        <AnimatePresence mode="wait">
          {/* TAB 1: NOTES */}
          {activeTab === 'notes' && (
            <motion.div 
              key="notes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              role="tabpanel"
              aria-label="Notes Tab"
              className="flex flex-col h-full gap-2"
            >
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-300">Executable Architecture Notes</label>
              {savedNotesNotice && (
                <span className="text-[10px] text-green-400 flex items-center gap-1 animate-fade-in">
                  <Check size={12} /> Saved
                </span>
              )}
            </div>
            <textarea
              value={currentCtx.notes}
              onChange={handleNotesChange}
              placeholder="Add architectural notes, API contracts, deployment instructions, schema details..."
              className="w-full flex-1 min-h-[220px] p-3 rounded-xl bg-black/30 border border-white/10 text-white text-xs font-mono outline-none focus:border-purple-500 transition-colors resize-none leading-relaxed"
            />
            </motion.div>
          )}

          {/* TAB 2: LINKS */}
          {activeTab === 'links' && (
            <motion.div 
              key="links"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              role="tabpanel"
              aria-label="Links Tab"
              className="flex flex-col gap-4"
            >
            <form onSubmit={handleAddLink} className="flex flex-col gap-2 p-3 rounded-xl bg-black/20 border border-white/10">
              <span className="text-xs font-semibold text-gray-300">Attach Reference Link</span>
              <input
                type="text"
                placeholder="Link Title (e.g. Swagger API Docs)"
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-purple-500"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="https://api-docs.example.com"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={!newLinkUrl.trim()}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-purple-500 disabled:opacity-40"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </form>

            <div className="flex flex-col gap-2">
              {currentCtx.links.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No reference links attached yet.</p>
              ) : (
                currentCtx.links.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <a 
                      href={link.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs font-medium text-purple-300 hover:underline truncate flex-1"
                    >
                      <ExternalLink size={14} />
                      <span className="truncate">{link.title}</span>
                    </a>
                    <button
                      onClick={() => activeShapeId && removeLink(activeShapeId, link.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: CODE */}
          {activeTab === 'code' && (
            <motion.div 
              key="code"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              role="tabpanel"
              aria-label="Code Tab"
              className="flex flex-col gap-4"
            >
            <form onSubmit={handleAddCodeSnippet} className="flex flex-col gap-2 p-3 rounded-xl bg-black/20 border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Add Code Snippet</span>
                <select
                  value={newCodeLang}
                  onChange={(e) => setNewCodeLang(e.target.value)}
                  className="px-2 py-1 rounded bg-black/50 border border-white/10 text-xs text-purple-300 outline-none"
                >
                  <option value="typescript">TypeScript</option>
                  <option value="sql">SQL Schema</option>
                  <option value="json">JSON Payload</option>
                  <option value="python">Python</option>
                  <option value="bash">Bash / Docker</option>
                </select>
              </div>
              <textarea
                value={newCodeSnippet}
                onChange={(e) => setNewCodeSnippet(e.target.value)}
                placeholder="Paste code snippet, handler function, or SQL DDL here..."
                rows={4}
                className="w-full p-2.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-green-400 outline-none focus:border-purple-500"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newCodeSnippet.trim()}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-purple-500 disabled:opacity-40"
                >
                  <Plus size={14} /> Save Snippet
                </button>
              </div>
            </form>

            <div className="flex flex-col gap-3">
              {currentCtx.codeSnippets.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No code snippets attached yet.</p>
              ) : (
                currentCtx.codeSnippets.map((snip) => (
                  <div key={snip.id} className="flex flex-col rounded-xl bg-black/40 border border-white/10 overflow-hidden">
                    <div className="px-3 py-1.5 bg-white/5 border-b border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-purple-400 uppercase font-semibold">{snip.language}</span>
                      <button
                        onClick={() => activeShapeId && removeCodeSnippet(activeShapeId, snip.id)}
                        className="p-1 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <pre className="p-3 text-[11px] font-mono text-green-400 overflow-x-auto whitespace-pre-wrap max-h-40">
                      {snip.code}
                    </pre>
                  </div>
                ))
              )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: FILES */}
          {activeTab === 'files' && (
            <motion.div 
              key="files"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              role="tabpanel"
              aria-label="Files Tab"
              className="flex flex-col gap-4"
            >
            <label className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-white/15 bg-white/5 hover:bg-white/10 hover:border-purple-500/50 cursor-pointer transition-all">
              <Upload size={22} className="text-purple-400 mb-1" />
              <span className="text-xs font-semibold text-gray-300">Click to upload file attachment</span>
              <span className="text-[10px] text-gray-500 mt-0.5">Images, PDFs, specs, diagrams</span>
              <input 
                type="file" 
                multiple 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>

            <div className="flex flex-col gap-2">
              {currentCtx.files.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No files attached yet.</p>
              ) : (
                currentCtx.files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip size={14} className="text-purple-400 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <span className="text-xs font-medium text-white truncate block">{file.name}</span>
                        <span className="text-[10px] text-gray-500">{Math.round(file.size / 1024)} KB</span>
                      </div>
                    </div>
                    <button
                      onClick={() => activeShapeId && removeFile(activeShapeId, file.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
