const editor = document.getElementById("editor");
const slideBox = document.getElementById("slide");
const counter = document.getElementById("counter");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const fsBtn = document.getElementById("fsBtn");
const viewer = document.getElementById("viewer");
const status = document.getElementById("status");
const fileInput = document.getElementById("fileInput");

const STORAGE_KEY = "markdownSlides";   
const DEFAULT_TEXT = "# Welcome\n## My first presentation\n\nEdit the text on the left!\n---\n# Slide 02\n\n- Bullet one\n- Bullet **bold** and *italic*\n- Some `code`\n---\n# Code Example\n\n```\nconsole.log(\"Hello\");\n```\n---\n# The End";

let slides = [];        
let current = 0;     
let savedText = "";     // last saved text, used to detect unsaved changes

// ---------- 2. Convert markdown to HTML (a small converter) ----------
function inline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

function markdownToHtml(md) {
  // Escape < > & so typed HTML is shown as text, not run
  md = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = "";
  let inList = false, inCode = false;
  for (const line of md.split("\n")) {
    if (line.trim().startsWith("```")) {          // start/end of a code block
      html += inCode ? "</code></pre>" : "<pre><code>";
      inCode = !inCode;
      continue;
    }
    if (inCode) { html += line + "\n"; continue; }

    const heading = line.match(/^(#{1,6})\s+(.*)/);
    const item = line.match(/^[-*]\s+(.*)/);
    if (inList && !item) { html += "</ul>"; inList = false; }
    if (heading) {
      const level = heading[1].length;
      html += `<h${level}>${inline(heading[2])}</h${level}>`;
    } else if (item) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(item[1])}</li>`;
    } else if (line.trim() !== "") {
      html += `<p>${inline(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  if (inCode) html += "</code></pre>";
  return html;
}

// ---------- 3. Show the slides ----------
function render(animate) {
  // A line containing only --- splits one slide from the next
  slides = editor.value.split(/^\s*---\s*$/m);
  if (current > slides.length - 1) current = slides.length - 1;
  if (current < 0) current = 0;

  slideBox.innerHTML = markdownToHtml(slides[current]);
  counter.textContent = (current + 1) + " / " + slides.length;   // {current} / {total}
  prevBtn.disabled = current === 0;                 // first slide: Left disabled
  nextBtn.disabled = current === slides.length - 1; // last slide: Right disabled

  if (animate) {                                    // small slide-in animation
    slideBox.classList.remove("fade");
    void slideBox.offsetWidth;
    slideBox.classList.add("fade");
  }
  updateStatus();
}

function goNext() { if (current < slides.length - 1) { current++; render(true); } }
function goPrev() { if (current > 0) { current--; render(true); } }

// ---------- 4. Full screen (presentation mode) ----------
function toggleFullScreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else viewer.requestFullscreen();
}

document.addEventListener("fullscreenchange", () => {
  fsBtn.textContent = document.fullscreenElement ? "\u2716 Exit Full Screen" : "\u26F6 Full Screen";
});

// ---------- 5. Save / load (browser memory = localStorage) ----------
function save() {
  localStorage.setItem(STORAGE_KEY, editor.value);
  savedText = editor.value;
  status.textContent = "Saved!";
  status.className = "saved";
  setTimeout(updateStatus, 1500);
}

function updateStatus() {
  if (status.textContent === "Saved!" && editor.value === savedText) return;
  status.className = "";
  status.textContent = editor.value === savedText ? "" : "\u25CF Unsaved changes";
}

function newSlides() {
  if (confirm("Start a new presentation? Unsaved changes will be lost.")) {
    editor.value = "# New Slide\n\nWrite here...";
    current = 0;
    render();
  }
}


function downloadMd() {
  const blob = new Blob([editor.value], { type: "text/markdown" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "slides.md";
  link.click();
  URL.revokeObjectURL(link.href);
}


fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { editor.value = reader.result; current = 0; render(); };
  reader.readAsText(file);
  fileInput.value = "";
});


window.addEventListener("beforeunload", (e) => {
  if (editor.value !== savedText) e.preventDefault();
});

prevBtn.addEventListener("click", goPrev);
nextBtn.addEventListener("click", goNext);
fsBtn.addEventListener("click", toggleFullScreen);
document.getElementById("presentBtn").addEventListener("click", toggleFullScreen);
document.getElementById("saveBtn").addEventListener("click", save);
document.getElementById("newBtn").addEventListener("click", newSlides);
document.getElementById("downloadBtn").addEventListener("click", downloadMd);
document.getElementById("openBtn").addEventListener("click", () => fileInput.click());
editor.addEventListener("input", () => render());   // realtime updates while typing

document.addEventListener("keydown", (e) => {
  if (e.key === "F11") { e.preventDefault(); toggleFullScreen(); }
  else if (e.ctrlKey && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
  else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
    // don't steal arrow keys while typing in the editor (unless presenting)
    if (document.activeElement === editor && !document.fullscreenElement) return;
    e.key === "ArrowRight" ? goNext() : goPrev();
  }
});

savedText = localStorage.getItem(STORAGE_KEY) || "";
editor.value = savedText || DEFAULT_TEXT;
if (!savedText) savedText = DEFAULT_TEXT;
render();