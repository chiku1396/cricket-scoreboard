import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot
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
const adminBtn = document.getElementById("adminBtn");
const logoutBtn = document.getElementById("logoutBtn");
const saveBtn = document.getElementById("saveBtn");
const resetAwardsBtn = document.getElementById("resetAwardsBtn");
const loginPopup = document.getElementById("loginPopup");
let admin = false;
let playersCache = [];

/* DATE */
const today = new Date();
document.getElementById("date").innerText =
`${today.getDate()}-${today.getMonth() + 1}-${String(today.getFullYear()).slice(-2)}`;

document.getElementById("matchDate").value =
new Date().toISOString().split("T")[0];

/* MATCH REF (IMPORTANT CHANGE → matches collection) */
function matchRef(date) {
  return doc(db, "matches", date);
}

function getDateKey() {
  return document.getElementById("matchDate").value;
}

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

  if (adminBtn) adminBtn.style.display = user ? "none" : "block";
  if (logoutBtn) logoutBtn.style.display = user ? "block" : "none";
  if (saveBtn) saveBtn.style.display = user ? "block" : "none";
  if (resetAwardsBtn) resetAwardsBtn.style.display = user ? "block" : "none";

  renderTable(playersCache);
});

/* LOAD BY DATE */
window.loadByDate = async function () {
  const date = getDateKey();

  const snap = await getDoc(matchRef(date));

  if (!snap.exists()) {
    alert("No data for this date");
    playersCache = [];
    renderTable(playersCache);
    renderAwards([]);
    renderWinner("");
    return;
  }

  const data = snap.data();

  playersCache = data.players || [];

  renderTable(playersCache);
  renderAwards(data.awards || []);
  renderWinner(data.winner || "");

  attachLiveListener(date);
};

/* LIVE LISTENER */
onSnapshot(matchRef(getDateKey()), snap => {
  if (!snap.exists()) return;

  const data = snap.data();

  playersCache = data.players || [];

  renderTable(playersCache);
  renderAwards(data.awards || []);
  renderWinner(data.winner || "");
});

/* SAVE MATCH */
window.saveMatch = async function () {
  await setDoc(matchRef(getDateKey()), {
    players: playersCache
  }, { merge: true });

  alert("Match saved");
};

/* UPDATE RUN */
window.updateRun = async function (id, val) {
  const p = playersCache.find(x => x.id === id);
  if (!p) return;

  p.runs += val;

  await setDoc(matchRef(getDateKey()), {
    players: playersCache
  }, { merge: true });
};

/* AWARDS */
window.giveSingleAward = async function (type, points) {
  const id = document.getElementById(type).value;
  if (!id) return;

  const p = playersCache.find(x => x.id === id);

  p.runs += points;

  let snap = await getDoc(matchRef(getDateKey()));
  let data = snap.exists() ? snap.data() : {};

  let awards = data.awards || [];

  const label =
    type === "batsman" ? "🏏 Batsman" :
    type === "bowler" ? "🎯 Bowler" :
    "🧤 Catch";

  awards.push(`${label}: ${p.name} +${points}`);

  await setDoc(matchRef(getDateKey()), {
    players: playersCache,
    awards
  }, { merge: true });
};

/* RESET AWARDS */
window.resetAwards = async function () {
  if (!admin) return;

  await setDoc(matchRef(getDateKey()), {
    awards: []
  }, { merge: true });

  document.getElementById("awardFeed").innerHTML = "";
};

/* RENDER AWARDS */
function renderAwards(list) {
  const feed = document.getElementById("awardFeed");
  feed.innerHTML = "";

  (list || []).forEach(a => {
    const div = document.createElement("div");
    div.innerText = a;
    feed.appendChild(div);
  });
}

/* WINNER */
function renderWinner(name) {
  document.getElementById("winnerBanner").innerText =
    name ? "🏆 Winner: " + name : "";
}
let unsub = null;

function attachLiveListener(date) {
  if (unsub) unsub(); // remove old listener

  unsub = onSnapshot(matchRef(date), snap => {
    if (!snap.exists()) return;

    const data = snap.data();

    playersCache = data.players || [];

    renderTable(playersCache);
    renderAwards(data.awards || []);
    renderWinner(data.winner || "");
  });
}