(() => {
  const STORAGE_KEY = "lunch_roulette_menus_v1";
  const SPIN_DURATION_MS = 2000;
  const SLICE_COLORS = [
    "#FF6B35",
    "#FFB703",
    "#2A9D8F",
    "#E76F51",
    "#4EA8DE",
    "#8AC926",
    "#F77F00",
    "#9B5DE5",
    "#F15BB5",
    "#00BBF9",
  ];

  const canvas = document.getElementById("rouletteCanvas");
  const ctx = canvas.getContext("2d");
  const spinButton = document.getElementById("spinButton");
  const resultBox = document.getElementById("resultBox");
  const resultText = document.getElementById("resultText");
  const menuForm = document.getElementById("menuForm");
  const menuInput = document.getElementById("menuInput");
  const addButton = document.getElementById("addButton");
  const formMessage = document.getElementById("formMessage");
  const menuList = document.getElementById("menuList");
  const menuCount = document.getElementById("menuCount");
  const emptyState = document.getElementById("emptyState");

  let menus = loadMenus();
  let currentRotation = 0;
  let isSpinning = false;

  function loadMenus() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  function saveMenus() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(menus));
    } catch {
      // Ignore storage quota or restricted context errors
    }
  }

  function getSliceColor(index) {
    return SLICE_COLORS[index % SLICE_COLORS.length];
  }

  function setupCanvasResolution() {
    const dpr = window.devicePixelRatio || 1;
    const size = 420;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawWheel() {
    const size = 420;
    const center = size / 2;
    const radius = center - 10;

    ctx.clearRect(0, 0, size, size);

    if (menus.length === 0) {
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fillStyle = "#f7eadc";
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#e8d2bc";
      ctx.stroke();

      ctx.fillStyle = "#7a6655";
      ctx.font = "700 18px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("메뉴를 추가해 주세요", center, center);
      return;
    }

    const sliceAngle = (Math.PI * 2) / menus.length;

    menus.forEach((name, index) => {
      const startAngle = currentRotation + index * sliceAngle;
      const endAngle = startAngle + sliceAngle;

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = getSliceColor(index);
      ctx.fill();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();

      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + sliceAngle / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.font = menus.length > 8 ? "700 14px sans-serif" : "700 17px sans-serif";
      ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = 3;

      const label = name.length > 10 ? `${name.slice(0, 9)}…` : name;
      ctx.fillText(label, radius - 22, 0);
      ctx.restore();
    });

    // Center hub
    ctx.beginPath();
    ctx.arc(center, center, 24, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#2b2118";
    ctx.stroke();
  }

  function renderMenuList() {
    menuList.innerHTML = "";
    menuCount.textContent = `${menus.length}개`;
    emptyState.classList.toggle("hidden", menus.length > 0);

    menus.forEach((name, index) => {
      const li = document.createElement("li");
      li.className = "menu-item";

      const info = document.createElement("div");
      info.className = "menu-item-info";

      const dot = document.createElement("span");
      dot.className = "color-dot";
      dot.style.backgroundColor = getSliceColor(index);

      const span = document.createElement("span");
      span.className = "menu-item-name";
      span.textContent = name;

      info.appendChild(dot);
      info.appendChild(span);

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn-delete";
      deleteBtn.textContent = "삭제";
      deleteBtn.disabled = isSpinning;
      deleteBtn.setAttribute("aria-label", `${name} 삭제`);
      deleteBtn.addEventListener("click", () => deleteMenu(index));

      li.appendChild(info);
      li.appendChild(deleteBtn);
      menuList.appendChild(li);
    });
  }

  function updateControls() {
    spinButton.disabled = isSpinning || menus.length === 0;
    addButton.disabled = isSpinning;
    menuInput.disabled = isSpinning;
    const deleteButtons = menuList.querySelectorAll(".btn-delete");
    deleteButtons.forEach((btn) => {
      btn.disabled = isSpinning;
    });

    if (!isSpinning && menus.length === 0) {
      resultBox.classList.remove("is-winner");
      resultText.textContent = "메뉴를 추가해 주세요";
    } else if (!isSpinning && !resultBox.classList.contains("is-winner")) {
      resultText.textContent = "돌리기 버튼을 눌러보세요!";
    }
  }

  function renderAll() {
    renderMenuList();
    drawWheel();
    updateControls();
  }

  function addMenu(rawName) {
    const name = rawName.trim();
    if (!name) {
      formMessage.textContent = "메뉴 이름을 입력해 주세요.";
      return;
    }
    if (menus.includes(name)) {
      formMessage.textContent = "이미 목록에 있는 메뉴입니다.";
      return;
    }

    formMessage.textContent = "";
    menus.push(name);
    saveMenus();
    menuInput.value = "";
    menuInput.focus();
    resultBox.classList.remove("is-winner");
    renderAll();
  }

  function deleteMenu(index) {
    if (isSpinning) return;
    menus.splice(index, 1);
    saveMenus();
    formMessage.textContent = "";
    resultBox.classList.remove("is-winner");
    renderAll();
  }

  function spinWheel() {
    if (isSpinning || menus.length === 0) return;

    isSpinning = true;
    formMessage.textContent = "";
    resultBox.classList.remove("is-winner");
    resultText.textContent = "두구두구... 고르는 중!";
    updateControls();

    const winnerIndex = Math.floor(Math.random() * menus.length);
    const sliceAngle = (Math.PI * 2) / menus.length;
    const pointerAngle = -Math.PI / 2;
    const jitter = (Math.random() - 0.5) * sliceAngle * 0.6;
    const targetSliceCenter = (winnerIndex + 0.5) * sliceAngle + jitter;

    const baseTarget = pointerAngle - targetSliceCenter;
    const fullTurns = 6 * Math.PI * 2;
    const startRotation = currentRotation;
    const normalizedDelta =
      ((baseTarget - startRotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const totalDelta = fullTurns + normalizedDelta;

    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / SPIN_DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      currentRotation = startRotation + totalDelta * eased;
      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(frame);
        return;
      }

      isSpinning = false;
      resultBox.classList.add("is-winner");
      resultText.textContent = menus[winnerIndex];
      updateControls();
    }

    requestAnimationFrame(frame);
  }

  menuForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (isSpinning) return;
    addMenu(menuInput.value);
  });

  spinButton.addEventListener("click", spinWheel);

  setupCanvasResolution();
  renderAll();
})();

