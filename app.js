let data = {};
let currentRoom = null;
let currentGroup = null;
let puzzleVisibleState = {}; // 每個房間一個記錄
const app = document.getElementById("app");

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
    app.innerHTML = "<h2>請選擇房間：</h2>";
    const container = document.createElement("div");
    container.className = "container";
    // 原有的房間按鈕
    for (const room in data) {
        const groups = data[room].groups;
        let completedGroups = 0;
        const totalGroups = Object.keys(groups).length;
        for (const group in groups) {
            const key = `status_${room}_${group}`;
            const saved = JSON.parse(localStorage.getItem(key) || "{}");
            const totalItems = groups[group].items.length;
			const checkedItems = Object.values(saved).filter(Boolean).length;
            if (checkedItems === totalItems && totalItems > 0) {
                completedGroups++;
            }
        }
        const btn = document.createElement("button");
        btn.className = "room";
        if (completedGroups === totalGroups && totalGroups > 0) {
            btn.classList.add("completed"); // 加上綠色背景
        }
        btn.textContent = `${completedGroups === totalGroups && totalGroups > 0 ? '✅ ' : '🟩'}${room}（${completedGroups}/${totalGroups} 區完成）`;
        btn.onclick = () => {
            currentRoom = room;
            showGroupList(room);
        };		
        container.appendChild(btn);		
    }
	
    app.appendChild(container);
}

//區域清單 (修正版)
// 新增變數記錄展開狀態（像謎題一樣）
let expandedGroupStates = {}; // 格式：expandedGroupStates[room][group] = true/false

function showGroupList(room) {
  app.innerHTML = "";

  // ========== 房間選擇區 ==========
  const roomSection = document.createElement("div");
  roomSection.innerHTML = "<h2>請選擇房間：</h2>";
  const roomContainer = document.createElement("div");
  roomContainer.className = "container";

  for (const r in data) {
    const totalGroups = Object.keys(data[r].groups).length;
    let completedGroups = 0;
    for (const g in data[r].groups) {
      const key = `status_${r}_${g}`;
      const saved = JSON.parse(localStorage.getItem(key) || "{}");
      const total = data[r].groups[g].items.length;
      const done = Object.values(saved).filter(Boolean).length;
      if (total > 0 && done === total) completedGroups++;
    }
    const btn = document.createElement("button");
    btn.className = `room ${r === room ? 'active' : ''} ${completedGroups === totalGroups ? 'completed' : ''}`;
    btn.textContent = `${completedGroups === totalGroups && totalGroups > 0 ? '✅ ' : '🟩'}${r}（${completedGroups}/${totalGroups} 區完成）`;
    btn.onclick = () => showGroupList(r);
    roomContainer.appendChild(btn);
  }
  roomSection.appendChild(roomContainer);
  app.appendChild(roomSection);

  // ========== 區域選擇 ==========
  const groupSection = document.createElement("div");
  groupSection.innerHTML = `<h2>${room} - 區域選擇：</h2>`;
  groupSection.appendChild(renderPuzzleSection(room));

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
    // 按鈕本體
    const btn = document.createElement("button");
    btn.className = `group group-${groupData.color}`;
    btn.textContent = `${done === total && total > 0 ? '✅ ' : '🟩'}${groupName} (${done}/${total})`;
    if (groupName === currentGroup) btn.classList.add("active");
    if (done === total && total > 0) btn.classList.add("completed");

    // 切換展開物品清單
    btn.onclick = () => {
	  const wasExpanded = expandedGroupStates[room][groupName];
	  // 關閉所有區域
	  for (const g in expandedGroupStates[room]) {
		expandedGroupStates[room][g] = false;
	  }
	  // 如果原本是關的，現在打開；原本是開的，就保持關
	  expandedGroupStates[room][groupName] = !wasExpanded;
	  currentGroup = groupName;
	  showGroupList(room);
	};
    wrapper.appendChild(btn);

    // 物品清單 (展開)
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
          showGroupList(room);
        };
        itemWrapper.appendChild(itemBtn);
      });

      // 單一清單的 reset
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

  groupSection.appendChild(groupContainer);
  app.appendChild(groupSection);

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
  app.appendChild(action);
}


function showItemList(room, group) {
    app.innerHTML = "";
    // 1. 房間選擇區 (保持不變)
    const roomListSection = document.createElement("div");
    roomListSection.innerHTML = "<h2>請選擇房間：</h2>";
    const roomContainer = document.createElement("div");
    roomContainer.className = "container";
    for (const r in data) {
    let completedGroups = 0;
    const totalGroups = Object.keys(data[r].groups).length;
    for (const g in data[r].groups) {
        const key = `status_${r}_${g}`;
        const saved = JSON.parse(localStorage.getItem(key) || "{}");
        const totalItems = data[r].groups[g].items.length;
        const checked = Object.values(saved).filter(Boolean).length;
        if (totalItems > 0 && checked === totalItems) completedGroups++;
    }

    const btn = document.createElement("button");
    btn.className = `room ${r === room ? 'active' : ''} ${completedGroups === totalGroups ? 'completed' : ''}`;
    btn.textContent = `${completedGroups === totalGroups && totalGroups > 0 ? '✅ ' : '🟩'}${r}（${completedGroups}/${totalGroups} 區完成）`;
    btn.onclick = () => {
        currentRoom = r;
        showGroupList(r);
    };
    roomContainer.appendChild(btn);
}
    roomListSection.appendChild(roomContainer);
    app.appendChild(roomListSection);
    // 2. 區域選擇區 (新增顏色分類樣式)
    const groupSection = document.createElement("div");
    groupSection.innerHTML = `<h2>${room} - 區域選擇：</h2>`;
    groupSection.appendChild(renderPuzzleSection(room));
    const groupContainer = document.createElement("div");
    groupContainer.className = "container";
    const groups = data[room].groups;
    for (const g in groups) {
        const groupData = groups[g]; // 取得群組資料
        const btn = document.createElement("button");
        btn.className = `group group-${groupData.color}`; // 加入顏色樣式
        if (g === group) btn.classList.add("active");
        const key = `status_${room}_${g}`;
        const saved = JSON.parse(localStorage.getItem(key) || "{}");
        const items = groupData.items; // 正確取得物品陣列
        const completedCount = items.filter(item => saved[item]).length;
        const totalCount = items.length;
        btn.textContent = `${completedCount === totalCount && totalCount > 0 ? '✅ ' : '🟩'}${g} (${completedCount}/${totalCount})`;
        if (completedCount === totalCount && totalCount > 0) {
            btn.classList.add("completed");
        }
        btn.onclick = () => {
            currentGroup = g;
            showItemList(room, g);
        };
        groupContainer.appendChild(btn);
    }
    groupSection.appendChild(groupContainer);
    app.appendChild(groupSection);
    // 3. 物品清單區 (關鍵修改處)
    const itemSection = document.createElement("div");
    itemSection.innerHTML = `<h2>${room} - ${group} 物品清單：</h2>`;
    const itemContainer = document.createElement("div");
    itemContainer.className = "container";
    const groupData = data[room].groups[group]; // 取得當前群組資料
    const key = `status_${room}_${group}`;
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    const items = groupData.items; // 正確取得物品陣列
    items.forEach(item => {
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
    itemSection.appendChild(itemContainer);
    app.appendChild(itemSection);
    // 4. 功能按鈕區 (保持不變)
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
    app.appendChild(actionSection);
}

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
    puzzleContent.style.whiteSpace = "pre-line"; // <--- 關鍵樣式
    // 根據房間決定謎題內容
    let puzzleText = "";
    if (room === "國中房與紙條房") {
        puzzleText = "課表順序:\n國文-英文-數學 \n 國文-英文-數學\n巧克力順序:96%,30^";
    } else if (room === "房間B") {
        puzzleText = "房間B 的謎題：找到四個碎片組合起來，才能解開保險箱。";
    } else {
        puzzleText = `${room} 的謎題尚未設定。`;
    }
    puzzleContent.textContent = puzzleText;

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
    document.getElementById('time-display').textContent = now.toLocaleString('zh-TW', options);
}
updateTime();
setInterval(updateTime, 1000);