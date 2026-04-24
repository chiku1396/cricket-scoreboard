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

/* 🔥 Firebase Config */
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

/* STATE */
let admin = false;
let playersCache = [];
let lastSnapshot = null;

/* ---------------- DATE ---------------- */
function setDate() {
  const d = new Date();
  const formatted =
    d.getDate() + "-" +
    (d.getMonth() + 1) + "-" +
    String(d.getFullYear()).slice(-2);

  document.getElementById("date").innerText = formatted;
}
setDate();

/* ---------------- AUTH ---------------- */

window.login = async function () {
  let email = document.getElementById("email").value;
  let password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);

    // hide login popup after login
    document.getElementById("loginPopup").style.display = "none";

  } catch (error) {
    alert(error.message);
  }
};

window.logout = function () {
  signOut(auth).then(() => {
    location.reload();
  });
};

window.toggleLogin = function () {
  let popup = document.getElementById("loginPopup");
  popup.style.display = popup.style.display === "block" ? "none" : "block";
};

/* ---------------- AUTH STATE ---------------- */

onAuthStateChanged(auth, user => {
  admin = !!user;

  document.getElementById("adminBtn").style.display = user ? "none" : "block";
  document.getElementById("logoutBtn").style.display = user ? "block" : "none";
  document.getElementById("awardsBox").style.display = user ? "block" : "none";
  document.getElementById("resetAwardsBtn").style.display = user ? "block" : "none";

  document.getElementById("loginPopup").style.display = "none";
});

/* ---------------- PLAYERS ---------------- */

onSnapshot(colRef, snapshot => {
  lastSnapshot = snapshot;
  renderUI(snapshot);
});

function renderUI(snapshot) {
  const table = document.getElementById("table");
  table.innerHTML = "";

  playersCache = [];

  snapshot.forEach(docSnap => {
    playersCache.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  let players = [...playersCache];
  players.sort((a, b) => b.runs - a.runs);

  const batsman = document.getElementById("batsman");
  const bowler = document.getElementById("bowler");
  const catcher = document.getElementById("catch");

  batsman.innerHTML =
    bowler.innerHTML =
    catcher.innerHTML =
    `<option value="" disabled selected>Select Player</option>`;

  players.forEach((p, i) => {
    table.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${p.name}</td>
        <td>${p.runs}</td>
        <td>
          ${admin ? `
            <button onclick="updateRun('${p.id}', 2)">+2</button>
            <button onclick="updateRun('${p.id}', -3)">-3</button>
          ` : ""}
        </td>
      </tr>
    `;

    let opt = `<option value="${p.id}">${p.name}</option>`;
    batsman.innerHTML += opt;
    bowler.innerHTML += opt;
    catcher.innerHTML += opt;
  });
}

/* ---------------- UPDATE RUN ---------------- */

window.updateRun = async function (id, val) {
  let player = playersCache.find(p => p.id === id);
  if (!player) return;

  await updateDoc(doc(db, "players", id), {
    runs: player.runs + val
  });
};

/* ---------------- AWARDS ---------------- */

const awardRef = doc(db, "settings", "awards");
const winnerRef = doc(db, "settings", "match");

window.giveSingleAward = async function (type, points) {
  const select = document.getElementById(type);
  const playerId = select.value;

  if (!playerId) return alert("Select player");

  let player = playersCache.find(p => p.id === playerId);
  if (!player) return;

  await updateDoc(doc(db, "players", playerId), {
    runs: player.runs + points
  });

  const text =
    `${type === "batsman" ? "🏏 Batsman of the Day" :
      type === "bowler" ? "🎯 Bowler of the Day" :
      "🧤 Catch of the Day"}: ${player.name} +${points}`;

  const snap = await getDoc(awardRef);
  let list = snap.exists() ? snap.data().list || [] : [];

  list.push(text);

  await setDoc(awardRef, { list });
};

/* ---------------- AWARD FEED ---------------- */

onSnapshot(awardRef, snap => {
  const feed = document.getElementById("awardFeed");
  feed.innerHTML = "";

  if (snap.exists()) {
    (snap.data().list || []).forEach(item => {
      const div = document.createElement("div");
      div.innerHTML = item;
      feed.appendChild(div);
    });
  }
});

/* ---------------- WINNER (FIXED) ---------------- */

onSnapshot(winnerRef, snap => {
  const banner = document.getElementById("winnerBanner");

  if (!snap.exists()) {
    banner.style.display = "block";
    banner.innerText = "🏆 Winner: Not declared yet";
    return;
  }

  const data = snap.data();

  if (data.winner && data.winner.trim() !== "") {
    banner.style.display = "block";
    banner.innerText = "🏆 Winner: " + data.winner;
  } else {
    banner.style.display = "block";
    banner.innerText = "🏆 Winner: Not declared yet";
  }
});

/* ---------------- SET WINNER (FIXED) ---------------- */

window.setWinner = async function () {
  const name = document.getElementById("winnerName").value;

  if (!admin) return alert("Only admin can set winner");

  if (!name || name.trim() === "") return alert("Enter winner name");

  await setDoc(winnerRef, {
    winner: name.trim()
  }, { merge: true });
};

/* ---------------- RESET ---------------- */

window.resetAwards = async function () {
  if (!admin) return alert("Only admin");

  await setDoc(awardRef, { list: [] });

  await setDoc(winnerRef, {
    winner: ""
  }, { merge: true });
};