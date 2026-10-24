const L = readLetterFromUrl();
const preview = new URLSearchParams(location.search).has("preview");
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ================= Fill in the letter data =================
const monthName = MONTHS[L.month - 1].toUpperCase();
document.querySelectorAll("[data-month]").forEach((el) => (el.textContent = monthName));
document.querySelectorAll("[data-day]").forEach((el) => (el.textContent = L.day));
document.querySelectorAll("[data-to]").forEach((el) => (el.textContent = L.to));
document.querySelectorAll("[data-from]").forEach((el) => (el.textContent = L.from));
$("pillDate").textContent = `${monthName} ${L.day}` + (L.age ? ` · ${L.age} YEARS` : "");
document.title = `Happy birthday, ${L.to}!`;

const ageStr = String(L.age || "").slice(0, 2);
if (ageStr.length === 2) { $("digitL").textContent = ageStr[0]; $("digitR").textContent = ageStr[1]; }
else if (ageStr.length === 1) { $("digitL").textContent = ageStr; $("digitR").remove(); }
else { $("digitL").remove(); $("digitR").remove(); }

const candleCount = Math.max(3, Math.min(7, Number(L.age) ? Math.round(L.age / 5) : 5));

// ================= Intro =================
$("startBtn").addEventListener("click", () => {
  $("intro").classList.add("gone");
  document.body.classList.add("started");
  setTimeout(() => burst(innerWidth / 2, innerHeight * .35, 140), 400);
  ambient();
});

// ================= Party page =================
const words = ["amazing", "kind", "beautiful", "funny", "thoughtful", "special", "brave", "wonderful", "loved"];
let wi = 0;
setInterval(() => {
  const el = $("word");
  el.classList.add("out");
  setTimeout(() => { wi = (wi + 1) % words.length; el.textContent = words[wi]; el.classList.remove("out"); }, 350);
}, 2200);

const homeCake = makeCake($("homeCake"), { candles: candleCount });
homeCake.enableDrag($("stage"));
addEventListener("keydown", (e) => {
  if (!$("gallery").hidden) return;
  if (e.key === "ArrowLeft") homeCake.vel = -0.08;
  if (e.key === "ArrowRight") homeCake.vel = 0.08;
});

let homeBlown = false;
$("blowBtn").addEventListener("click", () => {
  if (homeBlown) { homeCake.relight(); homeBlown = false; $("blowBtn").textContent = "Make a wish 🌬️"; return; }
  homeCake.blowAll(); homeBlown = true; $("blowBtn").textContent = "Relight 🕯️";
  const r = $("stage").getBoundingClientRect();
  setTimeout(() => burst(r.left + r.width / 2, r.top + r.height * .35, 200), 400);
  playTune();
});

const pad = (n) => String(n).padStart(2, "0");
const isUnlocked = () => !L.lock || preview || isBirthdayToday(L.month, L.day);
function tick() {
  const now = new Date();
  if (isBirthdayToday(L.month, L.day, now)) {
    $("countdown").innerHTML = '<p class="today-msg">Today is all about you 🎉</p>';
  } else {
    let diff = Math.max(0, nextBirthday(L.month, L.day, now) - now);
    const d = Math.floor(diff / 864e5); diff -= d * 864e5;
    const h = Math.floor(diff / 36e5); diff -= h * 36e5;
    const m = Math.floor(diff / 6e4); diff -= m * 6e4;
    $("cdD").textContent = pad(d); $("cdH").textContent = pad(h);
    $("cdM").textContent = pad(m); $("cdS").textContent = pad(Math.floor(diff / 1e3));
  }
  const unlocked = isUnlocked();
  $("giftBtn").classList.toggle("locked", !unlocked);
  $("giftBtn").textContent = unlocked ? "🎁 Open your gift" : "🔒 Opens on your birthday";
}
tick();
setInterval(tick, 1000);

$("giftBtn").addEventListener("click", () => {
  if (!isUnlocked()) {
    const btn = $("giftBtn");
    btn.classList.remove("wiggle"); void btn.offsetWidth; btn.classList.add("wiggle");
    $("lockNote").textContent = `Not yet! Good things come to those who wait. Your gift opens on ${MONTHS[L.month - 1]} ${L.day}. 💝`;
    return;
  }
  openGallery(0);
});

// ================= Popup =================
function showPop({ emoji, eyebrow, text, btn = "Close" }) {
  return new Promise((resolve) => {
    $("popEmoji").textContent = emoji;
    $("popEyebrow").textContent = eyebrow;
    $("popText").textContent = text;
    $("popBtn").textContent = btn;
    $("pop").hidden = false;
    const close = () => { $("pop").hidden = true; $("popBtn").onclick = $("pop").onclick = null; resolve(); };
    $("popBtn").onclick = close;
    $("pop").onclick = (e) => { if (e.target.id === "pop") close(); };
  });
}

// ================= Gallery =================
const has = { reasons: L.reasons?.length, chapters: L.chapters?.length, wishes: L.wishes?.length,
  moments: L.moments?.length, places: L.places?.length };
document.querySelectorAll(".scene").forEach((s) => { if (s.dataset.key in has && !has[s.dataset.key]) s.remove(); });
const scenes = [...document.querySelectorAll(".scene")];
const hooks = {};
const seen = new Set();
let cur = -1;

scenes.forEach((s, i) => {
  const d = document.createElement("button");
  d.setAttribute("aria-label", s.dataset.title);
  d.onclick = () => go(i);
  $("dots").appendChild(d);
  if (s.dataset.key !== "final") {
    const j = document.createElement("button");
    j.textContent = s.dataset.icon; j.title = s.dataset.title;
    j.onclick = () => go(i);
    $("jumpRow").appendChild(j);
  }
});

function openGallery(i) {
  $("gallery").hidden = false;
  document.body.classList.add("in-gallery");
  burst(innerWidth / 2, innerHeight * .3, 120);
  go(i, true);
}
function closeGallery() {
  if (cur >= 0) hooks[scenes[cur].dataset.key]?.leave?.();
  $("gallery").hidden = true;
  document.body.classList.remove("in-gallery");
  cur = -1;
}
$("homeBtn").onclick = closeGallery;

function go(i, force) {
  i = Math.max(0, Math.min(scenes.length - 1, i));
  if (i === cur && !force) return;
  if (cur >= 0 && cur !== i) hooks[scenes[cur].dataset.key]?.leave?.();
  cur = i;
  seen.add(i);
  scenes.forEach((s, k) => {
    s.classList.toggle("active", k === i);
    s.classList.toggle("before", k < i);
  });
  scenes[i].scrollTop = 0;
  [...$("dots").children].forEach((d, k) => { d.classList.toggle("on", k === i); d.classList.toggle("seen", seen.has(k)); });
  $("navTitle").textContent = scenes[i].dataset.title;
  $("navCount").textContent = `${i + 1}/${scenes.length}`;
  $("prevBtn").disabled = i === 0;
  $("nextBtn").disabled = i === scenes.length - 1;
  hooks[scenes[i].dataset.key]?.enter?.();
}
$("prevBtn").onclick = () => go(cur - 1);
$("nextBtn").onclick = () => go(cur + 1);
$("againBtn").onclick = () => { hooks.letter.reset(); hooks.candles.reset(); go(0); };

// swipe left/right between surprises
(() => {
  let sx = 0, sy = 0, st = 0, tracking = false;
  $("gallery").addEventListener("pointerdown", (e) => {
    tracking = !e.target.closest(".no-swipe, button, a, input, .pocket, .lc-body, .cake-host");
    sx = e.clientX; sy = e.clientY; st = Date.now();
  });
  $("gallery").addEventListener("pointerup", (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - st < 800) go(cur + (dx < 0 ? 1 : -1));
  });
})();

addEventListener("keydown", (e) => {
  if ($("gallery").hidden || !$("pop").hidden) return;
  if (scenes[cur].dataset.key === "reasons" && ["ArrowLeft", "ArrowRight", " "].includes(e.key)) return;
  if (e.key === "ArrowRight") go(cur + 1);
  if (e.key === "ArrowLeft") go(cur - 1);
  if (e.key === "Escape") closeGallery();
});

// ================= 1. Letter =================
hooks.letter = (() => {
  const scene = document.querySelector(".s-letter");
  let typed = false, timer = null;
  function open() {
    if (scene.classList.contains("open")) return;
    scene.classList.add("open");
    if (!typed) { typed = true; setTimeout(() => typeMessage(L.message), 600); }
  }
  function typeMessage(text) {
    const el = $("lcMsg");
    let i = 0;
    const step = () => {
      i++;
      el.textContent = text.slice(0, i);
      el.insertAdjacentHTML("beforeend", '<span class="caret"></span>');
      if (i < text.length) timer = setTimeout(step, text[i - 1] === "\n" ? 220 : 26);
      else { el.querySelector(".caret")?.remove(); scene.querySelector(".lc-sig").classList.add("show"); }
    };
    step();
  }
  $("wax").onclick = open;
  $("pocket").addEventListener("click", open);
  let y0 = null;
  for (const el of [$("pocket"), $("letterCard")]) {
    el.addEventListener("pointerdown", (e) => (y0 = e.clientY));
    el.addEventListener("pointermove", (e) => { if (y0 !== null && y0 - e.clientY > 40) { y0 = null; open(); } });
    el.addEventListener("pointerup", () => (y0 = null));
  }
  return {
    reset() {
      clearTimeout(timer); typed = false; $("lcMsg").textContent = "";
      scene.classList.remove("open"); scene.querySelector(".lc-sig").classList.remove("show");
    },
  };
})();

// ================= 2. Claw machine =================
if (has.reasons) hooks.reasons = (() => {
  const glass = $("glass"), claw = $("claw"), cable = $("cable"), unit = $("clawUnit");
  const reasons = L.reasons;
  const slots = [{ x: 14, b: 14 }, { x: 33, b: 14 }, { x: 52, b: 14 }, { x: 23.5, b: 54 }, { x: 42.5, b: 54 }, { x: 64, b: 14 }];
  const colors = ["#fde68a", "#fda4af", "#c4b5fd", "#a7f3d0", "#fbcfe8", "#93c5fd"];
  const icons = ["🧸", "💌", "🌷", "⭐", "🍓", "🎀"];
  let next = 0, x = 40, dir = 0, busy = false, active = false;
  const caps = [];

  function spawn(slot, k) {
    const c = document.createElement("div");
    c.className = "cap";
    c.style.setProperty("--c", colors[k % colors.length]);
    c.style.left = slot.x + "%"; c.style.bottom = slot.b + "px";
    c.textContent = icons[next % icons.length];
    c.dataset.reason = next % reasons.length;
    next++;
    glass.appendChild(c);
    return c;
  }
  slots.slice(0, Math.min(slots.length, Math.max(3, reasons.length))).forEach((s, k) => caps.push({ slot: s, el: spawn(s, k) }));

  function place() { claw.style.left = x + "%"; document.querySelector(".stick").parentElement.style.setProperty("--jx", dir); }
  place();
  (function move() {
    if (active && !busy && dir) { x = Math.max(8, Math.min(70, x + dir * 0.6)); place(); }
    requestAnimationFrame(move);
  })();

  // joystick
  const joy = $("joy"), knob = $("knob");
  let jx0 = null;
  joy.addEventListener("pointerdown", (e) => { jx0 = joy.getBoundingClientRect().left + 38; joy.setPointerCapture(e.pointerId); update(e); });
  joy.addEventListener("pointermove", (e) => jx0 !== null && update(e));
  const release = () => { jx0 = null; dir = 0; knob.style.transform = ""; place(); };
  joy.addEventListener("pointerup", release);
  joy.addEventListener("pointercancel", release);
  function update(e) {
    const dx = Math.max(-22, Math.min(22, e.clientX - jx0));
    knob.style.transform = `translateX(${dx}px)`;
    dir = Math.abs(dx) < 4 ? 0 : dx / 22;
  }
  addEventListener("keydown", (e) => {
    if (!active) return;
    if (e.key === "ArrowLeft") dir = -1;
    if (e.key === "ArrowRight") dir = 1;
    if (e.key === " ") { e.preventDefault(); grab(); }
  });
  addEventListener("keyup", (e) => { if (["ArrowLeft", "ArrowRight"].includes(e.key)) { dir = 0; place(); } });

  async function grab() {
    if (busy) return;
    busy = true; $("grabBtn").disabled = true;
    const gh = glass.clientHeight;
    // pick the capsule under the claw, preferring the top of the pile
    const target = caps.filter((c) => Math.abs(c.slot.x - x) < 9).sort((a, b) => b.slot.b - a.slot.b || Math.abs(a.slot.x - x) - Math.abs(b.slot.x - x))[0];
    const depth = target ? gh - target.slot.b - 50 - 10 - 30 : gh - 24 - 10 - 40;
    cable.style.height = depth + "px"; unit.style.top = depth + "px";
    await sleep(850);
    claw.classList.add("closed");
    await sleep(350);
    if (target) { unit.appendChild(target.el); target.el.classList.add("held"); }
    cable.style.height = ""; unit.style.top = "";
    await sleep(850);
    if (!target) { claw.classList.remove("closed"); busy = false; $("grabBtn").disabled = false; return; }
    claw.classList.add("auto"); x = 86; place();
    await sleep(950);
    claw.classList.remove("closed");
    const el = target.el;
    el.classList.remove("held"); el.classList.add("drop");
    el.style.left = "88%"; el.style.top = "30px"; el.style.bottom = "auto";
    glass.appendChild(el);
    requestAnimationFrame(() => { el.style.top = gh + "px"; el.style.opacity = "0"; });
    await sleep(500);
    const k = caps.indexOf(target);
    const idx = Number(el.dataset.reason);
    el.remove();
    caps[k] = { slot: target.slot, el: spawn(target.slot, k) };
    caps[k].el.style.opacity = 0; requestAnimationFrame(() => (caps[k].el.style.opacity = 1));
    burst(innerWidth / 2, innerHeight * .4, 70);
    await showPop({ emoji: el.textContent, eyebrow: `Reason #${idx + 1} I love you`, text: reasons[idx], btn: "Win another one" });
    x = 40; place();
    await sleep(900);
    claw.classList.remove("auto");
    busy = false; $("grabBtn").disabled = false;
  }
  $("grabBtn").onclick = grab;

  $("reasonsList").innerHTML = reasons.map((r) => `<li>${esc(r)}</li>`).join("");
  $("showAll").onclick = () => {
    const list = $("reasonsList");
    list.hidden = !list.hidden;
    $("showAll").textContent = list.hidden ? "Show all" : "Hide";
    if (!list.hidden) list.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  return { enter() { active = true; }, leave() { active = false; dir = 0; } };
})();

// ================= 3. Story book =================
if (has.chapters) hooks.chapters = (() => {
  const pages = [...L.chapters, { t: "To be continued…", x: "The best chapters haven't been written yet. I can't wait to write them with you, one happy day at a time. ♥" }];
  let p = 0, turning = false;
  function show() {
    $("pgNum").textContent = p < pages.length - 1 ? `CHAPTER ${p + 1}` : "THE NEXT CHAPTER";
    if ($("book").classList.contains("opened"))
      $("bookTip").textContent = p === pages.length - 1 ? "The end… for now ♥" : "Swipe the page or tap the arrows to keep reading";
    $("pgTitle").textContent = pages[p].t;
    $("pgText").textContent = pages[p].x;
    $("pgCount").textContent = `${p + 1} / ${pages.length}`;
    $("pgPrev").disabled = p === 0;
    $("pgNext").disabled = p === pages.length - 1;
  }
  async function turn(d) {
    const np = p + d;
    if (turning || np < 0 || np >= pages.length) return;
    turning = true;
    const page = $("page");
    page.classList.add("turn-out");
    await sleep(280);
    p = np; show();
    page.classList.remove("turn-out"); page.classList.add("turn-in");
    await sleep(320);
    page.classList.remove("turn-in");
    turning = false;
  }
  show();
  $("cover").onclick = () => { $("book").classList.add("opened"); show(); };
  $("pgPrev").onclick = () => turn(-1);
  $("pgNext").onclick = () => turn(1);
  let sx = null;
  $("page").addEventListener("pointerdown", (e) => (sx = e.clientX));
  $("page").addEventListener("pointerup", (e) => {
    if (sx === null || e.target.closest("button")) return;
    const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) > 40) turn(dx < 0 ? 1 : -1);
  });
  return {};
})();

// ================= 4. Wishes jar =================
if (has.wishes) hooks.wishes = (() => {
  const starColors = ["#fde68a", "#fbcfe8", "#fdba74", "#fef3c7", "#f9a8d4"];
  const box = $("jarStars");
  for (let k = 0; k < 22; k++) {
    const s = document.createElement("span");
    s.textContent = "★";
    s.style.setProperty("--c", starColors[k % starColors.length]);
    s.style.left = (k * 37 % 86) + "%";
    s.style.bottom = (Math.floor(k / 6) * 22 + (k * 13 % 10)) + "%";
    s.style.transform = `rotate(${k * 47 % 60 - 30}deg)`;
    s.style.animationDelay = (-k * .37) + "s";
    box.appendChild(s);
  }
  let w = 0;
  $("jar").onclick = async () => {
    const r = $("jar").getBoundingClientRect();
    const star = document.createElement("div");
    star.className = "fly-star"; star.textContent = "★";
    star.style.left = r.left + r.width / 2 + "px"; star.style.top = r.top + r.height * .45 + "px";
    document.body.appendChild(star);
    setTimeout(() => star.remove(), 1000);
    await sleep(700);
    burst(r.left + r.width / 2, r.top, 40);
    const i = w % L.wishes.length; w++;
    const left = L.wishes.length - w;
    $("jarTip").textContent = left <= 0 ? "Every wish is out and on its way to you. Tap to read them again ✨"
      : `${left} more ${left === 1 ? "wish is" : "wishes are"} waiting inside ✨`;
    await showPop({ emoji: "🌟", eyebrow: `I wish for you… (${i + 1} of ${L.wishes.length})`, text: L.wishes[i], btn: left > 0 ? "Release another wish" : "Close the jar" });
  };
  return {};
})();

// ================= 5. Photo booth =================
if (has.moments) hooks.moments = (() => {
  const shots = L.moments.slice(0, 4);
  const fills = ["linear-gradient(135deg,#fbcfe8,#c4b5fd)", "linear-gradient(135deg,#a7f3d0,#fde68a)", "linear-gradient(135deg,#fecaca,#fbcfe8)", "linear-gradient(135deg,#bfdbfe,#ddd6fe)"];
  const emojis = ["🥰", "☔", "🍝", "💞"];
  $("boothDots").innerHTML = shots.map(() => "<i></i>").join("");
  $("strip").innerHTML = shots.map((m, k) => {
    const bg = m.img ? `background-image:url('${encodeURI(m.img)}')` : `background:${fills[k % 4]}`;
    return `<figure><div class="frame" style="${bg}">${m.img ? "" : emojis[k % 4]}</div><figcaption>${esc(m.c)}</figcaption></figure>`;
  }).join("");
  let running = false;
  $("snapBtn").onclick = async () => {
    if (running) return;
    running = true; $("snapBtn").disabled = true;
    const booth = $("booth"), strip = $("strip"), dots = $("boothDots").children;
    strip.classList.remove("out"); strip.parentElement.classList.remove("show"); [...dots].forEach((d) => d.classList.remove("on"));
    booth.classList.add("open");
    await sleep(900);
    for (let k = 0; k < shots.length; k++) {
      for (const n of ["3", "2", "1"]) { $("count").textContent = n; await sleep(k ? 260 : 500); }
      $("count").textContent = "";
      $("flash").classList.remove("go"); void $("flash").offsetWidth; $("flash").classList.add("go");
      dots[k].classList.add("on");
      await sleep(350);
    }
    booth.classList.remove("open");
    await sleep(500);
    strip.parentElement.classList.add("show");
    await sleep(30);
    strip.classList.add("out");
    setTimeout(() => strip.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    $("snapBtn").textContent = "One more time 📸";
    running = false; $("snapBtn").disabled = false;
  };
  return {};
})();

// ================= 6. Places =================
if (has.places) hooks.places = (() => {
  const route = document.getElementById("route");
  const len = route.getTotalLength();
  const n = L.places.length;
  $("placesList").innerHTML = L.places.map((p, k) =>
    `<li><button data-k="${k}"><span class="n">${k + 1}</span><b>${esc(p.n)}</b><small>${esc(p.d || "")}</small></button></li>`).join("");
  function select(k) {
    const pt = route.getPointAtLength(n === 1 ? len / 2 : len * k / (n - 1));
    $("pin").style.left = pt.x / 300 * 100 + "%";
    $("pin").style.top = pt.y / 200 * 100 + "%";
    const sp = $("pin").firstElementChild;
    sp.style.animation = "none"; void sp.offsetWidth; sp.style.animation = "";
    $("placesList").querySelectorAll("button").forEach((b) => b.classList.toggle("on", Number(b.dataset.k) === k));
  }
  $("placesList").onclick = (e) => { const b = e.target.closest("button"); if (b) select(Number(b.dataset.k)); };
  select(0);
  return {};
})();

// ================= Candles (shown first) =================
hooks.candles = (() => {
  const scene = document.querySelector(".s-candles");
  const cake = makeCake($("bigCake"), { candles: candleCount, speed: 0.002 });
  cake.enableDrag($("bigCake"));
  const minis = $("miniCandles");
  minis.innerHTML = cake.candles.map((_, k) => `<i style="--c:${CANDLE_COLORS[k % CANDLE_COLORS.length]}"></i>`).join("");
  let mic = null, holdTimer = null, done = false;

  function sync() { [...minis.children].forEach((m, k) => m.classList.toggle("out", cake.candles[k].el.classList.contains("out"))); }
  function blowOne() {
    if (done) return;
    const left = cake.blowOne(); sync();
    if (left === 0) finish();
  }
  async function finish() {
    done = true;
    stopMic(); stopHold();
    scene.classList.add("wished");
    $("candleEyebrow").textContent = "Wish made ✨";
    $("candleNote").textContent = "Your wish is on its way. Shh… don't tell anyone, or it won't come true. Tap › for your next surprise.";
    $("micBtn").hidden = true;
    $("holdBtn").textContent = "↻ Relight";
    await sleep(600);
    burst(innerWidth / 2, innerHeight * .3, 220);
    playTune();
    await sleep(2200);
    scene.classList.remove("wished");
  }
  function relight() {
    done = false; cake.relight(); sync();
    $("candleEyebrow").textContent = "Make a wish";
    $("micBtn").hidden = false; $("holdBtn").textContent = "🌬️ Hold";
    $("candleNote").textContent = "Got your wish? Now blow gently into your microphone, or press and hold the button. The microphone only listens for your breath, right here on your phone. Nothing is recorded.";
  }

  // hold to blow
  function startHold(e) {
    if (done) { relight(); return; }
    e?.preventDefault();
    $("holdBtn").classList.add("holding");
    blowOne();
    holdTimer = setInterval(blowOne, 320);
  }
  function stopHold() { clearInterval(holdTimer); holdTimer = null; $("holdBtn").classList.remove("holding"); }
  $("holdBtn").addEventListener("pointerdown", startHold);
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => $("holdBtn").addEventListener(ev, stopHold));
  addEventListener("keydown", (e) => { if (e.key === " " && scenes[cur]?.dataset.key === "candles" && !holdTimer && !e.repeat) startHold(e); });
  addEventListener("keyup", (e) => { if (e.key === " ") stopHold(); });

  // microphone: listens for the loud, noisy sound of a breath; nothing is stored
  async function startMic() {
    if (mic) return stopMic();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const an = ac.createAnalyser(); an.fftSize = 1024;
      ac.createMediaStreamSource(stream).connect(an);
      const buf = new Float32Array(an.fftSize);
      let blowing = 0, raf;
      mic = { stream, ac, stop() { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); ac.close(); } };
      $("micMeter").hidden = false; $("micBtn").textContent = "⏹ Stop mic";
      $("candleNote").textContent = "Listening… take a deep breath and blow!";
      const loop = () => {
        an.getFloatTimeDomainData(buf);
        let sum = 0; for (const v of buf) sum += v * v;
        const rms = Math.sqrt(sum / buf.length);
        $("micMeter").firstElementChild.style.width = Math.min(100, rms * 400) + "%";
        if (rms > 0.08) { blowing++; if (blowing % 12 === 0) blowOne(); } else blowing = Math.max(0, blowing - 1);
        raf = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      $("candleNote").textContent = "No microphone? No problem. Press and hold the Hold button to blow instead.";
    }
  }
  function stopMic() {
    mic?.stop(); mic = null;
    $("micMeter").hidden = true; $("micBtn").textContent = "🎙️ Microphone";
  }
  $("micBtn").onclick = startMic;
  return { leave() { stopMic(); stopHold(); }, reset() { stopMic(); stopHold(); relight(); } };
})();

// ================= 10. Final =================
makeCake($("finalCake"), { candles: candleCount, speed: 0.006 });

// ================= Confetti =================
const cv = $("confetti"), ctx = cv.getContext("2d");
let parts = [];
function resize() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
resize(); addEventListener("resize", resize);
const confColors = ["#f472b6", "#e11d63", "#fbbf24", "#a78bfa", "#60a5fa", "#34d399", "#fff"];
function burst(x, y, n) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let k = 0; k < n; k++) {
    const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
    parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 5, r: 4 + Math.random() * 5,
      c: confColors[k % confColors.length], rot: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 1, shape: k % 3 });
  }
}
function ambient() {
  setInterval(() => {
    if (parts.length > 160 || !$("gallery").hidden) return;
    parts.push({ x: Math.random() * innerWidth, y: -10, vx: Math.random() - .5, vy: 1 + Math.random(), r: 3 + Math.random() * 3,
      c: confColors[Math.floor(Math.random() * confColors.length)], rot: 0, vr: (Math.random() - .5) * .1, life: 1, shape: 1, slow: true });
  }, 320);
}
(function drawConfetti() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.y < innerHeight + 20 && p.life > 0);
  for (const p of parts) {
    if (!p.slow) { p.vx *= .985; p.vy += .22; p.life -= .006; } else { p.vx += Math.sin(p.y / 40) * .02; }
    p.x += p.vx; p.y += p.vy; p.rot += p.vr;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.c;
    if (p.shape === 0) { ctx.beginPath(); ctx.arc(0, 0, p.r / 1.6, 0, Math.PI * 2); ctx.fill(); }
    else ctx.fillRect(-p.r / 2, -p.r, p.r, p.r * 2);
    ctx.restore();
  }
  requestAnimationFrame(drawConfetti);
})();

// ================= Music box "Happy Birthday" (Web Audio, no files) =================
let audioCtx = null;
function playTune({ loop = false } = {}) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    const notes = [[392, 1], [392, 1], [440, 2], [392, 2], [523, 2], [494, 4],
      [392, 1], [392, 1], [440, 2], [392, 2], [587, 2], [523, 4],
      [392, 1], [392, 1], [784, 2], [659, 2], [523, 2], [494, 2], [440, 4],
      [698, 1], [698, 1], [659, 2], [523, 2], [587, 2], [523, 5]];
    const beat = 0.24;
    let stopped = false, timer = null;
    const nodes = [];
    const playOnce = () => {
      let t = audioCtx.currentTime + .05;
      for (const [f, len] of notes) {
        for (const [mult, vol] of [[1, .16], [2, .05]]) {
          const o = audioCtx.createOscillator(), g = audioCtx.createGain();
          o.type = "sine"; o.frequency.value = f * mult;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(vol, t + .01);
          g.gain.exponentialRampToValueAtTime(.0008, t + len * beat + .4);
          o.connect(g).connect(audioCtx.destination);
          o.start(t); o.stop(t + len * beat + .45);
          nodes.push(o);
        }
        t += len * beat;
      }
      const total = notes.reduce((s, [, l]) => s + l, 0) * beat;
      if (loop && !stopped) timer = setTimeout(playOnce, (total + .8) * 1000);
    };
    playOnce();
    return () => { stopped = true; clearTimeout(timer); nodes.forEach((o) => { try { o.stop(); } catch {} }); };
  } catch { return () => {}; }
}
