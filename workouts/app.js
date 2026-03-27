// Workout Scheduler Application
// Main application logic for schedule list

class WorkoutApp {
  constructor() {
    // DOM Elements
    this.elements = this.initializeElements();
    
    // Initialize application
    this.init();
  }
  
  initializeElements() {
    return {
      // Schedule List View
      scheduleList: document.getElementById('schedule-list'),
      emptyState: document.getElementById('empty-state'),
      loadingState: document.getElementById('loading-state'),
      errorState: document.getElementById('error-state'),
      errorMessage: document.getElementById('error-message'),
      retryBtn: document.getElementById('retry-btn'),
      
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
    
    // Modal controls
    this.elements.modalCancel.addEventListener('click', () => this.closeModal());
    this.elements.modalConfirm.addEventListener('click', () => this.confirmModalAction());
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
    const exportBtn = item.querySelector('.export-btn');
    const deleteBtn = item.querySelector('.delete-btn');
    const startBtn = item.querySelector('.start-workout-btn');
    
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleScheduleMenu(menu);
    });
    
    // Set edit link
    editBtn.href = `builder.html?id=${schedule.id}`;
    
    duplicateBtn.addEventListener('click', () => this.duplicateSchedule(schedule.id));
    exportBtn.addEventListener('click', () => this.exportSchedule(schedule.id));
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
  
  startWorkout(scheduleId) {
    window.location.href = `execute.html?id=${scheduleId}`;
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
  
  // ===== Export/Import Functions =====
  async exportSchedule(scheduleId) {
    try {
      const schedule = await idbHelper.getSchedule(scheduleId);
      if (!schedule) {
        this.showToast('Schedule not found', 'error');
        return;
      }
      
      // Create export data with version info
      const exportData = {
        version: '1.0',
        type: 'workout-schedule',
        schedule: {
          name: schedule.name,
          exercises: schedule.exercises.map(ex => ({
            name: ex.name,
            breakTime: ex.breakTime,
            sets: ex.sets,
            reps: ex.reps
          })),
          createdAt: schedule.createdAt,
          updatedAt: schedule.updatedAt
        }
      };
      
      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);
      
      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.sanitizeFilename(schedule.name)}.workout.json`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      this.showToast('Schedule exported successfully', 'success');
      
    } catch (error) {
      console.error('Error exporting schedule:', error);
      this.showToast('Failed to export schedule', 'error');
    }
  }
  
  sanitizeFilename(name) {
    // Remove invalid characters and replace spaces with hyphens
    return name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
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