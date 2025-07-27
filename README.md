# Email Copymaker | By Hex

### 🌐 **Check here:** https://graysay.github.io/copymaker/

Email Copymaker is a professional tool for creating, managing, and organizing email copy. It integrates with Google Drive, allows quick headline search, body replacement, copy rewriting, and easy image updates.

###  **Why You Need It**

   - Quickly create and manage email content.
   - Simplify collaboration via Google Drive integration.

### 🏗️ Project Structure

```
├── index.html                 # Main HTML file
├── config/
│   ├── config.js             # Working configuration
│   └── config.example.js     # Example configuration
├── src/
│   ├── app.js               # Main application
│   ├── components/
│   │   └── imageManager.js  # Image management
│   ├── services/
│   │   ├── historyService.js    # Copy history management
│   │   ├── googleDriveService.js # Google Drive API integration
│   │   └── slService.js         # Subject Line file handling
│   ├── styles/
│   │   ├── main.css         # Core styles
│   │   ├── forms.css        # Form styles
│   │   └── components.css   # Component styles
│   └── utils/
│       └── helpers.js       # Utilities and helper functions
└── README.md
```

### 📝 Usage

1. **API Key Configuration:**
   ```bash
    cp config/config.example.js config/config.js
    # Edit config/config.js and add your API keys
   ```

2. **Run:**
   
   - Launch via a local server

Features

1. **Copy History:**
  - Stores up to 4 previous versions
  - Saves changes for each version

2. **Modular Architecture:**
  - Easy to add new features
  - Simple to test individual modules

### 🔮 Future Plans

   - None
