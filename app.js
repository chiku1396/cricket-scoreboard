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

  const adminBtn = document.getElementById("adminBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const awardsBox = document.getElementById("awardsBox");
  const resetBtn = document.getElementById("resetAwardsBtn");

  if (adminBtn) adminBtn.style.display = user ? "none" : "block";
  if (logoutBtn) logoutBtn.style.display = user ? "block" : "none";
  if (awardsBox) awardsBox.style.display = user ? "block" : "none";
  if (resetBtn) resetBtn.style.display = user ? "block" : "none";

  // 🔥 force UI refresh
  renderTable(playersCache, admin);
});
window.resetAwards = async function () {
  if (!admin) return;

  try {
    let errors = [];

    // 1️⃣ Reset awards
    try {
      await setDoc(awardRef, { list: [] });
    } catch (e) {
      errors.push("awards");
      console.error("Awards reset error:", e);
    }

    // 2️⃣ Reset winner
    try {
      await setDoc(winnerRef, { winner: "" });
    } catch (e) {
      errors.push("winner");
      console.error("Winner reset error:", e);
    }

    // 3️⃣ UI clear (always safe)
    document.getElementById("awardFeed").innerHTML = "";

    // 4️⃣ Show correct message
    if (errors.length > 0) {
      alert("Reset completed with minor issues: " + errors.join(", "));
    } else {
      alert("Reset successful");
    }

  } catch (err) {
    console.error(err);
    alert("Reset failed completely");
  }
};
/* PLAYERS */
/* PLAYERS */
onSnapshot(colRef, snap => {
  playersCache = [];

  snap.forEach(d => {
    playersCache.push({ id: d.id, ...d.data() });
  });

  renderTable(playersCache, admin);
});
function renderTable(players, isAdmin) {
  const table = document.getElementById("table");
  table.innerHTML = "";

  const batsman = document.getElementById("batsman");
  const bowler = document.getElementById("bowler");
  const catcher = document.getElementById("catch");

  batsman.innerHTML =
  bowler.innerHTML =
  catcher.innerHTML =
    `<option disabled selected>Select</option>`;

  if (!players || players.length === 0) return;

  players.sort((a, b) => b.runs - a.runs);

  players.forEach((p, i) => {

    // 🔥 ALWAYS RELIABLE ADMIN CHECK
    const actions = isAdmin
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
}
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

const matchRef = collection(db, "matches");

/* SAVE FULL MATCH DATA */
window.saveMatch = async function () {
  if (!admin) {
    alert("Only admin can save match");
    return;
  }

  try {
    const dateInput = document.getElementById("matchDate").value;

    if (!dateInput) {
      alert("Select date first");
      return;
    }

    // convert YYYY-MM-DD → DD-MM-YY
    const d = new Date(dateInput);

    const dateKey =
      d.getDate() + "-" +
      (d.getMonth() + 1) + "-" +
      String(d.getFullYear()).slice(-2);

    // 🔥 GET PLAYERS FROM FIRESTORE (MOST IMPORTANT FIX)
    const snap = await getDocs(colRef);

    let players = [];
    snap.forEach(docSnap => {
      players.push({ id: docSnap.id, ...docSnap.data() });
    });

    // get winner
    const winnerSnap = await getDoc(winnerRef);
    const winner = winnerSnap.exists() ? winnerSnap.data().winner : "";

    // get awards
    const awardSnap = await getDoc(awardRef);
    const awards = awardSnap.exists() ? awardSnap.data().list || [] : [];

    // 🔥 SAVE TO MATCH COLLECTION
    await setDoc(doc(db, "matches", dateKey), {
      date: dateKey,
      players,
      winner,
      awards,
      savedAt: new Date().toISOString()
    });

    alert("Match saved successfully ✅");

  } catch (err) {
    console.error("SAVE ERROR:", err);
    alert("Save failed ❌ Check console");
  }
};
window.loadMatch = async function (date) {
  const snap = await getDoc(doc(db, "matches", date));

  if (!snap.exists()) {
    alert("No data for this date");
    return;
  }

  const data = snap.data();

  // update table
  renderTable(data.players, false);

  // update winner
  document.getElementById("winnerBanner").innerText =
    "🏆 Winner: " + data.winner;

  // update awards
  const feed = document.getElementById("awardFeed");
  feed.innerHTML = "";

  (data.awards || []).forEach(a => {
    const div = document.createElement("div");
    div.innerText = a;
    div.style.color = "gold";
    div.style.fontWeight = "bold";
    feed.appendChild(div);
  });
};
window.loadSelectedMatch = async function () {
  try {
    const dateInput = document.getElementById("matchDate").value;

    if (!dateInput) {
      alert("Select a date");
      return;
    }

    const d = new Date(dateInput);

    const dateKey =
      d.getDate() + "-" +
      (d.getMonth() + 1) + "-" +
      String(d.getFullYear()).slice(-2);

    const snap = await getDoc(doc(db, "matches", dateKey));

    if (!snap.exists()) {
      alert("No match found for this date");
      return;
    }

    const data = snap.data();

    // render players
    renderTable(data.players || [], admin);

    // winner
    document.getElementById("winnerBanner").innerText =
      data.winner ? "🏆 Winner: " + data.winner : "";

    // awards
    const feed = document.getElementById("awardFeed");
    feed.innerHTML = "";

    (data.awards || []).forEach(a => {
      const div = document.createElement("div");
      div.innerText = a;
      div.style.color = "gold";
      div.style.fontWeight = "bold";
      feed.appendChild(div);
    });

  } catch (err) {
    console.error("LOAD ERROR:", err);
    alert("Load failed");
  }
};
function setTodayInCalendar() {
  const today = new Date();

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const formatted = `${yyyy}-${mm}-${dd}`;

  const input = document.getElementById("matchDate");
  input.value = formatted;
}
window.addEventListener("load", async () => {
  const today = new Date();

  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const formatted = `${yyyy}-${mm}-${dd}`;

  const input = document.getElementById("matchDate");
  if (input) input.value = formatted;

  await loadSelectedMatch();
});