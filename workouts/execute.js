// Workout Execution Page
// Handles the workout execution flow with rep-based timing

class WorkoutExecution {
  constructor() {
    // Application state
    this.currentSchedule = null;
    this.workoutState = null;
    this.workoutTimer = null;
    this.isPaused = false;
    
    // DOM Elements
    this.elements = this.initializeElements();
    
    // Initialize
    this.init();
  }
  
  initializeElements() {
    return {
      // Views
      executionView: document.getElementById('execution-view'),
      completeView: document.getElementById('complete-view'),
      
      // Header
      appTitle: document.getElementById('app-title'),
      
      // Execution View
      currentExerciseName: document.getElementById('current-exercise-name'),
      setProgress: document.getElementById('set-progress'),
      repProgress: document.getElementById('rep-progress'),
      timerDisplay: document.getElementById('timer-display'),
      timerValue: document.getElementById('timer-value'),
      timerLabel: document.getElementById('timer-label'),
      progressFill: document.getElementById('progress-fill'),
      progressText: document.getElementById('progress-text'),
      actionBtn: document.getElementById('action-btn'),
      pauseBtn: document.getElementById('pause-btn'),
      stopBtn: document.getElementById('stop-btn'),
      nextExerciseName: document.getElementById('next-exercise-name'),
      
      // Complete View
      totalExercises: document.getElementById('total-exercises'),
      totalTime: document.getElementById('total-time'),
      repeatWorkoutBtn: document.getElementById('repeat-workout-btn'),
      
      // Modal
      confirmModal: document.getElementById('confirm-modal'),
      modalCancel: document.getElementById('modal-cancel'),
      modalConfirm: document.getElementById('modal-confirm'),
      
      // Toast
      toast: document.getElementById('toast'),
      toastMessage: document.getElementById('toast-message')
    };
  }
  
  async init() {
    try {
      // Initialize IndexedDB
      await idbHelper.openDatabase();
      
      // Load workout schedule
      await this.loadWorkout();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('Workout Execution initialized');
    } catch (error) {
      console.error('Initialization error:', error);
      this.showToast('Failed to load workout', 'error');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    }
  }
  
  async loadWorkout() {
    // Get schedule ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const scheduleId = urlParams.get('id');
    
    if (!scheduleId) {
      throw new Error('No schedule ID provided');
    }
    
    const schedule = await idbHelper.getSchedule(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }
    
    if (schedule.exercises.length === 0) {
      throw new Error('Schedule has no exercises');
    }
    
    this.currentSchedule = schedule;
    this.initializeWorkoutState();
    this.updateExecutionUI();
  }
  
  initializeWorkoutState() {
    this.workoutState = {
      currentExerciseIndex: 0,
      currentSet: 1,
      currentRep: 1,
      phase: 'active', // 'active' or 'break'
      startTime: new Date(),
      totalRepsCompleted: 0
    };
    
    this.isPaused = false;
    this.clearWorkoutTimer();
  }
  
  setupEventListeners() {
    // Execution controls
    this.elements.actionBtn.addEventListener('click', () => this.handleAction());
    this.elements.pauseBtn.addEventListener('click', () => this.togglePause());
    this.elements.stopBtn.addEventListener('click', () => this.confirmStop());
    
    // Complete view controls
    this.elements.repeatWorkoutBtn.addEventListener('click', () => this.repeatWorkout());
    
    // Modal controls
    this.elements.modalCancel.addEventListener('click', () => this.closeModal());
    this.elements.modalConfirm.addEventListener('click', () => this.stopWorkout());
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    
    // Warn before leaving during workout
    window.addEventListener('beforeunload', (e) => {
      if (this.workoutState && this.executionView.classList.contains('active')) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }
  
  updateExecutionUI() {
    if (!this.workoutState || !this.currentSchedule) return;
    
    const exercise = this.currentSchedule.exercises[this.workoutState.currentExerciseIndex];
    
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
  
  handleAction() {
    if (this.workoutState.phase === 'break' || this.isPaused) {
      return; // Don't handle during break or pause
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
    this.elements.executionView.classList.remove('active');
    this.elements.completeView.classList.add('active');
    this.elements.appTitle.textContent = 'Workout Complete';
    
    // Celebrate!
    this.showToast('Workout complete! Great job!', 'success');
  }
  
  repeatWorkout() {
    this.elements.completeView.classList.remove('active');
    this.elements.executionView.classList.add('active');
    this.elements.appTitle.textContent = 'Workout in Progress';
    
    this.initializeWorkoutState();
    this.updateExecutionUI();
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
  
  confirmStop() {
    this.elements.confirmModal.classList.add('open');
  }
  
  closeModal() {
    this.elements.confirmModal.classList.remove('open');
  }
  
  stopWorkout() {
    this.clearWorkoutTimer();
    this.closeModal();
    window.location.href = 'index.html';
  }
  
  clearWorkoutTimer() {
    if (this.workoutTimer) {
      clearInterval(this.workoutTimer);
      this.workoutTimer = null;
    }
  }
  
  showToast(message, type = 'info') {
    this.elements.toastMessage.textContent = message;
    this.elements.toast.className = `toast ${type}`;
    this.elements.toast.classList.add('show');
    
    setTimeout(() => {
      this.elements.toast.classList.remove('show');
    }, 3000);
  }
  
  handleKeyboard(e) {
    // Escape to confirm stop
    if (e.key === 'Escape') {
      if (this.elements.confirmModal.classList.contains('open')) {
        this.closeModal();
      } else {
        this.confirmStop();
      }
    }
    
    // Spacebar for Done button during workout
    if (e.key === ' ' && this.executionView.classList.contains('active') && 
        this.workoutState?.phase === 'active' && !this.isPaused) {
      e.preventDefault();
      this.handleAction();
    }
  }
}

// Initialize execution when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.workoutExecution = new WorkoutExecution();
});