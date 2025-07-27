// Сервис для работы с Google Drive API

class GoogleDriveService {
  constructor() {
    this.gapi = null;
    this.google = null;
    this.pickerApiLoaded = false;
    this.cachedAccessToken = null;
    this.tokenExpirationTime = null;
    this.config = window.CONFIG?.GOOGLE || {};

    
    this.loadCachedToken();
    
    // Запустить периодическую проверку токена каждую минуту
    this.startTokenValidationTimer();
  }

  // Загрузить кэшированный токен (отключено для локального тестирования)
  loadCachedToken() {
    // Токен не кэшируется - требуется авторизация при каждой загрузке страницы
    this.cachedAccessToken = null;
    this.tokenExpirationTime = null;
  }

  // Сохранить токен в кэш (отключено)
  saveCachedToken() {
    // Токен не сохраняется для локального тестирования
  }

  // Очистить кэшированный токен
  clearCachedToken() {
    try {
      this.cachedAccessToken = null;
      this.tokenExpirationTime = null;
      AppUtils.removeFromStorage('googleDrive.accessToken');
      AppUtils.removeFromStorage('googleDrive.tokenExpiration');
      
      // Обновить статус после очистки
      if (typeof window !== 'undefined' && window.app && window.app.updateGoogleDriveStatus) {
        setTimeout(() => window.app.updateGoogleDriveStatus(), 100);
      }
      
      // НЕ очищаем SL индикатор - он должен оставаться даже при сбросе токена
      // SL контент уже загружен и сохранен в редакторе
    } catch (error) {
      console.error('Error clearing cached token:', error);
    }
  }

  // Проверить валидность токена (упрощенная проверка)
  hasValidToken() {
    try {
      const hasToken = !!this.cachedAccessToken;
      console.log('Token check:', { hasToken });
      return hasToken;
    } catch (error) {
      console.error('Error checking token validity:', error);
      this.clearCachedToken();
      return false;
    }
  }

  // Загрузить Google APIs
  async loadGoogleAPIs() {
    return new Promise((resolve, reject) => {
      if (window.gapi && window.google && this.pickerApiLoaded) {
        this.gapi = window.gapi;
        this.google = window.google;
        resolve();
        return;
      }
      
      const script1 = document.createElement('script');
      script1.src = 'https://apis.google.com/js/api.js';
      script1.onload = () => {
        const script2 = document.createElement('script');
        script2.src = 'https://accounts.google.com/gsi/client';
        script2.onload = () => {
          const script3 = document.createElement('script');
          script3.src = 'https://apis.google.com/js/picker.js';
          script3.onload = () => {
            this.gapi = window.gapi;
            this.google = window.google;
            this.pickerApiLoaded = true;
            resolve();
          };
          script3.onerror = reject;
          document.head.appendChild(script3);
        };
        script2.onerror = reject;
        document.head.appendChild(script2);
      };
      script1.onerror = reject;
      document.head.appendChild(script1);
    });
  }

  // Инициализировать Google APIs
  async initializeGoogleAPIs() {
    return new Promise((resolve, reject) => {
      this.gapi.load('client:picker', async () => {
        try {
          await this.gapi.client.init({
            apiKey: this.config.API_KEY,
            discoveryDocs: [this.config.DISCOVERY_DOC],
          });
          
          console.log('Google Drive API initialized successfully');
          resolve();
        } catch (error) {
          console.error('Error initializing Google APIs:', error);
          reject(error);
        }
      });
    });
  }

  // Аутентификация с Google
  async authenticate() {
    return new Promise((resolve, reject) => {
      // Проверить кэшированный токен
      if (this.hasValidToken()) {
        resolve(this.cachedAccessToken);
        return;
      }
      
      const tokenClient = this.google.accounts.oauth2.initTokenClient({
        client_id: this.config.CLIENT_ID,
        scope: this.config.SCOPES,
        callback: (response) => {
          if (response.error !== undefined) {
            console.error('Authentication error:', response);
            reject(new Error(response.error_description || response.error));
          } else {
            // Кэшировать токен (без таймера)
            this.cachedAccessToken = response.access_token;
            
            this.saveCachedToken();
            
            console.log('Token cached successfully');
            
            // Немедленно обновить статус авторизации в интерфейсе
            if (typeof window !== 'undefined' && window.app && window.app.updateGoogleDriveStatus) {
              setTimeout(() => window.app.updateGoogleDriveStatus(), 100);
            }
            
            resolve(response.access_token);
          }
        },
      });
      tokenClient.requestAccessToken();
    });
  }

  // Создать и показать Google Drive Picker
  async createPicker(accessToken) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.google || !this.google.picker) {
          reject(new Error('Google Picker API not loaded'));
          return;
        }
        
        if (!accessToken) {
          reject(new Error('No access token provided'));
          return;
        }
        
        const docsView = new this.google.picker.DocsView(this.google.picker.ViewId.DOCS)
          .setIncludeFolders(true);
        
        const pickerBuilder = new this.google.picker.PickerBuilder()
          .addView(docsView)
          .setOAuthToken(accessToken)
          .setCallback((data) => {
            try {
              console.log('Picker callback:', data);
              
              if (data.action === this.google.picker.Action.PICKED) {
                const file = data.docs[0];
                console.log('Selected file:', file);
                resolve(file);
              } else if (data.action === this.google.picker.Action.CANCEL) {
                console.log('Picker cancelled');
                resolve(null);
              }
            } catch (callbackError) {
              console.error('Error in picker callback:', callbackError);
              reject(callbackError);
            }
          });
        
        // Попытаться добавить developer key
        try {
          pickerBuilder.setDeveloperKey(this.config.API_KEY);
        } catch (keyError) {
          console.warn('Could not set developer key:', keyError);
        }
        
        const picker = pickerBuilder.build();
        picker.setVisible(true);
        
      } catch (error) {
        console.error('Error creating picker:', error);
        reject(error);
      }
    });
  }

  // Скачать содержимое файла
  async downloadFileContent(fileId) {
    try {
      const response = await this.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });
      return response.body;
    } catch (error) {
      console.error('Error downloading file:', error);
      
      // Если ошибка авторизации, очистить кэш
      if (error.status === 401 || error.status === 403) {
        console.log('Token expired or invalid, clearing cache');
        this.clearCachedToken();
      }
      
      throw new Error('Ошибка загрузки файла: ' + (error.message || 'Неизвестная ошибка'));
    }
  }



  // Получить статус подключения (без таймера)
  getConnectionStatus() {
    if (this.hasValidToken()) {
      return {
        connected: true,
        text: '✓ Авторизован',
        color: '#38a169'
      };
    } else {
      return {
        connected: false,
        text: '○ Требуется авторизация',
        color: '#666'
      };
    }
  }

  // Запустить периодическую проверку токена
  startTokenValidationTimer() {
    // Проверять токен каждую минуту
    setInterval(() => {
      this.validateTokenPeriodically();
    }, 60000); // 60 секунд
  }



  // Периодическая проверка токена через API
  async validateTokenPeriodically() {

    if (this.cachedAccessToken) {
      console.log('🔍 Периодическая проверка токена через API...');
      
      try {
        // Проверим токен реальным API запросом
        const response = await fetch(`https://www.googleapis.com/drive/v3/about?fields=user&access_token=${this.cachedAccessToken}`);
        
        if (response.ok) {
          console.log('✅ Токен действителен');
        } else {
          console.log('❌ Токен недействителен - очищаем и требуем повторную авторизацию');
          this.clearCachedToken();
          
          // Обновить статус интерфейса
          if (typeof window !== 'undefined' && window.app && window.app.updateGoogleDriveStatus) {
            window.app.updateGoogleDriveStatus();
          }
        }
      } catch (error) {
        console.log('❌ Ошибка проверки токена:', error.message);
        this.clearCachedToken();
        
        // Обновить статус интерфейса
        if (typeof window !== 'undefined' && window.app && window.app.updateGoogleDriveStatus) {
          window.app.updateGoogleDriveStatus();
        }
      }
    }
  }
}

// Экспорт для использования в других модулях
window.GoogleDriveService = GoogleDriveService;
