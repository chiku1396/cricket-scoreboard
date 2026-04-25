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
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
const storage = getStorage(app);
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
  admin = user ? true : false;  

  const dateInput = document.getElementById("date");

  // Toggle buttons
  adminBtn.style.display = user ? "none" : "block";
  logoutBtn.style.display = user ? "block" : "none";

  document.getElementById("awardsBox").style.display = user ? "block" : "none";
  resetAwardsBtn.style.display = user ? "block" : "none";

  const today = getTodayDate();

  if (admin) {
    let uploadBox = document.getElementById("uploadBox");

  if (!uploadBox) {
    uploadBox = document.createElement("div");
    uploadBox.id = "uploadBox";
    uploadBox.style.margin = "10px";

    uploadBox.innerHTML = `
      <input type="file" id="fileInput" accept="image/*,application/pdf" />
      <button onclick="uploadFile()">Upload</button>
    `;

    document.body.insertBefore(uploadBox, document.querySelector("table"));
  }
    // ✅ Set today internally
    if (dateInput) dateInput.value = today;

    // ❌ Hide date picker
    //if (dateInput) dateInput.style.display = "none";

    // 📅 Calculate yesterday
    const d = new Date(today);
    d.setDate(d.getDate() - 1);

    const yesterday = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

    // 🔥 Load yesterday data
    await loadMatchByDate(yesterday);
    console.log("yesterday loadMatchByDate called");

  } else {
    // 👤 Normal user
    if (dateInput) {
      dateInput.style.display = "block";
      dateInput.value = today;
    }

    loadMatchByDate(today);
    console.log("today loadMatchByDate called");
  }

  renderTable(playersCache, admin);
  console.log("Render → isAdmin =", admin);
  console.log("renderTable called");
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
        <button onclick="updateRun('${p.id}',2)">+2</button>
        <button onclick="updateRun('${p.id}',-3)">-3</button>
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

  snap.data().list.forEach(item => {
    const div = document.createElement("div");
    div.innerText = item;
    feed.appendChild(div);
  });
});

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
    });

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
/* LOAD MATCH BY DATE */
window.loadMatchByDate = async function (date) {
  if (!date) return;

  const docRef = doc(db, "matches", date);
  const snap = await getDoc(docRef); // ✅ snap is defined here

  const table = document.getElementById("table");
  const feed = document.getElementById("awardFeed");
  const banner = document.getElementById("winnerBanner");

// ✅ ADD HERE (TOP - BEFORE RENDERING NEW DATA)
  const oldFile = document.getElementById("matchFile");
  if (oldFile) oldFile.remove();

  if (!table || !feed || !banner) {
    console.error("Missing DOM elements");
    return;
  }

  table.innerHTML = "";
  feed.innerHTML = "";
  banner.style.display = "none";
  banner.innerText = "";

  if (!snap.exists()) {
    table.innerHTML = "<tr><td colspan='4'>No match found</td></tr>";
    return;
  }

  const data = snap.data();

  // 🏆 winner
  if (data.winner) {
    banner.style.display = "block";
    banner.innerText = "🏆 Winner: " + data.winner;
  }

  // 🏏 players
  data.players?.forEach((p, i) => {
    const actions = admin
    ? `
      <button onclick="updateRun('${p.id}',2)">+2</button>
      <button onclick="updateRun('${p.id}',-3)">-3</button>
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

  // 📄 FILE DISPLAY
if (data.fileUrl) {
  const fileDiv = document.createElement("div");
  fileDiv.style.margin = "15px";

  if (data.fileUrl.includes(".pdf")) {
    fileDiv.innerHTML = `
      <iframe src="${data.fileUrl}" width="90%" height="500px"></iframe>
    `;
  } else {
    fileDiv.innerHTML = `
      <img src="${data.fileUrl}" style="max-width:90%; border-radius:10px;" />
    `;
  }

  document.body.appendChild(fileDiv);
}
const fileDiv = document.createElement("div");
fileDiv.id = "matchFile";
};

window.uploadFile = async function () {
  if (!admin) return alert("Only admin can upload");

  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];

  if (!file) return alert("Select file first");

  const date = document.getElementById("date").value;

  try {
    const storageRef = ref(storage, `matches/${date}/${file.name}`);

    await uploadBytes(storageRef, file);

    const url = await getDownloadURL(storageRef);

    // save URL in Firestore
    await setDoc(doc(db, "matches", date), {
      fileUrl: url
    }, { merge: true });

    alert("File uploaded successfully!");

  } catch (err) {
    console.error(err);
    alert("Upload failed");
  }
};