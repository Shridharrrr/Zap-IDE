// ─── Python Runtime using Pyodide ────────────────────────────
// Loads Pyodide from CDN and executes Python code in browser

let pyodideInstance = null;
let pyodideLoadingPromise = null;

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';

export async function loadPyodide() {
    if (pyodideInstance) return pyodideInstance;
    if (pyodideLoadingPromise) return pyodideLoadingPromise;

    pyodideLoadingPromise = new Promise(async (resolve, reject) => {
        try {
            // Load Pyodide script
            if (!window.loadPyodide) {
                await new Promise((res, rej) => {
                    const script = document.createElement('script');
                    script.src = PYODIDE_URL;
                    script.onload = res;
                    script.onerror = () => rej(new Error('Failed to load Pyodide'));
                    document.head.appendChild(script);
                });
            }

            pyodideInstance = await window.loadPyodide({
                stdout: (text) => {
                    if (pyodideInstance._stdoutHandler) pyodideInstance._stdoutHandler(text);
                },
                stderr: (text) => {
                    if (pyodideInstance._stderrHandler) pyodideInstance._stderrHandler(text);
                },
            });

            // Set up matplotlib to display in browser
            await pyodideInstance.loadPackage('matplotlib');
            pyodideInstance.runPython(`
                import matplotlib
                matplotlib.use('AGG')
                import matplotlib.pyplot as plt
                from pyodide.http import pyfetch
                import io
                import base64
                
                def show_plot():
                    buf = io.BytesIO()
                    plt.savefig(buf, format='png')
                    buf.seek(0)
                    img_str = base64.b64encode(buf.read()).decode()
                    print(f"PLOT_OUTPUT:{img_str}")
                    plt.close()
                
                plt.show = show_plot
            `);

            resolve(pyodideInstance);
        } catch (err) {
            reject(err);
        }
    });

    return pyodideLoadingPromise;
}

export async function runPython(code, { onStdout, onStderr, onWarn, onDone }) {
    try {
        const pyodide = await loadPyodide();
        
        pyodide._stdoutHandler = onStdout;
        pyodide._stderrHandler = onStderr;

        // Wrap code to capture output
        const wrappedCode = `
import sys
import io
import traceback

# Redirect stdout/stderr
captured_output = io.StringIO()
captured_errors = io.StringIO()
old_stdout = sys.stdout
old_stderr = sys.stderr
sys.stdout = captured_output
sys.stderr = captured_errors

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
except Exception as e:
    print(f"Error: {e}", file=captured_errors)
    traceback.print_exc(file=captured_errors)
finally:
    sys.stdout = old_stdout
    sys.stderr = old_stderr

print("OUTPUT_START:" + captured_output.getvalue())
print("ERROR_START:" + captured_errors.getvalue())
        `;

        await pyodide.runPythonAsync(wrappedCode);
        
        const output = pyodide.runPython('captured_output.getvalue()');
        const errors = pyodide.runPython('captured_errors.getvalue()');
        
        if (output) onStdout?.(output);
        if (errors) onStderr?.(errors);
        
        onDone?.({ error: false });
        return { error: false };
    } catch (err) {
        onStderr?.(err.message || String(err));
        onDone?.({ error: true });
        return { error: true };
    }
}

export function isPyodideLoaded() {
    return pyodideInstance !== null;
}
