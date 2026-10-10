(function(){
const {
  byZh, categories, choiceOptions, dictionaryName, dictionaryUrl, featuredIds,
  lessons, prompts, sentencePoster, sentences, sentencesFor, sentenceVideo,
  shuffle, song, wordOfDay, wordPoster, words, wordVideo,
} = window.ShouyuData;
const { arrange } = window.ShouyuOrder;

const KEY = "shouyu-xu-progress";
const intervals = [0, 600000, 86400000, 259200000, 604800000, 1382400000];

function load() {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return defaults(); }
}
function defaults() {
  return { viewed:{}, favorites:[], lessonDone:[], quizCorrect:0, quizTotal:0, lastPractice:null, streak:0, reviews:{}, rate:1, mirror:false, loop:"off", recent:[] };
}
let P = load();
function save() { localStorage.setItem(KEY, JSON.stringify(P)); }

function today() { return new Date().toISOString().slice(0,10); }
function yday(d) { const x=new Date(d+"T12:00:00"); x.setDate(x.getDate()-1); return x.toISOString().slice(0,10); }
function markViewed(zh) { if (!P.viewed[zh]) { P.viewed[zh]=Date.now(); save(); } }
function toggleFav(zh) { P.favorites = P.favorites.includes(zh) ? P.favorites.filter(x=>x!==zh) : [...P.favorites, zh]; save(); }
function completeLesson(id) { if (!P.lessonDone.includes(id)) { P.lessonDone=[...P.lessonDone,id]; save(); } }
function recordQuiz(ok) {
  const d=today(), prev=P.lastPractice;
  if (prev!==d) P.streak = prev && yday(d)===prev ? P.streak+1 : 1;
  P.quizCorrect += ok?1:0; P.quizTotal += 1; P.lastPractice=d; save();
}
function grade(zh, ok) {
  const prev = P.reviews[zh] || {box:0,due:0};
  const box = ok ? Math.min(intervals.length-1, prev.box+1) : 0;
  P.reviews[zh] = { box, due: Date.now() + intervals[box] };
  recordQuiz(ok);
}
function remember(s) { P.recent = [s, ...P.recent.filter(x=>x!==s)].slice(0,6); save(); }
function dueCount() { const n=Date.now(); return Object.values(P.reviews).filter(r=>r.due<=n).length; }

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function progressPayload() {
  return {
    app: "手語序",
    version: 1,
    exportedAt: new Date().toISOString(),
    progress: {
      viewed: P.viewed,
      favorites: P.favorites,
      lessonDone: P.lessonDone,
      quizCorrect: P.quizCorrect,
      quizTotal: P.quizTotal,
      lastPractice: P.lastPractice,
      streak: P.streak,
      reviews: P.reviews,
      rate: P.rate,
      mirror: P.mirror,
      loop: P.loop,
      recent: P.recent,
    },
  };
}

function exportProgress(kind) {
  const day = today();
  const sum = progressSummary();
  if (kind === "txt") {
    const lines = [
      "手語序 · 學習進度報告",
      "匯出時間：" + new Date().toLocaleString("zh-TW"),
      "",
      "【總覽】",
      `已看詞彙：${sum.seen} / ${words.length}`,
      `收藏：${sum.fav}`,
      `課程完成：${P.lessonDone.length} / ${lessons.length}`,
      `測驗：${P.quizCorrect} / ${P.quizTotal}${P.quizTotal ? `（${sum.pct}%）` : ""}`,
      `連續練習：${P.streak} 天`,
      `上次練習：${P.lastPractice || "—"}`,
      `複習中詞彙：${sum.reviewN}${sum.due ? `（到期 ${sum.due}）` : ""}`,
      "",
      "【已完成課程】",
      ...(P.lessonDone.length
        ? P.lessonDone.map(id => {
            const L = lessons.find(l => l.id === id);
            return L ? `- ${L.kicker} ${L.title}` : `- ${id}`;
          })
        : ["- （尚無）"]),
      "",
      "【收藏詞彙】",
      P.favorites.length ? P.favorites.join("、") : "（尚無）",
      "",
      "【已看詞彙】",
      Object.keys(P.viewed).length ? Object.keys(P.viewed).join("、") : "（尚無）",
      "",
      "【閃卡複習狀態】",
      ...(Object.keys(P.reviews).length
        ? Object.entries(P.reviews).map(([zh, r]) => {
            const due = r.due <= Date.now() ? "到期" : new Date(r.due).toLocaleDateString("zh-TW");
            return `- ${zh} · 箱級 ${r.box} · 下次 ${due}`;
          })
        : ["- （尚無）"]),
      "",
      "（完整備份請用「匯出 JSON」，可再匯入還原。）",
    ];
    downloadBlob(new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" }), `shouyu-xu-report-${day}.txt`);
    return;
  }
  if (kind === "csv") {
    const rows = [["詞彙", "箱級", "下次複習", "是否到期", "已看", "收藏"]];
    const all = new Set([...Object.keys(P.viewed), ...Object.keys(P.reviews), ...P.favorites]);
    [...all].sort().forEach(zh => {
      const r = P.reviews[zh];
      rows.push([
        zh,
        r ? String(r.box) : "",
        r ? new Date(r.due).toISOString() : "",
        r && r.due <= Date.now() ? "是" : "否",
        P.viewed[zh] ? "是" : "否",
        P.favorites.includes(zh) ? "是" : "否",
      ]);
    });
    const csv = rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    downloadBlob(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), `shouyu-xu-words-${day}.csv`);
    return;
  }
  // default JSON (full restore)
  downloadBlob(
    new Blob([JSON.stringify(progressPayload(), null, 2)], { type: "application/json" }),
    `shouyu-xu-progress-${day}.json`
  );
}

function importProgress(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const src = data.progress || data;
      if (!src || typeof src !== "object") throw new Error("格式不對");
      const next = { ...defaults(), ...src };
      // keep playback prefs if missing
      if (src.rate == null) next.rate = P.rate;
      if (src.mirror == null) next.mirror = P.mirror;
      if (src.loop == null) next.loop = P.loop;
      P = next;
      save();
      S.meaning = null; S.order = null; S.flash = null; S.lessonQuiz = null;
      render();
      alert("進度已匯入。");
    } catch (err) {
      alert("匯入失敗：請選擇手語序匯出的 JSON 檔。");
    }
  };
  reader.readAsText(file);
}

function resetProgress() {
  if (!confirm("確定要清除本機全部學習進度？此動作無法復原。")) return;
  P = defaults();
  save();
  S.meaning = null; S.order = null; S.flash = null; S.lessonQuiz = null; S.lessonId = null;
  render();
}

function progressSummary() {
  const seen = Object.keys(P.viewed).length;
  const fav = P.favorites.length;
  const due = dueCount();
  const reviewN = Object.keys(P.reviews).length;
  const pct = P.quizTotal ? Math.round(P.quizCorrect / P.quizTotal * 100) : 0;
  return { seen, fav, due, reviewN, pct };
}

function progressPanelHTML() {
  const sum = progressSummary();
  return `<div class="card stack gap-sm">
    <div class="row" style="justify-content:space-between;align-items:flex-start;gap:1rem">
      <div>
        <h2 style="margin:0">學習進度</h2>
        <p class="muted" style="margin:.35rem 0 0">已看 ${sum.seen}/${words.length} · 收藏 ${sum.fav} · 課程 ${P.lessonDone.length}/${lessons.length} · 複習 ${sum.reviewN}${sum.due?` · 到期 ${sum.due}`:""}${P.streak?` · 連續 ${P.streak} 天`:""}</p>
      </div>
      <div class="row gap-sm" style="flex-wrap:wrap">
        <button type="button" class="btn btn-primary btn-sm" data-export-progress="json">匯出 JSON</button>
        <button type="button" class="btn btn-outline btn-sm" data-export-progress="txt">匯出報告</button>
        <button type="button" class="btn btn-outline btn-sm" data-export-progress="csv">匯出 CSV</button>
        <button type="button" class="btn btn-outline btn-sm" data-import-progress>匯入</button>
        <button type="button" class="btn btn-ghost btn-sm" data-reset-progress>清除</button>
      </div>
    </div>
    <input type="file" id="progress-file" accept="application/json,.json" class="hidden" />
    <p class="subtle">JSON 可完整還原進度；報告／CSV 方便閱讀或匯入試算表。匯入會覆寫本機現有進度。</p>
  </div>`;
}

const S = {
  route:"home", lessonId:null, lessonStep:0, lessonQuiz:null,
  draft:"", sentence:"", mode:"words",
  dialog:null, practiceTab:"meaning", lexiconTab:"words", lexiconFilter:"全部", lexiconQuery:"",
  meaning:null, order:null, flash:null,
};

const app = document.getElementById("app");
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const $ = (s,r=document) => r.querySelector(s);
const $$ = (s,r=document) => [...r.querySelectorAll(s)];

const stageStore = new Map();

function tokenClass(kind, dropped) {
  if (dropped) return "token drop";
  return "token " + (kind || "unk");
}
function tokensHTML(tokens, interactive=false) {
  return `<div class="token-row">${tokens.map((t,i)=>{
    const dropped = t.dropped || t.kind==="drop";
    const playable = interactive && !dropped && t.text!=="（疑問表情）";
    const sep = i ? `<span class="sep">${interactive?"→":"·"}</span>` : "";
    if (playable) return `${sep}<button type="button" class="${tokenClass(t.kind)} btnish" data-tok="${i}">${esc(t.text)}</button>`;
    return `${sep}<span class="${tokenClass(t.kind, dropped)}">${esc(t.text)}</span>`;
  }).join("")}</div>`;
}
function axisHTML(tokens) {
  const cols = [
    ["時間",["time"]],["人物",["person"]],["地點／物品",["place","object","unk"]],
    ["動作",["action","other"]],["疑問",["question"]],
  ];
  return `<div class="axis">${cols.map(([label,kinds])=>{
    const items = tokens.map((t,i)=>({t,i})).filter(x=>kinds.includes(x.t.kind));
    return `<div class="axis-col"><div class="label">${label}</div>${
      items.length ? items.map(({t,i})=>`<button type="button" class="${tokenClass(t.kind)} btnish" data-tok="${i}">${esc(t.text)}</button>`).join("")
      : `<span class="empty">—</span>`
    }</div>`;
  }).join("")}</div>`;
}
function legendHTML() {
  return `<div class="row gap-sm">${[["時間","time"],["人物","person"],["地點／物品","place"],["動作","action"],["疑問","question"],["虛字","drop"]].map(([l,k])=>`<span class="token ${k}" style="font-size:.75rem">${l}</span>`).join("")}</div>`;
}

function clipsFromGloss(gloss) {
  return gloss.filter(t=>!t.dropped).map((t,i)=>({
    key:`${t.text}-${i}`,
    src: wordVideo(t.text)||"",
    poster: wordPoster(t.text)||"",
    label: t.text,
    note: t.text==="（疑問表情）" ? "眉毛上揚、頭微傾，不打獨立手勢。" : (byZh[t.text]?.gloss || "詞庫還沒有這支影片。"),
  }));
}

function stageHTML(id, clips, title) {
  stageStore.set(id, clips);
  const first = clips[0] || {label:"手語序", note:"點詞彙或按播放。"};
  const multi = clips.length > 1;
  return `<div class="stage" data-stage="${esc(id)}">
    <div class="stage-video-wrap">
      ${first.src
        ? `<video playsinline preload="metadata" poster="${esc(first.poster||"")}" src="${esc(first.src)}" class="${P.mirror?"mirror":""}"></video>`
        : `<div class="stage-empty"><div class="big">${esc(first.label)}</div><div class="note">${esc(first.note||"")}</div></div>`}
    </div>
    ${multi?`<div class="filmstrip">${clips.map((c,i)=>`<button type="button" data-clip="${i}" class="${i===0?"on":""}">${c.poster?`<img src="${esc(c.poster)}" alt="">`:`<div class="ph">${esc(c.label)}</div>`}<span>${esc(c.label)}</span></button>`).join("")}</div>`:""}
    <div class="stage-bar">
      <input class="seek" type="range" min="0" max="0" step="0.1" value="0" aria-label="播放進度" />
      <div class="stage-controls">
        <button type="button" class="btn-cinema" data-act="play">▶</button>
        <button type="button" class="btn-cinema" data-act="replay">↺</button>
        <div class="rate-group">${[0.5,0.75,1].map(r=>`<button type="button" data-rate="${r}" class="${P.rate===r?"on":""}">${r===1?"1×":r+"×"}</button>`).join("")}</div>
        <button type="button" class="btn-cinema ${P.mirror?"on":""}" data-act="mirror">鏡像</button>
        <button type="button" class="btn-cinema" data-act="loop">${P.loop==="one"?"重複這段":P.loop==="all"?"整句循環":"不循環"}</button>
      </div>
      <p class="stage-title">${esc(title||first.label||"示範舞台")}</p>
      ${P.mirror?`<p class="subtle">鏡像開著，對著畫面跟著打。</p>`:""}
    </div>
  </div>`;
}

function bindStage(stage) {
  const id = stage.dataset.stage;
  const clips = stageStore.get(id) || [];
  let index = 0, want = false;
  const video = () => stage.querySelector("video");
  const seek = stage.querySelector(".seek");
  const titleEl = stage.querySelector(".stage-title");
  const wrap = stage.querySelector(".stage-video-wrap");

  function load(i, auto) {
    if (!clips.length) return;
    index = Math.max(0, Math.min(i, clips.length-1));
    const c = clips[index];
    if (c.src) {
      wrap.innerHTML = `<video playsinline preload="metadata" poster="${esc(c.poster||"")}" src="${esc(c.src)}" class="${P.mirror?"mirror":""}"></video>`;
      const v = video();
      v.playbackRate = P.rate;
      v.addEventListener("timeupdate", () => { seek.max = v.duration||0; seek.value = v.currentTime; });
      v.addEventListener("loadedmetadata", () => { seek.max = v.duration||0; v.playbackRate = P.rate; });
      v.addEventListener("ended", onEnd);
      v.addEventListener("play", () => { if (byZh[c.label]) markViewed(c.label); });
      if (auto || want) v.play().catch(()=>{});
    } else {
      wrap.innerHTML = `<div class="stage-empty"><div class="big">${esc(c.label)}</div><div class="note">${esc(c.note||"")}</div></div>`;
    }
    if (titleEl) titleEl.textContent = c.label;
    $$(".filmstrip button", stage).forEach((b,j)=>b.classList.toggle("on", j===index));
  }
  function onEnd() {
    if (P.loop==="one") { const v=video(); if(v){v.currentTime=0;v.play().catch(()=>{});} return; }
    if (index < clips.length-1) { want=true; load(index+1,true); return; }
    if (P.loop==="all" && clips.length>1) { want=true; load(0,true); return; }
    want=false;
  }
  stage.addEventListener("click", e => {
    const t = e.target.closest("[data-act],[data-rate],[data-clip]");
    if (!t) return;
    if (t.dataset.clip != null) { want=true; load(+t.dataset.clip, true); return; }
    if (t.dataset.rate != null) {
      P.rate = +t.dataset.rate; save();
      const v=video(); if(v) v.playbackRate=P.rate;
      $$("[data-rate]", stage).forEach(b=>b.classList.toggle("on", +b.dataset.rate===P.rate));
      return;
    }
    const act = t.dataset.act;
    if (act==="play") {
      const v=video();
      if (!v) { if(index<clips.length-1){want=true;load(index+1,true);} return; }
      if (v.paused) { want=true; v.play().catch(()=>{}); t.textContent="❚❚"; }
      else { v.pause(); want=false; t.textContent="▶"; }
    } else if (act==="replay") {
      const v=video(); if(v){v.currentTime=0;want=true;v.play().catch(()=>{});}
    } else if (act==="mirror") {
      P.mirror=!P.mirror; save();
      const v=video(); if(v) v.classList.toggle("mirror", P.mirror);
      t.classList.toggle("on", P.mirror);
    } else if (act==="loop") {
      P.loop = P.loop==="off"?"one":P.loop==="one"?"all":"off"; save();
      t.textContent = P.loop==="one"?"重複這段":P.loop==="all"?"整句循環":"不循環";
    }
  });
  seek?.addEventListener("input", () => { const v=video(); if(v) v.currentTime=+seek.value; });
  load(0, false);
  return { playFrom: i => { want=true; load(i,true); } };
}

function chrome() {
  const seen = Object.keys(P.viewed).length;
  const due = dueCount();
  const nav = [["home","語序"],["lexicon","詞彙"],["lessons","課程"],["practice","練習"],["songs","歌曲"]];
  const isActive = id => S.route===id || (id==="lessons" && S.route==="lesson");
  return `<header class="header"><div class="header-inner">
    <a href="#" class="brand" data-nav="home"><svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0f5f54"/><rect x="13" y="6" width="3.2" height="9.2" rx="1.6" fill="#f3eee4"/><rect x="16.6" y="4.6" width="3.2" height="10.6" rx="1.6" fill="#f3eee4"/><rect x="20.2" y="6.4" width="3.2" height="8.8" rx="1.6" fill="#f3eee4"/><path fill="#f3eee4" d="M8.2 16.2h8.2c1.5 0 2.6 1.2 2.6 2.7v4.8c0 2-1.6 3.4-3.6 3.4H10c-2 0-3.3-1.4-3.3-3.4v-6.1c0-.8.7-1.4 1.5-1.4z"/></svg><span class="name">手語序</span><span class="kicker">TSL STUDIO</span></a>
    <nav class="nav-desk">${nav.map(([id,l])=>`<button type="button" data-nav="${id}" class="${isActive(id)?"active":""}">${l}${id==="practice"&&due?` · ${due}`:""}</button>`).join("")}</nav>
    <button type="button" class="seen" data-nav="practice" title="查看與匯出進度" style="border:0;background:transparent;padding:0">已看 ${seen} / ${words.length}</button>
  </div></header>
  <main class="main" id="main"></main>
  <footer class="footer">影片來源：<a href="${dictionaryUrl}" target="_blank" rel="noreferrer">${dictionaryName}</a>。語序轉換是教學示意，不是逐句翻譯器。</footer>
  <nav class="nav-mob"><ul>${nav.map(([id,l])=>`<li><button type="button" data-nav="${id}" class="${isActive(id)?"active":""}">${l}</button></li>`).join("")}</ul></nav>`;
}

function pageHome() {
  const result = S.sentence.trim() ? arrange(S.sentence) : null;
  const teaching = result ? clipsFromGloss(result.gloss) : [];
  const film = result?.dictionary ? [{key:result.dictionary.id,src:sentenceVideo(result.dictionary.slug),poster:sentencePoster(result.dictionary.slug),label:result.dictionary.translation}] : [];
  const todayW = wordOfDay();
  const showFilm = S.mode==="film" && film.length;
  const clips = result ? (showFilm ? film : teaching) : [{key:todayW.zh,src:wordVideo(todayW.zh)||"",poster:wordPoster(todayW.zh)||"",label:todayW.zh,note:todayW.gloss}];
  const pid = result ? `h:${S.sentence}:${showFilm?"f":"w"}` : `today:${todayW.zh}`;
  const nextL = lessons.find(l=>!P.lessonDone.includes(l.id)) || lessons[0];
  const featured = featuredIds.map(id=>sentences.find(s=>s.id===id)).filter(Boolean);
  return `<div class="stack gap-lg">
    <header class="hero">
      <p class="eyebrow">TAIWAN SIGN LANGUAGE</p>
      <h1>把中文，排成手語。</h1>
      <p class="lead">常見順序是時間、人物、地點與物品，最後才是動作與疑問。有辭典影片時，舞台會先放真正的打法。</p>
      <div class="pills">
        <span class="pill">已看 ${Object.keys(P.viewed).length} / ${words.length}</span>
        <span class="pill">課程 ${P.lessonDone.length} / ${lessons.length}</span>
        ${P.streak?`<span class="pill accent">連續 ${P.streak} 天</span>`:""}
      </div>
    </header>
    <div class="grid-studio">
      <form class="card area-composer" id="compose-form">
        <div class="row" style="flex-wrap:nowrap;gap:.75rem">
          <input class="input" id="sentence-input" value="${esc(S.draft)}" placeholder="輸入中文句子，例如：明天我去學校" />
          <button class="btn btn-primary" type="submit" style="flex-shrink:0">轉換</button>
        </div>
        <div class="row mt-4">${prompts.map(p=>`<button type="button" class="btn btn-outline btn-chip" data-prompt="${esc(p)}">${esc(p)}</button>`).join("")}</div>
        ${P.recent.length?`<div class="row mt-3">${P.recent.map(r=>`<button type="button" class="btn btn-ghost btn-chip" data-prompt="${esc(r)}">${esc(r)}</button>`).join("")}</div>`:""}
      </form>
      <div class="area-stage">
        ${stageHTML(pid, clips)}
        ${result?`<div class="row mt-3">
          <button type="button" class="btn ${showFilm?"btn-outline":"btn-primary"}" data-mode="words">依序播放教學語序</button>
          ${film.length?`<button type="button" class="btn ${showFilm?"btn-primary":"btn-outline"}" data-mode="film">辭典整句</button>`:""}
        </div>`:""}
      </div>
      <section class="card area-analysis stack">
        ${result?`
          <div class="stack gap-sm"><div class="row" style="justify-content:space-between"><h2>原句拆解</h2>${legendHTML()}</div>${tokensHTML(result.original)}</div>
          <div class="stack gap-sm"><h2>教學語序</h2>${tokensHTML(result.gloss,true)}</div>
          <div class="stack gap-sm"><div class="row" style="justify-content:space-between"><h3>語序軸</h3><span class="subtle">時間 → 人物 → 地點／物品 → 動作 → 疑問</span></div>${axisHTML(result.gloss)}</div>
          <ul class="rules">${result.rules.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>
          ${result.dictionary?`<div class="banner"><div style="font-weight:500">這句對得上辭典例句</div><div class="ink">辭典語序：${esc(result.dictionary.gloss.join(" → "))}</div><div class="ink" style="font-size:.875rem;opacity:.85">${result.dictionary.gloss.join("→")===result.gloss.map(t=>t.text).join("→")?"和教學示意相同。":"真實語料不一定把時間放句首。看整句影片更接近課堂。"}</div></div>`
          :`<p class="muted">這句沒有完全對上辭典例句。教學語序只是示意。</p>`}
        `:`
          <h2>怎麼用這一台</h2>
          <ol class="muted" style="padding-left:1.2rem;margin:0;display:flex;flex-direction:column;gap:.5rem">
            <li>輸入一句日常中文，或點上面的例子。</li>
            <li>看虛字怎麼被拿掉，物品怎麼走到動詞前面。</li>
            <li>慢放、開鏡像，對著舞台跟著打。</li>
          </ol>
          <div class="row" style="background:var(--wash);border-radius:.75rem;padding:.75rem;gap:.75rem">
            <img src="${esc(wordPoster(todayW.zh)||"")}" alt="" style="width:4rem;height:4rem;border-radius:.5rem;object-fit:cover">
            <div><div class="subtle">今日詞彙</div><div style="font-family:var(--display);font-size:1.5rem">${esc(todayW.zh)}</div><div class="muted">${esc(todayW.gloss)}</div></div>
          </div>
        `}
      </section>
    </div>
    <section class="row" style="align-items:stretch;flex-wrap:wrap">
      <button type="button" class="card" data-open-lesson="${nextL.id}" style="flex:1;min-width:16rem;background:var(--accent);color:var(--accent-fg);text-align:left;border:0">
        <div class="subtle" style="color:color-mix(in srgb,var(--accent-fg) 80%,transparent)">${esc(nextL.kicker)}</div>
        <div style="font-family:var(--display);font-size:1.75rem;margin:.5rem 0">${esc(nextL.title)}</div>
        <div style="font-size:.875rem;opacity:.85">${esc(nextL.body)}</div>
        <div style="margin-top:1rem;font-size:.875rem">${P.lessonDone.includes(nextL.id)?"再看一次":"進入課程"} →</div>
      </button>
      <div class="card" style="flex:1.2;min-width:16rem">
        <div class="row" style="justify-content:space-between;margin-bottom:.75rem"><h2>辭典原句</h2><button type="button" class="btn btn-ghost btn-sm" data-nav="lexicon">全部例句</button></div>
        <div class="cards" style="grid-template-columns:repeat(2,1fr)">
          ${featured.map(item=>`<button type="button" class="line-card" data-prompt="${esc(item.translation)}"><div class="media"><img src="${esc(sentencePoster(item.slug))}" alt=""></div><div class="body"><div class="title" style="font-size:1rem">${esc(item.translation)}</div></div></button>`).join("")}
        </div>
      </div>
    </section>
  </div>`;
}

function pageLexicon() {
  const q = S.lexiconQuery.trim().toLowerCase();
  const filters = ["全部","收藏",...categories];
  const shown = words.filter(w=>{
    if (S.lexiconFilter==="收藏" && !P.favorites.includes(w.zh)) return false;
    if (S.lexiconFilter!=="全部" && S.lexiconFilter!=="收藏" && w.category!==S.lexiconFilter) return false;
    if (!q) return true;
    return w.zh.includes(S.lexiconQuery.trim()) || w.gloss.toLowerCase().includes(q) || w.category.includes(S.lexiconQuery.trim());
  });
  const lines = sentences.filter(s=>{
    if (!q) return true;
    return s.translation.toLowerCase().includes(q) || s.gloss.join("").includes(S.lexiconQuery.trim());
  });
  return `<div class="stack gap-lg">
    <header class="hero"><p class="eyebrow">LEXICON</p><h1>詞彙庫</h1><p class="lead">${words.length} 個常用詞、${sentences.length} 句辭典例句。</p></header>
    <div class="row">
      <div class="tabs">
        <button type="button" class="btn ${S.lexiconTab==="words"?"btn-primary":"btn-outline"}" data-lex-tab="words">詞彙</button>
        <button type="button" class="btn ${S.lexiconTab==="lines"?"btn-primary":"btn-outline"}" data-lex-tab="lines">例句</button>
      </div>
      <input class="input" style="flex:1" id="lex-q" value="${esc(S.lexiconQuery)}" placeholder="搜尋" />
    </div>
    ${S.lexiconTab==="words"?`<div class="row">${filters.map(f=>`<button type="button" class="btn btn-chip ${S.lexiconFilter===f?"btn-primary":"btn-outline"}" data-lex-filter="${esc(f)}">${esc(f)}</button>`).join("")}</div>`:""}
    ${S.lexiconTab==="words"
      ? (shown.length?`<div class="cards">${shown.map(w=>`<button type="button" class="word-card" data-open-word="${esc(w.zh)}"><div class="media"><img src="${esc(wordPoster(w.zh)||"")}" alt="">${P.viewed[w.zh]?`<span class="badge">已看過</span>`:""}</div><div class="body"><div class="row" style="justify-content:space-between"><span class="title">${esc(w.zh)}</span><span class="subtle">${esc(w.category)}</span></div><div class="muted">${esc(w.gloss)}</div></div></button>`).join("")}</div>`:`<p class="card muted" style="text-align:center;padding:3rem">找不到符合的詞彙。</p>`)
      : (lines.length?`<div class="cards">${lines.map(s=>`<button type="button" class="line-card" data-open-line="${s.id}"><div class="media"><img src="${esc(sentencePoster(s.slug))}" alt=""></div><div class="body"><div class="title">${esc(s.translation)}</div><div class="muted">${esc(s.gloss.join(" → "))}</div></div></button>`).join("")}</div>`:`<p class="card muted" style="text-align:center;padding:3rem">找不到符合的例句。</p>`)
    }
  </div>`;
}

function pageLessons() {
  return `<div class="stack gap-lg">
    <header class="hero"><p class="eyebrow">${lessons.length} LESSONS</p><h1>${lessons.length} 堂入門課</h1><p class="lead">從時間詞走到完整句與辭典對照。</p>
      <p class="muted">進度 ${P.lessonDone.length} / ${lessons.length}${P.lessonDone.length?` · ${Math.round(P.lessonDone.length/lessons.length*100)}%`:""}</p></header>
    ${progressPanelHTML()}
    <div class="lesson-path">${lessons.map((l,i)=>{
      const done=P.lessonDone.includes(l.id);
      const next=lessons.find(x=>!P.lessonDone.includes(x.id));
      const cur=next?.id===l.id;
      return `<div class="lesson-item"><div class="lesson-rail"><div class="lesson-dot ${done?"done":cur?"current":""}">${done?"✓":i+1}</div>${i<lessons.length-1?`<div class="lesson-line"></div>`:""}</div>
        <button type="button" class="lesson-card" data-open-lesson="${l.id}"><span><span class="subtle">${esc(l.kicker)}</span><span style="display:block;font-family:var(--display);font-size:1.5rem;margin-top:.25rem">${esc(l.title)}</span><span class="muted" style="display:block">${esc(l.words.join("、"))}</span></span><span class="muted">${done?"再看一次":cur?"開始":"進入"}</span></button></div>`;
    }).join("")}</div>
  </div>`;
}

function pageLesson() {
  const lesson = lessons.find(l=>l.id===S.lessonId);
  if (!lesson) return `<p>找不到這一課。<button class="btn btn-primary" data-nav="lessons">回到課程</button></p>`;
  const step = S.lessonStep;
  const phase = step < lesson.words.length ? "words" : step === lesson.words.length ? "sentence" : "quiz";
  const order = arrange(lesson.sentence);
  let body="";
  if (phase==="words") {
    const zh=lesson.words[step];
    body=`<div class="row" style="align-items:start;flex-wrap:wrap">
      <div class="stack" style="flex:1;min-width:16rem">${stageHTML(`lw:${lesson.id}:${zh}`,[{key:zh,src:wordVideo(zh)||"",poster:wordPoster(zh)||"",label:zh}])}
        <p class="muted">${esc(byZh[zh]?.gloss||"")}</p>
        <button type="button" class="btn btn-primary" data-lesson-next>${step+1===lesson.words.length?"看這句怎麼排":"下一個"} →</button>
      </div>
      <div class="stack gap-sm" style="width:min(18rem,100%)">${lesson.words.map((w,i)=>`<button type="button" class="btn ${i===step?"btn-outline":"btn-ghost"}" data-lesson-word="${i}" style="justify-content:flex-start"><img src="${esc(wordPoster(w)||"")}" alt="" style="width:3rem;height:3rem;border-radius:.5rem;object-fit:cover"> <span style="font-family:var(--display)">${esc(w)}</span></button>`).join("")}</div>
    </div>`;
  } else if (phase==="sentence") {
    body=`<div class="row" style="align-items:start;flex-wrap:wrap">
      <div class="card stack" style="flex:1;min-width:16rem">
        <p style="font-family:var(--display);font-size:1.5rem">「${esc(lesson.sentence)}」</p>
        ${tokensHTML(order.original)}${tokensHTML(order.gloss,true)}${axisHTML(order.gloss)}
        <ul class="rules">${order.rules.map(r=>`<li>${esc(r)}</li>`).join("")}</ul>
        <button type="button" class="btn btn-primary" data-lesson-quiz>小測驗 →</button>
      </div>
      <div style="flex:1;min-width:16rem">${stageHTML(`ls:${lesson.id}`, clipsFromGloss(order.gloss))}</div>
    </div>`;
  } else {
    if (!S.lessonQuiz) {
      const picks=shuffle([...lesson.words]).slice(0,Math.min(3,lesson.words.length));
      const pool=lessons.flatMap(l=>l.words);
      S.lessonQuiz={questions:picks.map(a=>({answer:a,options:choiceOptions(a,pool)})),index:0,score:0,picked:null,finished:false};
    }
    const qz=S.lessonQuiz;
    if (qz.finished) {
      const need=Math.ceil((qz.questions.length*2)/3);
      const passed=qz.score>=need;
      const next=lessons[lessons.findIndex(l=>l.id===lesson.id)+1];
      body=`<div class="card stack"><h2>${qz.score} / ${qz.questions.length}</h2>
        <p class="muted">${passed?"這一課可以記為完成。":"先再看一次詞彙，答對三分之二再記完成。"}</p>
        <div class="row">${passed&&next?`<button type="button" class="btn btn-primary" data-open-lesson="${next.id}">下一課 →</button>`:""}
          ${passed&&!next?`<button type="button" class="btn btn-primary" data-nav="practice">去練習場</button>`:""}
          ${!passed?`<button type="button" class="btn btn-primary" data-lesson-quiz-retry>再測一次</button>`:""}
          <button type="button" class="btn btn-outline" data-nav="lessons">課程列表</button></div></div>`;
    } else {
      const q=qz.questions[qz.index];
      body=`<div class="card stack"><p class="muted">小測驗 ${qz.index+1} / ${qz.questions.length}</p>
        ${stageHTML(`lq:${lesson.id}:${qz.index}`,[{key:q.answer,src:wordVideo(q.answer)||"",poster:wordPoster(q.answer)||"",label:qz.picked?q.answer:"這是什麼"}])}
        <div class="grid-2">${q.options.map(o=>{
          let cls="btn btn-outline";
          if(qz.picked){ if(o===q.answer) cls+=" btn-good"; else if(o===qz.picked) cls+=" btn-bad"; }
          return `<button type="button" class="${cls}" data-quiz-opt="${esc(o)}" ${qz.picked?"disabled":""}>${esc(o)}</button>`;
        }).join("")}</div>
        ${qz.picked?`<div class="row" style="justify-content:space-between"><p class="muted">${qz.picked===q.answer?"答對了。":`正確答案是「${esc(q.answer)}」。`}</p><button type="button" class="btn btn-primary" data-quiz-next>${qz.index+1===qz.questions.length?"看結果":"下一題"}</button></div>`:""}
      </div>`;
    }
  }
  return `<div class="stack gap-lg">
    <div class="row" style="justify-content:space-between"><button type="button" class="btn btn-ghost" data-nav="lessons">← 課程</button><span class="subtle">${esc(lesson.kicker)}</span></div>
    <header class="hero"><h1>${esc(lesson.title)}</h1><p class="lead">${esc(lesson.body)}</p>
      ${P.lessonDone.includes(lesson.id)?`<p style="color:var(--good);font-size:.875rem">這一課已完成。</p>`:""}</header>
    <p class="subtle">${phase==="words"?`詞彙 ${step+1}/${lesson.words.length}`:phase==="sentence"?"語序示範":"小測驗"}</p>
    ${body}
  </div>`;
}

function pickFlash(exclude) {
  const now=Date.now(), pool=words.filter(w=>w.zh!==exclude);
  const due=pool.filter(w=>P.reviews[w.zh]&&P.reviews[w.zh].due<=now);
  if(due.length) return {word:due[Math.floor(Math.random()*due.length)],reason:"到期複習"};
  const fresh=pool.filter(w=>!P.viewed[w.zh]);
  if(fresh.length) return {word:fresh[Math.floor(Math.random()*fresh.length)],reason:"新詞"};
  return {word:pool[Math.floor(Math.random()*pool.length)],reason:"再認一次"};
}

function pagePractice() {
  if (S.practiceTab==="meaning" && !S.meaning) {
    const word=words[Math.floor(Math.random()*words.length)];
    S.meaning={word, options:choiceOptions(word.zh, words.map(w=>w.zh)), picked:null};
  }
  if (S.practiceTab==="order" && !S.order) {
    const s=sentences[Math.floor(Math.random()*sentences.length)];
    S.order={sentence:s, placed:[], bank:shuffle(s.gloss), checked:false, correct:false, hint:""};
  }
  if (S.practiceTab==="flash" && !S.flash) {
    S.flash={...pickFlash(), side:"sign", phase:"prompt"};
  }
  const due=dueCount();
  let body="";
  if (S.practiceTab==="meaning") {
    const m=S.meaning;
    body=`<div class="card stack"><p class="muted">這個手語是什麼意思？</p>
      ${stageHTML(`pm:${m.word.zh}`,[{key:m.word.zh,src:wordVideo(m.word.zh)||"",poster:wordPoster(m.word.zh)||"",label:m.picked?m.word.zh:"這是什麼"}])}
      <div class="grid-2">${m.options.map(o=>{
        let cls="btn btn-outline"; if(m.picked){ if(o===m.word.zh) cls+=" btn-good"; else if(o===m.picked) cls+=" btn-bad"; }
        return `<button type="button" class="${cls}" data-mean-opt="${esc(o)}" ${m.picked?"disabled":""}>${esc(o)}</button>`;
      }).join("")}</div>
      ${m.picked?`<div class="row" style="justify-content:space-between"><p class="muted">${m.picked===m.word.zh?"答對了。":`正確答案是「${esc(m.word.zh)}」。`}</p><button type="button" class="btn btn-primary" data-mean-next>下一題</button></div>`:""}
    </div>`;
  } else if (S.practiceTab==="order") {
    const o=S.order;
    body=`<div class="card stack"><p class="muted">把這句排成辭典語序。點下方加入，點已加入可退回。</p>
      <p style="font-family:var(--display);font-size:1.5rem">「${esc(o.sentence.translation)}」</p>
      <div class="bank">${o.placed.length?o.placed.map((t,i)=>`<button type="button" class="bank-item placed" data-unplace="${i}" ${o.checked?"disabled":""}>${esc(t)}</button>`).join(""):`<span class="subtle">語序放這裡</span>`}</div>
      <div class="row">${o.bank.map((t,i)=>`<button type="button" class="bank-item" data-place="${i}" ${o.checked?"disabled":""}>${esc(t)}</button>`).join("")}</div>
      <div class="row">
        <button type="button" class="btn btn-primary" data-order-check ${o.checked||o.bank.length?"disabled":""}>檢查答案</button>
        <button type="button" class="btn btn-outline" data-order-reset ${o.checked?"disabled":""}>重來</button>
        <button type="button" class="btn btn-ghost" data-order-hint ${o.checked?"disabled":""}>提示</button>
      </div>
      ${o.hint&&!o.checked?`<p class="muted">${esc(o.hint)}</p>`:""}
      ${o.checked?`<div class="stack"><p class="muted" style="${o.correct?"color:var(--good)":""}">${o.correct?"和辭典語序一致。":`辭典語序：${esc(o.sentence.gloss.join(" → "))}。`}</p>
        ${stageHTML(`po:${o.sentence.id}`,[{key:o.sentence.id,src:sentenceVideo(o.sentence.slug),poster:sentencePoster(o.sentence.slug),label:o.sentence.translation}])}
        <button type="button" class="btn btn-primary" data-order-next>下一題</button></div>`:""}
    </div>`;
  } else {
    const f=S.flash; const video=wordVideo(f.word.zh);
    body=`<div class="card stack">
      <div class="row">
        <button type="button" class="btn btn-chip ${f.side==="sign"?"btn-primary":"btn-outline"}" data-flash-side="sign">看手勢想意思</button>
        <button type="button" class="btn btn-chip ${f.side==="word"?"btn-primary":"btn-outline"}" data-flash-side="word">看字回想手勢</button>
        <span class="subtle">${esc(f.reason)}</span>
      </div>
      ${f.side==="sign"&&video
        ? stageHTML(`pf:${f.word.zh}`,[{key:f.word.zh,src:video,poster:wordPoster(f.word.zh)||"",label:f.phase==="answer"?f.word.zh:"手勢"}])
        : `<div class="stage-empty" style="background:var(--wash);border-radius:1rem;color:var(--ink)"><div class="big">${esc(f.word.zh)}</div></div>`}
      ${f.phase==="prompt"
        ? `<button type="button" class="btn btn-primary" data-flash-reveal>${f.side==="sign"?"顯示意思":"看手勢"}</button>`
        : `<div class="stack">${f.side==="sign"?`<p style="font-family:var(--display);font-size:2rem">${esc(f.word.zh)}</p>`
          :(video?stageHTML(`pfr:${f.word.zh}`,[{key:f.word.zh,src:video,poster:wordPoster(f.word.zh)||"",label:f.word.zh}]):"")}
          <p class="muted">${esc(f.word.category)} · ${esc(f.word.gloss)}</p>
          <div class="row"><button type="button" class="btn btn-outline" data-flash-grade="0">再練</button>
          <button type="button" class="btn btn-primary" data-flash-grade="1">記得了</button></div></div>`}
    </div>`;
  }
  const sum = progressSummary();
  return `<div class="stack gap-lg">
    <header class="hero"><p class="eyebrow">DRILL</p><h1>練習場</h1>
      <p class="lead">認詞、排語序、閃卡間隔複習。進度可匯出備份或換裝置後匯入。</p>
      <p class="muted">答對 ${P.quizCorrect}/${P.quizTotal}${P.quizTotal?` · ${sum.pct}%`:""}${P.streak?` · 連續 ${P.streak} 天`:""}${due?` · ${due} 個到期`:""}</p>
    </header>
    ${progressPanelHTML()}
    <div class="tabs">
      <button type="button" class="btn ${S.practiceTab==="meaning"?"btn-primary":"btn-outline"}" data-prac-tab="meaning">看影片選意思</button>
      <button type="button" class="btn ${S.practiceTab==="order"?"btn-primary":"btn-outline"}" data-prac-tab="order">排列語序</button>
      <button type="button" class="btn ${S.practiceTab==="flash"?"btn-primary":"btn-outline"}" data-prac-tab="flash">閃卡複習</button>
    </div>
    ${body}
  </div>`;
}

function pageSongs() {
  const yt = song.youtube || "https://youtu.be/ZaTyHFcoYXw?si=5zT9YaB8EpRHp_V4";
  return `<div class="stack gap-lg" style="max-width:48rem;margin:0 auto">
    <header class="hero"><p class="eyebrow">SIGN LANGUAGE SONG</p><h1>手語歌曲</h1>
      <p class="lead">前往公開影片練習手語歌曲（僅使用可公開分享的連結）。</p></header>
    <div class="card stack gap-sm" style="text-align:center;padding:2rem 1.25rem">
      <h2 style="margin:0">公開手語歌曲示範</h2>
      <p class="muted">在 YouTube 觀看與練習。本應用不內嵌受著作權限制的歌曲檔案。</p>
      <div class="row" style="justify-content:center;margin-top:.5rem">
        <a class="btn btn-primary" href="${esc(yt)}" target="_blank" rel="noopener noreferrer">在 YouTube 公開觀看</a>
      </div>
    </div>
  </div>`;
}

function dialogHTML() {
  if (!S.dialog) return "";
  if (S.dialog.type==="word") {
    const w=byZh[S.dialog.zh]; if(!w) return "";
    const related=sentencesFor(w.zh);
    return `<div class="dialog-backdrop" data-close-dialog><div class="dialog" role="dialog" onclick="event.stopPropagation()">
      <div class="dialog-head"><div><div class="subtle">${esc(w.category)}</div><h2>${esc(w.zh)}</h2></div>
        <button type="button" class="btn btn-ghost btn-icon" data-close-dialog>✕</button></div>
      ${stageHTML(`dw:${w.zh}`,[{key:w.zh,src:wordVideo(w.zh)||"",poster:wordPoster(w.zh)||"",label:w.zh}])}
      <div class="row mt-4" style="justify-content:space-between"><p class="muted">${esc(w.gloss)}${w.note?` · ${esc(w.note)}`:""}</p>
        <button type="button" class="btn btn-outline" data-fav="${esc(w.zh)}">${P.favorites.includes(w.zh)?"已收藏":"收藏"}</button></div>
      <h3 class="mt-4">辭典例句</h3>
      ${related.length?related.map(s=>`<button type="button" class="btn btn-ghost" style="width:100%;justify-content:flex-start" data-open-line="${s.id}"><div><div>${esc(s.translation)}</div><div class="muted">${esc(s.gloss.join(" → "))}</div></div></button>`).join(""):`<p class="muted">這個詞目前沒有附上例句影片。</p>`}
      <button type="button" class="btn btn-ghost mt-3" data-prompt="${esc(w.zh)}">把「${esc(w.zh)}」放進語序台</button>
    </div></div>`;
  }
  if (S.dialog.type==="line") {
    const s=sentences.find(x=>x.id===S.dialog.id); if(!s) return "";
    return `<div class="dialog-backdrop" data-close-dialog><div class="dialog" role="dialog" onclick="event.stopPropagation()">
      <div class="dialog-head"><div><div class="subtle">辭典例句</div><h2>${esc(s.translation)}</h2></div>
        <button type="button" class="btn btn-ghost btn-icon" data-close-dialog>✕</button></div>
      ${stageHTML(`dl:${s.id}`,[{key:s.id,src:sentenceVideo(s.slug),poster:sentencePoster(s.slug),label:s.translation}])}
      <p class="muted mt-3">辭典語序：${esc(s.gloss.join(" → "))}</p>
      <button type="button" class="btn btn-ghost mt-3" data-prompt="${esc(s.translation)}">用教學規則重排這句</button>
    </div></div>`;
  }
  return "";
}

function commit(text) {
  const v=text.trim(); if(!v) return;
  const next=arrange(v);
  S.draft=v; S.sentence=v; S.mode=next.dictionary?"film":"words";
  remember(v); S.route="home"; S.dialog=null; render();
  setTimeout(()=>document.querySelector('[data-act="play"]')?.click(), 80);
}

function render() {
  stageStore.clear();
  app.innerHTML = `<div class="app">${chrome()}<div id="dlg"></div></div>`;
  const main = $("#main");
  main.innerHTML =
    S.route==="home" ? pageHome() :
    S.route==="lexicon" ? pageLexicon() :
    S.route==="lessons" ? pageLessons() :
    S.route==="lesson" ? pageLesson() :
    S.route==="practice" ? pagePractice() :
    S.route==="songs" ? pageSongs() : "";
  if (S.dialog) $("#dlg").innerHTML = dialogHTML();
  $$("[data-stage]", app).forEach(bindStage);
  wire(app);
}

function wire(root) {
  root.addEventListener("click", e => {
    const t = e.target.closest("[data-nav],[data-prompt],[data-mode],[data-tok],[data-open-word],[data-open-line],[data-open-lesson],[data-lex-tab],[data-lex-filter],[data-prac-tab],[data-close-dialog],[data-fav],[data-lesson-next],[data-lesson-word],[data-lesson-quiz],[data-lesson-quiz-retry],[data-quiz-opt],[data-quiz-next],[data-mean-opt],[data-mean-next],[data-place],[data-unplace],[data-order-check],[data-order-reset],[data-order-hint],[data-order-next],[data-flash-side],[data-flash-reveal],[data-flash-grade],[data-export-progress],[data-import-progress],[data-reset-progress]");
    if (!t) return;
    if (t.dataset.exportProgress != null) { exportProgress(t.dataset.exportProgress || "json"); return; }
    if (t.dataset.importProgress != null) { $("#progress-file")?.click(); return; }
    if (t.dataset.resetProgress != null) { resetProgress(); return; }
    if (t.dataset.nav) { S.route=t.dataset.nav; if(t.dataset.nav==="lessons") S.lessonId=null; S.dialog=null; render(); return; }
    if (t.dataset.prompt != null) { commit(t.dataset.prompt); return; }
    if (t.dataset.mode) { S.mode=t.dataset.mode; render(); setTimeout(()=>document.querySelector('[data-act="play"]')?.click(),80); return; }
    if (t.dataset.tok != null) {
      S.mode="words"; render();
      setTimeout(()=>{ const b=document.querySelector(`.filmstrip [data-clip="${t.dataset.tok}"]`); (b||document.querySelector('[data-act="play"]'))?.click(); },80);
      return;
    }
    if (t.dataset.openWord) { S.dialog={type:"word",zh:t.dataset.openWord}; render(); return; }
    if (t.dataset.openLine) { S.dialog={type:"line",id:t.dataset.openLine}; render(); return; }
    if (t.dataset.openLesson) { S.route="lesson"; S.lessonId=t.dataset.openLesson; S.lessonStep=0; S.lessonQuiz=null; S.dialog=null; render(); return; }
    if (t.dataset.lexTab) { S.lexiconTab=t.dataset.lexTab; render(); return; }
    if (t.dataset.lexFilter) { S.lexiconFilter=t.dataset.lexFilter; render(); return; }
    if (t.dataset.pracTab) { S.practiceTab=t.dataset.pracTab; S.meaning=null; S.order=null; S.flash=null; render(); return; }
    if (t.dataset.closeDialog != null) { S.dialog=null; render(); return; }
    if (t.dataset.fav) { toggleFav(t.dataset.fav); render(); return; }
    if (t.dataset.lessonNext != null) {
      const L=lessons.find(l=>l.id===S.lessonId); const zh=L?.words[S.lessonStep]; if(zh) markViewed(zh);
      S.lessonStep++; render(); return;
    }
    if (t.dataset.lessonWord != null) { S.lessonStep=+t.dataset.lessonWord; render(); return; }
    if (t.dataset.lessonQuiz != null) { const L=lessons.find(l=>l.id===S.lessonId); S.lessonStep=(L?.words.length||0)+1; S.lessonQuiz=null; render(); return; }
    if (t.dataset.lessonQuizRetry != null) { S.lessonQuiz=null; render(); return; }
    if (t.dataset.quizOpt) {
      const qz=S.lessonQuiz; if(!qz||qz.picked) return;
      const q=qz.questions[qz.index]; qz.picked=t.dataset.quizOpt;
      const ok=qz.picked===q.answer; if(ok) qz.score++; grade(q.answer,ok); render(); return;
    }
    if (t.dataset.quizNext != null) {
      const qz=S.lessonQuiz; if(!qz) return;
      if (qz.index+1>=qz.questions.length) {
        if (qz.score >= Math.ceil((qz.questions.length*2)/3)) completeLesson(S.lessonId);
        qz.finished=true;
      } else { qz.index++; qz.picked=null; }
      render(); return;
    }
    if (t.dataset.meanOpt) {
      const m=S.meaning; if(!m||m.picked) return;
      m.picked=t.dataset.meanOpt; grade(m.word.zh, m.picked===m.word.zh); render(); return;
    }
    if (t.dataset.meanNext != null) { S.meaning=null; render(); return; }
    if (t.dataset.place != null) { const o=S.order; const [tok]=o.bank.splice(+t.dataset.place,1); o.placed.push(tok); render(); return; }
    if (t.dataset.unplace != null) { const o=S.order; const [tok]=o.placed.splice(+t.dataset.unplace,1); o.bank.push(tok); render(); return; }
    if (t.dataset.orderCheck != null) {
      const o=S.order; o.checked=true; o.correct=o.placed.join("\u0000")===o.sentence.gloss.join("\u0000"); recordQuiz(o.correct); render(); return;
    }
    if (t.dataset.orderReset != null) { const o=S.order; o.placed=[]; o.bank=shuffle(o.sentence.gloss); o.hint=""; render(); return; }
    if (t.dataset.orderHint != null) {
      const o=S.order; const same=o.placed.every((tok,i)=>tok===o.sentence.gloss[i]);
      o.hint=same?`下一個是「${o.sentence.gloss[o.placed.length]||""}」。`:`開頭不對。辭典從「${o.sentence.gloss[0]}」排起。`; render(); return;
    }
    if (t.dataset.orderNext != null) {
      const pool=sentences.filter(s=>s.id!==S.order.sentence.id);
      const next=pool[Math.floor(Math.random()*pool.length)]||S.order.sentence;
      S.order={sentence:next,placed:[],bank:shuffle(next.gloss),checked:false,correct:false,hint:""}; render(); return;
    }
    if (t.dataset.flashSide) { S.flash.side=t.dataset.flashSide; S.flash.phase="prompt"; render(); return; }
    if (t.dataset.flashReveal != null) { markViewed(S.flash.word.zh); S.flash.phase="answer"; render(); return; }
    if (t.dataset.flashGrade != null) {
      grade(S.flash.word.zh, t.dataset.flashGrade==="1");
      S.flash={...pickFlash(S.flash.word.zh), side:S.flash.side, phase:"prompt"}; render(); return;
    }
  });
  $("#compose-form", root)?.addEventListener("submit", e => {
    e.preventDefault(); commit($("#sentence-input", root)?.value || S.draft);
  });
  const lexQ = $("#lex-q", root);
  if (lexQ) {
    lexQ.addEventListener("input", e => {
      S.lexiconQuery = e.target.value;
      clearTimeout(lexQ._t);
      lexQ._t = setTimeout(render, 180);
    });
  }
  const fileInput = $("#progress-file", root);
  if (fileInput && !fileInput._bound) {
    fileInput._bound = true;
    fileInput.addEventListener("change", () => {
      const f = fileInput.files && fileInput.files[0];
      if (f) importProgress(f);
      fileInput.value = "";
    });
  }
}

render();
})();
