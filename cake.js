// A CSS cake that can spin. Decorations sit at angles around each tier and are
// projected onto the front every frame, which gives a cheap but convincing 3D turn.
const CAKE_HTML = `
  <div class="cake">
    <div class="plate"></div>
    <div class="tier t1"><div class="body"></div><div class="top"></div><div class="deco"></div></div>
    <div class="tier t2"><div class="body"></div><div class="top"></div><div class="deco"></div></div>
    <div class="candles"></div>
  </div>`;

const SPRINKLES = ["#fde68a", "#a7f3d0", "#fff", "#fda4af", "#93c5fd", "#f9a8d4"];
const CANDLE_COLORS = ["#f472b6", "#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#fb7185", "#2dd4bf"];
const allCakes = [];

function makeCake(host, { candles = 5, speed = 0.004 } = {}) {
  host.innerHTML = CAKE_HTML;
  const decos = host.querySelectorAll(".deco");
  const tiers = [
    { el: decos[0], w: 250, h: 110, ry: 26, items: [] },
    { el: decos[1], w: 180, h: 84, ry: 20, items: [] },
  ];

  function add(tier, angle, y, style) {
    const i = document.createElement("i");
    Object.assign(i.style, style);
    tier.el.appendChild(i);
    tier.items.push({ el: i, angle, y, w: parseFloat(style.width) });
  }
  for (let k = 0; k < 28; k++) add(tiers[0], k / 28 * Math.PI * 2, "rim", {
    width: "14px", height: "14px", borderRadius: "50%",
    background: "radial-gradient(circle at 35% 35%, #fff, #e9d5ff 60%, #b79be6)" });
  for (let k = 0; k < 46; k++) add(tiers[0], Math.random() * Math.PI * 2, 18 + Math.random() * 80, {
    width: "4px", height: "10px", borderRadius: "3px", background: SPRINKLES[k % SPRINKLES.length] });
  for (let k = 0; k < 18; k++) add(tiers[0], k / 18 * Math.PI * 2, "top", {
    width: "20px", height: "18px", borderRadius: "50% 50% 45% 45%",
    background: "radial-gradient(circle at 40% 30%, #fff, #f8bbd4 70%)" });
  for (let k = 0; k < 22; k++) add(tiers[1], k / 22 * Math.PI * 2, "drip", {
    width: "16px", height: 18 + (k * 37 % 30) + "px", borderRadius: "0 0 10px 10px",
    background: "linear-gradient(#fff6fa, #ffe2ef)" });
  for (let k = 0; k < 10; k++) add(tiers[1], k / 10 * Math.PI * 2 + .3, 62, {
    width: "14px", height: "14px", borderRadius: "50%",
    background: ["#a7f3d0", "#fde68a", "#c4b5fd", "#fbcfe8", "#93c5fd"][k % 5] });

  const candleBox = host.querySelector(".candles");
  const candleList = [];
  for (let k = 0; k < candles; k++) {
    const c = document.createElement("div");
    c.className = "candle";
    c.style.setProperty("--c", CANDLE_COLORS[k % CANDLE_COLORS.length]);
    c.innerHTML = '<div class="flame"></div><div class="smoke"></div>';
    candleBox.appendChild(c);
    candleList.push({ el: c, angle: k / candles * Math.PI * 2 });
  }
  const berry = document.createElement("div");
  berry.className = "berry";
  candleBox.appendChild(berry);

  const cake = {
    host, rot: 0, vel: speed, speed, dragging: false, candles: candleList,
    get lit() { return candleList.filter((c) => !c.el.classList.contains("out")).length; },
    blowOne() {
      const c = candleList.find((c) => !c.el.classList.contains("out"));
      if (c) c.el.classList.add("out");
      return this.lit;
    },
    blowAll(step = 120) { candleList.forEach((c, k) => setTimeout(() => c.el.classList.add("out"), k * step)); },
    relight() { candleList.forEach((c) => c.el.classList.remove("out")); },
    render() {
      for (const t of tiers) {
        const rx = t.w / 2;
        for (const it of t.items) {
          const a = it.angle + this.rot;
          const x = Math.sin(a) * rx;
          const z = Math.cos(a); // 1 = facing us, -1 = behind
          let y, hide = z < 0.05;
          if (it.y === "rim") y = t.ry + t.h + t.ry * z - 8;
          else if (it.y === "top") { y = t.ry + t.ry * z - 12; hide = false; }
          else if (it.y === "drip") y = t.ry + t.ry * z - 4;
          else y = t.ry + it.y + t.ry * z;
          const sx = it.y === "top" ? 1 : Math.max(.15, z);
          it.el.style.transform = `translate(${rx + x - it.w / 2}px, ${y}px) scaleX(${sx})`;
          it.el.style.opacity = hide ? 0 : 1;
          it.el.style.zIndex = Math.round(z * 10) + 10;
        }
      }
      for (const c of candleList) {
        const a = c.angle + this.rot;
        const x = Math.sin(a) * 52, y = Math.cos(a) * 52 * (20 / 90);
        c.el.style.transform = `translate(${x}px, ${y}px)`;
        c.el.style.zIndex = Math.round(y + 50);
      }
    },
    enableDrag(area) {
      let lastX = 0;
      area.addEventListener("pointerdown", (e) => {
        if (e.target.closest("button")) return;
        this.dragging = true; lastX = e.clientX; area.setPointerCapture(e.pointerId);
      });
      area.addEventListener("pointermove", (e) => {
        if (!this.dragging) return;
        const dx = e.clientX - lastX; lastX = e.clientX;
        this.rot += dx * 0.012; this.vel = dx * 0.012;
      });
      ["pointerup", "pointercancel"].forEach((ev) => area.addEventListener(ev, () => (this.dragging = false)));
    },
  };
  allCakes.push(cake);
  return cake;
}

(function spinLoop() {
  for (const c of allCakes) {
    if (!c.host.offsetParent) continue; // not on screen
    if (!c.dragging) { c.rot += c.vel; c.vel += (c.speed - c.vel) * 0.02; }
    c.render();
  }
  requestAnimationFrame(spinLoop);
})();
