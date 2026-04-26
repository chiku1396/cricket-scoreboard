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
onAuthStateChanged(auth, async (user) => {
  admin = !!user;

  const dateInput = document.getElementById("date");
  const today = getTodayDate();

  adminBtn.style.display = user ? "none" : "block";
  logoutBtn.style.display = user ? "block" : "none";

  const d = new Date(today);
  d.setDate(d.getDate() - 1);

  const yesterday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
if (admin) {
  toggleAdminUI(true);   // ✅ SHOW ALL ADMIN CONTROLS
} else {
  toggleAdminUI(false);  // ❌ HIDE FOR VIEWER
}
  if (admin) {
    // 🟢 ADMIN = LIVE MODE
    if (dateInput) dateInput.value = today;

    loadLivePlayers();   // 🔥 LIVE STREAM ONLY FOR ADMIN
    await loadMatchByDate(yesterday);

  } else {
    // 🔵 VIEWER = DATE MODE ONLY
    if (dateInput) dateInput.value = today;

    await loadMatchByDate(today);
  }

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
onSnapshot(colRef, snap => {
  playersCache = [];

  snap.forEach(d => {
    playersCache.push({ id: d.id, ...d.data() });
  });

   // 🔥 always use latest admin value
  setTimeout(() => {
    renderTable(playersCache, admin);
  }, 0);
});

function renderTable(players, isAdmin) {
  const winCaptain = document.getElementById("winCaptain");
  const loseCaptain = document.getElementById("loseCaptain");
  if (winCaptain && loseCaptain) {
  winCaptain.innerHTML =
  loseCaptain.innerHTML =
    `<option disabled selected>Select</option>`;
  }
  const table = document.getElementById("table");
  table.innerHTML = "";

  const batsman = document.getElementById("batsman");
  const bowler = document.getElementById("bowler");
  const catcher = document.getElementById("catch");

  if (!table || !batsman || !bowler || !catcher) return;

  // 🔥 Show / Hide Action column header
  const actionHeader = document.getElementById("actionHeader");
  if (actionHeader) {
    actionHeader.style.display = isAdmin ? "table-cell" : "none";
  }

  batsman.innerHTML =
  bowler.innerHTML =
  catcher.innerHTML =
    `<option disabled selected>Select</option>`;

  if (!players || players.length === 0) return;

  players.sort((a, b) => b.runs - a.runs);

  players.forEach((p, i) => {

    const actions = isAdmin
      ? `
        <button onclick="updateRun('${p.id}',-1)">-1</button>
        <button onclick="updateRun('${p.id}',-5)">-5</button>
      `
      : "";

    table.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${p.name}</td>
        <td>${p.runs}</td>
        ${isAdmin ? `<td>${actions}</td>` : ""}
      </tr>
    `;

    const opt = `<option value="${p.id}">${p.name}</option>`;
    batsman.innerHTML += opt;
    bowler.innerHTML += opt;
    catcher.innerHTML += opt;
    if (winCaptain && loseCaptain) {
    const opt = `<option value="${p.id}">${p.name}</option>`;
    winCaptain.innerHTML += opt;
    loseCaptain.innerHTML += opt;
    }
  });
}
window.giveCaptainAward = async function (type, points) {
  const id = document.getElementById(type).value;
  if (!id) return;

  const p = playersCache.find(x => x.id === id);
  if (!p) return;

  // ➕ / ➖ update runs
  await updateDoc(doc(db, "players", id), {
    runs: p.runs + points
  });

  // 📥 get existing awards
  const snap = await getDoc(awardRef);
  let list = snap.exists() ? snap.data().list || [] : [];

  // 🏷 updated label (your requirement)
  const label =
    type === "winCaptain"
      ? "🏆 Winning Captain run distribution"
      : "😞 Losing Captain run distribution";

  // ✅ FIX sign display
  const sign = points > 0 ? `+${points}` : `${points}`;

  list.push(`${label}: ${p.name} ${sign}`);

  await setDoc(awardRef, { list });
};
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
  if (!feed) return;

  feed.innerHTML = "";

  if (!snap.exists()) return;

  const list = snap.data().list || [];

  list.forEach(item => {
    const div = document.createElement("div");
    div.innerText = item;
    feed.appendChild(div);
  });
});

function loadLivePlayers() {
  onSnapshot(colRef, snap => {
    if (!admin) return; // safety

    playersCache = [];

    snap.forEach(d => {
      playersCache.push({ id: d.id, ...d.data() });
    });

    renderTable(playersCache, true);
  });
}
/* SAVE MATCH */
window.saveMatch = async function () {
  if (!admin) return alert("Only admin can save match");

  const date = document.getElementById("date").value;

  try {
    const winnerSnap = await getDoc(winnerRef);
    const winner = winnerSnap.exists() ? winnerSnap.data().winner : "";

    const awardSnap = await getDoc(awardRef);
    const awards = awardSnap.exists() ? awardSnap.data().list || [] : [];

    const players = playersCache.map(p => ({
      name: p.name,
      runs: p.runs
    }));

await setDoc(doc(db, "matches", date), {
  date,
  winner,
  players,
  awards,
  timestamp: Date.now()
}, { merge: true });

    alert("Match saved successfully!");

  } catch (err) {
    console.error(err);
    alert("Failed to save match");
  }
};

/* DATE HELPERS */
function setTodayDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  const today = `${year}-${month}-${day}`;

  const dateInput = document.getElementById("date");
  if (dateInput) dateInput.value = today;
}

window.addEventListener("load", () => {
  setTodayDate();

  const dateInput = document.getElementById("date");

  if (dateInput && dateInput.value) {
    loadMatchByDate(dateInput.value);
    console.log("on load loadMatchByDate called");
  }
  setTimeout(() => {
    if (admin) toggleAdminUI(true);
  }, 500);
});

function getTodayDate() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* INIT */
window.addEventListener("DOMContentLoaded", () => {
  const dateEl = document.getElementById("date");

  if (dateEl) {
    dateEl.addEventListener("change", (e) => {
      //if (admin) return;
      loadMatchByDate(e.target.value);
    console.log("on date change loadMatchByDate called");
    });
  }
});
window.onload = () => {
  setTodayDate();

};
function toggleAdminUI(show) {
  const ids = [
    "winCaptain",
    "loseCaptain",
    "batsman",
    "bowler",
    "catch",
    "awardsBox",
    "resetAwardsBtn"
  ];

  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    // 🔥 IMPORTANT: use correct display types
    if (show) {
      if (el.tagName === "SELECT") {
        el.style.display = "inline-block";
      } else {
        el.style.display = "block";
      }
    } else {
      el.style.display = "none";
    }
  });
}
/* LOAD MATCH BY DATE */
window.loadMatchByDate = async function (date) {
  if (!date) return;

  const docRef = doc(db, "matches", date);
  const snap = await getDoc(docRef); // ✅ snap is defined here

  const table = document.getElementById("table");
  const feed = document.getElementById("awardFeed");
  const banner = document.getElementById("winnerBanner");

  if (!table || !feed || !banner) {
    console.error("Missing DOM elements");
    return;
  }

  table.innerHTML = "";
  // feed.innerHTML = "";
  // banner.style.display = "none";
  // banner.innerText = "";

  if (!snap.exists()) {
    table.innerHTML = "<tr><td colspan='4'>No match found</td></tr>";
    return;
  }

  const data = snap.data();
    // 🔥 FORCE VIEWER DATA
  if (!admin) {
    playersCache = data.players || [];
  }

  // // 🏆 winner
  // if (data.winner) {
  //   banner.style.display = "block";
  //   banner.innerText = "🏆 Winner: " + data.winner;
  // }

  // 🏏 players
  data.players?.forEach((p, i) => {
    const actions = admin
    ? `
      <button onclick="updateRun('${p.id}',-1)">-1</button>
      <button onclick="updateRun('${p.id}',-5)">-5</button>
    `
    : "";
    table.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${p.name}</td>
        <td>${p.runs}</td>
        ${admin ? `<td>${actions}</td>` : ""}
      </tr>
    `;
  });

  // 🎖 awards
  data.awards?.forEach(a => {
    const div = document.createElement("div");
    div.innerText = a;
    feed.appendChild(div);
  });
  // 📂 show uploaded file
if (data.fileBase64 && data.fileType && data.fileType.includes("image")) {
  const div = document.createElement("div");
  div.style.marginTop = "10px";

  div.innerHTML = `
    <button onclick="openImagePreview('${data.fileBase64}')" 
      style="
        padding:10px 15px;
        border:none;
        border-radius:8px;
        background:#007bff;
        color:white;
        cursor:pointer;
        font-weight:bold;
      ">
      🏏 View Scorecard
    </button>
  `;
  feed.appendChild(div);
}
};
onSnapshot(doc(db, "matches", document.getElementById("date").value), (snap) => {
  if (!snap.exists()) return;

  const data = snap.data();

  // 🏆 winner
  const banner = document.getElementById("winnerBanner");
  if (data.winner) {
    banner.style.display = "block";
    banner.innerText = "🏆 Winner: " + data.winner;
  }

  // 🎖 awards + scorecard
  const feed = document.getElementById("awardFeed");
  feed.innerHTML = "";

  data.awards?.forEach(a => {
    const div = document.createElement("div");
    div.innerText = a;
    feed.appendChild(div);
  });

  if (data.fileBase64 && data.fileType?.includes("image")) {
    const div = document.createElement("div");
    div.innerHTML = `<button onclick="openImagePreview('${data.fileBase64}')">🏏 View Scorecard</button>`;
    feed.appendChild(div);
  }
});
window.openImagePreview = function (src) {
  let overlay = document.createElement("div");

  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.9)";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";
  overlay.style.zIndex = "9999";

  overlay.innerHTML = `
    <img src="${src}" style="max-width:95%; max-height:95%; border-radius:10px;" />
  `;

  overlay.onclick = () => overlay.remove();

  document.body.appendChild(overlay);
};
window.uploadFile = async function () {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return alert("Select file");

  const date = document.getElementById("date").value;
  if (!date) return alert("Select date first");

  const reader = new FileReader();

  reader.onload = async function () {
    const base64 = reader.result;

    try {
      await updateDoc(doc(db, "matches", date), {
        fileBase64: base64,
        fileType: file.type
      });

      alert("Uploaded!");
    } catch (err) {
      console.log("updateDoc failed, creating doc...");

      await setDoc(doc(db, "matches", date), {
        fileBase64: base64,
        fileType: file.type
      }, { merge: true });

      alert("Uploaded!");
    }
  };

  reader.readAsDataURL(file);
};
onSnapshot(winnerRef, (snap) => {
  const banner = document.getElementById("winnerBanner");
  if (!banner) return;

  if (snap.exists() && snap.data().winner) {
    banner.style.display = "block";
    banner.innerText = "🏆 Winner: " + snap.data().winner;
  } else {
    banner.style.display = "none";
    banner.innerText = "";
  }
});