// 清點系統 JavaScript 邏輯
// 負責房間、區域、物品清單的渲染與管理，以及計時器和主題切換功能

// == 全局狀態 ==
const appState = {
  data: {}, // 房間數據，從 items.json 載入
  currentRoom: null,
  currentGroup: null,
  puzzleVisibleState: {}, // 每個房間的謎題顯示狀態
  expandedGroupStates: {}, // 格式：expandedGroupStates[room][group] = true/false
  timerInterval: null,
  startTime: null
};

// == 初始化 ==
window.addEventListener('load', () => {
  const savedTime = localStorage.getItem('startTime');
  if (savedTime) {
    appState.startTime = parseInt(savedTime, 10);
    appState.timerInterval = setInterval(updateTimerDisplay, 1000);
    updateTimerDisplay();
  }
  loadData();
});

// == 數據處理 ==
function loadData() {
  fetch('items.json')
    .then(response => {
      if (!response.ok) throw new Error('Failed to load items.json');
      return response.json();
    })
    .then(json => {
      const colorMap = {
        '綠色': 'green',
        '灰色': 'gray',
        '橘色': 'orange',
        '紫色': 'purple'
      };
      const convertedData = {};
      for (const roomName in json.rooms) {
        convertedData[roomName] = { groups: {} };
        const colors = json.rooms[roomName].colors || {};
        for (const color in colors) {
          const groupsInColor = colors[color].groups || {};
          for (const groupName in groupsInColor) {
            convertedData[roomName].groups[groupName] = {
              color: colorMap[color],
              items: groupsInColor[groupName]
            };
          }
        }
      }
      appState.data = convertedData;
      showResetModal();
    })
    .catch(error => {
      console.error('Error loading data:', error);
      alert('無法載入房間數據，請稍後重試');
    });
}

// == UI 渲染 ==
// 房間清單
function showRoomList() {
  const roomSection = document.getElementById('room-section');
  roomSection.innerHTML = '<h2>請選擇房間：</h2>';
  roomSection.appendChild(createRoomButtons(null));
}

// 區域清單
function showGroupList(room, shouldScroll = false) {
  appState.currentRoom = room;
  appState.currentGroup = null;

  const groupSection = document.getElementById('group-section');
  const itemSection = document.getElementById('item-section');
  groupSection.innerHTML = '';
  itemSection.innerHTML = '';

  const sectionWrapper = document.createElement('div');
  sectionWrapper.innerHTML = `<h2>${room} - 區域選擇：</h2>`;
  sectionWrapper.appendChild(renderPuzzleSection(room));

  const groupContainer = createElement('div', { className: 'container' });
  appState.expandedGroupStates[room] = appState.expandedGroupStates[room] || {};

  for (const groupName in appState.data[room].groups) {
    const groupData = appState.data[room].groups[groupName];
    const storageKey = `status_${room}_${groupName}`;
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const totalItems = groupData.items.length;
    const completedItems = groupData.items.filter(item => saved[item]).length;

    const groupWrapper = createElement('div');
    const groupButton = createGroupButton(groupName, groupData, saved, totalItems, completedItems);
    groupWrapper.appendChild(groupButton);

    if (appState.expandedGroupStates[room][groupName]) {
      const itemWrapper = createItemWrapper(groupData, saved, storageKey, room);
      groupWrapper.appendChild(itemWrapper);
    }

    groupContainer.appendChild(groupWrapper);
  }

  sectionWrapper.appendChild(groupContainer);
  sectionWrapper.appendChild(createActionButtons(room));
  groupSection.appendChild(sectionWrapper);

  if (shouldScroll) {
    scrollToSection('group-section');
  }
}

// 物品清單
function showItemList(room, group) {
  appState.currentRoom = room;
  appState.currentGroup = group;

  const itemSection = document.getElementById('item-section');
  itemSection.innerHTML = '';

  const sectionWrapper = createElement('div', {
    innerHTML: `<h2>${room} - ${group} 物品清單：</h2>`
  });

  const itemContainer = createElement('div', { className: 'container' });
  const groupData = appState.data[room].groups[group];
  const storageKey = `status_${room}_${group}`;
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');

  groupData.items.forEach(item => {
    const itemButton = createElement('button', {
      className: `item ${saved[item] ? 'completed' : ''}`,
      textContent: saved[item] ? `✅ ${item}` : `🟩 ${item}`,
      onclick: () => {
        saved[item] = !saved[item];
        localStorage.setItem(storageKey, JSON.stringify(saved));
        showItemList(room, group);
      }
    });
    itemContainer.appendChild(itemButton);
  });

  sectionWrapper.appendChild(itemContainer);
  sectionWrapper.appendChild(createItemActionButtons(room, group, storageKey));
  itemSection.appendChild(sectionWrapper);
}

// 重置確認彈窗
function showResetModal() {
  const modal = createElement('div', {
    className: 'modal-overlay',
    innerHTML: `
      <div class="modal">
        <h2>開始新一輪遊戲？</h2>
        <p>這會清除所有現有的紀錄。</p>
        <div class="modal-actions">
          <button class="reset" id="confirmReset">是，重置</button>
          <button class="back" id="cancelReset">否，保留紀錄</button>
        </div>
      </div>
    `
  });

  document.body.appendChild(modal);

  document.getElementById('confirmReset').onclick = () => {
    localStorage.clear();
    modal.remove();
    showRoomList();
    startTimer();
  };

  document.getElementById('cancelReset').onclick = () => {
    modal.remove();
    showRoomList();
  };
}

function resetToHome() {
  // 重置狀態
  appState.currentRoom = null;
  appState.currentGroup = null;

  // 更新房間區塊
  const roomSection = document.getElementById('room-section');
  roomSection.innerHTML = '<h2>請選擇房間：</h2>';
  roomSection.appendChild(createRoomButtons(null));

  // 清空區域和物品區塊
  const groupSection = document.getElementById('group-section');
  const itemSection = document.getElementById('item-section');
  if (groupSection) groupSection.innerHTML = '';
  if (itemSection) itemSection.innerHTML = '';
}

// 謎題顯示區（按要求保留不優化）
function renderPuzzleSection(room) {
  const puzzleWrapper = document.createElement("div");
  const puzzleToggleBtn = document.createElement("button");
  puzzleToggleBtn.className = "puzzle";
  puzzleToggleBtn.textContent = "🧩 查看本區謎題";
  const puzzleContent = document.createElement("div");
  puzzleContent.className = "puzzle-content";
  puzzleContent.style.display = "none";
  puzzleContent.style.whiteSpace = "pre-line";
  let puzzleText = "";
  let imagePath = "";
  if (room === "國中房與紙條房") {
    puzzleText = "(懸賞題目:CABDE)\n1.傳單:能墨教育中心\n2.計畫表:\n 數學基本-自然預報-數學變化-自然結報-數學資優\n國文句型-英文閱測-國文作文-社會筆記-英文文法\n3.巧克力順序:\n65|60|96\n99|86|72";
  } else if (room === "考卷通道與國中大考房") {
    puzzleText = "1.自然答案 ➔ Fe*2 \n 2.國文答案 ➔ 迢迢牽牛星，皎皎河漢女；纖纖擢素手，札札弄機杼\n3.朝代 ➔ 漢朝\n4.節日 ➔ 七夕";
  } else if (room === "高中房") {
    puzzleText = "1.中間櫃子密碼 ➔ LOVED";
  } else if (room === "電影院") {
    puzzleText = "1.售票機:2人|Prda的惡魔|17:25\n2.置物櫃密碼 ➔ A50601(旗語:0601)\n";
  } else if (room === "高三大考房") {
    puzzleText = "國文科 ➔ A:鈞啟 B:謹緘 C:恭請 D:崇安 E:謹上\n數學科 ➔ 615m\n英文科 ➔ A:in B:on\n社會科 ➔ 雙首長制\n自然科 ➔ 6-甲基-3-辛酮";
    imagePath = "images/room5-puzzle1.jpg";
  } else if (room === "自殺房") {
    puzzleText = "鑰匙鎖\n小 ➔ 不要重蹈覆轍\n中 ➔ 當媽媽的魁儡\n大 ➔ 怎麼會這樣\n特大 ➔ 2月29日\n盲人鎖\n▣▣\n▢▣\n▣▣\n▣▣\n▢▣\n▣▣";
  } else {
    puzzleText = `${room} 此處無謎題。`;
  }
  puzzleContent.textContent = puzzleText;
  if (imagePath) {
    const imageBtn = document.createElement("button");
    imageBtn.className = "view-image";
    imageBtn.textContent = "🖼️ 查看謎題圖片";
    imageBtn.style.marginTop = "10px";
    imageBtn.style.display = "block";
    imageBtn.onclick = () => {
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
      const imgContainer = document.createElement("div");
      imgContainer.style.position = "relative";
      imgContainer.style.maxWidth = "90%";
      imgContainer.style.maxHeight = "90%";
      const img = document.createElement("img");
      img.src = imagePath;
      img.style.maxWidth = "100%";
      img.style.maxHeight = "90vh";
      img.style.borderRadius = "8px";
      const loading = document.createElement("div");
      loading.className = "loading-spinner";
      loading.textContent = "圖片載入中...";
      imgContainer.appendChild(loading);
      const closeBtn = document.createElement("button");
      closeBtn.className = "close-btn";
      closeBtn.innerHTML = "×";
      img.onload = () => {
        imgContainer.removeChild(loading);
        img.style.display = "block";
        closeBtn.style.display = "flex";
      };
      img.onerror = () => {
        loading.textContent = "❌ 圖片載入失敗";
      };
      closeBtn.onclick = () => {
        document.body.removeChild(modal);
      };
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
  const visible = appState.puzzleVisibleState[room] ?? false;
  puzzleContent.style.display = visible ? "block" : "none";
  puzzleToggleBtn.onclick = () => {
    appState.puzzleVisibleState[room] = !appState.puzzleVisibleState[room];
    puzzleContent.style.display = appState.puzzleVisibleState[room] ? "block" : "none";
  };
  puzzleWrapper.appendChild(puzzleToggleBtn);
  puzzleWrapper.appendChild(puzzleContent);
  return puzzleWrapper;
}

// == 計時器 ==
function startTimer() {
  appState.startTime = Date.now();
  localStorage.setItem('startTime', appState.startTime);
  updateTimerDisplay();
  clearInterval(appState.timerInterval);
  appState.timerInterval = setInterval(updateTimerDisplay, 1000);
}

function stopTimer() {
  clearInterval(appState.timerInterval);
  appState.timerInterval = null;
  appState.startTime = null;
  localStorage.removeItem('startTime');
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById('time-display');
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
  let timerString = '';
  if (appState.startTime) {
    const elapsed = Math.floor((Date.now() - appState.startTime) / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    timerString = ` ⏱ 復原用時：${minutes}:${seconds}`;
  }
  timerDisplay.textContent = timeString + timerString;
}

// == 工具函數 ==
function createElement(tag, attributes = {}) {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') element.className = value;
    else if (key === 'textContent') element.textContent = value;
    else if (key === 'innerHTML') element.innerHTML = value;
    else if (key === 'onclick') element.onclick = value;
    else element.setAttribute(key, value);
  });
  return element;
}

function createRoomButtons(currentRoom) {
  const container = createElement('div', { className: 'container' });
  for (const room in appState.data) {
    const totalGroups = Object.keys(appState.data[room].groups).length;
    let completedGroups = 0;
    for (const group in appState.data[room].groups) {
      const storageKey = `status_${room}_${group}`;
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const totalItems = appState.data[room].groups[group].items.length;
      const completedItems = Object.values(saved).filter(Boolean).length;
      if (completedItems === totalItems && totalItems > 0) completedGroups++;
    }
    const roomButton = createElement('button', {
      className: `room ${room === currentRoom ? 'active' : ''} ${
        completedGroups === totalGroups ? 'completed' : ''
      }`,
      textContent: `${
        completedGroups === totalGroups && totalGroups > 0 ? '✅ ' : '🟩'
      }${room}（${completedGroups}/${totalGroups} 區完成）`,
      onclick: () => {
        appState.currentRoom = room;
        showGroupList(room, true);
      }
    });
    container.appendChild(roomButton);
  }
  return container;
}

function createGroupButton(groupName, groupData, saved, totalItems, completedItems) {
  const isCompleted = completedItems === totalItems && totalItems > 0;
  const button = createElement('button', {
    className: `group group-${groupData.color} ${isCompleted ? 'completed' : ''} ${
      groupName === appState.currentGroup ? 'active' : ''
    }`,
    textContent: `${isCompleted ? '✅ ' : '🟩'}${groupName} (${completedItems}/${totalItems})`,
    onclick: () => {
      const wasExpanded = appState.expandedGroupStates[appState.currentRoom][groupName];
      appState.expandedGroupStates[appState.currentRoom] = {
        ...appState.expandedGroupStates[appState.currentRoom],
        [groupName]: !wasExpanded
      };
      for (const g in appState.expandedGroupStates[appState.currentRoom]) {
        if (g !== groupName) appState.expandedGroupStates[appState.currentRoom][g] = false;
      }
      appState.currentGroup = groupName;
      showGroupList(appState.currentRoom);
    }
  });
  return button;
}

function createItemWrapper(groupData, saved, storageKey, room) {
  const itemWrapper = createElement('div', { className: 'item-wrapper' });
  groupData.items.forEach(item => {
    const itemButton = createElement('button', {
      className: `item ${saved[item] ? 'completed' : ''}`,
      textContent: saved[item] ? `✅ ${item}` : `🟩 ${item}`,
      onclick: () => {
        saved[item] = !saved[item];
        localStorage.setItem(storageKey, JSON.stringify(saved));
        showGroupList(room);
        showRoomList();
      }
    });
    itemWrapper.appendChild(itemButton);
  });
  const resetButton = createElement('button', {
    className: 'reset',
    textContent: '↻ 重置該清單',
    onclick: () => {
      localStorage.removeItem(storageKey);
      showGroupList(room);
	  showRoomList();
    }
  });
  itemWrapper.appendChild(resetButton);
  return itemWrapper;
}

function createActionButtons(room) {
  const actionContainer = createElement('div', { className: 'action-buttons' });
  const backButton = createElement('button', {
    className: 'back',
    textContent: '← 返回首頁',
	onclick: () => {
    resetToHome();
	}
  });
  
  const resetButton = createElement('button', {
    className: 'reset',
    textContent: '↻ 重置整個房間資料',
    onclick: () => {
      for (const group in appState.data[room].groups) {
        localStorage.removeItem(`status_${room}_${group}`);
      }
      showGroupList(room);
	  showRoomList();
    }
  });
  actionContainer.appendChild(backButton);
  actionContainer.appendChild(resetButton);
  return actionContainer;
}

function createItemActionButtons(room, group, storageKey) {
  const actionContainer = createElement('div', { className: 'action-buttons' });
  const backButton = createElement('button', {
    className: 'back',
    textContent: '← 返回區域',
    onclick: () => showGroupList(room)
  });
  const resetButton = createElement('button', {
    className: 'reset',
    textContent: '↻ 重置當前清單',
    onclick: () => {
      localStorage.removeItem(storageKey);
      showItemList(room, group);
	  showRoomList();
    }
  });
  actionContainer.appendChild(backButton);
  actionContainer.appendChild(resetButton);
  return actionContainer;
}

function scrollToSection(sectionId) {
  requestAnimationFrame(() => {
    const targetElement = document.getElementById(sectionId);
    if (targetElement) {
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - 20;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      if ('ontouchstart' in window) {
        setTimeout(() => {
          window.scrollBy(0, -100);
        }, 300);
      }
    }
  });
}
// == 主題切換邏輯 ==
function toggleThemeAndCSS() {
  const body = document.body;
  const link = document.getElementById('theme-css');
  const isDefaultTheme = body.classList.contains('theme-default');
  const isStyle1 = link.href.includes('style.css');

  // 同步切換類名和 CSS 文件
  if (isDefaultTheme && isStyle1) {
    // 從 theme-default (style.css) 切換到 theme-chalkboard (style2.css)
    body.classList.remove('theme-default');
    body.classList.add('theme-chalkboard');
    link.href = 'style2.css';
  } else {
    // 從 theme-chalkboard (style2.css) 切換到 theme-default (style.css)
    body.classList.remove('theme-chalkboard');
    body.classList.add('theme-default');
    link.href = 'style.css';
  }

  console.log('Theme:', body.classList.contains('theme-chalkboard') ? 'chalkboard' : 'default');
  console.log('CSS:', link.href.includes('style.css') ? 'style.css' : 'style2.css');
}
// == 事件處理 ==
function handleKeydown(event) {
  console.log('Key pressed:', event.key);
  if (event.key.toLowerCase() === 't') {
    toggleThemeAndCSS(); // t 鍵觸發統一切換
  } else if (event.shiftKey && event.key === 'D') {
    autoClickAllItems();
  }
}

function autoClickAllItems() {
  const buttons = document.querySelectorAll("button.item:not(.completed)");
  buttons.forEach(btn => btn.click());
  console.log(`✅ 已點擊 ${buttons.length} 個項目`);
}

// == 事件監聽器 ==
document.addEventListener('keydown', handleKeydown);
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

const themeToggleButton = document.getElementById('theme-toggle-btn');
if (themeToggleButton) {
  themeToggleButton.onclick = toggleThemeAndCSS; // 按鈕觸發統一切換
}

// == 初始化主題 ==
document.addEventListener('DOMContentLoaded', () => {
  const body = document.body;
  const link = document.getElementById('theme-css');
  
  // 確保初始狀態一致
  if (!body.classList.contains('theme-default') && !body.classList.contains('theme-chalkboard')) {
    body.classList.add('theme-default');
    link.href = 'style.css';
  } else if (body.classList.contains('theme-chalkboard')) {
    link.href = 'style2.css';
  }
});

// == 圖片預加載 ==
const imagePaths = ['images/room5-puzzle1.jpg'];
imagePaths.forEach(path => {
  const img = new Image();
  img.src = path;
});