/*
  MyDay Pro – JavaScript logic
  This script manages user data, tasks and goals, renders the UI and handles user interactions.
  Data is persisted in localStorage and notifications are scheduled 5 minutes before task deadlines.
*/

(() => {
  // Constant categories for tasks
  const CATEGORIES = [
    'Déjeuner',
    'Hygiène',
    'Musculation',
    'Lecture',
    'Business',
    'Ménage',
    'Sommeil'
  ];

  // DOM elements
  const nameOverlay = document.getElementById('name-overlay');
  const userNameInput = document.getElementById('user-name-input');
  const saveUserNameBtn = document.getElementById('save-user-name-btn');
  const dashboardGreeting = document.getElementById('dashboard-greeting');
  const dashboardDate = document.getElementById('dashboard-date');
  const dashboardCardsContainer = document.getElementById('dashboard-cards');
  const nextTasksList = document.getElementById('next-tasks-list');
  const tasksContainer = document.getElementById('tasks-container');
  const goalsContainer = document.getElementById('goals-container');
  const profileInfo = document.getElementById('profile-info');
  const themeSwitch = document.getElementById('theme-switch');
  const editNameInput = document.getElementById('edit-name-input');
  const updateNameBtn = document.getElementById('update-name-btn');
  const resetDataBtn = document.getElementById('reset-data-btn');
  const addTaskBtn = document.getElementById('add-task-btn');
  const taskModal = document.getElementById('task-modal');
  const taskForm = document.getElementById('task-form');
  const taskModalTitle = document.getElementById('task-modal-title');
  const taskNameInput = document.getElementById('task-name-input');
  const taskCategoryInput = document.getElementById('task-category-input');
  const taskTimeInput = document.getElementById('task-time-input');
  const taskPriorityInput = document.getElementById('task-priority-input');
  const taskDescInput = document.getElementById('task-desc-input');
  const cancelTaskBtn = document.getElementById('cancel-task-btn');
  const addGoalBtn = document.getElementById('add-goal-btn');
  const goalModal = document.getElementById('goal-modal');
  const goalForm = document.getElementById('goal-form');
  const goalModalTitle = document.getElementById('goal-modal-title');
  const goalNameInput = document.getElementById('goal-name-input');
  const goalProgressInput = document.getElementById('goal-progress-input');
  const goalProgressValue = document.getElementById('goal-progress-value');
  const goalDueInput = document.getElementById('goal-due-input');
  const goalDescInput = document.getElementById('goal-desc-input');
  const cancelGoalBtn = document.getElementById('cancel-goal-btn');
  // Navigation
  const navButtons = document.querySelectorAll('.nav-btn');

  // Application state
  let userName = null;
  let theme = 'dark';
  let tasks = [];
  let goals = [];
  let editingTaskId = null;
  let editingGoalId = null;
  let notificationTimers = {};

  // Utility functions
  function saveToLocalStorage() {
    localStorage.setItem('mydaypro_userName', userName || '');
    localStorage.setItem('mydaypro_theme', theme);
    localStorage.setItem('mydaypro_tasks', JSON.stringify(tasks));
    localStorage.setItem('mydaypro_goals', JSON.stringify(goals));
  }

  function loadFromLocalStorage() {
    const storedName = localStorage.getItem('mydaypro_userName');
    userName = storedName ? storedName : null;
    const storedTheme = localStorage.getItem('mydaypro_theme');
    theme = storedTheme || 'dark';
    const storedTasks = localStorage.getItem('mydaypro_tasks');
    tasks = storedTasks ? JSON.parse(storedTasks) : [];
    const storedGoals = localStorage.getItem('mydaypro_goals');
    goals = storedGoals ? JSON.parse(storedGoals) : [];
  }

  function applyTheme() {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      themeSwitch.checked = true;
    } else {
      document.body.classList.remove('light-theme');
      themeSwitch.checked = false;
    }
  }

  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  function showNotification(task) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      const due = new Date(task.datetime);
      const timeStr = due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      new Notification('Rappel de tâche', {
        body: `${task.name} à ${timeStr}`,
        icon: 'assets/icon-192.png'
      });
    }
  }

  function scheduleNotification(task) {
    // Cancel existing timer if any
    if (notificationTimers[task.id]) {
      clearTimeout(notificationTimers[task.id]);
    }
    if (task.completed) return;
    const dueTime = new Date(task.datetime).getTime();
    const notifyTime = dueTime - 5 * 60 * 1000; // 5 minutes before
    const delay = notifyTime - Date.now();
    if (delay > 0) {
      const timerId = setTimeout(() => {
        showNotification(task);
      }, delay);
      notificationTimers[task.id] = timerId;
    }
  }

  function scheduleAllNotifications() {
    tasks.forEach(task => scheduleNotification(task));
  }

  // Format date/time for display
  function formatDateTime(dtString) {
    const date = new Date(dtString);
    return date.toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function formatDate(dtString) {
    const date = new Date(dtString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  function updateDashboard() {
    // Greeting and date
    const now = new Date();
    const greeting = `Bonjour, ${userName || ''}`;
    dashboardGreeting.textContent = greeting;
    dashboardDate.textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    // Compute stats
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const dueToday = tasks.filter(t => {
      const d = new Date(t.datetime);
      return !t.completed && d.toDateString() === now.toDateString();
    }).length;
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.progress >= 100).length;
    // Clear cards container
    dashboardCardsContainer.innerHTML = '';
    const stats = [
      { label: 'Tâches totales', value: totalTasks },
      { label: 'Tâches terminées', value: completedTasks },
      { label: 'Tâches aujourd\'hui', value: dueToday },
      { label: 'Objectifs', value: `${completedGoals}/${totalGoals}` }
    ];
    stats.forEach(s => {
      const card = document.createElement('div');
      card.className = 'dashboard-card';
      card.innerHTML = `<h3>${s.label}</h3><div class="value">${s.value}</div>`;
      dashboardCardsContainer.appendChild(card);
    });
    // Next tasks list (3 upcoming incomplete tasks)
    nextTasksList.innerHTML = '';
    const upcoming = tasks.filter(t => !t.completed)
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
      .slice(0, 3);
    upcoming.forEach(task => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${task.name}</span><span class="due-time">${formatDateTime(task.datetime)}</span>`;
      nextTasksList.appendChild(li);
    });
  }

  function updateTasksUI() {
    // Clear current tasks
    tasksContainer.innerHTML = '';
    // Group tasks by category
    const groups = {};
    CATEGORIES.forEach(cat => groups[cat] = []);
    tasks.forEach(task => {
      if (!groups[task.category]) groups[task.category] = [];
      groups[task.category].push(task);
    });
    // For each category, create group container if tasks exist
    Object.keys(groups).forEach(category => {
      const list = groups[category].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
      if (list.length === 0) return;
      const groupDiv = document.createElement('div');
      groupDiv.className = 'category-group';
      const header = document.createElement('h4');
      header.textContent = category;
      groupDiv.appendChild(header);
      // Create timeline wrapper
      const timeline = document.createElement('ul');
      timeline.className = 'timeline';
      // Create progress line
      const progressLine = document.createElement('div');
      progressLine.className = 'progress-line';
      timeline.appendChild(progressLine);
      // Append tasks
      list.forEach(task => {
        const li = document.createElement('li');
        li.className = 'task-item';
        if (task.completed) li.classList.add('completed');
        li.dataset.id = task.id;
        // Task info container
        const info = document.createElement('div');
        info.className = 'task-info';
        const title = document.createElement('h5');
        title.textContent = task.name;
        info.appendChild(title);
        if (task.description) {
          const desc = document.createElement('div');
          desc.className = 'task-desc';
          desc.textContent = task.description;
          info.appendChild(desc);
        }
        const meta = document.createElement('div');
        meta.className = 'task-meta';
        const date = new Date(task.datetime);
        meta.textContent = `${formatDateTime(task.datetime)} | ${task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Sans priorité'}`;
        info.appendChild(meta);
        li.appendChild(info);
        // Actions container
        const actions = document.createElement('div');
        actions.className = 'task-actions';
        // Complete/Undo button
        const completeBtn = document.createElement('button');
        completeBtn.title = task.completed ? 'Marquer comme non fait' : 'Marquer comme fait';
        completeBtn.innerHTML = task.completed ? '↩︎' : '✓';
        completeBtn.addEventListener('click', () => {
          toggleTaskCompletion(task.id);
        });
        actions.appendChild(completeBtn);
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.title = 'Modifier';
        editBtn.innerHTML = '✎';
        editBtn.addEventListener('click', () => {
          openTaskModal(task);
        });
        actions.appendChild(editBtn);
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.title = 'Supprimer';
        deleteBtn.innerHTML = '🗑';
        deleteBtn.addEventListener('click', () => {
          deleteTask(task.id);
        });
        actions.appendChild(deleteBtn);
        li.appendChild(actions);
        timeline.appendChild(li);
      });
      groupDiv.appendChild(timeline);
      tasksContainer.appendChild(groupDiv);
      // After tasks appended, update progress line
      updateProgressLine(timeline);
    });
  }

  function updateProgressLine(timeline) {
    const tasksInTimeline = Array.from(timeline.querySelectorAll('.task-item'));
    const total = tasksInTimeline.length;
    if (total === 0) return;
    const completed = tasksInTimeline.filter(item => item.classList.contains('completed')).length;
    const ratio = completed / total;
    const line = timeline.querySelector('.progress-line');
    if (line) {
      line.style.height = `${ratio * 100}%`;
    }
  }

  function updateGoalsUI() {
    goalsContainer.innerHTML = '';
    goals.forEach(goal => {
      const item = document.createElement('div');
      item.className = 'goal-item';
      item.dataset.id = goal.id;
      // progress circle
      const progressWrap = document.createElement('div');
      progressWrap.className = 'goal-progress';
      progressWrap.style.setProperty('--progress', goal.progress);
      const pctSpan = document.createElement('span');
      pctSpan.textContent = `${goal.progress}%`;
      progressWrap.appendChild(pctSpan);
      item.appendChild(progressWrap);
      // info
      const info = document.createElement('div');
      info.className = 'goal-info';
      const title = document.createElement('h5');
      title.textContent = goal.name;
      info.appendChild(title);
      if (goal.description) {
        const desc = document.createElement('div');
        desc.className = 'goal-desc';
        desc.textContent = goal.description;
        info.appendChild(desc);
      }
      const meta = document.createElement('div');
      meta.className = 'goal-meta';
      if (goal.dueDate) {
        meta.textContent = `Échéance: ${formatDate(goal.dueDate)}`;
      } else {
        meta.textContent = '';
      }
      info.appendChild(meta);
      item.appendChild(info);
      // actions
      const actions = document.createElement('div');
      actions.className = 'goal-actions';
      const editBtn = document.createElement('button');
      editBtn.innerHTML = '✎';
      editBtn.title = 'Modifier';
      editBtn.addEventListener('click', () => {
        openGoalModal(goal);
      });
      actions.appendChild(editBtn);
      const deleteBtn = document.createElement('button');
      deleteBtn.innerHTML = '🗑';
      deleteBtn.title = 'Supprimer';
      deleteBtn.addEventListener('click', () => {
        deleteGoal(goal.id);
      });
      actions.appendChild(deleteBtn);
      item.appendChild(actions);
      goalsContainer.appendChild(item);
    });
  }

  function updateProfile() {
    profileInfo.innerHTML = '';
    const container = document.createElement('div');
    container.className = 'profile-info';
    const header = document.createElement('h3');
    header.textContent = `Bonjour, ${userName || ''}`;
    container.appendChild(header);
    // Stats grid
    const statsGrid = document.createElement('div');
    statsGrid.className = 'profile-stats';
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.progress >= 100).length;
    const categoryCounts = {};
    CATEGORIES.forEach(cat => categoryCounts[cat] = 0);
    tasks.forEach(t => { if (categoryCounts[t.category] !== undefined) categoryCounts[t.category]++; });
    const stats = [
      { number: totalTasks, label: 'Tâches créées' },
      { number: completedTasks, label: 'Tâches terminées' },
      { number: totalGoals, label: 'Objectifs' },
      { number: completedGoals, label: 'Objectifs atteints' }
    ];
    stats.forEach(s => {
      const statEl = document.createElement('div');
      statEl.className = 'profile-stat';
      statEl.innerHTML = `<div class="number">${s.number}</div><div class="label">${s.label}</div>`;
      statsGrid.appendChild(statEl);
    });
    container.appendChild(statsGrid);
    // Category summary (optional listing of tasks per category)
    const categoryList = document.createElement('ul');
    categoryList.style.listStyle = 'none';
    categoryList.style.marginTop = '1rem';
    categoryList.style.padding = '0';
    CATEGORIES.forEach(cat => {
      const li = document.createElement('li');
      li.style.fontSize = '0.85rem';
      li.style.color = 'var(--secondary-color)';
      li.textContent = `${cat}: ${categoryCounts[cat]}`;
      categoryList.appendChild(li);
    });
    container.appendChild(categoryList);
    profileInfo.appendChild(container);
  }

  // Task operations
  function openTaskModal(task) {
    editingTaskId = task ? task.id : null;
    taskModalTitle.textContent = task ? 'Modifier la tâche' : 'Nouvelle tâche';
    taskNameInput.value = task ? task.name : '';
    taskCategoryInput.value = task ? task.category : '';
    taskTimeInput.value = task ? task.datetime : '';
    taskPriorityInput.value = task ? (task.priority || '') : '';
    taskDescInput.value = task ? (task.description || '') : '';
    taskModal.classList.remove('hidden');
  }

  function closeTaskModal() {
    taskModal.classList.add('hidden');
    taskForm.reset();
    editingTaskId = null;
  }

  function addOrUpdateTask(event) {
    event.preventDefault();
    const name = taskNameInput.value.trim();
    const category = taskCategoryInput.value;
    const datetime = taskTimeInput.value;
    const priority = taskPriorityInput.value;
    const description = taskDescInput.value.trim();
    if (!name || !category || !datetime) return;
    if (editingTaskId) {
      // Update existing task
      const idx = tasks.findIndex(t => t.id === editingTaskId);
      if (idx > -1) {
        tasks[idx].name = name;
        tasks[idx].category = category;
        tasks[idx].datetime = datetime;
        tasks[idx].priority = priority;
        tasks[idx].description = description;
        tasks[idx].completed = tasks[idx].completed || false;
        scheduleNotification(tasks[idx]);
      }
    } else {
      // Create new task
      const id = Date.now().toString();
      const newTask = { id, name, category, datetime, priority, description, completed: false };
      tasks.push(newTask);
      scheduleNotification(newTask);
    }
    saveToLocalStorage();
    updateTasksUI();
    updateDashboard();
    updateProfile();
    closeTaskModal();
  }

  function toggleTaskCompletion(id) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx > -1) {
      tasks[idx].completed = !tasks[idx].completed;
      saveToLocalStorage();
      updateTasksUI();
      updateDashboard();
      updateProfile();
      // Reschedule notification: if completed, cancel; if undone, schedule again
      scheduleNotification(tasks[idx]);
    }
  }

  function deleteTask(id) {
    const idx = tasks.findIndex(t => t.id === id);
    if (idx > -1) {
      // Cancel any scheduled notification
      if (notificationTimers[tasks[idx].id]) {
        clearTimeout(notificationTimers[tasks[idx].id]);
        delete notificationTimers[tasks[idx].id];
      }
      tasks.splice(idx, 1);
      saveToLocalStorage();
      updateTasksUI();
      updateDashboard();
      updateProfile();
    }
  }

  // Goal operations
  function openGoalModal(goal) {
    editingGoalId = goal ? goal.id : null;
    goalModalTitle.textContent = goal ? 'Modifier l\'objectif' : 'Nouvel objectif';
    goalNameInput.value = goal ? goal.name : '';
    goalProgressInput.value = goal ? goal.progress : 0;
    goalProgressValue.textContent = goal ? `${goal.progress}%` : '0%';
    goalDueInput.value = goal ? (goal.dueDate || '') : '';
    goalDescInput.value = goal ? (goal.description || '') : '';
    goalModal.classList.remove('hidden');
  }

  function closeGoalModal() {
    goalModal.classList.add('hidden');
    goalForm.reset();
    editingGoalId = null;
    goalProgressValue.textContent = '0%';
  }

  function addOrUpdateGoal(event) {
    event.preventDefault();
    const name = goalNameInput.value.trim();
    const progress = parseInt(goalProgressInput.value, 10);
    const dueDate = goalDueInput.value;
    const description = goalDescInput.value.trim();
    if (!name) return;
    if (editingGoalId) {
      const idx = goals.findIndex(g => g.id === editingGoalId);
      if (idx > -1) {
        goals[idx].name = name;
        goals[idx].progress = progress;
        goals[idx].dueDate = dueDate;
        goals[idx].description = description;
      }
    } else {
      const id = Date.now().toString();
      const newGoal = { id, name, progress, dueDate, description };
      goals.push(newGoal);
    }
    saveToLocalStorage();
    updateGoalsUI();
    updateDashboard();
    updateProfile();
    closeGoalModal();
  }

  function deleteGoal(id) {
    const idx = goals.findIndex(g => g.id === id);
    if (idx > -1) {
      goals.splice(idx, 1);
      saveToLocalStorage();
      updateGoalsUI();
      updateDashboard();
      updateProfile();
    }
  }

  // Event listeners and initialization
  function attachEventListeners() {
    // Name overlay save
    saveUserNameBtn.addEventListener('click', () => {
      const name = userNameInput.value.trim();
      if (name) {
        userName = name;
        saveToLocalStorage();
        nameOverlay.classList.add('hidden');
        updateDashboard();
        updateProfile();
      }
    });
    // Nav buttons
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sectionId = btn.dataset.section;
        document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active-section'));
        document.getElementById(sectionId).classList.add('active-section');
      });
    });
    // Add task button
    addTaskBtn.addEventListener('click', () => {
      openTaskModal(null);
    });
    // Task form submit
    taskForm.addEventListener('submit', addOrUpdateTask);
    // Cancel task
    cancelTaskBtn.addEventListener('click', () => {
      closeTaskModal();
    });
    // Add goal button
    addGoalBtn.addEventListener('click', () => {
      openGoalModal(null);
    });
    // Goal form change update progress value
    goalProgressInput.addEventListener('input', () => {
      goalProgressValue.textContent = `${goalProgressInput.value}%`;
    });
    // Goal form submit
    goalForm.addEventListener('submit', addOrUpdateGoal);
    // Cancel goal
    cancelGoalBtn.addEventListener('click', () => {
      closeGoalModal();
    });
    // Theme switch
    themeSwitch.addEventListener('change', () => {
      theme = themeSwitch.checked ? 'light' : 'dark';
      applyTheme();
      saveToLocalStorage();
    });
    // Update name in settings
    updateNameBtn.addEventListener('click', () => {
      const newName = editNameInput.value.trim();
      if (newName) {
        userName = newName;
        saveToLocalStorage();
        updateDashboard();
        updateProfile();
        editNameInput.value = '';
      }
    });
    // Reset data
    resetDataBtn.addEventListener('click', () => {
      if (confirm('Voulez-vous vraiment réinitialiser toutes les données ?')) {
        localStorage.removeItem('mydaypro_userName');
        localStorage.removeItem('mydaypro_theme');
        localStorage.removeItem('mydaypro_tasks');
        localStorage.removeItem('mydaypro_goals');
        location.reload();
      }
    });
  }

  function populateCategoryOptions() {
    // Clear current options except placeholder
    taskCategoryInput.innerHTML = '<option value="">Catégorie</option>';
    CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      taskCategoryInput.appendChild(opt);
    });
  }

  function showNameOverlayIfNeeded() {
    if (!userName) {
      nameOverlay.classList.remove('hidden');
    } else {
      nameOverlay.classList.add('hidden');
    }
  }

  function init() {
    // Load data
    loadFromLocalStorage();
    // Apply theme
    applyTheme();
    // Populate category options
    populateCategoryOptions();
    // Request notification permission
    requestNotificationPermission();
    // Attach event listeners
    attachEventListeners();
    // Show overlay if name missing
    showNameOverlayIfNeeded();
    // Render UI
    updateDashboard();
    updateTasksUI();
    updateGoalsUI();
    updateProfile();
    // Schedule notifications
    scheduleAllNotifications();
  }

  // Initialize app when DOM is ready
  document.addEventListener('DOMContentLoaded', init);
})();