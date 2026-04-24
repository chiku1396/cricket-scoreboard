import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  updateDoc,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* ================= FIREBASE ================= */
const firebaseConfig = {
  apiKey: "AIzaSyD1mzmTLVUVLNTvSUINT_puwIstaQ93nwk",
  authDomain: "cricket-scoreboard-final.firebaseapp.com",
  projectId: "cricket-scoreboard-final",
  storageBucket: "cricket-scoreboard-final.firebasestorage.app",
  messagingSenderId: "692758487066",
  appId: "1:692758487066:web:9ae8df30e650837dc231a3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* ================= COLLECTIONS ================= */
const playersCol = collection(db, "players");

const awardRef = doc(db, "settings", "awards");
const winnerRef = doc(db, "settings", "match");

/* ================= STATE ================= */
let admin = false;
let playersCache = [];

/* ================= DATE KEY ================= */
function getDateKey(dateStr) {
  if (!dateStr) return null;
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${parseInt(dd)}-${parseInt(mm)}-${yyyy.slice(-2)}`;
}

/* ================= LOGIN ================= */
window.login = async function () {
  await signInWithEmailAndPassword(auth, email.value, password.value);
  loginPopup.style.display = "none";
};

window.logout = () => signOut(auth).then(() => location.reload());

window.toggleLogin = () => {
  loginPopup.style.display =
    loginPopup.style.display === "block" ? "none" : "block";
};

/* ================= AUTH ================= */
onAuthStateChanged(auth, user => {
  admin = !!user;

  document.getElementById("adminBtn").style.display = user ? "none" : "block";
  document.getElementById("logoutBtn").style.display = user ? "block" : "none";
  document.getElementById("awardsBox").style.display = user ? "block" : "none";
  document.getElementById("resetAwardsBtn").style.display = user ? "block" : "none";

  renderTable(playersCache);
});

/* ================= PLAYERS (ONLY LIVE CACHE) ================= */
onSnapshot(playersCol, snap => {
  playersCache = [];
  snap.forEach(d => playersCache.push({ id: d.id, ...d.data() }));
  renderTable(playersCache);
});

/* ================= RENDER TABLE ================= */
function renderTable(players) {
  const table = document.getElementById("table");
  const batsman = document.getElementById("batsman");
  const bowler = document.getElementById("bowler");
  const catcher = document.getElementById("catch");

  if (!table) return;

  table.innerHTML = "";

  if (batsman) {
    batsman.innerHTML =
      bowler.innerHTML =
      catcher.innerHTML =
        `<option disabled selected>Select</option>`;
  }

  if (!players || players.length === 0) return;

  players.sort((a, b) => b.runs - a.runs);

  players.forEach((p, i) => {

    const actions = admin
      ? `
        <button onclick="updateRun('${p.id}',2)">+2</button>
        <button onclick="updateRun('${p.id}',-3)">-3</button>
      `
      : "";

    table.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${p.name}</td>
        <td>${p.runs}</td>
        <td>${actions}</td>
      </tr>
    `;

    const opt = `<option value="${p.id}">${p.name}</option>`;
    if (batsman) batsman.innerHTML += opt;
    if (bowler) bowler.innerHTML += opt;
    if (catcher) catcher.innerHTML += opt;
  });
}

/* ================= UPDATE RUN ================= */
window.updateRun = async function (id, val) {
  const p = playersCache.find(x => x.id === id);
  if (!p) return;

  await updateDoc(doc(db, "players", id), {
    runs: p.runs + val
  });
};

/* ================= LOAD MATCH ================= */
window.loadSelectedMatch = async function () {
  const dateInput = document.getElementById("matchDate").value;

  const table = document.getElementById("table");
  const feed = document.getElementById("awardFeed");

  // ALWAYS CLEAR FIRST (IMPORTANT FIX)
  table.innerHTML = "";
  feed.innerHTML = "";
  banner.innerText = "";

  if (!dateInput) return;

  const key = getDateKey(dateInput);

  const snap = await getDoc(doc(db, "matches", key));

  if (!snap.exists()) {
    table.innerHTML =
      `<tr><td colspan="4">No data for this date</td></tr>`;
    return;
  }

  const data = snap.data();

  renderTable(data.players || []);

  banner.innerText =
    data.winner ? "🏆 Winner: " + data.winner : "";

  (data.awards || []).forEach(a => {
    const div = document.createElement("div");
    div.innerText = a;
    div.style.color = "gold";
    div.style.fontWeight = "bold";
    feed.appendChild(div);
  });
};

/* ================= SAVE MATCH ================= */
window.saveMatch = async function () {
  if (!admin) return alert("Only admin");

  const dateInput = document.getElementById("matchDate").value;
  if (!dateInput) return alert("Select date");

  const key = getDateKey(dateInput);

  const snap = await getDocs(playersCol);

  let players = [];
  snap.forEach(d => players.push({ id: d.id, ...d.data() }));

  const winnerSnap = await getDoc(winnerRef);
  const awardSnap = await getDoc(awardRef);

  await setDoc(doc(db, "matches", key), {
    date: key,
    players,
    winner: winnerSnap.exists() ? winnerSnap.data().winner : "",
    awards: awardSnap.exists() ? awardSnap.data().list || [] : []
  });

  alert("Match saved ✅");
};

/* ================= AWARDS ================= */
window.giveSingleAward = async function (type, points) {
  const id = document.getElementById(type).value;
  if (!id) return;

  const p = playersCache.find(x => x.id === id);

  await updateDoc(doc(db, "players", id), {
    runs: p.runs + points
  });

  const snap = await getDoc(awardRef);
  let list = snap.exists() ? snap.data().list || [] : [];

  const label =
    type === "batsman"
      ? "🏏 Batsman of the Day"
      : type === "bowler"
      ? "🎯 Bowler of the Day"
      : "🧤 Catch of the Day";

  list.push(`${label}: ${p.name} +${points}`);

  await setDoc(awardRef, { list });
};

/* ================= INIT ================= */
window.addEventListener("load", () => {
  const input = document.getElementById("matchDate");

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  if (input) input.value = `${yyyy}-${mm}-${dd}`;

  setTimeout(() => {
    loadSelectedMatch();
  }, 400);
});