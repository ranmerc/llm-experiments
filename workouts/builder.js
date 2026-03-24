// Builder Page Application
// Handles workout creation and editing

class WorkoutBuilder {
  constructor() {
    // Current schedule being edited
    this.currentSchedule = null;
    this.isEditing = false;
    this.isSaved = false;
    
    // DOM Elements
    this.elements = this.initializeElements();
    
    // Initialize
    this.init();
  }
  
  initializeElements() {
    return {
      appTitle: document.getElementById('app-title'),
      scheduleName: document.getElementById('schedule-name'),
      exercisesList: document.getElementById('exercises-list'),
      exercisesEmpty: document.getElementById('exercises-empty'),
      addExerciseBtn: document.getElementById('add-exercise-btn'),
      saveScheduleBtn: document.getElementById('save-schedule-btn'),
      confirmModal: document.getElementById('confirm-modal'),
      modalCancel: document.getElementById('modal-cancel'),
      modalConfirm: document.getElementById('modal-confirm'),
      toast: document.getElementById('toast'),
      toastMessage: document.getElementById('toast-message'),
      exerciseTemplate: document.getElementById('exercise-template')
    };
  }
  
  async init() {
    try {
      // Initialize IndexedDB
      await idbHelper.openDatabase();
      
      // Check if editing existing schedule
      await this.loadScheduleForEditing();
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('Workout Builder initialized');
    } catch (error) {
      console.error('Builder initialization error:', error);
      this.showToast('Failed to initialize builder', 'error');
    }
  }
  
  async loadScheduleForEditing() {
    // Check URL for schedule ID
    const urlParams = new URLSearchParams(window.location.search);
    const scheduleId = urlParams.get('id');
    
    if (scheduleId) {
      // Editing existing schedule
      try {
        const schedule = await idbHelper.getSchedule(scheduleId);
        if (schedule) {
          this.currentSchedule = schedule;
          this.isEditing = true;
          this.elements.appTitle.textContent = 'Edit Workout';
          this.populateBuilder(schedule);
          document.title = 'Edit Workout - Workout Scheduler';
        } else {
          this.showToast('Schedule not found', 'error');
        }
      } catch (error) {
        console.error('Error loading schedule:', error);
        this.showToast('Failed to load schedule', 'error');
      }
    }
    // If no scheduleId, we're creating a new workout (default title is already set)
  }
  
  setupEventListeners() {
    // Add exercise button
    this.elements.addExerciseBtn.addEventListener('click', () => this.addExercise());
    
    // Save button
    this.elements.saveScheduleBtn.addEventListener('click', () => this.saveSchedule());
    
    // Schedule name validation
    this.elements.scheduleName.addEventListener('input', () => this.validateBuilder());
    
    // Modal controls
    this.elements.modalCancel.addEventListener('click', () => this.closeModal());
    this.elements.modalConfirm.addEventListener('click', () => this.leavePage());
    
    // Back button - check for unsaved changes
    const backBtn = document.querySelector('.back-btn');
    backBtn.addEventListener('click', (e) => this.handleBackClick(e));
    
    // Warn before leaving if unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (this.hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }
  
  handleBackClick(e) {
    if (this.hasUnsavedChanges()) {
      e.preventDefault();
      this.showConfirmModal();
    }
    // If no unsaved changes, the default link behavior will navigate to index.html
  }
  
  showConfirmModal() {
    this.elements.confirmModal.classList.add('open');
  }
  
  closeModal() {
    this.elements.confirmModal.classList.remove('open');
  }
  
  leavePage() {
    this.closeModal();
    window.location.href = 'index.html';
  }
  
  populateBuilder(schedule) {
    this.elements.scheduleName.value = schedule.name;
    this.elements.exercisesList.innerHTML = '';
    
    if (schedule.exercises.length > 0) {
      this.elements.exercisesEmpty.style.display = 'none';
      schedule.exercises.forEach(exercise => this.addExercise(exercise));
    } else {
      this.elements.exercisesEmpty.style.display = 'block';
    }
    
    this.validateBuilder();
  }
  
  addExercise(exerciseData = null) {
    const template = this.elements.exerciseTemplate;
    const item = template.content.cloneNode(true);
    const container = item.querySelector('.exercise-item');
    
    // Generate unique ID
    const exerciseId = exerciseData?.id || this.generateId();
    container.dataset.exerciseId = exerciseId;
    
    // Populate fields
    const nameInput = item.querySelector('.exercise-name-input');
    const breakInput = item.querySelector('.break-time-input');
    const setsInput = item.querySelector('.sets-input');
    const repsInput = item.querySelector('.reps-input');
    const removeBtn = item.querySelector('.exercise-remove-btn');
    const dragHandle = item.querySelector('.exercise-drag-handle');
    
    if (exerciseData) {
      nameInput.value = exerciseData.name || '';
      breakInput.value = exerciseData.breakTime || 30;
      setsInput.value = exerciseData.sets || 1;
      repsInput.value = exerciseData.reps || 10;
    }
    
    // Setup event listeners
    removeBtn.addEventListener('click', () => this.removeExercise(container));
    
    // Setup drag and drop
    this.setupDragAndDrop(container, dragHandle);
    
    // Input validation
    [nameInput, breakInput, setsInput, repsInput].forEach(input => {
      input.addEventListener('input', () => this.validateBuilder());
    });
    
    // Add to list
    this.elements.exercisesList.appendChild(item);
    this.elements.exercisesEmpty.style.display = 'none';
    this.validateBuilder();
    
    // Focus on name input
    nameInput.focus();
  }
  
  removeExercise(container) {
    container.remove();
    
    // Show empty state if no exercises
    const exercises = this.elements.exercisesList.querySelectorAll('.exercise-item');
    if (exercises.length === 0) {
      this.elements.exercisesEmpty.style.display = 'block';
    }
    
    this.validateBuilder();
  }
  
  setupDragAndDrop(container, handle) {
    let draggedItem = null;
    
    container.draggable = true;
    
    container.addEventListener('dragstart', (e) => {
      draggedItem = container;
      container.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    
    container.addEventListener('dragend', () => {
      container.classList.remove('dragging');
      draggedItem = null;
      
      document.querySelectorAll('.exercise-item').forEach(item => {
        item.classList.remove('drag-over');
      });
    });
    
    container.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedItem && draggedItem !== container) {
        container.classList.add('drag-over');
      }
    });
    
    container.addEventListener('dragleave', () => {
      container.classList.remove('drag-over');
    });
    
    container.addEventListener('drop', (e) => {
      e.preventDefault();
      container.classList.remove('drag-over');
      
      if (draggedItem && draggedItem !== container) {
        const exercisesList = this.elements.exercisesList;
        const items = [...exercisesList.querySelectorAll('.exercise-item')];
        const draggedIndex = items.indexOf(draggedItem);
        const targetIndex = items.indexOf(container);
        
        if (draggedIndex < targetIndex) {
          container.after(draggedItem);
        } else {
          container.before(draggedItem);
        }
        
        this.validateBuilder();
      }
    });
  }
  
  validateBuilder() {
    const scheduleName = this.elements.scheduleName.value.trim();
    const exercises = this.getExercisesFromBuilder();
    
    const hasName = scheduleName.length > 0;
    const hasValidExercise = exercises.some(ex => 
      ex.name.trim() !== '' && 
      ex.breakTime >= 0 && 
      ex.sets > 0 && 
      ex.reps > 0
    );
    
    this.elements.saveScheduleBtn.disabled = !(hasName && hasValidExercise);
    
    return hasName && hasValidExercise;
  }
  
  getExercisesFromBuilder() {
    const exerciseItems = this.elements.exercisesList.querySelectorAll('.exercise-item');
    const exercises = [];
    
    exerciseItems.forEach(item => {
      const nameInput = item.querySelector('.exercise-name-input');
      const breakInput = item.querySelector('.break-time-input');
      const setsInput = item.querySelector('.sets-input');
      const repsInput = item.querySelector('.reps-input');
      
      exercises.push({
        id: item.dataset.exerciseId,
        name: nameInput.value.trim(),
        breakTime: parseInt(breakInput.value) || 0,
        sets: parseInt(setsInput.value) || 0,
        reps: parseInt(repsInput.value) || 0
      });
    });
    
    return exercises;
  }
  
  hasUnsavedChanges() {
    // If already saved, no unsaved changes
    if (this.isSaved) return false;
    
    const currentName = this.elements.scheduleName.value.trim();
    const currentExercises = this.getExercisesFromBuilder();
    
    if (!this.isEditing) {
      // New schedule - check if anything was entered
      return currentName.length > 0 || currentExercises.some(ex => ex.name.trim() !== '');
    }
    
    // Existing schedule - compare with original
    if (currentName !== this.currentSchedule.name) return true;
    
    if (currentExercises.length !== this.currentSchedule.exercises.length) return true;
    
    for (let i = 0; i < currentExercises.length; i++) {
      const current = currentExercises[i];
      const original = this.currentSchedule.exercises[i];
      
      if (current.name !== original.name ||
          current.breakTime !== original.breakTime ||
          current.sets !== original.sets ||
          current.reps !== original.reps) {
        return true;
      }
    }
    
    return false;
  }
  
  async saveSchedule() {
    if (!this.validateBuilder()) {
      this.showToast('Please fill in all required fields', 'error');
      return;
    }
    
    try {
      const scheduleName = this.elements.scheduleName.value.trim();
      const exercises = this.getExercisesFromBuilder().filter(ex => ex.name.trim() !== '');
      
      if (exercises.length === 0) {
        this.showToast('Please add at least one exercise', 'error');
        return;
      }
      
      const schedule = {
        id: this.currentSchedule?.id || this.generateId(),
        name: scheduleName,
        exercises: exercises,
        createdAt: this.currentSchedule?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (this.isEditing) {
        await idbHelper.updateSchedule(schedule);
        this.showToast('Schedule updated successfully', 'success');
      } else {
        await idbHelper.addSchedule(schedule);
        this.showToast('Schedule created successfully', 'success');
      }
      
      // Mark as saved to prevent unsaved changes warning
      this.isSaved = true;
      
      // Navigate back to home after short delay
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
      
    } catch (error) {
      console.error('Error saving schedule:', error);
      this.showToast('Failed to save schedule', 'error');
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
  
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Initialize builder when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.workoutBuilder = new WorkoutBuilder();
});