import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import process from 'node:process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const children = new Set();
let backendPort = null;
let frontendStarted = false;

const log = (label, data) => {
    const text = data.toString();
    const lines = text.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
        process.stdout.write(`[${label}] ${line}\n`);
    }
};

const stopAll = (code = 0) => {
    for (const child of children) {
        if (!child.killed) {
            child.kill();
        }
    }

    process.exit(code);
};

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

const spawnChild = (label, args, env = {}) => {
    const child = spawn(npmCommand, args, {
        cwd: process.cwd(),
        env: { ...process.env, ...env },
        shell: process.platform === 'win32',
        windowsHide: true
    });

    children.add(child);

    child.stdout.on('data', (data) => {
        log(label, data);

        if (label === 'backend' && !frontendStarted) {
            const match = data.toString().match(/API listening on http:\/\/localhost:(\d+)/);
            if (match) {
                backendPort = match[1];
                startFrontend();
            }
        }
    });

    child.stderr.on('data', (data) => log(label, data));

    child.on('exit', (code, signal) => {
        children.delete(child);

        if (signal) {
            stopAll(0);
            return;
        }

        if (code && code !== 0) {
            stopAll(code);
        }
    });

    return child;
};

const spawnProgram = (label, command, args, env = {}, cwd = process.cwd()) => {
    const child = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        shell: true,
        windowsHide: true
    });

    children.add(child);

    child.stdout.on('data', (data) => log(label, data));
    child.stderr.on('data', (data) => log(label, data));

    child.on('exit', (code, signal) => {
        children.delete(child);

        if (signal) {
            stopAll(0);
            return;
        }

        if (code && code !== 0) {
            stopAll(code);
        }
    });

    return child;
};

const startFrontend = () => {
    if (frontendStarted || !backendPort) {
        return;
    }

    frontendStarted = true;
    const apiUrl = `http://localhost:${backendPort}/api`;
    writeFile('frontend/.env.local', `VITE_API_URL=${apiUrl}\nVITE_API_BASE_URL=${apiUrl}\n`, 'utf8').catch((error) => {
        log('dev', `Unable to write frontend/.env.local: ${error.message}`);
    });
    spawnChild('frontend', ['run', 'dev', '--prefix', 'frontend'], {
        VITE_API_URL: apiUrl,
        VITE_API_BASE_URL: apiUrl
    });
};

const pythonCommand = process.env.PYTHON || (process.platform === 'win32' ? 'py' : 'python');
spawnProgram('ai', pythonCommand, ['-m', 'uvicorn', 'main:app', '--reload', '--host', '127.0.0.1', '--port', '8001'], {}, 'ai-service');
spawnChild('backend', ['run', 'dev', '--prefix', 'backend'], {
    PORT: '8000',
    AI_SERVICE_URL: 'http://localhost:8001'
});