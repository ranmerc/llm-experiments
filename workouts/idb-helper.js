// IndexedDB Helper for Workout App
// Handles all database operations for workout schedules

class IDBHelper {
  constructor() {
    this.dbName = 'workoutDB';
    this.storeName = 'workoutSchedules';
    this.db = null;
  }

  // Initialize database connection
  async openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error('Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          
          // Create indexes for better querying
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
          
          console.log('Object store created');
        }
      };
    });
  }

  // Ensure database is connected
  async ensureConnection() {
    if (!this.db) {
      await this.openDatabase();
    }
    return this.db;
  }

  // Add a new workout schedule
  async addSchedule(schedule) {
    const db = await this.ensureConnection();
    
    // Ensure schedule has required fields
    const newSchedule = {
      id: schedule.id || this.generateId(),
      name: schedule.name || 'Untitled Workout',
      exercises: schedule.exercises || [],
      createdAt: schedule.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(newSchedule);

      request.onsuccess = () => {
        console.log('Schedule added successfully:', newSchedule.id);
        resolve(newSchedule);
      };

      request.onerror = () => {
        console.error('Error adding schedule:', request.error);
        reject(request.error);
      };
    });
  }

  // Get a single schedule by ID
  async getSchedule(id) {
    const db = await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Error getting schedule:', request.error);
        reject(request.error);
      };
    });
  }

  // Get all workout schedules
  async getAllSchedules() {
    const db = await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort by most recently updated
        const schedules = request.result.sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        resolve(schedules);
      };

      request.onerror = () => {
        console.error('Error getting all schedules:', request.error);
        reject(request.error);
      };
    });
  }

  // Update an existing schedule
  async updateSchedule(schedule) {
    const db = await this.ensureConnection();

    // Ensure updated timestamp
    const updatedSchedule = {
      ...schedule,
      updatedAt: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(updatedSchedule);

      request.onsuccess = () => {
        console.log('Schedule updated successfully:', updatedSchedule.id);
        resolve(updatedSchedule);
      };

      request.onerror = () => {
        console.error('Error updating schedule:', request.error);
        reject(request.error);
      };
    });
  }

  // Delete a schedule by ID
  async deleteSchedule(id) {
    const db = await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Schedule deleted successfully:', id);
        resolve(true);
      };

      request.onerror = () => {
        console.error('Error deleting schedule:', request.error);
        reject(request.error);
      };
    });
  }

  // Delete all schedules (for testing/development)
  async deleteAllSchedules() {
    const db = await this.ensureConnection();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('All schedules deleted successfully');
        resolve(true);
      };

      request.onerror = () => {
        console.error('Error deleting all schedules:', request.error);
        reject(request.error);
      };
    });
  }

  // Check if database is available
  async isAvailable() {
    try {
      await this.ensureConnection();
      return true;
    } catch (error) {
      console.error('IndexedDB not available:', error);
      return false;
    }
  }

  // Get storage usage (approximate)
  async getStorageUsage() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage,
          quota: estimate.quota,
          percent: Math.round((estimate.usage / estimate.quota) * 100)
        };
      } catch (error) {
        console.error('Error getting storage estimate:', error);
        return null;
      }
    }
    return null;
  }

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Database connection closed');
    }
  }
}

// Create and export singleton instance
const idbHelper = new IDBHelper();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = idbHelper;
} else {
  window.idbHelper = idbHelper;
}