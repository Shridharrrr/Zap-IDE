// ─── Vite React Preview Builder ───────────────────────────────
// Generates a self-contained srcdoc HTML string for React/Vite projects.

/**
 * Returns true when the file map looks like a React / Vite project.
 * @param {Object.<string,string>} files
 * @returns {boolean}
 */
export function isViteProject(files) {
  if (!files || Object.keys(files).length === 0) return false;
  return Object.keys(files).some(
    (p) =>
      p.endsWith(".jsx") ||
      p.endsWith(".tsx") ||
      p === "vite.config.js" ||
      p === "vite.config.ts" ||
      p.includes("src/main") ||
      p.includes("src/index"),
  );
}

/**
 * Builds a fully self-contained HTML string from a map of project files.
 * @param {Object.<string,string>} files  { [virtualPath]: fileContent }
 * @param {string=} preferredEntry  Optional preferred entry path
 * @returns {string}  HTML ready to set as iframe.srcdoc
 */
export function buildVitePreviewHTML(files, preferredEntry) {
  if (!files || Object.keys(files).length === 0) {
    return errorPage("No project files provided.");
  }

  // ── 1. Partition: JS sources vs CSS ──────────────────────
  const sourceFiles = {};
  let userCSS = "";

  for (const [path, content] of Object.entries(files)) {
    if (content == null) continue;
    if (/\.(css|scss|less)$/.test(path)) {
      userCSS += `/* ${escHtml(path)} */\n${content}\n\n`;
    } else if (/\.(js|jsx|ts|tsx|json)$/.test(path)) {
      sourceFiles[path] = content;
    }
    // images, fonts, vite.config, etc. → ignored
  }

  // ── 2. Find entry file ────────────────────────────────────
  const ENTRIES = [
    "src/main.jsx",
    "src/main.tsx",
    "src/main.js",
    "src/index.jsx",
    "src/index.tsx",
    "src/index.js",
    "main.jsx",
    "main.tsx",
    "main.js",
  ];

  // 1. Identify "Project Root" if we are in a subdirectory (e.g. Community/MyProject/src/App.jsx)
  let projectRoot = "";
  if (preferredEntry && preferredEntry.includes("/")) {
    const parts = preferredEntry.split("/");
    // If it's in Community/..., the project root is the first two parts
    if (parts[0] === "Community" && parts.length >= 2) {
      projectRoot = parts.slice(0, 2).join("/") + "/";
    }
  }

  // 2. Find valid entry point
  let entryFile = null;

  // Priority 1: Exact match for preferred entry if it's a valid bootstrapper
  if (preferredEntry && files[preferredEntry] && ENTRIES.some(e => preferredEntry.endsWith(e))) {
    entryFile = preferredEntry;
  }

  // Priority 2: Standard entry points within the detected project root
  if (!entryFile && projectRoot) {
    const localEntry = ENTRIES.find(e => files[projectRoot + e] != null);
    if (localEntry) entryFile = projectRoot + localEntry;
  }

  // Priority 3: Fallback to global standard entry points
  if (!entryFile) {
    entryFile = ENTRIES.find(e => files[e] != null);
  }

  // Priority 4: Hard fallback to first found entry point in any directory
  if (!entryFile) {
    const allPaths = Object.keys(files);
    entryFile = allPaths.find(p => ENTRIES.some(e => p.endsWith("/" + e))) || ENTRIES[0];
  }

  // ── 3. Safely serialize file map ──────────────────────────
  // Replace </script> so the JSON blob never closes the wrapping tag.
  // JSON allows \/ as an escaped /, so the round-trip is lossless.
  const filesJson = JSON.stringify(sourceFiles).replace(
    /<\/script>/gi,
    "<\\/script>",
  );

  // ── 4. CSS ────────────────────────────────────────────────
  const baseCss = `
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;height:100%}
body{font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
#root{min-height:100vh}
.__loader{
  position:fixed;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  background:#0d0d1a;color:#9d87ff;font-family:monospace;font-size:13px;gap:14px;
  z-index:9999
}
.__loader-ring{
  width:36px;height:36px;
  border:3px solid rgba(123,97,255,.25);
  border-top-color:#7B61FF;
  border-radius:50%;
  animation:__spin .75s linear infinite
}
@keyframes __spin{to{transform:rotate(360deg)}}
.__stuck{
  position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
  padding:22px;background:#07070d;color:#eae6ff;z-index:10000;
  opacity:0;pointer-events:none;
  animation:__stuckFadeIn .01s linear forwards;
  animation-delay:7s;
}
@keyframes __stuckFadeIn{to{opacity:1;pointer-events:auto}}
.__stuck-card{
  max-width:680px;width:100%;
  border:1px solid rgba(123,97,255,.25);
  border-radius:12px;
  padding:18px 18px;
  background:rgba(15,15,30,.65);
  backdrop-filter: blur(10px);
  box-shadow:0 0 40px rgba(123,97,255,.12);
  font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
}
.__stuck h3{margin:0 0 10px;font-size:14px;color:#b9a6ff}
.__stuck p{margin:0 0 10px;font-size:12px;line-height:1.6;color:#c7c0de}
.__stuck code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px}
.__stuck a{color:#79ffe1;text-decoration:none}
.__stuck a:hover{text-decoration:underline}
.__preview-error{
  padding:24px;color:#ff4d6a;font-family:monospace;font-size:12px;
  background:#0d0009;min-height:100vh;white-space:pre-wrap;line-height:1.6;
  overflow:auto
}
.__preview-error h3{color:#ff4d6a;margin:0 0 10px;font-size:14px}
.__preview-error pre{margin:0}
`.trim();

  const inlineCss = userCSS
    ? `${baseCss}\n/* user styles */\n${userCSS}`
    : baseCss;

  // ── 5. Runtime script ─────────────────────────────────────
  // Placed verbatim inside a <script> block — must NOT contain </script>.
  // All user code is in the JSON blob (a separate element), so it is safe.
  const runtime = `(function(){
'use strict';

/* ── helpers ─────────────────────────────────────────────── */
function _esc(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// If JS is running, we can hide the CSP/JS-block fallback overlay immediately.
var __stuckEl=document.getElementById('__stuck');
if(__stuckEl){ __stuckEl.style.display='none'; }

function _showError(text){
  var r=document.getElementById('root');
  if(r){
    r.innerHTML=
      '<div class="__preview-error">'+
        '<h3>&#x26A0; Preview Error</h3>'+
        '<pre>'+_esc(String(text||'Unknown error'))+'</pre>'+
      '</div>';
  }
}

function _ensureMountContainers(){
  var rootEl=document.getElementById('root');
  var appEl=document.getElementById('app');

  if(!rootEl){
    rootEl=document.createElement('div');
    rootEl.id='root';
    rootEl.style.minHeight='100vh';
    document.body.appendChild(rootEl);
  }

  if(!appEl){
    appEl=document.createElement('div');
    appEl.id='app';
    appEl.style.minHeight='100vh';
    document.body.appendChild(appEl);
  }
}

/* ── environment shims ───────────────────────────────────── */
if(typeof window.process==='undefined'){
  window.process={env:{NODE_ENV:'development'},browser:true,version:''};
}

/* ── ensure common React mount points exist ──────────────── */
_ensureMountContainers();

/* ── global error catchers ───────────────────────────────── */
window.onerror=function(msg,src,line,col,err){
  _showError(err?(err.stack||err.toString()):String(msg));
  return true;
};
window.addEventListener('unhandledrejection',function(e){
  _showError(e.reason?(e.reason.stack||String(e.reason)):'Unhandled promise rejection');
});

/* ── guard: CDN must have loaded ─────────────────────────── */
if(typeof window.React==='undefined'||typeof window.ReactDOM==='undefined'){
  _showError('React or ReactDOM failed to load from CDN.\\nCheck your internet connection and try refreshing the preview.');
  return;
}
if(typeof window.Babel==='undefined'){
  _showError('Babel failed to load from CDN.\\nCheck your internet connection and try refreshing the preview.');
  return;
}

/* ── read file map ───────────────────────────────────────── */
var __filesEl=document.getElementById('__vite_files');
var __files;
try{
  __files=JSON.parse(__filesEl?__filesEl.textContent:'{}');
}catch(e){
  _showError('Failed to parse project files: '+e.message);
  return;
}

var __cache=Object.create(null);

/* ── externals resolved LAZILY (CDN is ready by now) ─────── */
function _ext(){
  return {
    'react':            window.React,
    'react-dom':        window.ReactDOM,
    'react-dom/client': window.ReactDOM,
    'react/jsx-runtime':{
      jsx:     window.React.createElement,
      jsxs:    window.React.createElement,
      Fragment:window.React.Fragment
    }
  };
}

/* ── path resolution ─────────────────────────────────────── */
function _normalize(fromFile,spec){
  if(!spec.startsWith('.')) return spec;
  var parts=fromFile.split('/');
  parts.pop();
  spec.split('/').forEach(function(seg){
    if(seg==='..'){parts.pop();}
    else if(seg!=='.'){parts.push(seg);}
  });
  return parts.join('/');
}

var EXTS=['','.jsx','.js','.tsx','.ts'];

function _resolveFile(base){
  var i,idx;
  for(i=0;i<EXTS.length;i++){
    if(__files[base+EXTS[i]]!==undefined) return base+EXTS[i];
  }
  for(i=1;i<EXTS.length;i++){
    idx=base+'/index'+EXTS[i];
    if(__files[idx]!==undefined) return idx;
  }
  return null;
}

var ASSET_RE=/\\.(css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|ico|bmp|woff2?|ttf|eot|otf|mp4|mp3|wav|ogg)$/i;

/* ── require() ───────────────────────────────────────────── */
var __externals=_ext();

function __require(spec,fromFile){
  // 1. externals
  if(Object.prototype.hasOwnProperty.call(__externals,spec)){
    return __externals[spec];
  }

  // 2. asset side-effects → silently ignore
  if(ASSET_RE.test(spec)) return {};

  // 3. resolve
  var resolved=spec.startsWith('.')?_normalize(fromFile||'',spec):spec;
  var actualPath=_resolveFile(resolved);

  if(!actualPath){
    // unknown bare module (e.g. react-router) → warn, return empty
    console.warn('[preview] Cannot resolve:',spec,'from',fromFile);
    return {};
  }

  // 4. cache (circular-dep safe)
  if(__cache[actualPath]) return __cache[actualPath].exports;

  var source=__files[actualPath];
  if(source===undefined){
    console.warn('[preview] File missing from bundle:',actualPath);
    return {};
  }

  // 5. JSON modules
  if(actualPath.endsWith('.json')){
    var jm={exports:{}};
    try{jm.exports=JSON.parse(source);}catch(_){}
    __cache[actualPath]=jm;
    return jm.exports;
  }

  // 6. Babel transform: JSX → CJS
  var transformed;
  try{
    transformed=Babel.transform(source,{
      filename:actualPath,
      presets:[
        ['react',{runtime:'automatic'}],
        ['env',{targets:{browsers:['last 2 Chrome versions']},modules:'commonjs'}]
      ],
      sourceType:'module',
      ast:false,
      comments:false
    }).code;
  }catch(babelErr){
    throw new Error(
      'Babel error in '+actualPath+':\\n'+
      (babelErr.message||String(babelErr))
    );
  }

  // 7. Register BEFORE execution (handles circular imports)
  var mod={exports:{}};
  __cache[actualPath]=mod;

  var dir=actualPath.includes('/')?actualPath.split('/').slice(0,-1).join('/'):'';

  // 8. Execute transformed CJS module
  try{
    /* eslint-disable no-new-func */
    var fn=new Function(
      'require','module','exports','__filename','__dirname','React','ReactDOM',
      transformed
    );
    /* eslint-enable no-new-func */
    fn(
      function(id){return __require(id,actualPath);},
      mod,mod.exports,
      actualPath,dir,
      window.React,window.ReactDOM
    );
  }catch(execErr){
    throw new Error(
      'Runtime error in '+actualPath+':\\n'+
      (execErr.stack||String(execErr))
    );
  }

  return mod.exports;
}

/* ── boot ────────────────────────────────────────────────── */
try{
  __require('${entryFile}','');
  // React.createRoot().render() is async — it will replace #root's
  // children (including the loader inside it) on its own schedule.
}catch(err){
  _showError(err?(err.stack||String(err)):'Boot failed');
}

})();`;

  // ── 6. Assemble HTML ───────────────────────────────────────
  //
  // KEY DESIGN: the loader lives INSIDE #root.
  // ReactDOM.createRoot(root).render(...) clears #root before mounting,
  // so the loader disappears automatically — no setTimeout hacks needed.
  //
  // CDN scripts have onerror handlers so failures show a clear message
  // instead of a permanently stuck spinner.
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview</title>
  <style>${inlineCss}</style>
</head>
<body>

  <!-- #root contains the loader as initial content.
       React replaces it when the app mounts. -->
  <div id="root">
    <div class="__loader">
      <div class="__loader-ring"></div>
      <span>Loading preview&hellip;</span>
    </div>
  </div>

  <!-- Fallback overlay: appears if scripts never run (e.g. CSP blocks inline JS). -->
  <div class="__stuck" id="__stuck">
    <div class="__stuck-card">
      <h3>Preview is taking too long</h3>
      <p>
        If this stays on “Loading”, this gateway is likely blocking scripts (CSP) or a CDN resource failed to load.
      </p>
      <p>
        Try opening the project inside the IDE (URL share) instead of the gateway preview, or use a different gateway.
      </p>
      <p style="margin:0;color:#a9a2c6">
        Tip: open DevTools → Console for errors like <code>Refused to execute inline script</code>.
      </p>
    </div>
  </div>

  <!-- Inert JSON file map – never executed by the browser -->
  <script type="application/json" id="__vite_files">${filesJson}</script>

  <!-- CDN error helper (must be before CDN scripts) -->
  <script>
  function __cdnFail(lib){
    var r=document.getElementById('root');
    if(r){
      r.innerHTML=
        '<div class="__preview-error">'+
          '<h3>&#x26A0; CDN Load Error</h3>'+
          '<pre>Failed to load '+lib+' from CDN.\\n'+
          'Check your internet connection and try refreshing the preview.</pre>'+
        '</div>';
    }
  }
  </script>

  <!-- React 18 UMD -->
  <script crossorigin src="https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.development.js"
          onerror="__cdnFail('React')"></script>

  <!-- ReactDOM 18 UMD -->
  <script crossorigin src="https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.development.js"
          onerror="__cdnFail('ReactDOM')"></script>

  <!-- Babel standalone (JSX transform) -->
  <script crossorigin src="https://cdn.jsdelivr.net/npm/@babel/standalone@7.24.7/babel.min.js"
          onerror="__cdnFail('Babel')"></script>

  <!-- Virtual bundler + app boot -->
  <script>${runtime}</script>

</body>
</html>`;
}

// ── private helpers ────────────────────────────────────────────

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function errorPage(message) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/>
<style>
  body{margin:0;background:#07070d;color:#ff4d6a;font-family:monospace;
       display:flex;align-items:center;justify-content:center;min-height:100vh}
  .b{padding:32px;border:1px solid rgba(255,77,106,.3);border-radius:8px;max-width:520px}
  h3{margin:0 0 10px;font-size:15px}
  pre{margin:0;white-space:pre-wrap;font-size:12px;color:#a09cbc}
</style>
</head>
<body>
  <div class="b">
    <h3>&#x26A0; Preview Unavailable</h3>
    <pre>${escHtml(message)}</pre>
  </div>
</body>
</html>`;
}
