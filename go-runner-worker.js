/* global Go, runGoCode */

let ready = false;

async function startRuntime() {
  try {
    self.importScripts('./wasm_exec.js');
    const go = new Go();
    const result = await WebAssembly.instantiateStreaming(fetch('./yaegi.wasm'), go.importObject);
    go.run(result.instance);
    ready = typeof runGoCode === 'function';
    self.postMessage({ type: ready ? 'ready' : 'runtime-error', error: ready ? undefined : 'The Go evaluator did not start.' });
  } catch (error) {
    self.postMessage({ type: 'runtime-error', error: String(error) });
  }
}

self.onmessage = (event) => {
  if (!ready || event.data?.type !== 'run') return;
  const { requestId, code, hiddenTests } = event.data;
  try {
    const result = runGoCode(code, hiddenTests);
    self.postMessage({ type: 'result', requestId, result });
  } catch (error) {
    self.postMessage({ type: 'result', requestId, result: JSON.stringify({ status: 'runtime_error', stdout: '', error: String(error), tests: [] }) });
  }
};

startRuntime();
