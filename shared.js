// Letter data travels in the URL hash, so no server or database is needed.
// An empty list (or null) in a letter hides that surprise.
const DEFAULT_LETTER = {
  to: "My Princess",
  from: "Adarsh",
  month: 10,
  day: 25,
  age: "",
  message:
    "Happy birthday to the person who makes my whole world softer.\n\nI wanted to give you something you could open more than once, so I made you this. Every surprise in here is a small piece of how I feel about you.\n\nThank you for your laugh, your patience, your terrible jokes and your beautiful heart. Thank you for the late-night talks, the silly fights we always laugh about later, and the quiet moments that mean everything to me.\n\nI hope this year gives you everything you've been wishing for, and a few things you never thought to ask for. And on the days that feel heavy, I hope you remember how deeply you are loved.\n\nToday is all about you. Make a big wish. I'll be right here, cheering the loudest when it comes true.",
  lock: true,
  reasons: [
    "Your laugh. It's my favourite sound in the whole world.",
    "The way you remember the little things nobody else notices.",
    "You make ordinary days feel like tiny holidays.",
    "You're so much braver than you give yourself credit for.",
    "Your hugs fix almost everything. The rest, they make better.",
    "You believe in me, even on the days I don't.",
    "How kind you are, even when no one is watching.",
    "That look you give me when you're trying not to laugh.",
  ],
  chapters: [
    { t: "The day we met", x: "I didn't know it yet, but that ordinary day was the first page of my favourite story." },
    { t: "Falling, slowly", x: "One conversation turned into a hundred. Somewhere in between, you became my favourite person." },
    { t: "Our first adventure", x: "Wrong turns, too many snacks and the best day I'd had in years. Getting lost was more fun with you." },
    { t: "The hard days", x: "You held my hand through every one of them. I promise I'll always hold yours." },
    { t: "Today", x: "Another year of you. And somehow, I'm still finding new reasons to smile because of you." },
  ],
  wishes: [
    "Laughter so loud and so often that your cheeks hurt.",
    "Dreams that finally come true, one beautiful step at a time.",
    "Slow mornings, warm coffee and absolutely no alarms.",
    "Adventures to places you've only ever imagined.",
    "Peace on the hard days and joy on all the others.",
    "People around you who love you as much as I do. (That's a lot.)",
  ],
  moments: [
    { c: "On top of the world at Chicham Bridge", img: "photos/1.jpg" },
    { c: "Sunshine on the Ganga", img: "photos/2.jpg" },
    { c: "A queen in red", img: "photos/3.jpg" },
    { c: "Simply, beautifully you", img: "photos/4.jpg" },
  ],
  places: [
    { n: "The metro rides where it all began", d: "Crowded coaches and stolen glances. Somewhere between two stations, I started falling for you, and I never stopped." },
    { n: "Our Banaras trip", d: "The ghats glowing at sunset, our boat on the Ganga, and you in red, more beautiful than the whole city." },
    { n: "Our first kiss", d: "The world went quiet for a moment. My heart still skips a beat every time I think about it." },
    { n: "Shopping days and bike rides", d: "Your arms around me on the bike, the city rushing past, and you laughing at everything. My favourite kind of freedom." },
    { n: "Cafés and our food dates", d: "Every café becomes our café when I'm sitting across from you, stealing bites from your plate." },
    { n: "Wherever we go next", d: "I don't care where the road takes us, as long as my hand is in yours." },
  ],
};

function encodeLetter(data) {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeLetter(str) {
  try {
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return { ...DEFAULT_LETTER, ...JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return null;
  }
}

function readLetterFromUrl() {
  const params = new URLSearchParams(location.hash.slice(1));
  const d = params.get("d");
  return (d && decodeLetter(d)) || { ...DEFAULT_LETTER };
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];

// Next occurrence of month/day at local midnight (today counts as "now").
function nextBirthday(month, day, now = new Date()) {
  let target = new Date(now.getFullYear(), month - 1, day);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (target < todayStart) target = new Date(now.getFullYear() + 1, month - 1, day);
  return target;
}

function isBirthdayToday(month, day, now = new Date()) {
  return now.getMonth() === month - 1 && now.getDate() === day;
}
