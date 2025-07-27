// Утилиты для работы с приложением

// Debounce функция для оптимизации производительности
function debounce(fn, delay) { 
  let timer; 
  return function(...args) { 
    clearTimeout(timer); 
    timer = setTimeout(() => fn.apply(this, args), delay); 
  }; 
}

// Показать сообщение об ошибке
function showError(message, container = null) {
  // Использовать overlay контейнер для главных ошибок
  const targetContainer = container || document.getElementById('notificationOverlay');
  if (!targetContainer) {
    console.error('Error container not found:', message);
    return;
  }
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error';
  
  // Создаем иконку отдельно
  const icon = document.createElement('i');
  icon.className = 'fas fa-exclamation-circle';
  errorDiv.appendChild(icon);
  
  // Добавляем пробел
  errorDiv.appendChild(document.createTextNode(' '));
  
  // Добавляем сообщение через textContent (не innerHTML!)
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  errorDiv.appendChild(messageSpan);
  
  targetContainer.appendChild(errorDiv);
  
  setTimeout(() => {
    errorDiv.classList.add('fade-out');
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 300);
  }, 5000);
}

// Показать сообщение об успехе
function showSuccess(message, container = null) {
  // Использовать overlay контейнер для главных сообщений
  const targetContainer = container || document.getElementById('notificationOverlay');
  if (!targetContainer) {
    console.error('Success container not found:', message);
    return;
  }
  
  const successDiv = document.createElement('div');
  successDiv.className = 'success';
  
  // Создаем иконку отдельно
  const icon = document.createElement('i');
  icon.className = 'fas fa-check-circle';
  successDiv.appendChild(icon);
  
  // Добавляем пробел
  successDiv.appendChild(document.createTextNode(' '));
  
  // Добавляем сообщение через textContent
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  successDiv.appendChild(messageSpan);
  
  targetContainer.appendChild(successDiv);
  
  setTimeout(() => {
    successDiv.classList.add('fade-out');
    setTimeout(() => {
      if (successDiv.parentNode) {
        successDiv.parentNode.removeChild(successDiv);
      }
    }, 300);
  }, 3000);
}

// Безопасное получение значения из localStorage
function getFromStorage(key, defaultValue = '') {
  try {
    return localStorage.getItem(key) || defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
}

// Безопасное сохранение в localStorage
function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error('Error saving to localStorage:', error);
    return false;
  }
}

// Безопасное удаление из localStorage
function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error removing from localStorage:', error);
    return false;
  }
}

// Экспорт для использования в других модулях
window.AppUtils = {
  debounce,
  showError,
  showSuccess,
  getFromStorage,
  saveToStorage,
  removeFromStorage
};
