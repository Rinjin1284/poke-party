let POKEMON = [];
let selected = []; // array of pokemon entries, allows duplicates, max 6
let charPhotoDataUrl = null;
let finalImageUrl = null;

const $ = (id) => document.getElementById(id);

function toHiragana(str) {
  return str.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

function normalizeQuery(str) {
  return toHiragana(str.trim());
}

async function loadData() {
  const res = await fetch("pokemon_data.json");
  POKEMON = await res.json();
}

function renderCandidates() {
  const q = normalizeQuery($("pokeSearch").value);
  const box = $("candidates");
  box.innerHTML = "";
  if (!q) return;

  const matches = POKEMON.filter((p) =>
    p.kana_keys.some((k) => k.startsWith(q))
  ).slice(0, 40);

  if (matches.length === 0) {
    const div = document.createElement("div");
    div.className = "no-match";
    div.textContent = "見つかりませんでした";
    box.appendChild(div);
    return;
  }

  matches.forEach((p) => {
    const btn = document.createElement("button");
    btn.className = "cand-btn";
    btn.textContent = p.display_name;
    btn.addEventListener("click", () => selectPokemon(p));
    box.appendChild(btn);
  });
}

function selectPokemon(p) {
  if (selected.length >= 6) return;
  selected.push(p);
  $("pokeSearch").value = "";
  renderCandidates();
  renderSlots();
}

function removeSlot(index) {
  selected.splice(index, 1);
  renderSlots();
}

function renderSlots() {
  const grid = $("slots");
  grid.innerHTML = "";
  $("slotCount").textContent = selected.length;

  for (let i = 0; i < 6; i++) {
    const slot = document.createElement("div");
    const p = selected[i];
    if (p) {
      slot.className = "slot filled";
      slot.innerHTML = `
        <img src="${p.image}" alt="${p.display_name}">
        <span class="slot-name">${p.display_name}</span>
        <button class="remove-x" aria-label="外す">×</button>
      `;
      slot.querySelector(".remove-x").addEventListener("click", () => removeSlot(i));
    } else {
      slot.className = "slot";
      slot.innerHTML = `<span class="empty-mark">＋</span>`;
    }
    grid.appendChild(slot);
  }

  if (selected.length === 6) {
    showResult();
  }
}

function showResult() {
  $("build-screen").classList.add("hidden");
  $("result-screen").classList.remove("hidden");
  $("resultName").textContent = $("charName").value.trim() || "だれか";

  const grid = $("resultGrid");
  grid.innerHTML = "";
  selected.forEach((p) => {
    const div = document.createElement("div");
    div.className = "rslot";
    div.innerHTML = `<img src="${p.image}" alt="${p.display_name}" crossorigin="anonymous"><p>${p.display_name}</p>`;
    grid.appendChild(div);
  });
}

function backToBuild() {
  $("result-screen").classList.add("hidden");
  $("build-screen").classList.remove("hidden");
  $("finalImageWrap").classList.add("hidden");
  $("saveBtn").textContent = "カード画像を作成";
}

function resetAll() {
  selected = [];
  charPhotoDataUrl = null;
  if (finalImageUrl) URL.revokeObjectURL(finalImageUrl);
  finalImageUrl = null;
  $("charName").value = "";
  $("pokeSearch").value = "";
  $("photoImg").classList.add("hidden");
  $("photoImg").src = "";
  $("cameraIcon").classList.remove("hidden");
  $("finalImageWrap").classList.add("hidden");
  $("saveBtn").textContent = "カード画像を作成";
  renderCandidates();
  renderSlots();
  backToBuild();
}

async function saveAsImage() {
  const node = $("resultCard");
  const btn = $("saveBtn");
  btn.disabled = true;
  btn.textContent = "作成中…";
  try {
    const canvas = await html2canvas(node, { backgroundColor: "#f4f3ef", useCORS: true, scale: 2 });
    canvas.toBlob((blob) => {
      if (finalImageUrl) URL.revokeObjectURL(finalImageUrl);
      finalImageUrl = URL.createObjectURL(blob);
      $("finalImage").src = finalImageUrl;
      $("finalImageWrap").classList.remove("hidden");
      $("finalImageWrap").scrollIntoView({ behavior: "smooth", block: "start" });
      btn.disabled = false;
      btn.textContent = "カード画像を作り直す";
    }, "image/png");
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "カード画像を作成";
    alert("画像の生成に失敗しました: " + e.message);
  }
}

function cropToSquareDataUrl(img, size = 300) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/png");
}

function setupPhotoPicker() {
  $("photoBtn").addEventListener("click", () => $("photoInput").click());
  $("photoInput").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const tempImg = new Image();
      tempImg.onload = () => {
        charPhotoDataUrl = cropToSquareDataUrl(tempImg);
        const img = $("photoImg");
        img.src = charPhotoDataUrl;
        img.classList.remove("hidden");
        $("cameraIcon").classList.add("hidden");
      };
      tempImg.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function init() {
  $("pokeSearch").addEventListener("input", renderCandidates);
  $("resetBtn").addEventListener("click", resetAll);
  $("gotoResultBtn").addEventListener("click", showResult);
  $("backBtn").addEventListener("click", backToBuild);
  $("saveBtn").addEventListener("click", saveAsImage);
  setupPhotoPicker();
  renderSlots();
  loadData();
}

init();
