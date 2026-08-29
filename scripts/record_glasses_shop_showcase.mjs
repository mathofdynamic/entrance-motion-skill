#!/usr/bin/env node

import { promises as fs } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const ROOT = resolve(import.meta.dirname, "..");
const FIXTURE = join(ROOT, "examples", "glasses-shop");
const OUTPUT = join(FIXTURE, "showcase-before-after.mp4");
const PORT = 4173;
const CDP_PORT = 9222;
const WIDTH = 1920;
const HEIGHT = 1080;
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CAPTURE_INTERVAL_MS = 40;

class CdpConnection {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolveReady, rejectReady) => {
      this.socket.addEventListener("open", resolveReady, { once: true });
      this.socket.addEventListener("error", rejectReady, { once: true });
    });
    this.socket.addEventListener("message", (event) => this.handleMessage(event.data));
  }

  handleMessage(raw) {
    const message = JSON.parse(raw);
    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
      else pending.resolve(message.result || {});
      return;
    }
    for (const listener of this.listeners.get(message.method) || []) listener(message);
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  async send(method, params = {}, sessionId) {
    await this.ready;
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    return new Promise((resolveResult, rejectResult) => {
      this.pending.set(id, { resolve: resolveResult, reject: rejectResult });
      this.socket.send(JSON.stringify(payload));
    });
  }

  close() {
    this.socket.close();
  }
}

const command = (binary, args, options = {}) => new Promise((resolveCommand, rejectCommand) => {
  const child = spawn(binary, args, { windowsHide: true, ...options });
  let stderr = "";
  child.stderr?.on("data", (chunk) => { stderr += chunk.toString(); });
  child.on("error", rejectCommand);
  child.on("close", (code) => {
    if (code === 0) resolveCommand();
    else rejectCommand(new Error(`${binary} exited with ${code}: ${stderr.trim()}`));
  });
});

const httpReady = async (url, timeout = 15000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const response = await fetch(url);
      await response.arrayBuffer();
      if (response.ok) return true;
    } catch {
      // The server may still be starting.
    }
    await delay(100);
  }
  return false;
};

const waitForCdp = async (timeout = 15000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    try {
      const response = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (response.ok) return response.json();
    } catch {
      // Chrome may still be starting.
    }
    await delay(100);
  }
  throw new Error("Chrome remote debugging did not become available.");
};

const evaluate = async (connection, sessionId, expression, awaitPromise = false) => {
  const result = await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true,
  }, sessionId);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || "Browser evaluation failed.");
  }
  return result.result?.value;
};

const waitFor = async (predicate, timeout = 20000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await predicate()) return;
    await delay(100);
  }
  throw new Error("Timed out while preparing the recording.");
};

const removeDirectory = async (path) => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await fs.rm(path, {recursive: true, force: true});
      return;
    } catch {
      await delay(250);
    }
  }
  console.warn(`Could not remove temporary directory: ${path}`);
};

const encode = async (frames, frameDirectory) => {
  if (frames.length < 12) throw new Error(`Only ${frames.length} browser frames were captured.`);
  const ordered = [...frames].sort((a, b) => a.timestamp - b.timestamp);
  const concatLines = ["ffconcat version 1.0"];
  ordered.forEach((frame, index) => {
    const nextTimestamp = ordered[index + 1]?.timestamp ?? frame.timestamp + 1 / 30;
    const duration = Math.max(1 / 120, nextTimestamp - frame.timestamp);
    concatLines.push(`file '${frame.path.replaceAll("\\", "/")}'`);
    concatLines.push(`duration ${duration.toFixed(6)}`);
  });
  concatLines.push(`file '${ordered.at(-1).path.replaceAll("\\", "/")}'`);
  const concatPath = join(frameDirectory, "frames.ffconcat");
  await fs.writeFile(concatPath, concatLines.join("\n"), "utf8");
  await command("ffmpeg", [
    "-hide_banner",
    "-loglevel", "error",
    "-y",
    "-f", "concat",
    "-safe", "0",
    "-i", concatPath,
    "-vf", `fps=30,scale=${WIDTH}:${HEIGHT}:flags=lanczos,format=yuv420p`,
    "-c:v", "libx264",
    "-preset", "slow",
    "-tune", "animation",
    "-crf", "14",
    "-profile:v", "high",
    "-level:v", "5.1",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    OUTPUT,
  ]);
  return ordered.length;
};

const main = async () => {
  const serverReady = await httpReady(`http://127.0.0.1:${PORT}/showcase.html`);
  let server = null;
  if (!serverReady) {
    server = spawn("python", ["-m", "http.server", String(PORT)], {
      cwd: FIXTURE,
      windowsHide: true,
      stdio: "ignore",
    });
    if (!await httpReady(`http://127.0.0.1:${PORT}/showcase.html`)) throw new Error("Could not start the Glasses Shop server.");
  }

  const profile = await fs.mkdtemp(join(tmpdir(), "entrance-motion-chrome-"));
  const frameDirectory = await fs.mkdtemp(join(tmpdir(), "entrance-motion-frames-"));
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    "--force-device-scale-factor=1",
    `http://127.0.0.1:${PORT}/showcase.html`,
  ], { windowsHide: true, stdio: "ignore" });

  let connection;
  let targetId;
  try {
    const version = await waitForCdp();
    connection = new CdpConnection(version.webSocketDebuggerUrl);
    const targets = await connection.send("Target.getTargets");
    const page = targets.targetInfos.find((item) => item.type === "page" && item.url.includes("showcase.html"));
    targetId = page?.targetId;
    if (!targetId) throw new Error("Could not find the showcase page in Chrome.");
    const attached = await connection.send("Target.attachToTarget", {targetId, flatten: true});
    const sessionId = attached.sessionId;

    await connection.send("Page.enable", {}, sessionId);
    await connection.send("Runtime.enable", {}, sessionId);
    await connection.send("Emulation.setDeviceMetricsOverride", {
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1,
      mobile: false,
    }, sessionId);

    await waitFor(async () => {
      try {
        return (await evaluate(connection, sessionId, "Boolean(window.showcase && window.showcase.waitForFrames)")) === true;
      } catch {
        return false;
      }
    });
    await evaluate(connection, sessionId, "window.showcase.waitForFrames()", true);
    await delay(700);

    const frames = [];
    let frameIndex = 0;
    let capturing = true;
    let captureError = null;
    const captureStartedAt = process.hrtime.bigint();
    const captureFrames = async () => {
      while (capturing) {
        const startedAt = process.hrtime.bigint();
        try {
          const screenshot = await connection.send("Page.captureScreenshot", {
            format: "jpeg",
            quality: 98,
            fromSurface: true,
            captureBeyondViewport: false,
          }, sessionId);
          const path = join(frameDirectory, `frame-${String(frameIndex++).padStart(6, "0")}.jpg`);
          const timestamp = Number(process.hrtime.bigint() - captureStartedAt) / 1e9;
          frames.push({path, timestamp});
          await fs.writeFile(path, Buffer.from(screenshot.data, "base64"));
        } catch (error) {
          captureError = error;
          break;
        }
        const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
        await delay(Math.max(0, CAPTURE_INTERVAL_MS - elapsedMs));
      }
    };

    const captureTask = captureFrames();
    const result = await evaluate(connection, sessionId, "window.showcase.playRecording()", true);
    await delay(500);
    capturing = false;
    await captureTask;
    if (captureError) throw captureError;
    const frameCount = await encode(frames, frameDirectory);
    const viewport = await evaluate(connection, sessionId, "({width: innerWidth, height: innerHeight, route: location.pathname})");
    const output = await fs.stat(OUTPUT);
    console.log(JSON.stringify({
      completed: result?.completed === true,
      route: result?.route || viewport.route,
      viewport,
      browserFrames: frameCount,
      output: OUTPUT,
      sizeBytes: output.size,
    }, null, 2));
  } finally {
    if (connection && targetId) {
      try { await connection.send("Target.closeTarget", {targetId}); } catch {}
      try { await connection.send("Browser.close"); } catch {}
      connection.close();
    }
    chrome.kill();
    if (server) server.kill();
    await delay(500);
    await removeDirectory(profile);
    await removeDirectory(frameDirectory);
  }
};

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
