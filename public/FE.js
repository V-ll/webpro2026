function toISOStringWithTimezone(date) {
  const year = date.getFullYear().toString();
  const month = zeroPadding((date.getMonth() + 1).toString());
  const day = zeroPadding(date.getDate().toString());
  const hour = zeroPadding(date.getHours().toString());
  const minute = zeroPadding(date.getMinutes().toString());
  const second = zeroPadding(date.getSeconds().toString());
  const localDate = `${year}-${month}-${day}`;
  const localTime = `${hour}:${minute}:${second}`;
  const diffFromUtc = date.getTimezoneOffset();
  // UTCだった場合
  if (diffFromUtc === 0) {
    const tzSign = 'Z';
    return `${localDate}T${localTime}${tzSign}`;
  }
  // UTCではない場合
  const tzSign = diffFromUtc < 0 ? '+' : '-';
  const tzHour = zeroPadding((Math.abs(diffFromUtc) / 60).toString());
  const tzMinute = zeroPadding((Math.abs(diffFromUtc) % 60).toString());
  return `${localDate}T${localTime}${tzSign}${tzHour}:${tzMinute}`;
}
function zeroPadding(s) {
  return ('0' + s).slice(-2);
}
function getTaskDue(s) {
  return new Date(s).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
// ===== Panel =====
function togglePanel() {
  const panel = document.getElementById('sidePanel');
  const overlay = document.getElementById('overlay');
  const btn = document.getElementById('togglePanelBtn');
  const isOpen = panel.classList.toggle('open');
  overlay.classList.toggle('active', isOpen);
  btn.setAttribute('aria-expanded', isOpen);
}
// ===== Task Selection =====
function selectTask(taskId) {
  const task = STATE.tasks.find(t => t.id === taskId);
  if (!task) return;
  // 今書いてるんだったらその内容でキャッシュをアップデート
  if (STATE.currentTaskId != taskId) {// 一致しないときだけ移っているので変更する
    // タスク削除に関する遷移については考えなくて良い: 再読込されるらしいので
    const previousTask = STATE.tasks.find(t => t.id === STATE.currentTaskId);
    if (previousTask) previousTask.description = document.getElementById('mdInput').value.trim();
  }
  // Update active item in sidebar
  document.querySelectorAll('.task-item').forEach(el => el.classList.remove('active'));
  const item = document.getElementById('task-item-' + taskId);
  if (item) item.classList.add('active');
  renderTaskEditor(task);
  STATE.currentTaskId = taskId;
}
function renderTaskEditor(task) {
  const main = document.getElementById('mainArea');
  const statusClass = `status-${task.status}`;
  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric' })
    : '未設定';
  main.innerHTML = `
    <div class="task-editor" id="taskEditor">
      <div class="task-top-bar">
        <div class="task-title-display" id="taskTitleDisplay" onclick="startEditTitle()">${escHtml(task.title)}</div>
        <input class="task-title-input" id="taskTitleInput" style="display:none"
               onblur="commitTitle()" onkeydown="if(event.key==='Enter')commitTitle()">
        <div class="task-meta-row">
          <div class="meta-chip meta-popup-anchor" id="chip-status">
            <span class="meta-chip-label">ステータス</span>
            <span class="meta-chip-value" id="taskStatus"
                  onclick="openStatusPopup()" aria-haspopup="true">
              <span class="status-badge ${statusClass}">${escHtml(task.status)}</span>
            </span>
          </div>
          <div class="meta-chip meta-popup-anchor" id="chip-priority">
            <span class="meta-chip-label">優先度</span>
            <span class="meta-chip-value" id="taskPriority"
                  onclick="openPriorityPopup()" aria-haspopup="true"
                  style="background:var(--priority-${task.priority})">${task.priority}</span>
          </div>
          <div class="meta-chip meta-popup-anchor" id="chip-progress">
            <span class="meta-chip-label">進捗</span>
            <span class="meta-chip-value" id="taskProgress"
                  onclick="openProgressPopup()" aria-haspopup="true">${task.progress}%</span>
          </div>
          <div class="meta-chip meta-popup-anchor" id="chip-duedate">
            <span class="meta-chip-label">期限</span>
            <span class="meta-chip-value" id="taskDueDate"
                  onclick="openDueDatePopup()" aria-haspopup="true">${dueDateStr}</span>
          </div>
          <div class="meta-chip meta-popup-anchor" id="chip-reminder">
            <span class="meta-chip-label">リマインド</span>
            <span class="meta-chip-value" id="taskReminder" onclick="openReminderPopup()" aria-haspopup="true">${task.reminders?.length ? `${task.reminders.length}件` : 'なし'}</span>
          </div>
          <button class="task-delete-btn" id="taskDeleteBtn" type="button" onclick="deleteCurrentTask()" aria-label="このタスクを削除">削除</button>
        </div>
      </div>
      <div class="md-area">
        <div class="md-pane">
          <div class="md-pane-label">説明（Markdown）</div>
          <textarea class="md-textarea" id="mdInput" placeholder="# タスクの説明\n\nマークダウンで記述...">${escHtml(task.description || '')}</textarea>
        </div>
        <div class="md-pane">
          <div class="md-pane-label">プレビュー</div>
          <div class="md-preview" id="mdPreview"></div>
        </div>
      </div>
    </div>
    <!-- Status Popup -->
    <div class="meta-popup" id="popup-status" style="display:none" role="dialog" aria-label="ステータス選択">
      <div class="meta-popup-header">ステータス</div>
      <div class="status-add-row">
        <input class="status-add-input" id="statusAddInput" type="text" placeholder="新しいステータスを追加..."
               onkeydown="if(event.key==='Enter')addCustomStatus()">
        <button class="status-add-btn" onclick="addCustomStatus()">追加</button>
      </div>
      <div id="statusOptionList"></div>
    </div>
    <!-- Priority Popup -->
    <div class="meta-popup" id="popup-priority" style="display:none" role="dialog" aria-label="優先度選択">
      <div class="meta-popup-header">優先度 (0 = 最低 / 5 = 最高)</div>
      <div class="priority-grid" id="priorityGrid"></div>
    </div>
    <!-- Progress Popup -->
    <div class="meta-popup" id="popup-progress" style="display:none" role="dialog" aria-label="進捗入力">
      <div class="meta-popup-header">進捗</div>
      <div class="progress-body">
        <div class="progress-number-row">
          <input class="progress-num-input" id="progressNumInput" type="number" min="0" max="100" value="0"
                 oninput="syncProgressSlider()">
          <span style="font-size:14px;color:var(--text-2)">%</span>
        </div>
        <input class="progress-slider" id="progressSlider" type="range" min="0" max="100" value="0"
               oninput="syncProgressNum()">
        <div class="progress-bar-track">
          <div class="progress-bar-fill" id="progressBarFill" style="width:0%"></div>
        </div>
        <button class="progress-save-btn" onclick="saveProgress()">保存</button>
      </div>
    </div>
    <!-- Reminder Popup -->
    <div class="meta-popup" id="popup-reminder" style="display:none" role="dialog" aria-label="リマインダー設定">
      <div class="meta-popup-header">リマインダー</div>
      <div class="reminder-body">
        <div class="reminder-add-row">
          <select class="reminder-select" id="reminderPresetInput" aria-label="期限前のリマインダー">
            <option value="30min">30分前</option>
            <option value="1hour">1時間前</option>
            <option value="3hours">3時間前</option>
            <option value="12hours">12時間前</option>
            <option value="1day">1日前</option>
            <option value="3days">3日前</option>
            <option value="1week">1週間前</option>
          </select>
          <button class="duedate-save-btn" onclick="addPresetReminder()">追加</button>
        </div>
        <div class="reminder-custom-row">
          <span class="reminder-custom-label">日時を指定（時計）</span>
          <div class="reminder-add-row">
            <input class="duedate-input" id="reminderCustomInput" type="datetime-local" aria-label="リマインダー日時">
            <button class="duedate-save-btn" onclick="addCustomReminder()">追加</button>
          </div>
        </div>
        <div class="reminder-list" id="reminderList"></div>
        <button class="reminder-enable-btn" type="button" onclick="enableReminderAlerts()">通知音・ブラウザ通知を有効化</button>
      </div>
    </div>
    <!-- DueDate Popup -->
    <div class="meta-popup" id="popup-duedate" style="display:none" role="dialog" aria-label="期限設定">
      <div class="meta-popup-header">期限</div>
      <div class="duedate-body">
        <input class="duedate-input" id="dueDateInput" type="datetime-local">
        <div class="duedate-btns">
          <button class="duedate-clear-btn" onclick="clearDueDate()">クリア</button>
          <button class="duedate-save-btn" onclick="saveDueDate()">保存</button>
        </div>
      </div>
    </div>
    <!-- ── Toast ── -->
    <div class="toast" id="toast"></div>
  `;
  initMarkdownEditor();
}
// ===== Title Editing =====
function startEditTitle() {
  const display = document.getElementById('taskTitleDisplay');
  const input = document.getElementById('taskTitleInput');
  if (!display || !input) return;
  input.value = display.textContent.trim();
  display.style.display = 'none';
  input.style.display = '';
  input.focus();
  input.select();
}
async function commitTitle() {
  if (STATE.savingTitle) return;
  const display = document.getElementById('taskTitleDisplay');
  const input = document.getElementById('taskTitleInput');
  if (!display || !input) return;
  const newTitle = input.value.trim();
  if (!newTitle || newTitle === display.textContent.trim()) {
    display.style.display = '';
    input.style.display = 'none';
    return;
  }
  STATE.savingTitle = true;
  try {
    const resp = await fetch(`/api/tasks/${STATE.currentTaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle })
    });
    if (!resp.ok) throw new Error(await resp.text());
    display.textContent = newTitle;
    // Update state & sidebar
    const t = STATE.tasks.find(t => t.id === STATE.currentTaskId);
    if (t) t.title = newTitle;
    const item = document.getElementById('task-item-' + STATE.currentTaskId);
    if (item) item.querySelector('.task-item-title').textContent = newTitle;
    showToast('タイトルを更新しました', 'success');
  } catch (e) {
    showToast('更新に失敗しました', 'error');
  } finally {
    STATE.savingTitle = false;
    display.style.display = '';
    input.style.display = 'none';
  }
}
// ===== Markdown Editor =====
function getCursorLinePos(pos, text) {
  const lines = text.split("\n");
  const charCounts = lines.map((line) => line.length + 1);
  if (charCounts.length > 0 && charCounts[0] > 0) { charCounts[0] -= 1; }
  let cur = 0;
  let sum = 0;
  for (let i = 0; i < charCounts.length; i++) {
    sum += charCounts[i];
    if (pos <= sum) {
      cur = i + 1;
      break;
    }
  }
  return [cur, lines.length];
}
function syncScroll() {
  const input = document.getElementById('mdInput');
  const preview = document.getElementById('mdPreview');
  const elements = preview.querySelectorAll('[data-sourcepos]');
  const CursorPos = getCursorLinePos(input.selectionStart, input.value);
  let exactelement;
  for (const el of elements) {
    const parsed = el.getAttribute('data-sourcepos').split(/:-/).map(i => parseInt(i))
    if (parsed[0] > CursorPos[0]) break;
    exactelement = el;
  }
  let temp = [exactelement.offsetTop - input.offsetTop, input.scrollTop, ...CursorPos]
  preview.scrollTop = -13 * 1.7 * (temp[2] - 1) + temp[1] + temp[0]
}
function initMarkdownEditor() {
  const input = document.getElementById('mdInput');
  const preview = document.getElementById('mdPreview');
  if (!input || !preview) return;
  let saveTimer;
  input.addEventListener('input', () => {
    MDForceRender();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveDescription(input.value); }, 1500);
  });
  // input.addEventListener('keyup', () => {
  //   syncScroll();
  // })
  MDForceRender();
}
function MDForceRender() {
  let renderTimer;
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => {
    if (typeof commonmark !== 'undefined') {
      document.getElementById('mdPreview').innerHTML = new commonmark.HtmlRenderer(
        { sourcepos: true }
      ).render(
        commonmark.Parser().parse(document.getElementById('mdInput').value)
      )
    }
    if (typeof hljs !== 'undefined') {//仮定
      hljs.highlightAll();
    } else {
      console.log('hljs.highlightAll not found');
    }
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise();
    }
  }, 100);
}
async function saveDescription(desc) {
  if (!STATE.currentTaskId) return;
  try {
    await fetch(`/api/tasks/${STATE.currentTaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: desc })
    });
  } catch (e) {
    console.log('saveDescription failed:' + e)
  }
}
function parseMarkdown(text) {
  if (!text) return '<span style="color:var(--text-2);font-style:italic">プレビューがここに表示されます...</span>';
  let h = marked.parse(text);
  return h;
}
// ===== Modal =====
function openNewTaskModal() {
  if (!STATE.workspaceId) {
    if (confirm('ワークスペースがありません。初期化しますか？')) initWorkspace();
    return;
  }
  document.getElementById('inputTitle').value = '';
  document.getElementById('inputDueDate').value = '';
  document.getElementById('modalBackdrop').classList.add('open');
  setTimeout(() => document.getElementById('inputTitle').focus(), 80);
}
function closeModal() {
  document.getElementById('modalBackdrop').classList.remove('open');
}
function openWorkspaceModal() {
  document.getElementById('inputWorkspaceName').value = '';
  document.getElementById('inputWorkspaceDescription').value = '';
  document.getElementById('workspaceModalBackdrop').classList.add('open');
  setTimeout(() => document.getElementById('inputWorkspaceName').focus(), 80);
}
function closeWorkspaceModal() {
  document.getElementById('workspaceModalBackdrop').classList.remove('open');
}
async function openWorkspaceManagerModal() {
  const backdrop = document.getElementById('workspaceManagerModalBackdrop');
  const select = document.getElementById('workspaceSelect');
  try {
    const resp = await fetch('/api/workspaces');
    if (!resp.ok) throw new Error('ワークスペースの取得に失敗しました');
    const workspaces = await resp.json();
    select.replaceChildren();
    workspaces.forEach(workspace => {
      const option = document.createElement('option');
      option.value = workspace.id;
      option.textContent = workspace.name;
      option.selected = workspace.id === STATE.workspaceId;
      select.appendChild(option);
    });
    const current = workspaces.find(workspace => workspace.id === STATE.workspaceId);
    document.getElementById('editWorkspaceName').value = current?.name || '';
    document.getElementById('editWorkspaceDescription').value = current?.description || '';
    backdrop.classList.add('open');
    setTimeout(() => document.getElementById('editWorkspaceName').focus(), 80);
  } catch (e) {
    showToast(e.message, 'error');
  }
}
function closeWorkspaceManagerModal() {
  document.getElementById('workspaceManagerModalBackdrop').classList.remove('open');
}
function switchWorkspace(workspaceId) {
  if (Number(workspaceId) !== STATE.workspaceId) {
    window.location.assign(`/?workspaceId=${workspaceId}`);
  }
}
async function saveCurrentWorkspace() {
  if (!STATE.workspaceId) return;
  const name = document.getElementById('editWorkspaceName').value.trim();
  const description = document.getElementById('editWorkspaceDescription').value.trim();
  if (!name) {
    document.getElementById('editWorkspaceName').focus();
    showToast('ワークスペース名を入力してください', 'error');
    return;
  }
  const btn = document.getElementById('saveWorkspaceBtn');
  btn.disabled = true;
  btn.textContent = '保存中...';
  try {
    const resp = await fetch(`/api/workspaces/${STATE.workspaceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'ワークスペースの更新に失敗しました');
    document.getElementById('workspaceName').textContent = data.name;
    closeWorkspaceManagerModal();
    showToast('ワークスペースを更新しました', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '保存';
  }
}
async function deleteCurrentWorkspace() {
  if (!STATE.workspaceId) return;
  const name = document.getElementById('editWorkspaceName').value || 'このワークスペース';
  if (!window.confirm(`「${name}」を削除しますか？\n含まれるリストとタスクも削除され、この操作は元に戻せません。`)) return;
  const btn = document.getElementById('deleteWorkspaceBtn');
  btn.disabled = true;
  btn.textContent = '削除中...';
  try {
    const resp = await fetch(`/api/workspaces/${STATE.workspaceId}`, { method: 'DELETE' });
    if (!resp.ok) {
      const data = await resp.json();
      throw new Error(data.error || 'ワークスペースの削除に失敗しました');
    }
    window.location.assign('/');
  } catch (e) {
    showToast(e.message, 'error');
    btn.disabled = false;
    btn.textContent = 'このワークスペースを削除';
  }
}
// ===== Create Workspace =====
async function createWorkspace() {
  const name = document.getElementById('inputWorkspaceName').value.trim();
  const description = document.getElementById('inputWorkspaceDescription').value.trim();
  if (!name) {
    document.getElementById('inputWorkspaceName').focus();
    showToast('ワークスペース名を入力してください', 'error');
    return;
  }
  const btn = document.getElementById('createWorkspaceBtn');
  btn.disabled = true;
  btn.textContent = '追加中...';
  try {
    const resp = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'ワークスペースの追加に失敗しました');
    window.location.assign(`/?workspaceId=${data.id}`);
  } catch (e) {
    showToast(e.message, 'error');
    btn.disabled = false;
    btn.textContent = '追加';
  }
}
// ===== Create Task =====
async function createTask() {
  const title = document.getElementById('inputTitle').value.trim();
  if (!title) {
    document.getElementById('inputTitle').focus();
    showToast('タスク名を入力してください', 'error');
    return;
  }
  const listId = document.getElementById('inputList').value;
  if (!listId) { showToast('リストを選択してください', 'error'); return; }
  const btn = document.getElementById('createBtn');
  btn.disabled = true;
  btn.textContent = '作成中...';
  try {
    const body = {
      title,
      listId: parseInt(listId),
      createdById: STATE.userId,
      status: document.getElementById('inputStatus').value,
      priority: parseInt(document.getElementById('inputPriority').value),
      dueDate: document.getElementById('inputDueDate').value || null,
    };
    const resp = await fetch(`/api/workspaces/${STATE.workspaceId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.error || 'Unknown error');
    }
    const task = await resp.json();
    STATE.tasks.push(task);
    // サイドパネルに追加
    addTaskToPanel(task, parseInt(listId));
    // 空状態なら差し替え
    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
      renderTaskEditor(task);
    }
    closeModal();
    togglePanel();//今開いているので、閉じる
    showToast('タスクを作成しました ✓', 'success');
    selectTask(task.id);
  } catch (e) {
    showToast('作成に失敗: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '作成';
  }
}
function addTaskToPanel(task, listId) {
  const section = document.getElementById('list-section-' + listId);
  if (!section) return;
  // 「タスクなし」テキストを消す
  const empty = section.querySelector('[style*="タスクなし"]');
  if (empty) empty.remove();
  const statusClass = `status-${task.status}`;
  const div = document.createElement('div');
  div.className = 'task-item';
  div.id = 'task-item-' + task.id;
  div.setAttribute('onclick', `selectTask(${task.id})`);
  div.innerHTML = `
    <div class="task-item-title">${escHtml(task.title)}</div>
    <div class="task-item-meta">
      <span class="status-badge ${statusClass}">${escHtml(task.status)}</span>
    </div>
  `;
  section.appendChild(div);
}
// ===== Init Workspace =====
async function initWorkspace() {
  try {
    const resp = await fetch('/api/init', { method: 'POST' });
    if (!resp.ok) throw new Error('初期化に失敗しました');
    showToast('ワークスペースを作成しました。ページを更新します...', 'success');
    setTimeout(() => location.reload(), 1200);
  } catch (e) {
    showToast(e.message, 'error');
  }
}
// ===== Meta Popup Engine =====
const POPUP_IDS = ['popup-status', 'popup-priority', 'popup-progress', 'popup-duedate', 'popup-reminder'];
let _activePopup = null;
function openPopup(id, anchorId) {
  closeAllPopups();
  const popup = document.getElementById(id);
  const anchor = document.getElementById(anchorId);
  if (!popup || !anchor) return;
  // Position: attach popup inside anchor (which has position:relative)
  anchor.appendChild(popup);
  popup.style.display = '';
  _activePopup = id;
  anchor.querySelector('.meta-chip-value').classList.add('active');
}
function closeAllPopups() {
  POPUP_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('.meta-chip-value.active').forEach(el => el.classList.remove('active'));
  _activePopup = null;
}
// Close popup on outside click
document.addEventListener('click', e => {
  if (!_activePopup) return;
  // const popup = document.getElementById(_activePopup);
  const anchors = document.querySelectorAll('.meta-popup-anchor');
  let inside = false;
  anchors.forEach(a => { if (a.contains(e.target)) inside = true; });
  if (!inside) closeAllPopups();
});
// ── Status Popup ──
let _customStatuses = [];
function openStatusPopup() {
  renderStatusOptions();
  openPopup('popup-status', 'chip-status');
  setTimeout(() => document.getElementById('statusAddInput')?.focus(), 60);
}
function renderStatusOptions() {
  const task = STATE.tasks.find(t => t.id === STATE.currentTaskId);
  const current = task?.status || '未着手';
  const allStatuses = [...Object.keys(STATUS_COLORS), ..._customStatuses];
  const list = document.getElementById('statusOptionList');
  if (!list) return;
  list.innerHTML = allStatuses.map(s => {
    const color = STATUS_COLORS[s] || '#b8b8c8';
    const sel = s === current ? 'selected' : '';
    return `<div class="status-option ${sel}" onclick="selectStatus('${escHtml(s)}')">
      <span class="status-option-dot" style="background:${color}"></span>
      <span>${escHtml(s)}</span>
      ${s === current ? '<span style="margin-left:auto;font-size:11px;color:var(--accent)">✓</span>' : ''}
    </div>`;
  }).join('');
}
function addCustomStatus() {
  const input = document.getElementById('statusAddInput');
  const val = input?.value.trim();
  if (!val) return;
  if (!_customStatuses.includes(val) && !STATUS_COLORS[val]) {
    STATUS_COLORS[val] = '#b8b8c8';
    _customStatuses.push(val);
  }
  input.value = '';
  selectStatus(val);
}
async function selectStatus(status) {
  if (!STATE.currentTaskId) return;
  try {
    const resp = await fetch(`/api/tasks/${STATE.currentTaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!resp.ok) throw new Error();
    // Update state
    const t = STATE.tasks.find(t => t.id === STATE.currentTaskId);
    if (t) t.status = status;
    // Update chip
    const chip = document.getElementById('taskStatus');
    if (chip) chip.innerHTML = `<span class="status-badge status-${escHtml(status)}">${escHtml(status)}</span>`;
    // Update sidebar badge
    const item = document.getElementById('task-item-' + STATE.currentTaskId);
    if (item) {
      const badge = item.querySelector('.status-badge');
      if (badge) { badge.textContent = status; badge.className = `status-badge status-${status}`; }
    }
    closeAllPopups();
    showToast('ステータスを更新しました', 'success');
  } catch { showToast('更新に失敗しました', 'error'); }
}
// ── Priority Popup ──
function openPriorityPopup() {
  const task = STATE.tasks.find(t => t.id === STATE.currentTaskId);
  const current = task?.priority ?? 0;
  const grid = document.getElementById('priorityGrid');
  if (grid) {
    grid.innerHTML = [0, 1, 2, 3, 4, 5].map(p => {
      const sel = p === current ? 'selected' : '';
      return `<button class="priority-btn ${sel}" style="background:var(--priority-${p});color:#fff"
        onclick="selectPriority(${p})" title="${p} ${PRIORITY_LABELS[p]}">${p}</button>`;
    }).join('');
  }
  openPopup('popup-priority', 'chip-priority');
}
async function selectPriority(priority) {
  if (!STATE.currentTaskId) return;
  try {
    const resp = await fetch(`/api/tasks/${STATE.currentTaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority })
    });
    if (!resp.ok) throw new Error();
    const t = STATE.tasks.find(t => t.id === STATE.currentTaskId);
    if (t) t.priority = priority;
    const chip = document.getElementById('taskPriority');
    if (chip) {
      chip.textContent = priority;
      chip.style.backgroundColor = `var(--priority-${priority})`;
    }

    // Update state & sidebar
    const item = document.getElementById('task-item-' + STATE.currentTaskId);
    if (item) {
      for (let i = 0; i <= 5; i++)item.classList.remove('task-priority-' + i);
      item.classList.add('task-priority-' + priority)
    }
    closeAllPopups();
    showToast('優先度を更新しました', 'success');
  } catch { showToast('更新に失敗しました', 'error'); }
}
// ── Progress Popup ──
function openProgressPopup() {
  const task = STATE.tasks.find(t => t.id === STATE.currentTaskId);
  const val = task?.progress ?? 0;
  const numInput = document.getElementById('progressNumInput');
  const slider = document.getElementById('progressSlider');
  const fill = document.getElementById('progressBarFill');
  if (numInput) numInput.value = val;
  if (slider) slider.value = val;
  if (fill) fill.style.width = val + '%';
  openPopup('popup-progress', 'chip-progress');
  setTimeout(() => numInput?.focus(), 60);
}
function syncProgressSlider() {
  const numInput = document.getElementById('progressNumInput');
  const slider = document.getElementById('progressSlider');
  const fill = document.getElementById('progressBarFill');
  let val = Math.min(100, Math.max(0, parseInt(numInput?.value) || 0));
  if (slider) slider.value = val;
  if (fill) fill.style.width = val + '%';
}
function syncProgressNum() {
  const slider = document.getElementById('progressSlider');
  const numInput = document.getElementById('progressNumInput');
  const fill = document.getElementById('progressBarFill');
  const val = parseInt(slider?.value) || 0;
  if (numInput) numInput.value = val;
  if (fill) fill.style.width = val + '%';
}
async function saveProgress() {
  const val = Math.min(100, Math.max(0, parseInt(document.getElementById('progressNumInput')?.value) || 0));
  if (!STATE.currentTaskId) return;
  try {
    const resp = await fetch(`/api/tasks/${STATE.currentTaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress: val })
    });
    if (!resp.ok) throw new Error();
    const t = STATE.tasks.find(t => t.id === STATE.currentTaskId);
    if (t) t.progress = val;
    const chip = document.getElementById('taskProgress');
    if (chip) chip.textContent = val + '%';
    closeAllPopups();
    showToast('進捗を更新しました', 'success');
  } catch { showToast('更新に失敗しました', 'error'); }
}
// ── DueDate Popup ──
function openDueDatePopup() {
  const task = STATE.tasks.find(t => t.id === STATE.currentTaskId);
  const input = document.getElementById('dueDateInput');
  if (input && task?.dueDate) {
    // datetime-local wants "YYYY-MM-DDTHH:mm"
    const d = new Date(task.dueDate);
    const pad = n => String(n).padStart(2, '0');
    input.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } else if (input) {
    input.value = '';
  }
  openPopup('popup-duedate', 'chip-duedate');
}
async function saveDueDate() {
  const val = document.getElementById('dueDateInput')?.value || null;
  await patchDueDate(val);
}
async function clearDueDate() {
  await patchDueDate(null);
}
async function patchDueDate(val) {
  if (!STATE.currentTaskId) return;
  try {
    const resp = await fetch(`/api/tasks/${STATE.currentTaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: val || null })
    });
    if (!resp.ok) throw new Error();
    const t = STATE.tasks.find(t => t.id === STATE.currentTaskId);
    if (t) t.dueDate = val ? new Date(val) : null;
    const chip = document.getElementById('taskDueDate');
    if (chip) {
      if (val) {
        const d = new Date(val);
        chip.textContent = d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      } else {
        chip.textContent = '未設定';
      }
    }
    closeAllPopups();
    showToast(val ? '期限を設定しました' : '期限をクリアしました', 'success');
  } catch { showToast('更新に失敗しました', 'error'); }
}
// ── Reminder Popup ──
function openReminderPopup() {
  renderReminderList();
  openPopup('popup-reminder', 'chip-reminder');
}
function renderReminderList() {
  const task = STATE.tasks.find(t => t.id === STATE.currentTaskId);
  const reminders = task?.reminders || [];
  const list = document.getElementById('reminderList');
  if (!list) return;
  if (!reminders.length) {
    list.innerHTML = '<div class="reminder-empty">リマインダーは未設定です</div>';
    return;
  }
  list.innerHTML = reminders.map(reminder => {
    const label = reminder.reminderType === 'custom'
      ? new Date(reminder.customTime).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : REMINDER_LABELS[reminder.reminderType];
    return `<div class="reminder-item"><span>${label}</span><button class="reminder-remove-btn" type="button" onclick="deleteReminder(${reminder.id})" aria-label="リマインダーを削除">✕</button></div>`;
  }).join('');
}
function updateReminderChip() {
  const task = STATE.tasks.find(t => t.id === STATE.currentTaskId);
  const chip = document.getElementById('taskReminder');
  if (chip) chip.textContent = task?.reminders?.length ? `${task.reminders.length}件` : 'なし';
}
async function addPresetReminder() {
  const task = STATE.tasks.find(t => t.id === STATE.currentTaskId);
  if (!task?.dueDate) {
    showToast('期限を設定してから追加してください', 'error');
    return;
  }
  await addReminder(document.getElementById('reminderPresetInput').value);
}
async function addCustomReminder() {
  const customTime = document.getElementById('reminderCustomInput').value;
  if (!customTime) {
    showToast('日時を指定してください', 'error');
    return;
  }
  await addReminder('custom', toISOStringWithTimezone(new Date(customTime)));
}
async function addReminder(reminderType, customTime = null) {
  if (!STATE.currentTaskId) return;
  try {
    const resp = await fetch(`/api/tasks/${STATE.currentTaskId}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminderType, customTime })
    });
    const reminder = await resp.json();
    if (!resp.ok) throw new Error(reminder.error || 'リマインダーの追加に失敗しました');
    const task = STATE.tasks.find(t => t.id === STATE.currentTaskId);
    if (task) task.reminders = [...(task.reminders || []), reminder];
    document.getElementById('reminderCustomInput').value = '';
    renderReminderList();
    updateReminderChip();
    showToast('リマインダーを追加しました', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}
async function deleteReminder(reminderId, shouldShowToast = true) {
  try {
    const resp = await fetch(`/api/reminders/${reminderId}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error('リマインダーの削除に失敗しました');
    const task = STATE.tasks.find(t => t.id === STATE.currentTaskId);
    if (task) task.reminders = (task.reminders || []).filter(reminder => reminder.id !== reminderId);
    renderReminderList();
    updateReminderChip();
    if (shouldShowToast) showToast('リマインダーを削除しました', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}
// ── Reminder alerts ──
let reminderAudioContext;
async function getReminderAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) return null;
  if (!reminderAudioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    reminderAudioContext = new AudioContextClass();
  }
  if (reminderAudioContext.state === 'suspended') await reminderAudioContext.resume();
  return reminderAudioContext;
}
async function enableReminderAlerts() {
  try {
    await getReminderAudioContext();
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
    showToast('リマインダー通知を有効化しました', 'success');
  } catch {
    showToast('通知音を有効化できませんでした', 'error');
  }
}
function getReminderTime(task, reminder) {
  if (reminder.reminderType === 'custom') return new Date(reminder.customTime).getTime();
  if (!task.dueDate || !REMINDER_OFFSETS[reminder.reminderType]) return null;
  return new Date(task.dueDate).getTime() - REMINDER_OFFSETS[reminder.reminderType];
}
function reminderStorageKey(reminder, reminderTime) {
  return `task-manager-reminder-${reminder.id}-${reminderTime}`;
}
async function playReminderSound(intensity) {
  const context = await getReminderAudioContext();
  if (!context) return;
  const level = Math.min(5, Math.max(1, Number(intensity) || 1));
  const now = context.currentTime;
  for (let index = 0; index < level; index += 1) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = now + index * 0.22;
    oscillator.type = level >= 4 ? 'square' : 'sine';
    oscillator.frequency.value = 440 + level * 80;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.8, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.18);
  }
}
async function fireReminder(task, reminder, reminderTime) {
  const key = reminderStorageKey(reminder, reminderTime);
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, 'fired');
  } catch { /* localStorage が使えない環境でも通知は試みる */ }
  showToast(`リマインダー: ${task.title}`, 'error');
  playReminderSound(reminder.soundIntensity);
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('タスクリマインダー', { body: task.title });
  }
  await deleteReminder(reminder.id, false);// リマインダーの通知とかぶらないように削除通知を出さない
}
function checkReminderSchedules() {
  const now = Date.now();
  STATE.tasks.forEach(task => {
    (task.reminders || []).forEach(reminder => {
      const reminderTime = getReminderTime(task, reminder);
      if (reminderTime && now >= reminderTime) fireReminder(task, reminder, reminderTime);
    });
  });
}
// ── Task deletion ──
async function deleteCurrentTask() {
  const task = STATE.tasks.find(t => t.id === STATE.currentTaskId);
  if (!task) return;
  if (!window.confirm(`「${task.title}」を削除しますか？`)) return;
  const btn = document.getElementById('taskDeleteBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '削除中…';
  }
  try {
    const resp = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    if (!resp.ok) throw new Error(await resp.text());
    window.location.reload();
  } catch (e) {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '削除';
    }
    showToast('削除に失敗しました', 'error');
  }
}
// ===== Toast =====
let toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 3000);
}
// ===== Helpers =====
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initMarkdownEditor();
  document.addEventListener('pointerdown', () => { getReminderAudioContext(); }, { once: true });
  checkReminderSchedules();
  window.setInterval(checkReminderSchedules, 15000);
  // 最初のタスクをアクティブに
  if (STATE.currentTaskId) {
    const item = document.getElementById('task-item-' + STATE.currentTaskId);
    if (item) item.classList.add('active');
  }
});
