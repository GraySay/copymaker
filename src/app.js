// Главный файл приложения

class EmailCopymaker {
  constructor() {
    this.template = '';
    this.draftInitialized = false;
    this.isLoadingFile = false;
    this.draftHTML = `<p style=\"margin:0;margin-bottom:8px;\"><strong> жирный текст </strong></p>\n<p style=\"margin:0;\"> сюда текст </p>\n<p style=\"margin:0;\">текст и потом <a href=\"UNSUBLINK\" target=\"_blank\" rel=\"noopener\" style=\"text-decoration:underline;color:#1a5fae;\"><strong>линка</strong></a></p>`;
    
    this.initServices();
    this.initElements();
    this.initEditors();
    this.restoreState();
    this.bindEvents();
    this.setupResizeObservers();
    
    // Инициализация компонентов
    this.imageManager = new ImageManager();
    
    // Первоначальная отрисовка
    this.updateOutput();
    this.applyPreviewDevice();
    this.applyDarkMode();
    
    // Обновление статуса Google Drive
    this.updateGoogleDriveStatus();
    setInterval(() => this.updateGoogleDriveStatus(), 60000);
  }

  // Инициализация сервисов
  initServices() {
    this.historyService = new HistoryService();
    this.googleDriveService = new GoogleDriveService();
    this.slService = new SLService(this.googleDriveService);
  }

  // Инициализация элементов DOM
  initElements() {
    // Основные элементы
    this.elements = {
      // Wrappers
      bodyWrapper: document.getElementById('bodyWrapper'),
      priorityWrapper: document.getElementById('priorityContainer').querySelector('.editor-wrapper'),
      outputWrapper: document.getElementById('output').closest('.editor-wrapper'),
      
      // Form elements
      copyNameInput: document.getElementById('copyNameInput'),
      templateFile: document.getElementById('templateFile'),
      loadedFilenameSpan: document.getElementById('loadedFilename'),
      espSelect: document.getElementById('espSelect'),
      copyType: document.getElementById('copyType'),
      linkInput: document.getElementById('linkInput'),
      linkColorInput: document.getElementById('linkColorInput'),
      linkColorText: document.getElementById('linkColorText'),
      
      // Preview elements
      previewDevice: document.getElementById('previewDevice'),
      previewWrapper: document.getElementById('previewWrapper'),
      iframe: document.getElementById('livePreview'),
      darkModeToggle: document.getElementById('darkModeToggle'),
      
      // Buttons
      loadFromGoogleDriveBtn: document.getElementById('loadFromGoogleDrive'),
      loadSLFromGoogleDriveBtn: document.getElementById('loadSLFromGoogleDrive'),
      saveBtn: document.getElementById('saveBtn'),
      copyButton: document.getElementById('copyButton'),
      copyPromoButton: document.getElementById('copyPromoButton'),
      historyPrev: document.getElementById('historyPrev'),
      historyNext: document.getElementById('historyNext'),
      cheatsheetBtn: document.getElementById('cheatsheetBtn'),
      cheatsheetPopup: document.getElementById('cheatsheetPopup'),
      cheatsheetClose: document.getElementById('cheatsheetClose'),
      
      // Status elements
      errorMsg: document.getElementById('errorMsg'),
      googleDriveStatus: document.getElementById('googleDriveStatus'),
      historyStatus: document.getElementById('historyStatus')
    };
  }

  // Инициализация редакторов CodeMirror
  initEditors() {
    this.bodyEditor = CodeMirror.fromTextArea(document.getElementById('bodyInput'), { 
      lineNumbers: true, 
      mode: 'htmlmixed', 
      lineWrapping: true,
      theme: 'default'
    });
    
    this.outputEditor = CodeMirror.fromTextArea(document.getElementById('output'), { 
      lineNumbers: true, 
      mode: 'htmlmixed', 
      lineWrapping: true, 
      readOnly: true,
      theme: 'default'
    });
    
    this.priorityEditor = CodeMirror.fromTextArea(document.getElementById('priorityText'), { 
      lineNumbers: true, 
      mode: 'htmlmixed', 
      lineWrapping: true,
      theme: 'default'
    });
    
    this.slEditor = CodeMirror.fromTextArea(document.getElementById('slInput'), { 
      lineNumbers: false, 
      mode: 'text/plain', 
      lineWrapping: true,
      theme: 'default'
    });
    
    // Сделать редакторы доступными глобально для других компонентов
    window.bodyEditor = this.bodyEditor;
    window.outputEditor = this.outputEditor;
    window.priorityEditor = this.priorityEditor;
    window.slEditor = this.slEditor;
    
    // Обновить редакторы
    this.bodyEditor.refresh(); 
    this.outputEditor.refresh(); 
    this.priorityEditor.refresh();
    this.slEditor.refresh();
  }

  // Восстановление состояния из localStorage
  restoreState() {
    // Восстановить высоты wrappers
    const savedBodyHeight = AppUtils.getFromStorage('emailCopymaker.bodyWrapperHeight');
    if (savedBodyHeight) this.elements.bodyWrapper.style.height = savedBodyHeight;
    
    const savedPriorityHeight = AppUtils.getFromStorage('emailCopymaker.priorityWrapperHeight');
    if (savedPriorityHeight) this.elements.priorityWrapper.style.height = savedPriorityHeight;
    
    const savedOutputHeight = AppUtils.getFromStorage('emailCopymaker.outputWrapperHeight');
    if (savedOutputHeight) this.elements.outputWrapper.style.height = savedOutputHeight;

    // Восстановить шаблон
    const savedTemplate = AppUtils.getFromStorage('emailCopymaker.template');
    const savedName = AppUtils.getFromStorage('emailCopymaker.templateName');
    if (savedTemplate) {
      this.template = savedTemplate;
      if (savedName) this.elements.loadedFilenameSpan.textContent = savedName;
    }
    
    // Восстановить значения форм
    const savedCopyName = AppUtils.getFromStorage('emailCopymaker.copyName'); 
    if (savedCopyName) this.elements.copyNameInput.value = savedCopyName;
    
    const savedEsp = AppUtils.getFromStorage('emailCopymaker.esp'); 
    if (savedEsp) this.elements.espSelect.value = savedEsp;
    
    const savedCopyType = AppUtils.getFromStorage('emailCopymaker.copyType');
    if (savedCopyType) {
      this.elements.copyType.value = savedCopyType;
      document.getElementById('priorityContainer').classList.toggle('hidden', savedCopyType !== 'priority');
      if (savedCopyType === 'priority' && !this.draftInitialized) {
        this.priorityEditor.setValue(this.draftHTML); 
        this.draftInitialized = true;
        setTimeout(() => this.priorityEditor.refresh(), 10);
      }
    }
    
    const savedLink = AppUtils.getFromStorage('emailCopymaker.link'); 
    if (savedLink) this.elements.linkInput.value = savedLink;
    
    const savedLinkColor = AppUtils.getFromStorage('emailCopymaker.linkColor'); 
    if (savedLinkColor) {
      this.elements.linkColorInput.value = savedLinkColor;
      this.elements.linkColorText.value = savedLinkColor;
    }
    
    const savedBody = AppUtils.getFromStorage('emailCopymaker.body'); 
    if (savedBody) this.bodyEditor.setValue(savedBody);
    
    const savedPriority = AppUtils.getFromStorage('emailCopymaker.priority');
    if (savedPriority) {
      this.priorityEditor.setValue(savedPriority);
      this.draftInitialized = true;
      setTimeout(() => this.priorityEditor.refresh(), 10);
    }
    
    const savedDevice = AppUtils.getFromStorage('emailCopymaker.previewDevice'); 
    if (savedDevice) this.elements.previewDevice.value = savedDevice;
    
    // Восстановить темную тему
    this.elements.darkModeToggle.checked = false; // default state
  }

  // Настройка ResizeObserver для сохранения размеров
  setupResizeObservers() {
    const observerConfigs = [
      [this.elements.bodyWrapper, 'bodyWrapperHeight'],
      [this.elements.priorityWrapper, 'priorityWrapperHeight'],
      [this.elements.outputWrapper, 'outputWrapperHeight']
    ];

    observerConfigs.forEach(([element, key]) => {
      if (element) {
        new ResizeObserver(entries => {
          entries.forEach(entry => {
            AppUtils.saveToStorage('emailCopymaker.' + key, entry.contentRect.height + 'px');
          });
        }).observe(element);
      }
    });
  }

  // Привязка событий
  bindEvents() {
    // Debounced update function
    this.debouncedUpdate = AppUtils.debounce(() => this.updateOutput(), 300);
    
    // Редакторы
    this.bodyEditor.on('change', () => this.handleBodyChange());
    this.priorityEditor.on('change', () => this.handlePriorityChange());
    
    // SL редактор - обновление истории при изменении
    this.slEditor.on('change', () => this.handleSLChange());
    
    // Форма
    this.elements.copyNameInput.addEventListener('input', () => this.handleCopyNameChange());
    this.elements.espSelect.addEventListener('change', () => this.handleEspChange());
    this.elements.copyType.addEventListener('change', () => this.handleCopyTypeChange());
    this.elements.linkInput.addEventListener('input', () => this.handleLinkChange());
    this.elements.linkColorInput.addEventListener('input', () => this.handleLinkColorChange());
    this.elements.linkColorText.addEventListener('input', () => this.handleLinkColorTextChange());
    
    // Превью
    this.elements.previewDevice.addEventListener('change', () => this.handlePreviewDeviceChange());
    this.elements.darkModeToggle.addEventListener('change', () => this.applyDarkMode());
    
    // Кнопки
    this.elements.templateFile.addEventListener('change', (e) => this.handleTemplateFileChange(e));
    this.elements.loadFromGoogleDriveBtn.addEventListener('click', () => this.handleGoogleDriveLoad());
    this.elements.loadSLFromGoogleDriveBtn.addEventListener('click', () => this.handleSLLoad());
    this.elements.saveBtn.addEventListener('click', () => this.handleSave());
    this.elements.copyButton.addEventListener('click', () => this.handleCopy());
    this.elements.copyPromoButton.addEventListener('click', () => this.handleCopyPromo());
    this.elements.historyPrev.addEventListener('click', () => this.handleHistoryNavigation(-1));
    this.elements.historyNext.addEventListener('click', () => this.handleHistoryNavigation(1));
    this.elements.cheatsheetBtn.addEventListener('click', () => this.showCheatsheet());
    this.elements.cheatsheetClose.addEventListener('click', () => this.hideCheatsheet());
    // Улучшенная логика закрытия cheatsheet - только если mousedown и mouseup были на overlay
    let mouseDownOnOverlay = false;
    
    this.elements.cheatsheetPopup.addEventListener('mousedown', (e) => {
      mouseDownOnOverlay = (e.target === this.elements.cheatsheetPopup);
    });
    
    this.elements.cheatsheetPopup.addEventListener('mouseup', (e) => {
      if (mouseDownOnOverlay && e.target === this.elements.cheatsheetPopup) {
        this.hideCheatsheet();
      }
      mouseDownOnOverlay = false;
    });
    
    // Keyboard support for cheatsheet
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.elements.cheatsheetPopup.style.display === 'flex') {
        this.hideCheatsheet();
      }
    });
    
    // Исправление для select dropdown
    this.fixSelectDropdowns();
    
    // Обновление при изменении размера окна
    window.addEventListener('resize', () => this.handleWindowResize());
    

  }

  // Получить текущее имя SL файла
  getCurrentSLFileName() {
    const indicator = document.getElementById('slLoadedIndicator');
    const textSpan = document.getElementById('slLoadedText');
    if (indicator && textSpan && indicator.style.display !== 'none') {
      return textSpan.textContent.replace('SL Loaded: ', '');
    }
    return '';
  }

  // Добавить текущее состояние в историю (общая функция)
  addCurrentStateToHistory() {
    if (this.historyService.isLoadingFromHistory || this.isLoadingFile) return;
    
    const currentContent = this.bodyEditor.getValue();
    if (!currentContent) return;
    
    const currentName = this.elements.copyNameInput.value;
    const slContent = this.slEditor.getValue();
    const currentLink = this.elements.linkInput.value;
    const slFileName = this.getCurrentSLFileName();
    
    this.historyService.addToHistory(currentContent, currentName, slContent, currentLink, this.imageManager.getImagesState(), slFileName);
    this.updateHistoryStatus();
  }

  // Обработчики событий
  handleBodyChange() {
    const content = this.bodyEditor.getValue();
    AppUtils.saveToStorage('emailCopymaker.body', content);
    this.addCurrentStateToHistory();
    this.debouncedUpdate();
  }

  handlePriorityChange() {
    AppUtils.saveToStorage('emailCopymaker.priority', this.priorityEditor.getValue());
    this.debouncedUpdate();
  }

  handleSLChange() {
    this.addCurrentStateToHistory();
  }

  handleCopyNameChange() {
    AppUtils.saveToStorage('emailCopymaker.copyName', this.elements.copyNameInput.value);
  }

  handleEspChange() {
    AppUtils.saveToStorage('emailCopymaker.esp', this.elements.espSelect.value);
    this.debouncedUpdate();
  }

  handleCopyTypeChange() {
    AppUtils.saveToStorage('emailCopymaker.copyType', this.elements.copyType.value);
    document.getElementById('priorityContainer').classList.toggle('hidden', this.elements.copyType.value !== 'priority');
    
    if (this.elements.copyType.value === 'priority' && !this.draftInitialized) {
      this.priorityEditor.setValue(this.draftHTML);
      this.draftInitialized = true;
      setTimeout(() => this.priorityEditor.refresh(), 10);
    }
    this.debouncedUpdate();
  }

  handleLinkChange() {
    AppUtils.saveToStorage('emailCopymaker.link', this.elements.linkInput.value);
    this.addCurrentStateToHistory();
    this.debouncedUpdate();
  }

  handleLinkColorChange() {
    const color = this.elements.linkColorInput.value;
    this.elements.linkColorText.value = color;
    AppUtils.saveToStorage('emailCopymaker.linkColor', color);
    this.debouncedUpdate();
  }

  handleLinkColorTextChange() {
    let color = this.elements.linkColorText.value.trim();
    
    if (/^[0-9a-fA-F]{3,6}$/.test(color)) {
      color = '#' + color;
      this.elements.linkColorText.value = color;
    }
    
    if (/^#[0-9a-fA-F]{3,6}$/.test(color)) {
      this.elements.linkColorInput.value = color;
      AppUtils.saveToStorage('emailCopymaker.linkColor', color);
      this.debouncedUpdate();
    }
  }

  handlePreviewDeviceChange() {
    AppUtils.saveToStorage('emailCopymaker.previewDevice', this.elements.previewDevice.value);
    this.applyPreviewDevice();
  }

  handleHistoryNavigation(direction) {
    const historyItem = this.historyService.navigate(direction);
    if (!historyItem) return;
    
    this.historyService.setLoadingFromHistory(true);
    
    // Загрузить содержимое из истории
    this.bodyEditor.setValue(historyItem.content);
    this.elements.copyNameInput.value = historyItem.name || 'Без названия';
    AppUtils.saveToStorage('emailCopymaker.copyName', this.elements.copyNameInput.value);
    
    // Загрузить соответствующий SL
    if (historyItem.slContent) {
      this.slEditor.setValue(historyItem.slContent);
      
      // Показать индикатор если есть имя файла в истории
      if (historyItem.slFileName) {
        this.slService.showSLLoadedIndicator(historyItem.slFileName);
      } else {
        this.slService.hideSLLoadedIndicator();
      }
    } else {
      this.slEditor.setValue('');
      this.slService.hideSLLoadedIndicator();
      // Не показывать ошибку если SL просто отсутствует
    }
    
    // Загрузить соответствующую ссылку
    if (historyItem.link) {
      this.elements.linkInput.value = historyItem.link;
      AppUtils.saveToStorage('emailCopymaker.link', historyItem.link);
    } else {
      this.elements.linkInput.value = '';
      AppUtils.saveToStorage('emailCopymaker.link', '');
    }
    
    // Восстановить изображения из истории
    this.imageManager.restoreImagesState(historyItem.images);
    
    this.historyService.setLoadingFromHistory(false);
    this.updateHistoryStatus();
  }

  handleWindowResize() {
    this.bodyEditor.refresh();
    this.outputEditor.refresh();
    this.priorityEditor.refresh();
    this.slEditor.refresh();
  }

  // Обновление статуса истории
  updateHistoryStatus() {
    const status = this.historyService.getStatus();
    this.elements.historyStatus.textContent = status.text;
    this.elements.historyPrev.disabled = !status.canPrev;
    this.elements.historyNext.disabled = !status.canNext;
  }

  // Обновление статуса Google Drive
  updateGoogleDriveStatus() {
    try {
      if (!this.elements.googleDriveStatus) return;
      
      const status = this.googleDriveService.getConnectionStatus();
      this.elements.googleDriveStatus.textContent = status.text;
      this.elements.googleDriveStatus.style.color = status.color;
    } catch (error) {
      console.error('Error updating Google Drive status:', error);
      if (this.elements.googleDriveStatus) {
        this.elements.googleDriveStatus.textContent = '○ Требуется авторизация';
        this.elements.googleDriveStatus.style.color = '#666';
      }
    }
  }

  // Основная функция обновления вывода
  updateOutput() {
    if (!this.template.includes('<!--BODY_HERE-->') || !this.template.includes('<!--PRIORITY_HERE-->')) return;
    
    let html = this.template;
    let body = this.bodyEditor.getValue().replace(/urlhere/g, this.elements.linkInput.value);
    
    // Замена цветов ссылок (улучшенная логика)
    const linkColor = this.elements.linkColorInput.value;
    body = body.replace(/<a[^>]*>[\s\S]*?<\/a>/gi, (linkBlock) => {
      const aTagMatch = linkBlock.match(/<a[^>]*>/i);
      if (!aTagMatch) return linkBlock;
      
      let aTag = aTagMatch[0];
      
      // Пропустить если это кнопка
      if (/background-color\s*:\s*[^;"']+/i.test(aTag)) {
        return linkBlock;
      }
      
      const linkContent = linkBlock.substring(aTag.length, linkBlock.length - 4);
      
      // Улучшенная обработка атрибута style
      if (/style\s*=\s*["']/i.test(aTag)) {
        // Найти полный атрибут style с правильной обработкой вложенных кавычек
        const styleMatch = aTag.match(/style\s*=\s*(["'])((?:\\.|(?!\1)[^\\])*?)\1/i);
        if (styleMatch) {
          const quote = styleMatch[1];
          let styleContent = styleMatch[2];
          
          // Проверить есть ли уже color в стилях
          if (/color\s*:\s*[^;"']+/i.test(styleContent)) {
            // Заменить существующий color
            styleContent = styleContent.replace(/color\s*:\s*[^;"']+/gi, `color:${linkColor}`);
          } else {
            // Добавить color в конец
            const separator = styleContent.trim().endsWith(';') ? ' ' : '; ';
            styleContent = styleContent + separator + `color:${linkColor}`;
          }
          
          // Заменить весь атрибут style
          aTag = aTag.replace(/style\s*=\s*(["'])((?:\\.|(?!\1)[^\\])*?)\1/i, `style=${quote}${styleContent}${quote}`);
        }
      } else {
        // Если нет атрибута style, добавить его
        aTag = aTag.replace(/<a/, `<a style="color:${linkColor}"`);
      }
      
      return aTag + linkContent + '</a>';
    });
    
    // Обработка изображений
    this.imageManager.getImageBlocks().forEach(block => {
      const orig = block.dataset.tag;
      const oldSrc = block.dataset.src;
      const newSrc = block.querySelector('.new-src').value;
      console.log('🔄 Замена изображения:', { oldSrc, newSrc });
      
      let newTag = orig.replace(oldSrc, newSrc);
      
      if (block.querySelector('.change-alt').checked) {
        const altVal = block.querySelector('.new-alt').value;
        newTag = /alt=["'][^"']*["']/.test(newTag)
          ? newTag.replace(/alt=["'][^"']*["']/, `alt="${altVal}"`)
          : newTag.replace(/<img/, `<img alt="${altVal}"`);
      }
      
      console.log('🔄 Результат замены:', { orig, newTag });
      body = body.replace(orig, newTag);
    });
    
    html = html.replace('<!--BODY_HERE-->', body);
    html = html.replace('<!--PRIORITY_HERE-->', this.elements.copyType.value === 'priority' ? this.priorityEditor.getValue() : '');
    
    if (this.elements.espSelect.value === 'exacttarget') {
      html = html.replace(/<html[^>]*>/i, m => `${m}\n<custom name="opencounter" type="tracking"/>`);
      html = html.replace(/<\/html>/i, `<div style="display:none"><a href="%%profile_center_url%%" alias="Update Profile">Update Profile</a><table cellpadding="2" cellspacing="0" width="600" ID="Table5" Border=0><tr><td><font face="verdana" size="1" color="#444444">This email was sent by: <b>%%Member_Busname%%</b><br>%%Member_Addr%% %%Member_City%%, %%Member_State%%, %%Member_PostalCode%%,%%Member_Country%%<br><br></font></td></tr></table>\n</div>\n</html>`);
    }
    
    this.outputEditor.setValue(html);
    
    const doc = this.elements.iframe.contentDocument || this.elements.iframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
    
    // Улучшенная логика обновления высоты
    const updateHeight = () => {
      const h = doc.documentElement.scrollHeight;
      if (h > 0) {
        this.elements.iframe.style.height = h + 'px';
        this.elements.previewWrapper.style.height = h + 'px';
      }
    };
    
    // Обновить высоту после загрузки контента
    setTimeout(updateHeight, 50);
    
    // Дополнительная проверка через 200ms для медленно загружающегося контента
    setTimeout(() => {
      const newHeight = doc.documentElement.scrollHeight;
      const currentHeight = parseInt(this.elements.iframe.style.height) || 0;
      if (Math.abs(newHeight - currentHeight) > 10) {
        updateHeight();
      }
    }, 200);
  }

  // Применение устройства предварительного просмотра
  applyPreviewDevice() {
    this.elements.previewWrapper.style.width = this.elements.previewDevice.value === 'mobile' ? '375px' : '100%';
    // Не сбрасываем высоту - она будет пересчитана в updateOutput
    this.updateOutput();
  }

  // Применение темной темы
  applyDarkMode() {
    const doc = this.elements.iframe.contentDocument || this.elements.iframe.contentWindow.document;
    let styleEl = doc.getElementById('dark-mode-style');
    
    if (this.elements.darkModeToggle.checked) {
      if (!styleEl) {
        styleEl = doc.createElement('style');
        styleEl.id = 'dark-mode-style';
        styleEl.innerHTML = `
          html { 
            filter: invert(1) hue-rotate(180deg) !important; 
          } 
          img, video, iframe, canvas, svg, picture { 
            filter: invert(1) hue-rotate(180deg) !important; 
          }
        `;
        doc.head.appendChild(styleEl);
      }
    } else {
      if (styleEl) styleEl.remove();
    }
  }

  // Исправление dropdown
  fixSelectDropdowns() {
    document.querySelectorAll('select').forEach(select => {
      let isMouseDown = false;
      
      select.addEventListener('mousedown', () => { isMouseDown = true; });
      select.addEventListener('mouseup', () => { isMouseDown = false; });
      select.addEventListener('blur', (e) => {
        if (isMouseDown) {
          e.preventDefault();
          select.focus();
        }
      });
      select.addEventListener('scroll', (e) => { e.stopPropagation(); });
    });
  }

  // Загрузка файла шаблона
  handleTemplateFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = () => {
      // Блокируем добавление в историю во время загрузки шаблона
      this.isLoadingFile = true;
      
      this.template = reader.result;
      AppUtils.saveToStorage('emailCopymaker.template', this.template);
      AppUtils.saveToStorage('emailCopymaker.templateName', file.name);
      this.elements.loadedFilenameSpan.textContent = file.name;
      
      let errors = [];
      if (!this.template.includes('<!--BODY_HERE-->')) {
        errors.push('Отсутствует плейсхолдер <!--BODY_HERE-->');
      }
      if (!this.template.includes('<!--PRIORITY_HERE-->')) {
        errors.push('Отсутствует плейсхолдер <!--PRIORITY_HERE-->');
      }
      
      if (errors.length > 0) {
        AppUtils.showError(`Ошибки в шаблоне "${file.name}": ${errors.join(', ')}`);
      } else {
          AppUtils.showSuccess(`Шаблон "${file.name}" успешно загружен`);
          
          // Для шаблонов SL файлы не загружаются
          // SL файлы загружаются только для основных HTML копий
        }
      
      this.debouncedUpdate();
      
      // Разблокируем добавление в историю
      this.isLoadingFile = false;
    };
    reader.readAsText(file);
    
    // Сброс полей при загрузке нового шаблона
    this.elements.linkInput.value = '';
    AppUtils.saveToStorage('emailCopymaker.link', '');
    this.imageManager.clearImages();
  }

  // Загрузка SL из Google Drive
  async handleSLLoad() {
    try {
      const slContent = await this.slService.loadSLFromGoogleDrive();
      
      // Если SL загружен успешно, обновить историю
      if (slContent) {
        const currentContent = this.bodyEditor.getValue();
        const currentName = this.elements.copyNameInput.value;
        const currentLink = this.elements.linkInput.value;
        
        // Обновить текущую запись в истории
        if (currentContent) {
          const slFileName = this.getCurrentSLFileName();
          this.historyService.addToHistory(currentContent, currentName, slContent, currentLink, this.imageManager.getImagesState(), slFileName);
          this.updateHistoryStatus();
        }
      }
      
      // Обновить статус после загрузки
      this.updateGoogleDriveStatus();
    } catch (error) {
      console.error('SL Load error:', error);
      AppUtils.showError('Ошибка загрузки SL: ' + (error.message || 'Неизвестная ошибка'));
    }
  }

  // Загрузка из Google Drive
  async handleGoogleDriveLoad() {
    try {
      if (this.googleDriveService.hasValidToken()) {
              // Подключение к Google Drive
    }
    
    await this.googleDriveService.loadGoogleAPIs();
    await this.googleDriveService.initializeGoogleAPIs();
    const accessToken = await this.googleDriveService.authenticate();
      
      const selectedFile = await this.googleDriveService.createPicker(accessToken);
      
      if (selectedFile) {
        AppUtils.showSuccess('Загружаем файл...');
        const content = await this.googleDriveService.downloadFileContent(selectedFile.id);
        
        if (content) {
          // Блокируем добавление в историю во время загрузки
          this.isLoadingFile = true;
          
          this.bodyEditor.setValue(content);
          
          const fileName = selectedFile.name.replace(/\.(html|htm)$/i, '');
          this.elements.copyNameInput.value = fileName;
          AppUtils.saveToStorage('emailCopymaker.copyName', fileName);
          
          // Очистка поля Link при загрузке нового файла
          this.elements.linkInput.value = '';
          AppUtils.saveToStorage('emailCopymaker.link', '');
          
          // Автоматический поиск SL файла в той же папке
          console.log('🔍 Запуск автоматического поиска SL...');
          const slContent = await this.slService.searchAndLoadSLAutomatically(selectedFile, accessToken);
          
          const slFileName = this.getCurrentSLFileName();
          this.historyService.addToHistory(content, fileName, slContent || '', this.elements.linkInput.value, [], slFileName);
          this.updateHistoryStatus();
          
          // Разблокируем добавление в историю
          this.isLoadingFile = false;
          
          AppUtils.showSuccess(`Файл "${selectedFile.name}" успешно загружен`);
        }
      } else {
        AppUtils.showError('Файл не выбран');
      }
    } catch (error) {
      console.error('Google Drive error:', error);
      
      // Разблокируем добавление в историю в случае ошибки
      this.isLoadingFile = false;
      
      if (error.status === 401 || error.status === 403 || error.error === 'access_denied') {
        this.googleDriveService.clearCachedToken();
        AppUtils.showError('Ошибка авторизации Google Drive. Попробуйте еще раз.');
      } else {
        AppUtils.showError('Ошибка Google Drive: ' + (error.message || 'Неизвестная ошибка'));
      }
      
      // Обновить статус после ошибки
      this.updateGoogleDriveStatus();
    }
  }

  // Сохранение файла
  handleSave() {
    this.updateOutput();
    const filename = this.elements.copyNameInput.value.trim() || 'email_copy';
    const blob = new Blob([this.outputEditor.getValue()], {type: 'text/html'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename.endsWith('.html') ? filename : filename + '.html';
    a.click();
    
          AppUtils.showSuccess(`Файл "${a.download}" сохранен`);
  }

  // Копирование в буфер обмена
  handleCopy() {
    const text = this.outputEditor.getValue();
    
    if (!text.trim()) {
      AppUtils.showError('Нет содержимого для копирования');
      return;
    }
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => {
          AppUtils.showSuccess('HTML код скопирован в буфер обмена!');
        })
        .catch(e => AppUtils.showError('Ошибка при копировании: ' + e.message));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      AppUtils.showSuccess('HTML код скопирован в буфер обмена!');
    }
  }

  // Копирование только body (Promo)
  handleCopyPromo() {
    let body = this.bodyEditor.getValue().replace(/urlhere/g, this.elements.linkInput.value);
    
    // Замена цветов ссылок (используем ту же логику что и в updateOutput)
    const linkColor = this.elements.linkColorInput.value;
    body = body.replace(/<a[^>]*>[\s\S]*?<\/a>/gi, (linkBlock) => {
      const aTagMatch = linkBlock.match(/<a[^>]*>/i);
      if (!aTagMatch) return linkBlock;
      
      let aTag = aTagMatch[0];
      
      // Пропустить если это кнопка
      if (/background-color\s*:\s*[^;"']+/i.test(aTag)) {
        return linkBlock;
      }
      
      const linkContent = linkBlock.substring(aTag.length, linkBlock.length - 4);
      
      // Улучшенная обработка атрибута style
      if (/style\s*=\s*["']/i.test(aTag)) {
        const styleMatch = aTag.match(/style\s*=\s*(["'])((?:\\.|(?!\1)[^\\])*?)\1/i);
        if (styleMatch) {
          const quote = styleMatch[1];
          let styleContent = styleMatch[2];
          
          if (/color\s*:\s*[^;"']+/i.test(styleContent)) {
            styleContent = styleContent.replace(/color\s*:\s*[^;"']+/gi, `color:${linkColor}`);
          } else {
            const separator = styleContent.trim().endsWith(';') ? ' ' : '; ';
            styleContent = styleContent + separator + `color:${linkColor}`;
          }
          
          aTag = aTag.replace(/style\s*=\s*(["'])((?:\\.|(?!\1)[^\\])*?)\1/i, `style=${quote}${styleContent}${quote}`);
        }
      } else {
        aTag = aTag.replace(/>$/, ` style="color:${linkColor}">`);
      }
      
      return aTag + linkContent + '</a>';
    });
    
    if (!body.trim()) {
      AppUtils.showError('Нет содержимого body для копирования');
      return;
    }
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(body)
        .then(() => {
          AppUtils.showSuccess('Body HTML скопирован в буфер обмена!');
        })
        .catch(e => AppUtils.showError('Ошибка при копировании: ' + e.message));
    } else {
      const ta = document.createElement('textarea');
      ta.value = body;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      AppUtils.showSuccess('Body HTML скопирован в буфер обмена!');
    }
  }

  // Показать cheatsheet
  showCheatsheet() {
    this.elements.cheatsheetPopup.style.display = 'flex';
    // Фокус на textarea для работы Ctrl+A
    setTimeout(() => {
      const textarea = document.getElementById('cheatsheetCode');
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }, 100);
  }

  // Скрыть cheatsheet
  hideCheatsheet() {
    this.elements.cheatsheetPopup.style.display = 'none';
  }
}

// Сделать updateOutput доступной глобально для других компонентов
window.updateOutput = null;

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
  const app = new EmailCopymaker();
  
  // Сделать функции доступными глобально
  window.updateOutput = () => app.updateOutput();
  window.app = app; // Для доступа к методам приложения
  
  // Обновить статус истории
  app.updateHistoryStatus();
});
