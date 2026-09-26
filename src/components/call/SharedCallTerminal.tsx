'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Terminal as TerminalIcon,
  X,
  Code2,
  Check,
  Copy,
  Clock,
  Sparkles,
  ChevronDown,
  Minimize2,
  Maximize2,
  Laptop,
} from 'lucide-react';

interface SharedCallTerminalProps {
  roomId: string;
  socket: any;
  currentUser: any;
  partnerName: string;
  isMentor?: boolean;
  mySenderId?: string;
  onClose: () => void;
}

const TEMPLATES: Record<string, string> = {
  python: `# Collaborative Python 3 Environment
def solve(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []

# Test run
result = solve([2, 7, 11, 15], 9)
print(f"Algorithm Result: {result}")
print("Peer collaboration active! 🚀")
`,
  javascript: `// Collaborative Node.js Environment
function asyncFibonacci(n) {
  if (n <= 1) return n;
  let a = 0, b = 1;
  for (let i = 2; i <= n; i++) {
    const c = a + b;
    a = b;
    b = c;
  }
  return b;
}

console.log("Fibonacci(10) =", asyncFibonacci(10));
console.log("Timestamp:", new Date().toISOString());
`,
  typescript: `// Collaborative TypeScript Environment
interface UserPeer {
  id: string;
  handle: string;
  skills: string[];
}

const peer: UserPeer = {
  id: "peer_777",
  handle: "Alex_Voronov",
  skills: ["Rust", "PyTorch", "WebRTC"]
};

console.log("Peer Verified:", peer);
`,
  rust: `// Collaborative Rust Environment
fn main() {
    let mut numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    println!("Rust Concurrency Sandbox: sum = {}", sum);
    
    numbers.push(42);
    println!("Updated Vector: {:?}", numbers);
}
`,
  cpp: `// Collaborative C++ 20 Environment
#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> v = {10, 20, 30, 40};
    int total = std::accumulate(v.begin(), v.end(), 0);
    std::cout << "C++ High Performance Runner: Total = " << total << std::endl;
    return 0;
}
`,
  go: `// Collaborative Golang Environment
package main

import (
	"fmt"
	"time"
)

func main() {
	ch := make(chan string)
	go func() {
		ch <- "Goroutine completed successfully!"
	}()

	fmt.Println("Starting Go Routine at:", time.Now().Format("15:04:05"))
	fmt.Println("Received:", <-ch)
}
`,
  bash: `#!/bin/bash
echo "Live Bash Terminal on Pixelmink"
echo "Host: $(uname -a 2>/dev/null || echo 'Linux Cloud Runner')"
echo "Date: $(date)"
for i in {1..3}; do
  echo "Iteration $i: P2P Socket Channel OK"
done
`,
  sql: `-- Collaborative SQLite In-Memory Database
CREATE TABLE peers (id INTEGER PRIMARY KEY, name TEXT, hours REAL);
INSERT INTO peers (name, hours) VALUES ('Linus', 32.5), ('Amina', 18.0);
SELECT * FROM peers;
`,
};

const LANGUAGES = [
  { id: 'python', label: 'Python 3', ext: '.py' },
  { id: 'javascript', label: 'JavaScript (Node.js)', ext: '.js' },
  { id: 'typescript', label: 'TypeScript', ext: '.ts' },
  { id: 'rust', label: 'Rust', ext: '.rs' },
  { id: 'cpp', label: 'C++ 20', ext: '.cpp' },
  { id: 'go', label: 'Go', ext: '.go' },
  { id: 'bash', label: 'Bash / Shell', ext: '.sh' },
  { id: 'sql', label: 'SQL (SQLite)', ext: '.sql' },
];

export default function SharedCallTerminal({
  roomId,
  socket,
  currentUser,
  partnerName,
  isMentor,
  mySenderId,
  onClose,
}: SharedCallTerminalProps) {
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(TEMPLATES.python);
  const [stdout, setStdout] = useState('');
  const [stderr, setStderr] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [runtimeLabel, setRuntimeLabel] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [lastEditor, setLastEditor] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'editor' | 'console'>('editor');

  const canEdit = isMentor !== false;
  const isLocalChange = useRef(false);

  const localSenderIdRef = useRef<string>(mySenderId || currentUser?.id || '');
  useEffect(() => {
    if (mySenderId) {
      localSenderIdRef.current = mySenderId;
    } else if (!localSenderIdRef.current) {
      localSenderIdRef.current = currentUser?.id || 'sender_' + Math.random().toString(36).substring(2, 9);
    }
  }, [mySenderId, currentUser?.id]);

  // Dual channel sync: Socket.io + ntfy SSE fallback for live cloud coding
  useEffect(() => {
    // 1. Socket.io listeners
    if (socket) {
      socket.on('call:terminal_sync', (data: { code: string; language: string; byUserName?: string; senderId?: string }) => {
        if (data.senderId && localSenderIdRef.current && data.senderId === localSenderIdRef.current) return;
        isLocalChange.current = true;
        if (data.code !== undefined) setCode(data.code);
        if (data.language && data.language !== language) setLanguage(data.language);
        if (data.byUserName) setLastEditor(data.byUserName);
        setTimeout(() => {
          isLocalChange.current = false;
        }, 50);
      });

      socket.on('call:terminal_executing', () => {
        setIsRunning(true);
        setStderr('');
      });

      socket.on('call:terminal_output', (data: any) => {
        setIsRunning(false);
        setStdout(data.stdout || '');
        setStderr(data.stderr || '');
        setExecutionTime(data.executionTime || 0);
        setRuntimeLabel(data.runtime || '');
      });

      socket.on('call:terminal_closed', () => {
        onClose();
      });
    }

    // 2. ntfy SSE listener for cross-platform / Vercel real-time collaboration
    let eventSource: EventSource | null = null;
    const cleanRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const termTopic = `pixelmink_term_${cleanRoomId}`;

    try {
      eventSource = new EventSource(`https://ntfy.sh/${termTopic}/sse`);
      eventSource.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data);
          const data = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw;
          if (!data) return;
          if (localSenderIdRef.current && data.senderId === localSenderIdRef.current) return;

          if (data.type === 'sync') {
            isLocalChange.current = true;
            if (data.code !== undefined) setCode(data.code);
            if (data.language && data.language !== language) setLanguage(data.language);
            if (data.byUserName) setLastEditor(data.byUserName);
            setTimeout(() => {
              isLocalChange.current = false;
            }, 50);
          } else if (data.type === 'executing') {
            setIsRunning(true);
            setStderr('');
          } else if (data.type === 'output') {
            setIsRunning(false);
            setStdout(data.stdout || '');
            setStderr(data.stderr || '');
            setExecutionTime(data.executionTime || 0);
            setRuntimeLabel(data.runtime || '');
          } else if (data.type === 'close') {
            onClose();
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (socket) {
        socket.off('call:terminal_sync');
        socket.off('call:terminal_executing');
        socket.off('call:terminal_output');
        socket.off('call:terminal_closed');
      }
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [socket, language, onClose, roomId]);

  const cleanRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const termTopic = `pixelmink_term_${cleanRoomId}`;

  const publishToCloudTerm = useCallback((payload: any) => {
    try {
      fetch(`https://ntfy.sh/${termTopic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, senderId: localSenderIdRef.current || currentUser?.id }),
      }).catch(() => {});
    } catch {}
  }, [termTopic, currentUser?.id]);

  // Code change broadcast with debounce
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCodeChange = (newCode: string) => {
    if (!canEdit) return;
    setCode(newCode);
    if (!isLocalChange.current) {
      const myName = currentUser?.profile?.name || currentUser?.email?.split('@')[0] || 'Peer';
      if (socket) {
        socket.emit('call:terminal_sync', {
          roomId,
          code: newCode,
          language,
          byUserName: myName,
          senderId: localSenderIdRef.current,
        });
      }
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        publishToCloudTerm({
          type: 'sync',
          code: newCode,
          language,
          byUserName: myName,
        });
      }, 80);
    }
  };

  // Language switch
  const handleLanguageChange = (newLang: string) => {
    if (!canEdit) return;
    setLanguage(newLang);
    const newCode = TEMPLATES[newLang] || `// ${newLang} Environment\n`;
    setCode(newCode);
    const myName = currentUser?.profile?.name || currentUser?.email?.split('@')[0] || 'Peer';
    if (socket) {
      socket.emit('call:terminal_sync', {
        roomId,
        code: newCode,
        language: newLang,
        byUserName: myName,
        senderId: localSenderIdRef.current,
      });
    }
    publishToCloudTerm({
      type: 'sync',
      code: newCode,
      language: newLang,
      byUserName: myName,
    });
  };

  // Execute Code
  const handleRunCode = async () => {
    if (!canEdit || isRunning) return;
    setIsRunning(true);
    setStdout('');
    setStderr('');
    setMobileTab('console');

    if (socket) {
      socket.emit('call:terminal_executing', { roomId });
    }
    publishToCloudTerm({ type: 'executing' });

    try {
      const res = await fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
      });

      const data = await res.json();
      setIsRunning(false);
      setStdout(data.stdout || '');
      setStderr(data.stderr || '');
      setExecutionTime(data.executionTime || 0);
      setRuntimeLabel(data.runtime || '');

      const outPayload = {
        type: 'output',
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        executionTime: data.executionTime || 0,
        runtime: data.runtime || '',
        exitCode: data.exitCode,
      };

      if (socket) {
        socket.emit('call:terminal_output', {
          roomId,
          output: outPayload,
        });
      }
      publishToCloudTerm(outPayload);
    } catch (err: any) {
      setIsRunning(false);
      const errMsg = err.message || 'Execution failed';
      setStderr(errMsg);
      const errPayload = { type: 'output', stdout: '', stderr: errMsg, executionTime: 0 };
      if (socket) {
        socket.emit('call:terminal_output', {
          roomId,
          output: errPayload,
        });
      }
      publishToCloudTerm(errPayload);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCloseTerminal = () => {
    if (socket) {
      socket.emit('call:terminal_close', { roomId });
    }
    publishToCloudTerm({ type: 'close' });
    onClose();
  };

  // Keyboard shortcut Ctrl+Enter to Run
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!canEdit) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRunCode();
    }
    // Tab key support
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const updated = code.substring(0, start) + '  ' + code.substring(end);
      handleCodeChange(updated);
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  const lineCount = code.split('\n').length;
  const linesArray = Array.from({ length: Math.max(lineCount, 16) }, (_, i) => i + 1);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0a0f] border border-white/[0.1] rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95">
      {/* Top IDE Toolbar */}
      <div className="h-12 bg-[#121218] border-b border-white/[0.08] px-2.5 sm:px-4 flex items-center justify-between shrink-0 select-none gap-1.5">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] sm:text-xs font-bold shrink-0">
            <TerminalIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">P2P Live Terminal</span>
            <span className="sm:hidden">P2P</span>
          </div>

          {/* Language Selector Dropdown */}
          <select
            value={language}
            disabled={!canEdit}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className={`bg-[#181822] border border-white/[0.12] text-xs font-mono text-white rounded-lg px-2 py-1 outline-none focus:border-blue-500 max-w-[120px] sm:max-w-none ${
              !canEdit ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id} className="bg-[#121218] text-white">
                {lang.label} ({lang.ext})
              </option>
            ))}
          </select>

          <span className="hidden lg:inline-flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Синхронизировано с {partnerName || 'собеседником'}</span>
          </span>

          {/* Mobile Tab Switcher */}
          <div className="md:hidden flex bg-[#161622] rounded-lg p-0.5 border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab('editor')}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                mobileTab === 'editor'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Код
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('console')}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                mobileTab === 'console'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Консоль
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Copy Code */}
          <button
            onClick={handleCopyCode}
            title="Скопировать код"
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-colors"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Run Code Button */}
          <button
            onClick={handleRunCode}
            disabled={isRunning || !canEdit}
            title={!canEdit ? 'Только ментор может запускать компилятор' : 'Запустить код (Ctrl+Enter)'}
            className={`px-3 sm:px-4 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
              !canEdit
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                : isRunning
                ? 'bg-amber-600 text-white cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 tap-active'
            }`}
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running...' : canEdit ? 'Run' : 'Mentor Only'}</span>
          </button>

          {/* Close Terminal Button */}
          <button
            onClick={handleCloseTerminal}
            title="Закрыть терминал для обоих"
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors ml-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mentor / Student Status Banner */}
      {isMentor !== undefined && (
        <div
          className={`px-3 py-1.5 border-b font-mono text-[11px] flex items-center justify-between shrink-0 select-none ${
            canEdit
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs">{canEdit ? '🎓' : '🎧'}</span>
            <span>
              {canEdit ? (
                <>
                  <strong className="font-semibold text-white">Режим ментора:</strong> Вы пишете код и управляете запуском компилятора.
                </>
              ) : (
                <>
                  <strong className="font-semibold text-white">Режим ученика:</strong> Просмотр в реальном времени. Только ментор может писать и запускать код.
                </>
              )}
            </span>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              canEdit ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            {canEdit ? 'Трансляция' : 'Только чтение'}
          </span>
        </div>
      )}

      {/* Editor & Console Split Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Code Editor Pane (60%) */}
        <div
          className={`flex-1 bg-[#0c0c12] overflow-hidden border-b md:border-b-0 md:border-r border-white/[0.08] min-h-0 ${
            mobileTab === 'editor' ? 'flex' : 'hidden md:flex'
          }`}
        >
          {/* Line Numbers Gutter */}
          <div className="w-10 sm:w-12 py-3 bg-[#0a0a0e] text-zinc-600 font-mono text-xs text-right pr-2 sm:pr-3 select-none overflow-hidden shrink-0 leading-6 border-r border-white/[0.04]">
            {linesArray.map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>

          {/* Textarea Code Buffer */}
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={!canEdit}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            placeholder={
              !canEdit
                ? 'Режим ученика: здесь отображается код ментора в реальном времени...'
                : 'Пишите код здесь... Синхронизируется в реальном времени.'
            }
            className={`flex-1 bg-transparent p-2.5 sm:p-3 text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-600 outline-none resize-none leading-6 overflow-y-auto selection:bg-blue-600/30 ${
              !canEdit ? 'cursor-default' : ''
            }`}
          />
        </div>

        {/* Terminal Output Console Pane (Mobile: full when tab active, Desktop: side column) */}
        <div
          className={`w-full md:w-96 bg-[#07070a] overflow-hidden shrink-0 select-text h-full ${
            mobileTab === 'console' ? 'flex flex-col flex-1' : 'hidden md:flex md:flex-col'
          }`}
        >
          {/* Terminal Console Header */}
          <div className="px-3.5 py-2 bg-[#0e0e14] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-zinc-400 shrink-0">
            <div className="flex items-center gap-2">
              <Laptop className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-white">Output Console</span>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              {executionTime !== null && (
                <span className="text-zinc-500 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {executionTime}ms
                </span>
              )}
              {runtimeLabel && (
                <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-400">
                  {runtimeLabel}
                </span>
              )}
            </div>
          </div>

          {/* Terminal Output Buffer */}
          <div className="flex-1 p-3.5 font-mono text-xs overflow-y-auto space-y-2 leading-relaxed">
            <div className="text-zinc-600 text-[11px]">
              pixelmink@sandbox:~$ {language} main{LANGUAGES.find((l) => l.id === language)?.ext}
            </div>

            {isRunning && (
              <div className="flex items-center gap-2 text-amber-400 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Compiling and running code across P2P session...</span>
              </div>
            )}

            {stdout && (
              <pre className="text-emerald-400 whitespace-pre-wrap break-words bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-500/20">
                {stdout}
              </pre>
            )}

            {stderr && (
              <pre className="text-red-400 whitespace-pre-wrap break-words bg-red-950/20 p-2.5 rounded-lg border border-red-500/20">
                {stderr}
              </pre>
            )}

            {!stdout && !stderr && !isRunning && (
              <div className="text-zinc-600 text-xs py-8 text-center">
                Press «Run (Ctrl+↵)» to execute code and see stdout/stderr in real-time.
              </div>
            )}
          </div>

          {/* Console Footer */}
          <div className="px-3 py-1.5 bg-[#0e0e14] border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-zinc-500 shrink-0">
            <span>Live WebAssembly & Cloud Runtime</span>
            <button
              onClick={() => {
                setStdout('');
                setStderr('');
                setExecutionTime(null);
              }}
              className="hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
