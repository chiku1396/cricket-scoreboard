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
const matchCol = collection(db, "matches");

const awardRef = doc(db, "settings", "awards");
const winnerRef = doc(db, "settings", "match");

/* ================= STATE ================= */
let admin = false;
let playersCache = [];
let currentMode = "live"; // live | history

/* ================= DATE KEY ================= */
function getDateKey(dateStr) {
  const [yyyy, mm, dd] = dateStr.split("-");
  return `${parseInt(dd)}-${parseInt(mm)}-${yyyy.slice(-2)}`;
}

/* ================= INIT DATE ================= */
function setToday() {
  const input = document.getElementById("matchDate");

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  if (input) input.value = `${yyyy}-${mm}-${dd}`;
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

  const adminBtn = document.getElementById("adminBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const awardsBox = document.getElementById("awardsBox");
  const resetBtn = document.getElementById("resetAwardsBtn");

  if (adminBtn) adminBtn.style.display = user ? "none" : "block";
  if (logoutBtn) logoutBtn.style.display = user ? "block" : "none";
  if (awardsBox) awardsBox.style.display = user ? "block" : "none";
  if (resetBtn) resetBtn.style.display = user ? "block" : "none";

  renderTable(playersCache);
});

/* ================= REMOVE LIVE SNAPSHOT CONFLICT ================= */
/* (IMPORTANT: no onSnapshot(playersCol)) */

/* ================= RENDER TABLE ================= */
function renderTable(players) {
  const table = document.getElementById("table");
  table.innerHTML = "";

  const batsman = document.getElementById("batsman");
  const bowler = document.getElementById("bowler");
  const catcher = document.getElementById("catch");

  if (batsman) {
    batsman.innerHTML =
    bowler.innerHTML =
    catcher.innerHTML =
      `<option disabled selected>Select</option>`;
  }

  if (!players || players.length === 0) return;

  players.sort((a, b) => b.runs - a.runs);

  players.forEach((p, i) => {

    const actions =
      (admin && currentMode === "live")
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

/* ================= LOAD MATCH ================= */
window.loadSelectedMatch = async function () {
  const dateInput = document.getElementById("matchDate").value;
  if (!dateInput) return;

  const key = getDateKey(dateInput);

  const snap = await getDoc(doc(db, "matches", key));

  const table = document.getElementById("table");
  const feed = document.getElementById("awardFeed");
  const banner = document.getElementById("winnerBanner");

  table.innerHTML = "";
  feed.innerHTML = "";
  banner.innerText = "";

  if (!snap.exists()) {
    table.innerHTML =
      `<tr><td colspan="4">No data for this date</td></tr>`;
    currentMode = "history";
    return;
  }

  const data = snap.data();

  currentMode = "history";

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

/* ================= DATE CHANGE ================= */
document.getElementById("matchDate")
  .addEventListener("change", loadSelectedMatch);

/* ================= INIT ================= */
window.addEventListener("load", () => {
  setToday();
  setTimeout(() => {
    loadSelectedMatch();
  }, 300);
});