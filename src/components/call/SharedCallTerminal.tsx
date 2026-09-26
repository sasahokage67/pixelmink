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

  const isLocalChange = useRef(false);

  // Sync listener from socket
  useEffect(() => {
    if (!socket) return;

    socket.on('call:terminal_sync', (data: { code: string; language: string; byUserName?: string }) => {
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

    return () => {
      socket.off('call:terminal_sync');
      socket.off('call:terminal_executing');
      socket.off('call:terminal_output');
      socket.off('call:terminal_closed');
    };
  }, [socket, language, onClose]);

  // Code change broadcast
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (!isLocalChange.current && socket) {
      socket.emit('call:terminal_sync', {
        roomId,
        code: newCode,
        language,
        byUserName: currentUser?.profile?.name || currentUser?.email?.split('@')[0] || 'Peer',
      });
    }
  };

  // Language switch
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    const newCode = TEMPLATES[newLang] || `// ${newLang} Environment\n`;
    setCode(newCode);
    if (socket) {
      socket.emit('call:terminal_sync', {
        roomId,
        code: newCode,
        language: newLang,
        byUserName: currentUser?.profile?.name || currentUser?.email?.split('@')[0] || 'Peer',
      });
    }
  };

  // Execute Code
  const handleRunCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setStdout('');
    setStderr('');

    if (socket) {
      socket.emit('call:terminal_executing', { roomId });
    }

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

      if (socket) {
        socket.emit('call:terminal_output', {
          roomId,
          output: {
            stdout: data.stdout || '',
            stderr: data.stderr || '',
            executionTime: data.executionTime || 0,
            runtime: data.runtime || '',
            exitCode: data.exitCode,
          },
        });
      }
    } catch (err: any) {
      setIsRunning(false);
      const errMsg = err.message || 'Execution failed';
      setStderr(errMsg);
      if (socket) {
        socket.emit('call:terminal_output', {
          roomId,
          output: { stdout: '', stderr: errMsg, executionTime: 0 },
        });
      }
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
    onClose();
  };

  // Keyboard shortcut Ctrl+Enter to Run
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      <div className="h-12 bg-[#121218] border-b border-white/[0.08] px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>P2P Live Terminal</span>
          </div>

          {/* Language Selector Dropdown */}
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-[#181822] border border-white/[0.12] text-xs font-mono text-white rounded-lg px-2.5 py-1 outline-none focus:border-blue-500 cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id} className="bg-[#121218] text-white">
                {lang.label} ({lang.ext})
              </option>
            ))}
          </select>

          <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Синхронизировано с {partnerName || 'собеседником'}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
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
            disabled={isRunning}
            className={`px-4 py-1.5 rounded-lg font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
              isRunning
                ? 'bg-amber-600 text-white cursor-wait'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 tap-active'
            }`}
          >
            <Play className={`w-3.5 h-3.5 fill-current ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running...' : 'Run (Ctrl+↵)'}</span>
          </button>

          {/* Close Terminal Button */}
          <button
            onClick={handleCloseTerminal}
            title="Закрыть терминал для обоих"
            className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor & Console Split Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Code Editor Pane (60%) */}
        <div className="flex-1 flex bg-[#0c0c12] overflow-hidden border-b md:border-b-0 md:border-r border-white/[0.08]">
          {/* Line Numbers Gutter */}
          <div className="w-12 py-3 bg-[#0a0a0e] text-zinc-600 font-mono text-xs text-right pr-3 select-none overflow-hidden shrink-0 leading-6 border-r border-white/[0.04]">
            {linesArray.map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>

          {/* Textarea Code Buffer */}
          <textarea
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            placeholder="Type code here... Synchronized in real-time between both peers."
            className="flex-1 bg-transparent p-3 text-xs sm:text-sm font-mono text-zinc-100 placeholder-zinc-600 outline-none resize-none leading-6 overflow-y-auto selection:bg-blue-600/30"
          />
        </div>

        {/* Terminal Output Console Pane (40%) */}
        <div className="w-full md:w-96 flex flex-col bg-[#07070a] overflow-hidden shrink-0 select-text">
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
