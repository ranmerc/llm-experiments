// Workout Scheduler Application
// Main application logic for schedule list and workout execution

class WorkoutApp {
  constructor() {
    // Application state
    this.currentView = 'schedule-list';
    this.currentSchedule = null;
    this.workoutState = null;
    this.workoutTimer = null;
    this.isPaused = false;
    
    // DOM Elements
    this.elements = this.initializeElements();
    
    // Initialize application
    this.init();
  }
  
  initializeElements() {
    return {
      // Views
      views: {
        scheduleList: document.getElementById('schedule-list-view'),
        execution: document.getElementById('execution-view'),
        complete: document.getElementById('complete-view')
      },
      
      // Header
      appTitle: document.getElementById('app-title'),
      
      // Schedule List View
      scheduleList: document.getElementById('schedule-list'),
      emptyState: document.getElementById('empty-state'),
      loadingState: document.getElementById('loading-state'),
      errorState: document.getElementById('error-state'),
      errorMessage: document.getElementById('error-message'),
      retryBtn: document.getElementById('retry-btn'),
      
      // Execution View
      currentExerciseName: document.getElementById('current-exercise-name'),
      setProgress: document.getElementById('set-progress'),
      repProgress: document.getElementById('rep-progress'),
      timerDisplay: document.getElementById('timer-display'),
      timerValue: document.getElementById('timer-value'),
      timerLabel: document.getElementById('timer-label'),
      progressBar: document.getElementById('progress-bar'),
      progressFill: document.getElementById('progress-fill'),
      progressText: document.getElementById('progress-text'),
      actionBtn: document.getElementById('action-btn'),
      pauseBtn: document.getElementById('pause-btn'),
      stopBtn: document.getElementById('stop-btn'),
      nextExercise: document.getElementById('next-exercise'),
      nextExerciseName: document.getElementById('next-exercise-name'),
      
      // Complete View
      totalExercises: document.getElementById('total-exercises'),
      totalTime: document.getElementById('total-time'),
      repeatWorkoutBtn: document.getElementById('repeat-workout-btn'),
      backToListBtn: document.getElementById('back-to-list-btn'),
      
      // Modal
      confirmModal: document.getElementById('confirm-modal'),
      modalTitle: document.getElementById('modal-title'),
      modalMessage: document.getElementById('modal-message'),
      modalCancel: document.getElementById('modal-cancel'),
      modalConfirm: document.getElementById('modal-confirm'),
      
      // Toast
      toast: document.getElementById('toast'),
      toastMessage: document.getElementById('toast-message'),
      
      // Templates
      scheduleItemTemplate: document.getElementById('schedule-item-template')
    };
  }
  
  async init() {
    try {
      // Initialize IndexedDB
      await idbHelper.openDatabase();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Load saved schedules
      await this.loadSchedules();
      
      // Register service worker
      this.registerServiceWorker();
      
      console.log('Workout Scheduler initialized successfully');
    } catch (error) {
      console.error('Initialization error:', error);
      this.showError('Failed to initialize application');
    }
  }
  
  // ===== Event Listeners Setup =====
  setupEventListeners() {
    // Schedule list controls
    this.elements.retryBtn.addEventListener('click', () => this.loadSchedules());
    
    // Execution controls
    this.elements.actionBtn.addEventListener('click', () => this.handleRepDone());
    this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
    this.elements.stopBtn.addEventListener('click', () => this.confirmStopWorkout());
    
    // Complete view controls
    this.elements.repeatWorkoutBtn.addEventListener('click', () => this.repeatWorkout());
    this.elements.backToListBtn.addEventListener('click', () => this.showScheduleList());
    
    // Modal controls
    this.elements.modalCancel.addEventListener('click', () => this.closeModal());
    this.elements.modalConfirm.addEventListener('click', () => this.confirmModalAction());
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }
  
  // ===== View Management =====
  showView(viewName) {
    // Hide all views
    Object.values(this.elements.views).forEach(view => {
      view.classList.remove('active');
    });
    
    // Show requested view
    this.elements.views[viewName].classList.add('active');
    this.currentView = viewName;
    
    // Update header based on view
    this.updateHeader();
  }
  
  updateHeader() {
    switch (this.currentView) {
      case 'schedule-list':
        this.elements.appTitle.textContent = 'Workout Scheduler';
        break;
        
      case 'execution':
        this.elements.appTitle.textContent = 'Workout in Progress';
        break;
        
      case 'complete':
        this.elements.appTitle.textContent = 'Workout Complete';
        break;
    }
  }
  
  // ===== Schedule List Functions =====
  async loadSchedules() {
    try {
      this.showLoading(true);
      
      const schedules = await idbHelper.getAllSchedules();
      this.renderScheduleList(schedules);
      
      this.showLoading(false);
      this.showEmptyState(schedules.length === 0);
      
    } catch (error) {
      console.error('Error loading schedules:', error);
      this.showError('Failed to load schedules');
      this.showLoading(false);
    }
  }
  
  renderScheduleList(schedules) {
    const list = this.elements.scheduleList;
    list.innerHTML = '';
    
    if (schedules.length === 0) return;
    
    schedules.forEach(schedule => {
      const item = this.createScheduleItem(schedule);
      list.appendChild(item);
    });
  }
  
  createScheduleItem(schedule) {
    const template = this.elements.scheduleItemTemplate;
    const item = template.content.cloneNode(true);
    const container = item.querySelector('.schedule-item');
    
    // Set schedule data
    container.dataset.scheduleId = schedule.id;
    item.querySelector('.schedule-name').textContent = schedule.name;
    item.querySelector('.exercise-count').textContent = 
      `${schedule.exercises.length} exercise${schedule.exercises.length !== 1 ? 's' : ''}`;
    
    const updatedDate = new Date(schedule.updatedAt);
    item.querySelector('.last-updated').textContent = this.formatDate(updatedDate);
    
    // Setup event listeners
    const menuBtn = item.querySelector('.schedule-menu-btn');
    const menu = item.querySelector('.schedule-menu');
    const editBtn = item.querySelector('.edit-btn');
    const duplicateBtn = item.querySelector('.duplicate-btn');
    const deleteBtn = item.querySelector('.delete-btn');
    const startBtn = item.querySelector('.start-workout-btn');
    
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleScheduleMenu(menu);
    });
    
    // Set edit link
    editBtn.href = `builder.html?id=${schedule.id}`;
    
    duplicateBtn.addEventListener('click', () => this.duplicateSchedule(schedule.id));
    deleteBtn.addEventListener('click', () => this.confirmDeleteSchedule(schedule.id));
    startBtn.addEventListener('click', () => this.startWorkout(schedule.id));
    
    // Close menu when clicking elsewhere
    document.addEventListener('click', () => menu.classList.remove('open'));
    
    return item;
  }
  
  toggleScheduleMenu(menu) {
    // Close all other menus
    document.querySelectorAll('.schedule-menu.open').forEach(m => {
      if (m !== menu) m.classList.remove('open');
    });
    
    menu.classList.toggle('open');
  }
  
  showLoading(show) {
    this.elements.loadingState.style.display = show ? 'flex' : 'none';
  }
  
  showEmptyState(show) {
    this.elements.emptyState.style.display = show ? 'block' : 'none';
    this.elements.scheduleList.style.display = show ? 'none' : 'flex';
  }
  
  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.elements.errorState.style.display = 'block';
    this.elements.scheduleList.style.display = 'none';
    this.elements.emptyState.style.display = 'none';
  }
  
  showScheduleList() {
    this.currentSchedule = null;
    this.workoutState = null;
    this.clearWorkoutTimer();
    this.loadSchedules();
    this.showView('schedule-list');
  }
  
  async duplicateSchedule(scheduleId) {
    try {
      const original = await idbHelper.getSchedule(scheduleId);
      if (!original) {
        this.showToast('Schedule not found', 'error');
        return;
      }
      
      const duplicate = {
        id: this.generateId(),
        name: `${original.name} (Copy)`,
        exercises: original.exercises.map(ex => ({
          ...ex,
          id: this.generateId()
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await idbHelper.addSchedule(duplicate);
      this.showToast('Schedule duplicated', 'success');
      this.loadSchedules();
      
    } catch (error) {
      console.error('Error duplicating schedule:', error);
      this.showToast('Failed to duplicate schedule', 'error');
    }
  }
  
  confirmDeleteSchedule(scheduleId) {
    this.pendingDeleteId = scheduleId;
    this.showConfirmModal(
      'Delete Schedule',
      'Are you sure you want to delete this schedule? This action cannot be undone.',
      () => this.deleteSchedule(scheduleId)
    );
  }
  
  async deleteSchedule(scheduleId) {
    try {
      await idbHelper.deleteSchedule(scheduleId);
      this.showToast('Schedule deleted', 'success');
      this.loadSchedules();
      
    } catch (error) {
      console.error('Error deleting schedule:', error);
      this.showToast('Failed to delete schedule', 'error');
    }
  }
  
  // ===== Workout Execution Functions =====
  async startWorkout(scheduleId) {
    try {
      const schedule = await idbHelper.getSchedule(scheduleId);
      if (!schedule) {
        this.showToast('Schedule not found', 'error');
        return;
      }
      
      if (schedule.exercises.length === 0) {
        this.showToast('Schedule has no exercises', 'error');
        return;
      }
      
      this.currentSchedule = schedule;
      this.initializeWorkoutState();
      this.updateExecutionUI();
      this.showView('execution');
      
    } catch (error) {
      console.error('Error starting workout:', error);
      this.showToast('Failed to start workout', 'error');
    }
  }
  
  initializeWorkoutState() {
    this.workoutState = {
      currentExerciseIndex: 0,
      currentSet: 1,
      currentRep: 1,
      phase: 'active', // 'active' or 'break'
      isPaused: false,
      startTime: new Date(),
      totalRepsCompleted: 0,
      breakTimer: null
    };
    
    this.isPaused = false;
    this.clearWorkoutTimer();
  }
  
  updateExecutionUI() {
    if (!this.workoutState || !this.currentSchedule) return;
    
    const exercise = this.currentSchedule.exercises[this.workoutState.currentExerciseIndex];
    const totalExercises = this.currentSchedule.exercises.length;
    
    // Update exercise name
    this.elements.currentExerciseName.textContent = exercise.name;
    
    // Update progress info
    this.elements.setProgress.textContent = 
      `Set ${this.workoutState.currentSet}/${exercise.sets}`;
    this.elements.repProgress.textContent = 
      `Rep ${this.workoutState.currentRep}/${exercise.reps}`;
    
    // Update action button
    if (this.workoutState.phase === 'break') {
      this.elements.actionBtn.textContent = 'Breaking...';
      this.elements.actionBtn.classList.add('break-phase');
      this.elements.timerDisplay.classList.add('active');
    } else {
      this.elements.actionBtn.textContent = 'Done';
      this.elements.actionBtn.classList.remove('break-phase');
      this.elements.timerDisplay.classList.remove('active');
    }
    
    // Update pause button
    this.elements.pauseBtn.textContent = this.isPaused ? '▶ Resume' : '⏸ Pause';
    
    // Update next exercise preview
    this.updateNextExercisePreview();
    
    // Update progress bar
    this.updateProgress();
  }
  
  updateNextExercisePreview() {
    const { currentExerciseIndex, currentSet, currentRep } = this.workoutState;
    const exercises = this.currentSchedule.exercises;
    const currentExercise = exercises[currentExerciseIndex];
    
    // Check if there's a next rep in current set
    if (currentRep < currentExercise.reps) {
      this.elements.nextExerciseName.textContent = `${currentExercise.name} - Rep ${currentRep + 1}`;
      return;
    }
    
    // Check if there's a next set
    if (currentSet < currentExercise.sets) {
      this.elements.nextExerciseName.textContent = `${currentExercise.name} - Set ${currentSet + 1}`;
      return;
    }
    
    // Check if there's a next exercise
    if (currentExerciseIndex < exercises.length - 1) {
      const nextExercise = exercises[currentExerciseIndex + 1];
      this.elements.nextExerciseName.textContent = `${nextExercise.name} - Set 1`;
      return;
    }
    
    // Workout is almost done
    this.elements.nextExerciseName.textContent = 'Workout Complete!';
  }
  
  updateProgress() {
    if (!this.workoutState || !this.currentSchedule) return;
    
    // Calculate total reps in workout
    let totalReps = 0;
    let completedReps = 0;
    
    this.currentSchedule.exercises.forEach((exercise, exIndex) => {
      const exerciseReps = exercise.sets * exercise.reps;
      totalReps += exerciseReps;
      
      if (exIndex < this.workoutState.currentExerciseIndex) {
        completedReps += exerciseReps;
      } else if (exIndex === this.workoutState.currentExerciseIndex) {
        // Current exercise
        const completedSets = this.workoutState.currentSet - 1;
        const completedRepsInCurrentSet = this.workoutState.currentRep - 1;
        completedReps += (completedSets * exercise.reps) + completedRepsInCurrentSet;
        
        if (this.workoutState.totalRepsCompleted) {
          completedReps = this.workoutState.totalRepsCompleted;
        }
      }
    });
    
    const progressPercent = Math.round((completedReps / totalReps) * 100);
    this.elements.progressFill.style.width = `${progressPercent}%`;
    this.elements.progressText.textContent = `${progressPercent}% Complete`;
  }
  
  handleRepDone() {
    if (this.workoutState.phase === 'break') {
      return; // Don't handle during break
    }
    
    // Start break timer
    this.startBreakTimer();
  }
  
  startBreakTimer() {
    const exercise = this.currentSchedule.exercises[this.workoutState.currentExerciseIndex];
    const breakTime = exercise.breakTime;
    
    if (breakTime <= 0) {
      // No break, go directly to next rep
      this.completeRep();
      return;
    }
    
    // Set phase to break
    this.workoutState.phase = 'break';
    this.updateExecutionUI();
    
    // Update timer display
    let secondsRemaining = breakTime;
    this.elements.timerValue.textContent = secondsRemaining;
    this.elements.timerLabel.textContent = 'seconds remaining';
    
    // Start countdown
    this.workoutTimer = setInterval(() => {
      if (this.isPaused) return;
      
      secondsRemaining--;
      this.elements.timerValue.textContent = secondsRemaining;
      
      if (secondsRemaining <= 0) {
        this.clearWorkoutTimer();
        this.completeRep();
      }
    }, 1000);
  }
  
  completeRep() {
    const exercise = this.currentSchedule.exercises[this.workoutState.currentExerciseIndex];
    
    // Update rep counter
    this.workoutState.currentRep++;
    this.workoutState.totalRepsCompleted++;
    
    // Check if set is complete
    if (this.workoutState.currentRep > exercise.reps) {
      this.completeSet();
      return;
    }
    
    // Reset to active phase
    this.workoutState.phase = 'active';
    this.updateExecutionUI();
  }
  
  completeSet() {
    const exercise = this.currentSchedule.exercises[this.workoutState.currentExerciseIndex];
    
    // Update set counter
    this.workoutState.currentSet++;
    this.workoutState.currentRep = 1;
    
    // Check if all sets are complete
    if (this.workoutState.currentSet > exercise.sets) {
      this.completeExercise();
      return;
    }
    
    // Brief set completion indicator
    this.showToast(`Set ${this.workoutState.currentSet - 1} complete!`, 'success');
    
    // Reset to active phase
    this.workoutState.phase = 'active';
    this.updateExecutionUI();
  }
  
  completeExercise() {
    // Move to next exercise
    this.workoutState.currentExerciseIndex++;
    this.workoutState.currentSet = 1;
    this.workoutState.currentRep = 1;
    
    // Check if workout is complete
    if (this.workoutState.currentExerciseIndex >= this.currentSchedule.exercises.length) {
      this.completeWorkout();
      return;
    }
    
    // Brief exercise completion indicator
    const nextExercise = this.currentSchedule.exercises[this.workoutState.currentExerciseIndex];
    this.showToast(`Next: ${nextExercise.name}`, 'success');
    
    // Reset to active phase
    this.workoutState.phase = 'active';
    this.updateExecutionUI();
  }
  
  completeWorkout() {
    this.clearWorkoutTimer();
    
    // Calculate workout stats
    const endTime = new Date();
    const duration = Math.round((endTime - this.workoutState.startTime) / 1000); // seconds
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    // Update complete view
    this.elements.totalExercises.textContent = this.currentSchedule.exercises.length;
    this.elements.totalTime.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Show complete view
    this.showView('complete');
    
    // Celebrate!
    this.showToast('Workout complete! Great job!', 'success');
  }
  
  repeatWorkout() {
    if (!this.currentSchedule) return;
    
    this.initializeWorkoutState();
    this.updateExecutionUI();
    this.showView('execution');
  }
  
  togglePause() {
    this.isPaused = !this.isPaused;
    this.updateExecutionUI();
    
    if (this.isPaused) {
      this.showToast('Workout paused', 'warning');
    } else {
      this.showToast('Workout resumed', 'success');
    }
  }
  
  confirmStopWorkout() {
    this.showConfirmModal(
      'Stop Workout',
      'Are you sure you want to stop the workout? Your progress will not be saved.',
      () => this.stopWorkout()
    );
  }
  
  stopWorkout() {
    this.clearWorkoutTimer();
    this.workoutState = null;
    this.currentSchedule = null;
    this.showScheduleList();
    this.showToast('Workout stopped', 'warning');
  }
  
  clearWorkoutTimer() {
    if (this.workoutTimer) {
      clearInterval(this.workoutTimer);
      this.workoutTimer = null;
    }
  }
  
  // ===== Modal Functions =====
  showConfirmModal(title, message, onConfirm) {
    this.elements.modalTitle.textContent = title;
    this.elements.modalMessage.textContent = message;
    this.pendingConfirmAction = onConfirm;
    this.elements.confirmModal.classList.add('open');
  }
  
  closeModal() {
    this.elements.confirmModal.classList.remove('open');
    this.pendingConfirmAction = null;
  }
  
  confirmModalAction() {
    if (this.pendingConfirmAction) {
      this.pendingConfirmAction();
    }
    this.closeModal();
  }
  
  // ===== Toast Functions =====
  showToast(message, type = 'info') {
    this.elements.toastMessage.textContent = message;
    this.elements.toast.className = `toast ${type}`;
    this.elements.toast.classList.add('show');
    
    setTimeout(() => {
      this.elements.toast.classList.remove('show');
    }, 3000);
  }
  
  // ===== Utility Functions =====
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return 'Today';
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
  
  // ===== Keyboard Navigation =====
  handleKeyboard(e) {
    // Global shortcuts
    if (e.key === 'Escape') {
      if (this.elements.confirmModal.classList.contains('open')) {
        this.closeModal();
      } else if (this.currentView === 'execution') {
        this.confirmStopWorkout();
      }
    }
    
    // Spacebar for Done button during workout
    if (e.key === ' ' && this.currentView === 'execution' && this.workoutState?.phase === 'active') {
      e.preventDefault();
      this.handleRepDone();
    }
  }
  
  // ===== Service Worker =====
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('service-worker.js');
        console.log('Service Worker registered:', registration.scope);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showToast('New version available! Refresh to update.', 'info');
            }
          });
        });
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.workoutApp = new WorkoutApp();
});