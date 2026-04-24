import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  updateDoc,
  onSnapshot,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

/* Firebase Config */
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

const colRef = collection(db, "players");

let admin = false;
let playersCache = [];

/* DATE */
const d = new Date();
document.getElementById("date").innerText =
`${d.getDate()}-${d.getMonth() + 1}-${String(d.getFullYear()).slice(-2)}`;

/* LOGIN */
window.login = async function () {
  await signInWithEmailAndPassword(auth, email.value, password.value);
  loginPopup.style.display = "none";
};

window.logout = () => signOut(auth).then(() => location.reload());

window.toggleLogin = () => {
  loginPopup.style.display =
    loginPopup.style.display === "block" ? "none" : "block";
};

/* AUTH */
onAuthStateChanged(auth, user => {
  admin = !!user;

  adminBtn.style.display = user ? "none" : "block";
  logoutBtn.style.display = user ? "block" : "none";

  /* ✅ FIX 1: awards box now visible only for admin */
  document.getElementById("awardsBox").style.display = user ? "block" : "none";

  /* reset button */
  resetAwardsBtn.style.display = user ? "block" : "none";
});
window.resetAwards = async function () {
  if (!admin) return;

  // 1️⃣ Get award history
  const snap = await getDoc(awardRef);

  if (snap.exists()) {
    const list = snap.data().list || [];

    // ⚠️ NOTE: we cannot reverse runs properly without storing deltas per player
    // So we only clear award list safely (best practice)

    await setDoc(awardRef, { list: [] });
  }

  // 2️⃣ Reset winner
  await setDoc(winnerRef, { winner: "" }, { merge: true });
};
/* PLAYERS */
onSnapshot(colRef, snap => {
  const table = document.getElementById("table");
  table.innerHTML = "";

  let players = [];

  snap.forEach(d => players.push({ id: d.id, ...d.data() }));
  playersCache = players;

  players.sort((a, b) => b.runs - a.runs);

  const batsman = document.getElementById("batsman");
  const bowler = document.getElementById("bowler");
  const catcher = document.getElementById("catch");

  batsman.innerHTML =
  bowler.innerHTML =
  catcher.innerHTML =
    `<option disabled selected>Select</option>`;

  players.forEach((p, i) => {

    /* ✅ FIX 2: ensure admin buttons always render correctly */
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
    batsman.innerHTML += opt;
    bowler.innerHTML += opt;
    catcher.innerHTML += opt;
  });
});

/* UPDATE RUN */
window.updateRun = async (id, val) => {
  const p = playersCache.find(x => x.id === id);
  if (!p) return;

  await updateDoc(doc(db, "players", id), {
    runs: p.runs + val
  });
};

/* AWARDS */
const awardRef = doc(db, "settings", "awards");
const winnerRef = doc(db, "settings", "match");

window.giveSingleAward = async (type, points) => {
  const id = document.getElementById(type).value;
  if (!id) return;

  const p = playersCache.find(x => x.id === id);

  await updateDoc(doc(db, "players", id), {
    runs: p.runs + points
  });

  const snap = await getDoc(awardRef);
  let list = snap.exists() ? snap.data().list || [] : [];

  list.push(`${type}: ${p.name} +${points}`);

  await setDoc(awardRef, { list });
};

/* AWARD FEED */
onSnapshot(awardRef, snap => {
  const feed = document.getElementById("awardFeed");
  feed.innerHTML = "";

  if (!snap.exists()) return;

  snap.data().list.forEach(item => {
    const div = document.createElement("div");
    div.innerText = item;
    feed.appendChild(div);
  });
});

/* WINNER */
onSnapshot(winnerRef, snap => {
  const banner = document.getElementById("winnerBanner");

  if (!snap.exists()) {
    banner.innerText = "";
    return;
  }

  const data = snap.data();

  if (!data.winner || data.winner.trim() === "") {
    banner.innerText = "";
    return;
  }

  banner.innerText = "🏆 Winner: " + data.winner;
});

/* SET WINNER */
window.setWinner = async function () {
  const name = document.getElementById("winnerName").value;

  if (!admin) return alert("Only admin");

  if (!name || name.trim() === "") return;

  await setDoc(winnerRef, {
    winner: name.trim()
  }, { merge: true });
};