// Сервис для управления историей копий

class HistoryService {
  constructor() {
    this.emailHistory = [];
    this.currentHistoryIndex = -1;
    this.isLoadingFromHistory = false;
    this.maxHistoryItems = 4;
    this.storageKey = 'emailCopymaker.history';
    
    this.loadHistory();
  }

  // Загрузить историю из localStorage
  loadHistory() {
    try {
      const savedHistory = AppUtils.getFromStorage(this.storageKey);
      if (savedHistory) {
        this.emailHistory = JSON.parse(savedHistory);
        this.currentHistoryIndex = this.emailHistory.length - 1;
      }
    } catch (error) {
      console.error('Error loading email history:', error);
      this.emailHistory = [];
      this.currentHistoryIndex = -1;
    }
  }

  // Сохранить историю в localStorage
  saveHistory() {
    try {
      AppUtils.saveToStorage(this.storageKey, JSON.stringify(this.emailHistory));
    } catch (error) {
      console.error('Error saving email history:', error);
    }
  }

  // Добавить новую запись в историю
  addToHistory(content, name = '', slContent = '', link = '', images = null, slFileName = '') {
    if (this.isLoadingFromHistory || !content.trim()) return;
    
    const historyItem = {
      content: content,
      name: name || 'Без названия',
      slContent: slContent || '',
      link: link || '',
      images: images || [],
      slFileName: slFileName || '',
      timestamp: Date.now()
    };
    
    // Удалить дубликаты на основе контента
    this.emailHistory = this.emailHistory.filter(item => item.content !== content);
    
    // Добавить в конец
    this.emailHistory.push(historyItem);
    
    // Оставить только последние элементы
    if (this.emailHistory.length > this.maxHistoryItems) {
      this.emailHistory = this.emailHistory.slice(-this.maxHistoryItems);
    }
    
    this.currentHistoryIndex = this.emailHistory.length - 1;
    this.saveHistory();
  }

  // Получить текущий элемент истории
  getCurrentItem() {
    if (this.currentHistoryIndex >= 0 && this.currentHistoryIndex < this.emailHistory.length) {
      return this.emailHistory[this.currentHistoryIndex];
    }
    return null;
  }

  // Навигация по истории (линейная)
  navigate(direction) {
    if (this.emailHistory.length === 0) return null;
    
    const newIndex = this.currentHistoryIndex + direction;
    if (newIndex < 0 || newIndex >= this.emailHistory.length) {
      return null; // Не выходим за границы
    }
    
    this.currentHistoryIndex = newIndex;
    return this.emailHistory[this.currentHistoryIndex];
  }

  // Проверить возможность навигации (линейная)
  canNavigate(direction) {
    if (this.emailHistory.length === 0) return false;
    
    const newIndex = this.currentHistoryIndex + direction;
    return newIndex >= 0 && newIndex < this.emailHistory.length;
  }

  // Получить статус истории
  getStatus() {
    if (this.emailHistory.length === 0) {
      return {
        text: 'История: нет данных',
        canPrev: false,
        canNext: false
      };
    }
    
    const current = this.currentHistoryIndex + 1;
    const total = this.emailHistory.length;
    const currentItem = this.emailHistory[this.currentHistoryIndex];
    const name = currentItem ? (currentItem.name || 'Без названия') : '';
    
    return {
      text: `История: ${current}/${total} - ${name}`,
      canPrev: this.canNavigate(-1),
      canNext: this.canNavigate(1)
    };
  }

  // Установить флаг загрузки из истории
  setLoadingFromHistory(loading) {
    this.isLoadingFromHistory = loading;
  }

  // Обновить изображения в текущей записи истории
  updateCurrentImages(images) {
    if (this.emailHistory.length > 0 && this.currentHistoryIndex >= 0) {
      this.emailHistory[this.currentHistoryIndex].images = images || [];
      this.saveHistory();
    }
  }

  // Обновить SL файл в текущей записи истории
  updateCurrentSLFile(slFileName) {
    if (this.emailHistory.length > 0 && this.currentHistoryIndex >= 0) {
      this.emailHistory[this.currentHistoryIndex].slFileName = slFileName || '';
      this.saveHistory();
    }
  }

  // Очистить историю
  clearHistory() {
    this.emailHistory = [];
    this.currentHistoryIndex = -1;
    AppUtils.removeFromStorage(this.storageKey);
  }
}

// Экспорт для использования в других модулях
window.HistoryService = HistoryService;
