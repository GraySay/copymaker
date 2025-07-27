// Сервис для работы с Subject Line файлами

class SLService {
  constructor(googleDriveService) {
    this.googleDriveService = googleDriveService;
  }

  // Показать уведомление SL (используем overlay)
  showSLNotification(message, type = 'info') {
    const overlay = document.getElementById('notificationOverlay');
    if (!overlay) {
      console.error('Notification overlay not found');
      return;
    }

    const notificationDiv = document.createElement('div');
    notificationDiv.className = type === 'warning' ? 'error' : 'success';
    notificationDiv.innerHTML = '<i class="fas fa-' + (type === 'warning' ? 'exclamation-triangle' : 'info-circle') + '"></i> ' + message;
    
    overlay.appendChild(notificationDiv);
    
    setTimeout(() => {
      notificationDiv.classList.add('fade-out');
      setTimeout(() => {
        if (notificationDiv.parentNode) {
          notificationDiv.parentNode.removeChild(notificationDiv);
        }
      }, 300);
    }, type === 'warning' ? 5000 : 3000);
  }

  // Показать индикатор загруженного SL файла
  showSLLoadedIndicator(fileName) {
    const indicator = document.getElementById('slLoadedIndicator');
    const textSpan = document.getElementById('slLoadedText');
    
    if (indicator && textSpan) {
      textSpan.textContent = `SL Loaded: ${fileName}`;
      indicator.style.display = 'block';
    }
  }

  // Скрыть индикатор загруженного SL файла
  hideSLLoadedIndicator() {
    const indicator = document.getElementById('slLoadedIndicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  // Загрузить SL файл через Google Drive Picker
  async loadSLFromGoogleDrive() {
    try {
      await this.googleDriveService.loadGoogleAPIs();
      await this.googleDriveService.initializeGoogleAPIs();
      const accessToken = await this.googleDriveService.authenticate();
      
      // Создать picker с фильтром для SL файлов
      const selectedFile = await this.createSLPicker(accessToken);
      
              if (selectedFile) {
        const content = await this.downloadAndExtractSLContent(selectedFile, accessToken);
        
        if (content) {
          // Загрузить содержимое в редактор
          if (window.slEditor) {
            window.slEditor.setValue(content);
          }
          this.showSLNotification('SL файл "' + selectedFile.name + '" успешно загружен', 'info');
          this.showSLLoadedIndicator(selectedFile.name);
          

          
          // Сохранить имя файла в истории
          if (window.app && window.app.historyService) {
            window.app.historyService.updateCurrentSLFile(selectedFile.name);
          }
          
          return content;
        }
      } else {
        this.showSLNotification('SL файл не выбран', 'warning');
      }
    } catch (error) {
      console.error('Error loading SL from Google Drive:', error);
      
      let errorMessage = 'Неизвестная ошибка';
      if (error && error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      this.showSLNotification('Ошибка загрузки SL: ' + errorMessage, 'warning');
      
      // Очистить токен при ошибке авторизации
      if (error.status === 401 || error.status === 403 || error.error === 'access_denied') {
        this.googleDriveService.clearCachedToken();
      }
    }
  }

  // Создать Google Drive Picker для SL файлов
  async createSLPicker(accessToken) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.googleDriveService.google || !this.googleDriveService.google.picker) {
          reject(new Error('Google Picker API not loaded'));
          return;
        }
        
        if (!accessToken) {
          reject(new Error('No access token provided'));
          return;
        }
        
        // Создать view для документов (Word, Google Docs, текстовые файлы)
        const docsView = new this.googleDriveService.google.picker.DocsView(this.googleDriveService.google.picker.ViewId.DOCS)
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false);
        
        const pickerBuilder = new this.googleDriveService.google.picker.PickerBuilder()
          .addView(docsView)
          .setOAuthToken(accessToken)
          .setTitle('Выберите SL файл (.docx, .txt или Google Docs)')
          .setCallback((data) => {
            try {
              
              if (data.action === this.googleDriveService.google.picker.Action.PICKED) {
                const file = data.docs[0];
                
                // Проверить что это подходящий файл
                if (this.isSLFileSupported(file)) {
                  resolve(file);
                } else {
                  this.showSLNotification('Неподдерживаемый формат файла: ' + file.name + '. Используйте .docx, .txt файлы или Google Docs', 'warning');
                  resolve(null);
                }
              } else if (data.action === this.googleDriveService.google.picker.Action.CANCEL) {
                console.log('SL Picker cancelled');
                resolve(null);
              }
            } catch (callbackError) {
              console.error('Error in SL picker callback:', callbackError);
              reject(callbackError);
            }
          });
        
        // Попытаться добавить developer key
        try {
          pickerBuilder.setDeveloperKey(this.googleDriveService.config.API_KEY);
        } catch (keyError) {
          console.warn('Could not set developer key:', keyError);
        }
        
        const picker = pickerBuilder.build();
        picker.setVisible(true);
        
      } catch (error) {
        console.error('Error creating SL picker:', error);
        reject(error);
      }
    });
  }

  // Проверить что файл поддерживается для SL
  isSLFileSupported(file) {
    const supportedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'text/plain', // .txt
      'application/vnd.google-apps.document' // Google Docs
    ];
    
    if (supportedMimeTypes.includes(file.mimeType)) {
      return true;
    }
    
    // Дополнительная проверка по расширению файла
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.docx') || fileName.endsWith('.txt')) {
      return true;
    }
    
    return false;
  }

  // Скачать и извлечь содержимое SL файла
  async downloadAndExtractSLContent(slFile, accessToken) {
    try {
      console.log('Downloading SL file:', slFile);
      
      if (!accessToken) {
        throw new Error('Нет токена доступа для загрузки файла');
      }
      
      // Скачать содержимое файла
      let response;
      
      // Проверить, является ли файл Google Docs
      if (slFile.mimeType === 'application/vnd.google-apps.document') {
        // Для Google Docs экспортируем как текст
        response = await fetch('https://www.googleapis.com/drive/v3/files/' + slFile.id + '/export?mimeType=text/plain', {
          headers: {
            'Authorization': 'Bearer ' + accessToken
          }
        });
      } else {
        // Для обычных файлов скачиваем как есть
        response = await fetch('https://www.googleapis.com/drive/v3/files/' + slFile.id + '?alt=media', {
          headers: {
            'Authorization': 'Bearer ' + accessToken
          }
        });
      }
      
      if (!response.ok) {
        // При ошибке авторизации очистить токен
        if (response.status === 401 || response.status === 403) {
          console.log('🔄 Токен недействителен, очищаем кеш...');
          if (this.googleDriveService) {
            this.googleDriveService.clearCachedToken();
          }
        }
        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
      }
      

      
      // Проверить тип файла и обработать соответственно
      let slContent = '';
      
      if (slFile.mimeType === 'application/vnd.google-apps.document') {
        // Google Docs - уже экспортирован как текст
        slContent = await response.text();
      } else {
        const fileName = slFile.name.toLowerCase();
        
        if (fileName.endsWith('.txt')) {
          // Обычный текстовый файл
          slContent = await response.text();
        } else if (fileName.endsWith('.docx')) {
          // DOCX файл - простая обработка через mammoth.js
          try {
            const arrayBuffer = await response.arrayBuffer();
            if (window.mammoth) {
              const result = await window.mammoth.extractRawText({ arrayBuffer });
              slContent = result.value.trim();
            } else {
              throw new Error('Mammoth.js не загружен');
            }
          } catch (docxError) {
            throw new Error(`Ошибка обработки DOCX: ${docxError.message}`);
          }
        } else {
          // Попытаться как текст
          try {
            slContent = await response.text();
          } catch (textError) {
            throw new Error('Неподдерживаемый формат файла: ' + slFile.name + '. Поддерживаются .docx, .txt файлы и Google Docs.');
          }
        }
      }
      
      slContent = slContent.trim();
      
      if (slContent) {
        return slContent;
      } else {
        throw new Error('SL файл "' + slFile.name + '" пуст');
      }
      
    } catch (error) {
      console.error('Error downloading SL file:', error);
      throw error;
    }
  }

  // === АВТОМАТИЧЕСКИЙ ПОИСК SL ФАЙЛОВ ===

  // Автоматический поиск SL файла в той же папке что и HTML файл
  async searchAndLoadSLAutomatically(htmlFile, accessToken) {
    try {
      
      // Извлечь базовое имя файла (без расширения)
      const baseName = this.extractBaseName(htmlFile.name);
      
      // Получить ID папки где лежит HTML файл из метаданных
      console.log('📡 Получаем метаданные HTML файла для определения папки...');
      const folderId = await this.getParentFolderId(htmlFile.id, accessToken);
      
      if (!folderId) {
        console.log('❌ Не удалось определить папку HTML файла');
        this.showSLNotification('SL не обнаружен', 'warning');
        return null;
      }
      
      console.log('📁 Быстрый поиск SL в папке:', folderId);
      
      // Поиск SL файлов в папке (без отладки для скорости)
      let slFile = await this.findSLFileInFolder(folderId, baseName, accessToken);
      
      // Если не найден в папке, попробуем глобальный поиск как fallback
      if (!slFile) {
        console.log('🌍 Fallback: глобальный поиск SL файлов...');
        slFile = await this.findSLFileGlobally(baseName, accessToken);
      }
      
      if (slFile) {
        console.log('✅ Найден SL файл:', slFile.name);
        const content = await this.downloadAndExtractSLContent(slFile, accessToken);
        
        if (content && window.slEditor) {
          window.slEditor.setValue(content);
          this.showSLNotification(`SL файл "${slFile.name}" автоматически загружен`, 'info');
          this.showSLLoadedIndicator(slFile.name);
          

          
          // Сохранить имя файла в истории
          if (window.app && window.app.historyService) {
            window.app.historyService.updateCurrentSLFile(slFile.name);
          }
          
          return content;
        }
      } else {
        console.log('⚠️ SL файл не найден');
        this.showSLNotification('SL не обнаружен', 'warning');
      }
      
      return null;
    } catch (error) {
      console.error('❌ Ошибка автоматического поиска SL:', error);
      this.showSLNotification('SL не обнаружен', 'warning');
      return null;
    }
  }

  // Извлечь базовое имя файла для поиска SL
  extractBaseName(fileName) {
    // Убрать расширение (.html, .htm)
    let baseName = fileName.replace(/\.(html|htm)$/i, '');
    
    // Убрать суффиксы типа _html, -html
    baseName = baseName.replace(/[_-]html$/i, '');
    
    // Извлечь буквенно-цифровую часть (ABC3, XYZ5, etc.)
    const match = baseName.match(/([A-Za-z]+\d*)/);
    const extracted = match ? match[1] : baseName;
    
    console.log(`📋 Извлечение: "${fileName}" → "${baseName}" → "${extracted}"`);
    return extracted;
  }

  // Получить ID родительской папки файла
  async getParentFolderId(fileId, accessToken) {
    try {
      console.log('📡 Запрос метаданных файла для получения папки:', fileId);
      
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents&supportsAllDrives=true&access_token=${accessToken}`;
      console.log('📡 URL запроса:', url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Метаданные файла:', data);
        
        const parentId = data.parents && data.parents.length > 0 ? data.parents[0] : null;
        console.log('📁 ID родительской папки:', parentId);
        return parentId;
      } else {
        // При ошибке авторизации очистить токен
        if (response.status === 401 || response.status === 403) {
          console.log('🔄 Токен недействителен, очищаем кеш...');
          if (this.googleDriveService) {
            this.googleDriveService.clearCachedToken();
          }
        }
        const errorText = await response.text();
        console.error('❌ API ошибка получения метаданных:', response.status, errorText);
        return null;
      }
    } catch (error) {
      console.error('❌ Сетевая ошибка при получении метаданных:', error.message);
      return null;
    }
  }

  // Найти SL файл в папке (оптимизированный поиск)
  async findSLFileInFolder(folderId, baseName, accessToken) {
    try {
      console.log('🚀 Оптимизированный поиск SL файлов...');
      
      // Один запрос для поиска всех файлов содержащих SL в папке
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name contains 'SL' and '${folderId}' in parents`)}&includeItemsFromAllDrives=true&supportsAllDrives=true&access_token=${accessToken}`;
      console.log('📡 Единый поисковый запрос SL файлов');
      
      const response = await fetch(searchUrl);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Найдено файлов с SL:', data.files ? data.files.length : 0);
        
        if (data.files && data.files.length > 0) {
          console.log('📄 Все SL файлы:', data.files.map(f => f.name));
          
          // Найти файл с лучшим совпадением среди всех SL файлов
          const bestMatch = this.findBestSLMatch(data.files, baseName);
          if (bestMatch) {
            console.log('🏆 Лучшее совпадение:', bestMatch.name);
            return bestMatch;
          }
        } else {
          console.log('📭 Нет SL файлов в папке');
        }
      } else {
        const errorText = await response.text();
        console.warn('⚠️ Ошибка поиска:', response.status, errorText);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Ошибка поиска в папке:', error);
      return null;
    }
  }

  // Построить паттерны поиска SL файлов
  buildSLSearchPatterns(baseName) {
    const patterns = [];
    
    console.log('🔤 Строим паттерны для базового имени:', baseName);
    
    // Основные варианты названий SL файлов
    const variations = [
      `${baseName} SL`,      // AMDT5 SL
      `${baseName}_SL`,      // AMDT5_SL
      `${baseName}-SL`,      // AMDT5-SL
      `${baseName}SL`,       // AMDT5SL
      `${baseName} sl`,      // AMDT5 sl (нижний регистр)
      `${baseName}_sl`,      // AMDT5_sl
      `${baseName}-sl`,      // AMDT5-sl
      `${baseName}sl`        // AMDT5sl
    ];
    
    // Добавить варианты с пробелами (AMDT5 → AMDT 5)
    if (/[A-Za-z]\d/.test(baseName)) {
      const spaced = baseName.replace(/([A-Za-z])(\d)/g, '$1 $2');
      variations.push(
        `${spaced} SL`,        // AMDT 5 SL
        `${spaced}_SL`,        // AMDT 5_SL
        `${spaced}-SL`,        // AMDT 5-SL
        `${spaced} sl`         // AMDT 5 sl
      );
      console.log('🔤 Добавлены варианты с пробелами:', spaced);
    }
    
    console.log('📝 Все вариации:', variations);
    
    // Создать поисковые запросы - попробуем разные подходы
    for (const variation of variations) {
      // Основной поиск
      patterns.push(`name contains '${variation}'`);
      
      // Также попробуем поиск только по базовому имени + SL
      if (variation.includes(' SL') || variation.includes('_SL') || variation.includes('-SL')) {
        patterns.push(`name contains '${baseName}' and name contains 'SL'`);
        patterns.push(`name contains '${baseName}' and name contains 'sl'`);
      }
    }
    
    // Добавим очень простые паттерны
    patterns.push(`name contains '${baseName}'`);
    patterns.push(`name contains 'SL'`);
    
    console.log('🔍 Финальные паттерны (первые 5):', patterns.slice(0, 5));
    return patterns;
  }

  // Найти лучшее совпадение среди найденных файлов
  findBestSLMatch(files, baseName) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const file of files) {
      // Проверить что файл поддерживается
      if (this.isSLFileSupported(file)) {
        const score = this.calculateSLMatchScore(file.name, baseName);
        console.log(`📊 Оценка "${file.name}": ${score} баллов`);
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = file;
        }
      } else {
        console.log(`❌ Неподдерживаемый формат: ${file.name}`);
      }
    }
    
    if (bestMatch) {
      console.log(`🏆 Лучший результат: "${bestMatch.name}" с ${bestScore} баллами`);
    }
    
    return bestMatch;
  }



  // Вычислить оценку соответствия имени файла
  calculateSLMatchScore(fileName, baseName) {
    const lowerFileName = fileName.toLowerCase();
    const lowerBaseName = baseName.toLowerCase();
    
    let score = 0;
    
    // Проверить наличие базового имени
    if (lowerFileName.includes(lowerBaseName)) {
      score += 10;
    }
    
    // Проверить наличие 'sl'
    if (lowerFileName.includes('sl')) {
      score += 5;
    }
    
    // Бонус за точное совпадение паттернов
    const exactPatterns = [
      `${lowerBaseName} sl`,
      `${lowerBaseName}_sl`,
      `${lowerBaseName}-sl`,
      `${lowerBaseName}sl`
    ];
    
    for (const pattern of exactPatterns) {
      if (lowerFileName.includes(pattern)) {
        score += 15;
        break;
      }
    }
    
    return score;
  }

  // Глобальный поиск SL файлов (fallback)
  async findSLFileGlobally(baseName, accessToken) {
    try {
      const searchQueries = this.buildSLSearchPatterns(baseName);
      console.log('🌍 Глобальные паттерны поиска:', searchQueries.slice(0, 3)); // Показать первые 3
      
      // Ограничимся первыми 3 паттернами для глобального поиска
      for (const query of searchQueries.slice(0, 3)) {
        console.log('🔎 Глобальный поиск по паттерну:', query);
        
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&includeItemsFromAllDrives=true&supportsAllDrives=true&access_token=${accessToken}`;
        
        const response = await fetch(searchUrl);
        
        if (response.ok) {
          const data = await response.json();
          
          if (data.files && data.files.length > 0) {
            console.log('🌍 Найденные файлы глобально:', data.files.map(f => f.name));
            
            // Найти файл с лучшим совпадением
            const bestMatch = this.findBestSLMatch(data.files, baseName);
            if (bestMatch) {
              console.log('🏆 Лучшее глобальное совпадение:', bestMatch.name);
              return bestMatch;
            }
          }
        } else {
          console.warn('⚠️ Ошибка глобального поиска:', response.status);
        }
      }
      
      console.log('❌ Глобальный поиск не дал результатов');
      return null;
    } catch (error) {
      console.error('❌ Ошибка глобального поиска:', error);
      return null;
    }
  }

  // Отладочный метод - показать все файлы в папке
  async debugFolderContents(folderId, accessToken) {
    try {
      console.log('🔍 Отладка: проверяем все файлы в папке...');
      
      const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents&fields=files(id,name,mimeType)&includeItemsFromAllDrives=true&supportsAllDrives=true&access_token=${accessToken}`;
      console.log('📡 URL отладки папки:', url);
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📂 Всего файлов в папке:', data.files ? data.files.length : 0);
        
        if (data.files && data.files.length > 0) {
          console.log('📄 Все файлы в папке:');
          data.files.forEach((file, index) => {
            console.log(`  ${index + 1}. "${file.name}" (${file.mimeType})`);
          });
          
          // Показать файлы которые содержат SL
          const slFiles = data.files.filter(f => 
            f.name.toLowerCase().includes('sl') || 
            f.name.toLowerCase().includes('subject')
          );
          
          if (slFiles.length > 0) {
            console.log('🎯 Файлы содержащие "SL" или "subject":');
            slFiles.forEach(file => {
              console.log(`  📄 "${file.name}" (${file.mimeType})`);
            });
          } else {
            console.log('❌ Нет файлов содержащих "SL" или "subject"');
          }
        } else {
          console.log('📭 Папка пустая или нет доступа');
        }
      } else {
        console.warn('⚠️ Ошибка получения содержимого папки:', response.status);
      }
    } catch (error) {
      console.error('❌ Ошибка отладки папки:', error);
    }
  }
}

// Экспорт для использования в других модулях
window.SLService = SLService;
