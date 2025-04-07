let data = {};
let currentRoom = null;
let currentGroup = null;
const app = document.getElementById("app");

fetch("items.json")
  .then(res => res.json())
  .then(json => {
    data = json.rooms;
    showRoomList();
  });

const progress = document.createElement("div");
progress.className = "progress-bar";
const progressText = document.createElement("span");
progressText.textContent = `進度: ${calculateProgress(items, saved)}`;
progress.appendChild(progressText);
app.appendChild(progress);


function showRoomList() {
  app.innerHTML = "<h2>請選擇房間：</h2>";
  const container = document.createElement("div");
  container.className = "container";
  
  // 原有的房間按鈕
  for (const room in data) {
    const btn = document.createElement("button");
    btn.className = "room";
    btn.textContent = `房間 ${room}`;
    btn.onclick = () => {
      currentRoom = room;
      showGroupList(room);
    };
    container.appendChild(btn);
  }
  
  app.appendChild(container);
  
  // 新增資料管理按鈕 (加在這裏)
  addDataManagementButtons(); // 新增這行
}

function showGroupList(room) {
  // 保留原有的房間選擇標題和按鈕
  const roomListSection = document.createElement("div");
  roomListSection.innerHTML = "<h2>請選擇房間：</h2>";
  const roomContainer = document.createElement("div");
  roomContainer.className = "container";
  
  // 重新渲染所有房間按鈕
  for (const r in data) {
    const btn = document.createElement("button");
    btn.className = "room";
    if (r === room) btn.classList.add("active"); // 標記當前選中的房間
    btn.textContent = `房間 ${r}`;
    btn.onclick = () => {
      currentRoom = r;
      showGroupList(r);
    };
    roomContainer.appendChild(btn);
  }
  
  roomListSection.appendChild(roomContainer);
  
  // 清空 app 並重新添加內容
  app.innerHTML = "";
  app.appendChild(roomListSection);
  
  // 添加區域選擇標題
  const groupTitle = document.createElement("h2");
  groupTitle.textContent = `${room} - 區域選擇：`;
  app.appendChild(groupTitle);
  
  // 添加區域按鈕
  const groupContainer = document.createElement("div");
  groupContainer.className = "container";
  const groups = data[room].groups;
  
  for (const group in groups) {
  const btn = document.createElement("button");
  btn.className = "group";

  // 進度統計
  const key = `status_${room}_${group}`;
  const saved = JSON.parse(localStorage.getItem(key) || "{}");
  const items = groups[group];
  const completedCount = items.filter(item => saved[item]).length;
  const totalCount = items.length;

  // 顯示名稱 + 進度
  btn.textContent = `${group} (${completedCount}/${totalCount})`;

  // 如果全部完成，就加上 completed 樣式（像物品清單一樣綠色）
  if (completedCount === totalCount && totalCount > 0) {
    btn.classList.add("completed");
  }

  // 點擊事件
  btn.onclick = () => {
    currentGroup = group;
    showItemList(room, group);
  };

  groupContainer.appendChild(btn);
}
  
  app.appendChild(groupContainer);
  
  // 添加返回按鈕（如果需要）
  const backBtn = document.createElement("button");
  backBtn.className = "back";
  backBtn.textContent = "← 返回首頁";
  backBtn.onclick = showRoomList;
  app.appendChild(backBtn);
  // 添加重置整個房間資料按鈕
const resetAllBtn = document.createElement("button");
resetAllBtn.className = "reset";
resetAllBtn.textContent = "↻ 重置整個房間資料";
resetAllBtn.onclick = () => {
  const groups = data[room].groups;
  for (const group in groups) {
    const key = `status_${room}_${group}`;
    localStorage.removeItem(key);
  }
  showGroupList(room); // 重新載入區域列表
};

app.appendChild(resetAllBtn);

}

function showItemList(room, group) {
  // 清空整個 app
  app.innerHTML = "";

  // 1. 顯示房間選擇區 (保持最上方)
  const roomSection = document.createElement("div");
  roomSection.innerHTML = "<h2>請選擇房間：</h2>";
  const roomContainer = document.createElement("div");
  roomContainer.className = "container";
  
  for (const r in data) {
    const btn = document.createElement("button");
    btn.className = "room";
    if (r === room) btn.classList.add("active");
    btn.textContent = `房間 ${r}`;
    btn.onclick = () => {
      currentRoom = r;
      showGroupList(r);
    };
    roomContainer.appendChild(btn);
  }
  roomSection.appendChild(roomContainer);
  app.appendChild(roomSection);

  // 2. 顯示區域選擇區 (在房間下方)
  const groupSection = document.createElement("div");
  groupSection.innerHTML = `<h2>${room} - 區域選擇：</h2>`;
  const groupContainer = document.createElement("div");
  groupContainer.className = "container";
  
  const groups = data[room].groups;
for (const g in groups) {
  const btn = document.createElement("button");
  btn.className = "group";
  if (g === group) btn.classList.add("active");

  const key = `status_${room}_${g}`;
  const saved = JSON.parse(localStorage.getItem(key) || "{}");
  const items = groups[g];
  const completedCount = items.filter(item => saved[item]).length;
  const totalCount = items.length;

  btn.textContent = `${g} (${completedCount}/${totalCount})`;

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

  // 3. 顯示物品清單 (在最下方)
  const itemSection = document.createElement("div");
  itemSection.innerHTML = `<h2>${room} - ${group} 物品清單：</h2>`;
  const itemContainer = document.createElement("div");
  itemContainer.className = "container";
  
  const key = `status_${room}_${group}`;
  const saved = JSON.parse(localStorage.getItem(key) || "{}");
  const items = data[room].groups[group];
  
  items.forEach(item => {
    const btn = document.createElement("button");
    btn.className = "item";
    if (saved[item]) btn.classList.add("completed");
    btn.textContent = saved[item] ? `✅ ${item}` : `🟩 ${item}`;
    btn.onclick = () => {
      saved[item] = !saved[item];
      localStorage.setItem(key, JSON.stringify(saved));
      showItemList(room, group); // 重新渲染
    };
    itemContainer.appendChild(btn);
  });
  
  itemSection.appendChild(itemContainer);
  app.appendChild(itemSection);

  // 4. 添加功能按鈕 (重置、返回等)
  const actionSection = document.createElement("div");
  actionSection.className = "action-buttons";
  
  const backBtn = document.createElement("button");
  backBtn.className = "back";
  backBtn.textContent = "← 返回首頁";
  backBtn.onclick = showRoomList;
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
// 新增資料管理按鈕
function addDataManagementButtons() {
  const mgmtContainer = document.createElement("div");
  mgmtContainer.className = "management-container";
  mgmtContainer.style.marginTop = "30px";
  mgmtContainer.style.paddingTop = "20px";
  mgmtContainer.style.borderTop = "1px solid #ddd";

  const exportBtn = document.createElement("button");
  exportBtn.className = "management";
  exportBtn.textContent = "匯出所有清點資料";
  exportBtn.onclick = exportData;
  
  const importBtn = document.createElement("button");
  importBtn.className = "management";
  importBtn.textContent = "匯入清點資料";
  importBtn.onclick = importData;
  
  mgmtContainer.appendChild(exportBtn);
  mgmtContainer.appendChild(importBtn);
  app.appendChild(mgmtContainer);
}

