let data = {};
let currentRoom = null;
let currentGroup = null;
let puzzleVisibleState = {}; // 每個房間一個記錄
let expandedGroupStates = {}; // 格式：expandedGroupStates[room][group] = true/false
let timerInterval = null;
let startTime = null;

const app = document.getElementById("app");

window.addEventListener("load", () => {
  const savedTime = localStorage.getItem("startTime");
  if (savedTime) {
    startTime = parseInt(savedTime, 10);
    timerInterval = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay();
  }
});

//匯入Json
fetch("items.json")
    .then(res => res.json())
    .then(json => {
        const convertedData = {};
        const colorMap = { // 中英顏色映射
            '綠色': 'green',
            '灰色': 'gray',
            '橘色': 'orange',
            '紫色': 'purple'
        };
        for (const roomName in json.rooms) {
            convertedData[roomName] = { groups: {} };
            const colors = json.rooms[roomName].colors || {};
            for (const color in colors) {
                const groupsInColor = colors[color].groups || {};
                for (const groupName in groupsInColor) {
                    convertedData[roomName].groups[groupName] = {
                        color: colorMap[color], // 轉換為英文
                        items: groupsInColor[groupName] // 物品清單
                    };
                }
            }
        }
        data = convertedData;
        showResetModal(); // 加這行：載入時顯示 modal
    });

//房間清單
function showRoomList() {
  const roomEl = document.getElementById("room-section");
  roomEl.innerHTML = "<h2>請選擇房間：</h2>";
  roomEl.appendChild(createRoomButtons(null));
}

//區域清單
function showGroupList(room) {
  currentRoom = room;
  currentGroup = null;

  const groupSection = document.getElementById("group-section");
  const itemSection = document.getElementById("item-section");
  groupSection.innerHTML = "";
  itemSection.innerHTML = ""; // 清空物品區

  const sectionWrapper = document.createElement("div");
  sectionWrapper.innerHTML = `<h2>${room} - 區域選擇：</h2>`;
  sectionWrapper.appendChild(renderPuzzleSection(room));

  const groupContainer = document.createElement("div");
  groupContainer.className = "container";

  if (!expandedGroupStates[room]) expandedGroupStates[room] = {};

  for (const groupName in data[room].groups) {
    const groupData = data[room].groups[groupName];
    const key = `status_${room}_${groupName}`;
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    const total = groupData.items.length;
    const done = groupData.items.filter(item => saved[item]).length;

    const wrapper = document.createElement("div");

    const btn = document.createElement("button");
    btn.className = `group group-${groupData.color}`;
    btn.textContent = `${done === total && total > 0 ? '✅ ' : '🟩'}${groupName} (${done}/${total})`;
    if (groupName === currentGroup) btn.classList.add("active");
    if (done === total && total > 0) btn.classList.add("completed");

    btn.onclick = () => {
      const wasExpanded = expandedGroupStates[room][groupName];
      for (const g in expandedGroupStates[room]) {
        expandedGroupStates[room][g] = false;
      }
      expandedGroupStates[room][groupName] = !wasExpanded;
      currentGroup = groupName;
      showGroupList(room); // 重新渲染
    };

    wrapper.appendChild(btn);

    // 物品清單
    if (expandedGroupStates[room][groupName]) {
      const itemWrapper = document.createElement("div");
      itemWrapper.style.margin = "10px 0";
      itemWrapper.style.padding = "10px";
      itemWrapper.style.border = "1px solid var(--border-color)";
      itemWrapper.style.borderRadius = "8px";
      itemWrapper.style.background = "var(--bg-body)";

      groupData.items.forEach(item => {
        const itemBtn = document.createElement("button");
        itemBtn.className = "item";
        if (saved[item]) itemBtn.classList.add("completed");
        itemBtn.textContent = saved[item] ? `✅ ${item}` : `🟩 ${item}`;
		itemBtn.onclick = () => {
		  saved[item] = !saved[item];
		  localStorage.setItem(key, JSON.stringify(saved));
		  showGroupList(room);    // ✅ 更新 group 區域
		  showRoomList();         // ✅ 更新 room 區域
		};
        itemWrapper.appendChild(itemBtn);
      });

      const resetBtn = document.createElement("button");
      resetBtn.className = "reset";
      resetBtn.textContent = "↻ 重置該清單";
      resetBtn.onclick = () => {
        localStorage.removeItem(key);
        showGroupList(room);
      };

      itemWrapper.appendChild(resetBtn);
      wrapper.appendChild(itemWrapper);
    }

    groupContainer.appendChild(wrapper);
  }

  sectionWrapper.appendChild(groupContainer);

  const action = document.createElement("div");
  action.className = "action-buttons";

  const backBtn = document.createElement("button");
  backBtn.className = "back";
  backBtn.textContent = "← 返回首頁";
  backBtn.onclick = showRoomList;
  action.appendChild(backBtn);

  const resetBtn = document.createElement("button");
  resetBtn.className = "reset";
  resetBtn.textContent = "↻ 重置整個房間資料";
  resetBtn.onclick = () => {
    for (const g in data[room].groups) {
      localStorage.removeItem(`status_${room}_${g}`);
    }
    showGroupList(room);
  };
  action.appendChild(resetBtn);

  sectionWrapper.appendChild(action);
  groupSection.appendChild(sectionWrapper);
}

//物品清單
function showItemList(room, group) {
  currentRoom = room;
  currentGroup = group;

  const itemSection = document.getElementById("item-section");
  itemSection.innerHTML = ""; // 只清空物品區

  const sectionWrapper = document.createElement("div");
  sectionWrapper.innerHTML = `<h2>${room} - ${group} 物品清單：</h2>`;

  const itemContainer = document.createElement("div");
  itemContainer.className = "container";

  const groupData = data[room].groups[group];
  const key = `status_${room}_${group}`;
  const saved = JSON.parse(localStorage.getItem(key) || "{}");

  groupData.items.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "item";
    if (saved[item]) btn.classList.add("completed");
    btn.textContent = saved[item] ? `✅ ${item}` : `🟩 ${item}`;
    btn.onclick = () => {
      saved[item] = !saved[item];
      localStorage.setItem(key, JSON.stringify(saved));
      showItemList(room, group);
    };
    itemContainer.appendChild(btn);
  });

  sectionWrapper.appendChild(itemContainer);

  const actionSection = document.createElement("div");
  actionSection.className = "action-buttons";

  const backBtn = document.createElement("button");
  backBtn.className = "back";
  backBtn.textContent = "← 返回區域";
  backBtn.onclick = () => showGroupList(room);
  actionSection.appendChild(backBtn);

  const resetBtn = document.createElement("button");
  resetBtn.className = "reset";
  resetBtn.textContent = "↻ 重置當前清單";
  resetBtn.onclick = () => {
    localStorage.removeItem(key);
    showItemList(room, group);
  };
  actionSection.appendChild(resetBtn);

  sectionWrapper.appendChild(actionSection);
  itemSection.appendChild(sectionWrapper);
}


//重製功能
function showResetModal() {
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
        <div class="modal">
            <h2>開始新一輪遊戲？</h2>
            <p>這會清除所有現有的紀錄。</p>
            <div class="modal-actions">
                <button class="reset" id="confirmReset">是，重置</button>
                <button class="back" id="cancelReset">否，保留紀錄</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("confirmReset").onclick = () => {
        localStorage.clear();
        modal.remove();
        showRoomList(); // 繼續顯示主畫面
		startTimer();                      // ✅ 開始計時
    };
    document.getElementById("cancelReset").onclick = () => {
        modal.remove();
        showRoomList();
    };
}

//謎題顯示區
function renderPuzzleSection(room) {
    const puzzleWrapper = document.createElement("div");
    const puzzleToggleBtn = document.createElement("button");
    puzzleToggleBtn.className = "puzzle";
    puzzleToggleBtn.textContent = "🧩 查看本區謎題";
    const puzzleContent = document.createElement("div");
    puzzleContent.className = "puzzle-content";
    puzzleContent.style.display = "none";
    puzzleContent.style.whiteSpace = "pre-line";
    // 根據房間決定謎題內容
    let puzzleText = "";
    let imagePath = "";
    if (room === "國中房與紙條房") {
        puzzleText = "課表順序 ➔ 國文-英文-數學/國文-英文-數學\n巧克力順序:96%,30^";
    } else if (room === "考卷通道與國中大考房") {
        puzzleText = "自然答案 ➔ Fe*2 \n 國文答案 ➔ 迢迢牽牛星，皎皎河漢女；纖纖擢素手，札札弄機杼\n朝代 ➔ 漢朝\n節日 ➔ 七夕";
    } else if (room === "高中房") {
        puzzleText = "貓咪紳士予告信 ➔ 圍巾櫃密碼\n中間櫃子密碼 ➔ LOVED";
    } else if (room === "電影院") {
        puzzleText = "售票機 ➔ 2人 ➔ 穿著Prada的惡魔 ➔ 17:25";
    } else if (room === "高三大考房") {
        puzzleText = "國文科 ➔ A:鈞啟 B:謹緘 C:恭請 D:崇安 E:謹上\n數學科 ➔ 615m\n英文科 ➔ A:in B:on\n社會科 ➔ 雙首長制\n自然科 ➔ 6-甲基-3-辛酮";
        imagePath = "images/room5-puzzle1.jpg";
    } else if (room === "自殺房") {
        puzzleText = "鑰匙鎖\n小 ➔ 不要重蹈覆轍\n中 ➔ 當媽媽的魁儡\n大 ➔ 怎麼會這樣\n特大 ➔ 2月29日\n盲人鎖\n▢▣\n▣▢\n▢▢\n▣▣";
    } else {
        puzzleText = `${room} 此處無謎題。`;
    }
    puzzleContent.textContent = puzzleText;
    // 如果有圖片，添加查看圖片按鈕
    if (imagePath) {
        const imageBtn = document.createElement("button");
        imageBtn.className = "view-image";
        imageBtn.textContent = "🖼️ 查看謎題圖片";
        imageBtn.style.marginTop = "10px";
        imageBtn.style.display = "block";
        imageBtn.onclick = () => {
            // 創建圖片彈出層
            const modal = document.createElement("div");
            modal.className = "image-modal";
            modal.style.position = "fixed";
            modal.style.top = "0";
            modal.style.left = "0";
            modal.style.width = "100%";
            modal.style.height = "100%";
            modal.style.backgroundColor = "rgba(0,0,0,0.8)";
            modal.style.display = "flex";
            modal.style.justifyContent = "center";
            modal.style.alignItems = "center";
            modal.style.zIndex = "1000";
            // 圖片容器
            const imgContainer = document.createElement("div");
            imgContainer.style.position = "relative";
            imgContainer.style.maxWidth = "90%";
            imgContainer.style.maxHeight = "90%";
            // 圖片元素
            const img = document.createElement("img");
            img.src = imagePath;
            img.style.maxWidth = "100%";
            img.style.maxHeight = "90vh";
            img.style.borderRadius = "8px";
			// 加入 loading spinner
			const loading = document.createElement("div");
			loading.className = "loading-spinner";
			loading.textContent = "圖片載入中..."; // 也可用動畫圈圈
			imgContainer.appendChild(loading);
            // 關閉按鈕
			const closeBtn = document.createElement("button");
			closeBtn.className = "close-btn";
			closeBtn.innerHTML = "&times;";
            // 圖片載入完再顯示
			img.onload = () => {
				imgContainer.removeChild(loading);
				img.style.display = "block";
				closeBtn.style.display = "flex"; // 載入完才顯示 X
			};
			// 如果錯誤也移除 loading
			img.onerror = () => {
				loading.textContent = "❌ 圖片載入失敗";
			};
            closeBtn.onclick = () => {
                document.body.removeChild(modal);
            };
            // 點擊背景關閉
            modal.onclick = (e) => {
                if (e.target === modal) {
                    document.body.removeChild(modal);
                }
            };
            imgContainer.appendChild(img);
            imgContainer.appendChild(closeBtn);
            modal.appendChild(imgContainer);
            document.body.appendChild(modal);
        };
        puzzleContent.appendChild(imageBtn);
    }

    // 使用記憶狀態來決定是否展開
    const visible = puzzleVisibleState[room] ?? false;
    puzzleContent.style.display = visible ? "block" : "none";
    // 按下時更新狀態與顯示
    puzzleToggleBtn.onclick = () => {
        puzzleVisibleState[room] = !puzzleVisibleState[room];
        puzzleContent.style.display = puzzleVisibleState[room] ? "block" : "none";
    };
    puzzleWrapper.appendChild(puzzleToggleBtn);
    puzzleWrapper.appendChild(puzzleContent);
    return puzzleWrapper;
}

//顯示時間
function updateTime() {
  const now = new Date();
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const timeString = now.toLocaleString('zh-TW', options);
  let timerString = "";

  if (startTime) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const seconds = String(elapsed % 60).padStart(2, "0");
    timerString = ` ⏱ 復原用時：${minutes}:${seconds}`;
  }

  document.getElementById('time-display').textContent = timeString + timerString;
}


//房間按鈕生成
function createRoomButtons(current) {
    const container = document.createElement("div");
    container.className = "container";
    for (const r in data) {
        const totalGroups = Object.keys(data[r].groups).length;
        let completed = 0;
        for (const g in data[r].groups) {
            const key = `status_${r}_${g}`;
            const saved = JSON.parse(localStorage.getItem(key) || "{}");
            const total = data[r].groups[g].items.length;
            const done = Object.values(saved).filter(Boolean).length;
            if (done === total && total > 0) completed++;
        }
        const btn = document.createElement("button");
        btn.className = `room ${r === current ? "active" : ""} ${completed === totalGroups ? "completed" : ""}`;
        btn.textContent = `${completed === totalGroups && totalGroups > 0 ? '✅ ' : '🟩'}${r}（${completed}/${totalGroups} 區完成）`;
        btn.onclick = () => {
            currentRoom = r;
            showGroupList(r);
        };
        container.appendChild(btn);
    }
    return container;
}

//快速按鈕
function autoClickAllItems() {
  const buttons = document.querySelectorAll("button.item:not(.completed)");
  buttons.forEach(btn => btn.click());
  console.log(`✅ 已點擊 ${buttons.length} 個項目`);
}

function toggleTheme() {
  const body = document.body;
  if (body.classList.contains("theme-default")) {
    body.classList.remove("theme-default");
    body.classList.add("theme-chalkboard");
  } else {
    body.classList.remove("theme-chalkboard");
    body.classList.add("theme-default");
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "t") {
    toggleTheme();
  }
});

//iOS不會被縮放
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});

//iOS不會被縮放
document.addEventListener('dblclick', function (e) {
  e.preventDefault();
});

//快速按鈕
document.addEventListener("keydown", (e) => {
  if (e.shiftKey && e.key === "D") {
    autoClickAllItems();
  }
});

function toggleCSS() {
  const link = document.getElementById("theme-css");
  if (link.href.includes("style.css")) {
    link.href = "style2.css";
  } else {
    link.href = "style.css";
  }
}

const btn = document.getElementById("theme-toggle-btn");
if (btn) {
  btn.onclick = toggleCSS;
}

function startTimer() {
  startTime = Date.now();
  localStorage.setItem("startTime", startTime); // ✅ 儲存開始時間
  updateTimerDisplay(); // 顯示一次（避免 1 秒延遲）
  clearInterval(timerInterval);
  timerInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById("time-display");
  const now = new Date();
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  const timeString = now.toLocaleString('zh-TW', options);

  let timerString = "";
  if (startTime) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const seconds = String(elapsed % 60).padStart(2, "0");
    timerString = ` ⏱ 復原用時：${minutes}:${seconds}`;
  }

  timerDisplay.textContent = timeString + timerString;
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  startTime = null;
  localStorage.removeItem("startTime"); // ✅ 建議補上這行
}

const imagePaths = [
  "images/room5-puzzle1.jpg",
];

imagePaths.forEach(path => {
  const img = new Image();
  img.src = path;
});