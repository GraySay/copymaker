// Компонент для управления изображениями

class ImageManager {
  constructor() {
    this.searchBtn = document.getElementById('searchImagesBtn');
    this.container = document.getElementById('imageEditor');
    this.notifications = document.getElementById('searchImageNotifications');
    
    this.init();
  }

  init() {
    if (this.searchBtn) {
      this.searchBtn.addEventListener('click', () => this.handleSearchImages());
    }
  }

  // Обработчик поиска изображений
  handleSearchImages() {
    const bodyEditor = window.bodyEditor;
    if (!bodyEditor) {
      console.error('Body editor not found');
      return;
    }

    const htmlContent = bodyEditor.getValue().trim();
    
    if (!htmlContent) {
      this.showSearchError('Пожалуйста, введите HTML код в поле "Email Body HTML" перед поиском изображений');
      return;
    }
    
    // Добавить состояние загрузки
    const originalText = this.searchBtn.innerHTML;
    this.searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Поиск...';
    this.searchBtn.disabled = true;
    
    setTimeout(() => {
      try {
        this.searchImages();
      } catch (error) {
        console.error('Error searching images:', error);
        // Показать ошибку пользователю
        if (window.showError) {
          window.showError('Ошибка поиска изображений: ' + error.message);
        }
      } finally {
        // Всегда восстановить состояние кнопки
        this.searchBtn.innerHTML = originalText;
        this.searchBtn.disabled = false;
      }
    }, 500);
  }

  // Показать ошибку поиска
  showSearchError(message) {
    if (!this.notifications) return;

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    this.notifications.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.classList.add('fade-out');
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.parentNode.removeChild(errorDiv);
        }
      }, 300);
    }, 4000);
  }

  // Поиск изображений в HTML коде
  searchImages() {
    const bodyEditor = window.bodyEditor;
    if (!bodyEditor || !this.container) return;

    const regex = /<img[^>]*src=["']([^"']+)["'][^>]*?(?:alt=["']?([^"'>]*)["']?)?[^>]*?>/gi;
    this.container.innerHTML = '';
    
    let match;
    let imageCount = 0;
    
    while ((match = regex.exec(bodyEditor.getValue()))) {
      const [fullTag, src, alt] = match;
      console.log('🔍 Найдено изображение:', { fullTag, src, alt });
      imageCount++;
      
      const block = this.createImageBlock(fullTag, src, alt, imageCount);
      this.container.appendChild(block);
    }
    
    if (imageCount === 0) {
      this.showNoImagesMessage();
    } else {
      this.showSuccessMessage(imageCount);
    }
    
    // Всегда обновить текущую запись истории с изображениями (даже если 0)
    this.updateCurrentHistoryWithImages();
  }

  // Создать блок редактирования изображения
  createImageBlock(fullTag, src, alt, imageCount) {
    const block = document.createElement('div'); 
    block.className = 'image-edit-block'; 
    block.dataset.tag = fullTag; 
    block.dataset.src = src;
    
    block.innerHTML = `
      <div style="margin-bottom: 15px;">
        <strong style="color: #4a5568;"><i class="fas fa-image"></i> Image ${imageCount}:</strong>
        <code>${fullTag.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code>
      </div>
      <label><i class="fas fa-link"></i> Source URL:</label>
      <input class="new-src" type="text" value="${src}" />
      <div style="margin-top: 10px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" class="change-alt" /> 
          <i class="fas fa-edit"></i> Change alt text
        </label>
        <input type="text" class="new-alt hidden" value="${alt || ''}" placeholder="${alt || 'Enter alt text...'}" style="margin-top: 8px;" />
      </div>
    `;
    
    // Установить значение и placeholder для alt текста
    const newAltInput = block.querySelector('.new-alt');
    newAltInput.value = alt || '';
    newAltInput.placeholder = alt || 'Enter alt text...';
    
    // Добавить обработчики событий
    this.addImageBlockListeners(block);
    
    return block;
  }

  // Добавить обработчики событий для блока изображения
  addImageBlockListeners(block) {
    const debouncedUpdate = AppUtils.debounce(() => {
      if (window.updateOutput) {
        window.updateOutput();
      }
      // Обновить историю при изменении изображений
      this.updateCurrentHistoryWithImages();
    }, 300);

    const srcInput = block.querySelector('.new-src');
    const altCheckbox = block.querySelector('.change-alt');
    const altInput = block.querySelector('.new-alt');

    if (srcInput) {
      srcInput.addEventListener('input', debouncedUpdate);
    }

    if (altCheckbox) {
      altCheckbox.addEventListener('change', () => { 
        const altField = block.querySelector('.new-alt');
        if (altField) {
          altField.classList.toggle('hidden', !altCheckbox.checked);
        }
        debouncedUpdate();
      });
    }

    if (altInput) {
      altInput.addEventListener('input', debouncedUpdate);
    }
  }

  // Показать сообщение об отсутствии изображений
  showNoImagesMessage() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="no-images-message">
        <i class="fas fa-info-circle"></i>
        <p>Изображения не найдены в HTML коде</p>
      </div>
    `;
  }

  // Показать сообщение об успехе в overlay
  showSuccessMessage(imageCount) {
    const message = `Найдено ${imageCount} изображени${imageCount === 1 ? 'е' : imageCount < 5 ? 'я' : 'й'}`;
    
    // Используем глобальную функцию showSuccess для overlay
    if (window.showSuccess) {
      window.showSuccess(message);
    } else {
      console.log('✅', message);
    }
  }

  // Очистить найденные изображения
  clearImages(showMessage = true) {
    if (this.container) {
      if (showMessage) {
        this.container.innerHTML = `
          <div class="no-images-message">
            <i class="fas fa-info-circle"></i>
            <p>Нажмите кнопку "Search Images" для поиска изображений в HTML коде</p>
          </div>
        `;
      } else {
        this.container.innerHTML = '';
      }
    }
  }

  // Получить все блоки изображений для обработки
  getImageBlocks() {
    return this.container ? this.container.querySelectorAll('.image-edit-block') : [];
  }

  // Получить текущее состояние всех изображений для сохранения в истории
  getImagesState() {
    const blocks = this.getImageBlocks();
    const imagesState = [];
    
    blocks.forEach(block => {
      const srcInput = block.querySelector('.new-src');
      const altCheckbox = block.querySelector('.change-alt');
      const altInput = block.querySelector('.new-alt');
      
      imagesState.push({
        originalTag: block.dataset.tag,
        originalSrc: block.dataset.src,
        newSrc: srcInput ? srcInput.value : block.dataset.src,
        altChanged: altCheckbox ? altCheckbox.checked : false,
        newAlt: altInput ? altInput.value : '',
        originalAlt: altInput ? altInput.placeholder : ''
      });
    });
    
    return imagesState;
  }

  // Восстановить состояние изображений из истории
  restoreImagesState(imagesState) {
    if (!imagesState || imagesState.length === 0) {
      this.clearImages(true); // Показать сообщение о поиске если нет изображений
      return;
    }
    
    // Очистить текущие изображения без показа сообщения
    this.clearImages(false);
    
    // Восстановить каждое изображение
    imagesState.forEach((imageData, index) => {
      const block = this.createImageBlock(
        imageData.originalTag, 
        imageData.originalSrc, 
        imageData.originalAlt,
        index + 1
      );
      
      // Установить сохраненные значения
      const srcInput = block.querySelector('.new-src');
      const altCheckbox = block.querySelector('.change-alt');
      const altInput = block.querySelector('.new-alt');
      
      if (srcInput) {
        srcInput.value = imageData.newSrc;
      }
      
      if (altCheckbox) {
        altCheckbox.checked = imageData.altChanged;
      }
      
      if (altInput) {
        altInput.value = imageData.newAlt;
        altInput.classList.toggle('hidden', !imageData.altChanged);
      }
      
      this.container.appendChild(block);
    });
    
    // При восстановлении из истории не показываем уведомления
  }

  // Обновить текущую запись истории с изображениями (не создавать новую)
  updateCurrentHistoryWithImages() {
    if (!window.app || !window.app.historyService) {
      return;
    }

    const currentImages = this.getImagesState();
    
    // Обновить изображения в текущей записи истории
    window.app.historyService.updateCurrentImages(currentImages);
  }

  // Создать новую запись истории с изображениями
  updateHistoryWithImages() {
    if (!window.app || !window.app.historyService || !window.app.bodyEditor) {
      return;
    }

    const currentContent = window.app.bodyEditor.getValue();
    const currentName = window.app.elements.copyNameInput.value;
    const currentLink = window.app.elements.linkInput.value;
    const currentSL = window.app.slEditor ? window.app.slEditor.getValue() : '';
    const currentImages = this.getImagesState();

    if (currentContent) {
      const currentSLFileName = window.app.getCurrentSLFileName();
      window.app.historyService.addToHistory(
        currentContent, 
        currentName, 
        currentSL, 
        currentLink, 
        currentImages,
        currentSLFileName
      );
      window.app.updateHistoryStatus();
    }
  }
}

// Экспорт для использования в других модулях
window.ImageManager = ImageManager;
