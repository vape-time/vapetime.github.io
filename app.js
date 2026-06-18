import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwTMsX9hJnBBPbNOArjDrXdZ84RtPokIE",
  authDomain: "vape-time-cb199.firebaseapp.com",
  projectId: "vape-time-cb199",
  storageBucket: "vape-time-cb199.firebasestorage.app",
  messagingSenderId: "329958219626",
  appId: "1:329958219626:web:d974e50e01427def9f0f13",
  measurementId: "G-80848Z5Y4Y"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const vapeBtn = document.getElementById("vapeBtn");
const led = document.getElementById("led");
const totalCount = document.getElementById("totalCount");
const nicknameInput = document.getElementById("nicknameInput");
const saveNameBtn = document.getElementById("saveNameBtn");
const currentName = document.getElementById("currentName");
const rankingList = document.getElementById("rankingList");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendChatBtn = document.getElementById("sendChatBtn");
const vapeSound = document.getElementById("vapeSound");

let userId = localStorage.getItem("userId");

if (!userId) {
  userId = crypto.randomUUID();
  localStorage.setItem("userId", userId);
}
let nickname = localStorage.getItem("nickname") || "익명";
currentName.textContent = nickname;

const badPatterns = [
  /시+발+/gi,
  /씨+발+/gi,
  /ㅅ+\s*ㅂ+/gi,
  /병\s*신/gi,
  /ㅂ\s*ㅅ/gi,
  /좆/gi,
  /존\s*나/gi,
  /ㅈ\s*ㄴ/gi,

  /섹\s*스/gi,
  /섹1스/gi,
  /s\s*e\s*x/gi,
  /s3x/gi,
  /야\s*스/gi,

  /보\s*지/gi,
  /자\s*지/gi,

  /니\s*애\s*미/gi,
  /느\s*금/gi,
  /애\s*미/gi,

  /죽\s*어/gi,
  /꺼\s*져/gi
];

function cleanText(text) {

  let result = text
    .replaceAll("1", "ㅣ")
    .replaceAll("!", "ㅣ")
    .replaceAll("3", "e")
    .replaceAll("0", "o");

  badPatterns.forEach(pattern => {
    result = result.replace(pattern, "***");
  });

  return result.trim();
}

saveNameBtn.addEventListener("click", async () => {
  const name = cleanText(nicknameInput.value.trim()).slice(0, 12);

  if (name.length < 2) {
    alert("닉네임은 2글자 이상");
    return;
  }

  const nameKey = name.toLowerCase();
  const reservedRef = doc(db, "reservedNames", nameKey);
  const reservedSnap = await getDoc(reservedRef);

  if (reservedSnap.exists() && reservedSnap.data().userId !== userId) {
    alert("이미 사용 중인 닉네임이야");
    return;
  }

  nickname = name;
  localStorage.setItem("nickname", nickname);
  currentName.textContent = nickname;
  nicknameInput.value = "";

  await setDoc(reservedRef, {
    name: nickname,
    userId: userId,
    createdAt: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "ranking", userId), {
    name: nickname,
    count: increment(0),
    updatedAt: serverTimestamp()
  }, { merge: true });
});

let isHolding = false;
let holdStart = 0;
let soundLoopTimer = null;

vapeBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  
  isHolding = true;
  holdStart = Date.now();

  led.classList.add("active");
  vapeBtn.classList.add("pressed");

  try {
  vapeSound.loop = false;
  vapeSound.volume = 0.4;
  vapeSound.currentTime = 0;
  vapeSound.play();

  clearInterval(soundLoopTimer);
  soundLoopTimer = setInterval(() => {
    if (vapeSound.duration && vapeSound.currentTime > vapeSound.duration - 0.12) {
      vapeSound.currentTime = 0.05;
      vapeSound.play();
    }
  }, 30);
} catch {}
});

vapeBtn.addEventListener("pointerup", async () => {
  if (!isHolding) return;

  isHolding = false;
  led.classList.remove("active");
  vapeBtn.classList.remove("pressed");

  clearInterval(soundLoopTimer);
soundLoopTimer = null;
  
vapeSound.pause();
vapeSound.currentTime = 0;
vapeSound.loop = false;
  
  const holdTime = Date.now() - holdStart;

  if (holdTime < 400) {
    alert("0.4초 이상 길게 눌러야 해");
    return;
  }

  const particleCount = Math.min(Math.floor(holdTime / 80), 80);
showMistParticles(particleCount);

  const counterRef = doc(db, "site", "counter");
  const userRef = doc(db, "ranking", userId);

  await setDoc(counterRef, { total: increment(1) }, { merge: true });

  await setDoc(userRef, {
    name: nickname,
    count: increment(1),
    updatedAt: serverTimestamp()
  }, { merge: true });
});

vapeBtn.addEventListener("pointercancel", () => {
  isHolding = false;
  led.classList.remove("active");
  vapeBtn.classList.remove("pressed");

  vapeSound.pause();
vapeSound.currentTime = 0;
vapeSound.loop = false;
});

function showMistParticles(amount) {
  const wrap = document.querySelector(".smoke-wrap");

  for (let i = 0; i < amount; i++) {
    const p = document.createElement("span");
    p.className = "mist-particle";

    p.style.left = `${25 + Math.random() * 50}%`;
    p.style.animationDuration = `${1.2 + Math.random() * 1.4}s`;
    p.style.transform = `scale(${0.7 + Math.random() * 1.4})`;

    wrap.appendChild(p);

    setTimeout(() => {
      p.remove();
    }, 3000);
  }
}


onSnapshot(doc(db, "site", "counter"), (snap) => {
  totalCount.textContent = snap.exists() ? snap.data().total || 0 : 0;
});

const rankingQuery = query(collection(db, "ranking"), orderBy("count", "desc"), limit(30));

onSnapshot(rankingQuery, (snapshot) => {
  rankingList.innerHTML = "";

  let rank = 1;

  snapshot.forEach(docSnap => {
    const data = docSnap.data();

    if (!data.name || !data.count || data.count <= 0) return;
if (rank > 10) return;

    const div = document.createElement("div");
    div.className = "rank-item";

    div.innerHTML = `
      <span class="rank-num">${rank}등</span>
      <span class="rank-name">${data.name}</span>
      <span class="rank-count">${data.count}회</span>
    `;

    rankingList.appendChild(div);
    rank++;
  });

  if (rank === 1) {
    rankingList.innerHTML = "<p>아직 랭킹이 없습니다.</p>";
  }
});

let lastChatTime = 0;

async function sendChat() {
  const raw = chatInput.value.trim();

  if (!raw) return;

  const now = Date.now();

  if (now - lastChatTime < 3000) {
    alert("채팅은 3초에 한 번만 가능");
    return;
  }
lastChatTime = now;

const msg = cleanText(raw).slice(0, 80);

await addDoc(collection(db, "chats"), {
  userId: userId,
  name: nickname,
  message: msg,
  createdAt: serverTimestamp()
});

chatInput.value = "";
}
sendChatBtn.addEventListener("click", sendChat);

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

const chatQuery = query(collection(db, "chats"), orderBy("createdAt", "desc"), limit(30));

onSnapshot(chatQuery, (snapshot) => {
  chatBox.innerHTML = "";

  const messages = [];
  snapshot.forEach(docSnap => messages.push(docSnap.data()));
  messages.reverse();

  messages.forEach(data => {
  if (!data.createdAt) return;

  const created =
    data.createdAt.seconds
      ? data.createdAt.seconds * 1000
      : Date.now();

  if (Date.now() - created > 180000) return;

  const div = document.createElement("div");
  div.textContent = `${data.name}: ${data.message}`;
  chatBox.appendChild(div);
});

  chatBox.scrollTop = chatBox.scrollHeight;
});
