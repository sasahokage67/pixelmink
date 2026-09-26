import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

// Wandbox compiler names (verified against live Wandbox API)
const WANDBOX_MAP: Record<string, string> = {
  python: 'cpython-3.12.7',
  py: 'cpython-3.12.7',
  rust: 'rust-1.82.0',
  rs: 'rust-1.82.0',
  cpp: 'gcc-13.2.0',
  'c++': 'gcc-13.2.0',
  c: 'gcc-13.2.0',
  go: 'go-1.23.2',
  golang: 'go-1.23.2',
  typescript: 'typescript-5.6.2',
  ts: 'typescript-5.6.2',
  javascript: 'nodejs-20.17.0',
  js: 'nodejs-20.17.0',
  bash: 'bash',
  shell: 'bash',
  sh: 'bash',
};

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { language = 'python', code = '', stdin = '' } = body;

    if (!code || code.trim().length === 0) {
      return NextResponse.json({
        success: true,
        stdout: '',
        stderr: 'Error: Empty code buffer',
        exitCode: 1,
        executionTime: 0,
      });
    }

    const langKey = language.toLowerCase().trim();

    // 1. FAST LOCAL EXECUTION FOR JAVASCRIPT & TYPESCRIPT
    if (langKey === 'javascript' || langKey === 'js' || langKey === 'typescript' || langKey === 'ts') {
      try {
        const tmpFile = path.join(os.tmpdir(), `pixelmink_${Date.now()}.js`);
        // Strip basic typescript types if needed or run in node
        const cleanedCode = code.replace(/:\s*(string|number|boolean|any|void)\b/g, '');
        fs.writeFileSync(tmpFile, cleanedCode, 'utf8');

        try {
          const { stdout, stderr } = await execAsync(`node "${tmpFile}"`, { timeout: 6000 });
          try { fs.unlinkSync(tmpFile); } catch {}
          return NextResponse.json({
            success: true,
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: 0,
            executionTime: Date.now() - startTime,
            runtime: 'Node.js v18 (Local)',
          });
        } catch (runErr: any) {
          try { fs.unlinkSync(tmpFile); } catch {}
          return NextResponse.json({
            success: true,
            stdout: runErr.stdout || '',
            stderr: runErr.stderr || runErr.message || 'Execution error',
            exitCode: runErr.code || 1,
            executionTime: Date.now() - startTime,
            runtime: 'Node.js v18 (Local)',
          });
        }
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: err.message,
          executionTime: Date.now() - startTime,
        });
      }
    }

    // 2. FAST LOCAL EXECUTION FOR PYTHON
    if (langKey === 'python' || langKey === 'py') {
      try {
        const tmpFile = path.join(os.tmpdir(), `pixelmink_${Date.now()}.py`);
        fs.writeFileSync(tmpFile, code, 'utf8');

        try {
          const { stdout, stderr } = await execAsync(`py "${tmpFile}"`, { timeout: 7000 });
          try { fs.unlinkSync(tmpFile); } catch {}
          return NextResponse.json({
            success: true,
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: 0,
            executionTime: Date.now() - startTime,
            runtime: 'Python 3 (Local)',
          });
        } catch (runErr: any) {
          try { fs.unlinkSync(tmpFile); } catch {}
          return NextResponse.json({
            success: true,
            stdout: runErr.stdout || '',
            stderr: runErr.stderr || runErr.message || 'Python execution error',
            exitCode: runErr.code || 1,
            executionTime: Date.now() - startTime,
            runtime: 'Python 3 (Local)',
          });
        }
      } catch (err: any) {
        // Fallback to Wandbox if local python fails
      }
    }

    // 3. WANDBOX CLOUD COMPILER (PYTHON, C++, RUST, GO, TS/JS, BASH)
    const wandboxCompiler = WANDBOX_MAP[langKey] || 'cpython-3.12.7';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const wandboxRes = await fetch('https://wandbox.org/api/compile.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compiler: wandboxCompiler,
          code,
          stdin: stdin || '',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (wandboxRes.ok) {
        const data = await wandboxRes.json();
        const stdout = (data.program_message || data.program_output || '');
        const stderr = (data.compiler_error || data.program_error || '');
        const exitCode = data.status !== undefined ? Number(data.status) : 0;

        return NextResponse.json({
          success: true,
          stdout,
          stderr,
          exitCode,
          executionTime: Date.now() - startTime,
          runtime: `Cloud (${wandboxCompiler})`,
        });
      }
    } catch (wandboxErr: any) {
      console.warn('Wandbox error:', wandboxErr?.message);
    }

    return NextResponse.json({
      success: false,
      stdout: '',
      stderr: `Runtime for ${language} temporarily unavailable. Supported: Python, JavaScript, TypeScript, Rust, C++, Go.`,
      exitCode: -1,
      executionTime: Date.now() - startTime,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      executionTime: Date.now() - startTime,
    }, { status: 500 });
  }
}
