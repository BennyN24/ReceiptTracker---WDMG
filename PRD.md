# ReceiptTracker - Product Requirements Document

**Version:** 1.0.0  
**Last Updated:** February 7, 2026  
**Status:** Active Development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Core Features](#core-features)
4. [Technical Architecture](#technical-architecture)
5. [Data Model](#data-model)
6. [Feature Roadmap](#feature-roadmap)
7. [Known Issues & Limitations](#known-issues--limitations)
8. [Development Guidelines](#development-guidelines)

---

## Executive Summary

ReceiptTracker is a React Native mobile application built with Expo that enables users to track personal expenses, manage budgets, and capture receipts on the go. The app provides a clean, intuitive Material Design interface with local data storage, encryption, and multi-platform support (iOS, Android, Web).

**Target Users:** Individuals seeking simple, privacy-focused expense tracking without cloud dependencies.

**Key Value Propositions:**
- Local-first data storage with encryption
- Receipt capture via camera and gallery
- Real-time budget tracking
- Category-based expense organization
- Multi-platform support

---

## Product Overview

### App Architecture

**Platform:** React Native with Expo SDK 54  
**Navigation:** React Navigation (Bottom Tab + Stack)  
**UI Framework:** React Native Paper  
**State Management:** React Hooks (useState, useEffect, useMemo)  
**Storage:** AsyncStorage + Expo SecureStore  
**Forms:** React Hook Form  
**Icons:** Expo Vector Icons (MaterialIcons)

### Core Screens

| Screen | Purpose | Key Features |
|--------|---------|--------------|
| **Dashboard** | Overview & quick stats | Monthly budget progress, recent expenses, quick actions |
| **Expenses** | Expense management | List view, search, filter by category, sort options, delete |
| **Capture** | Receipt capture | Camera/gallery integration, automatic expense creation |
| **Budgets** | Budget management | Create/manage budgets, period selection (weekly/monthly/yearly) |
| **Settings** | App configuration | User preferences, security, data management |

---

## Core Features

### 1. Expense Management

**Status:** ✅ Implemented

**Functionality:**
- Add expenses with vendor, amount, category, date, and optional notes
- Edit existing expenses
- Delete expenses with confirmation dialog
- Automatic ID generation and timestamps
- Data validation for all fields

**Data Structure:**
```javascript
{
  id: string,
  vendor: string,
  amount: number,
  category: string,
  date: string (ISO format),
  notes?: string,
  image?: string,
  createdAt: string (ISO timestamp),
  updatedAt: string (ISO timestamp)
}
```

**Validation Rules:**
- Vendor: Required, non-empty string
- Amount: Required, positive number
- Category: Required, must exist in categories list
- Date: Required, ISO date format

---

### 2. Budget Tracking

**Status:** ✅ Implemented

**Functionality:**
- Create budgets with custom names and amounts
- Set budget periods: weekly, monthly, yearly
- Real-time budget progress calculation
- Visual progress indicators (color-coded: green <80%, red >80%)
- Delete budgets with confirmation

**Data Structure:**
```javascript
{
  id: string,
  name: string,
  amount: number,
  period: 'weekly' | 'monthly' | 'yearly',
  createdAt: string (ISO timestamp),
  updatedAt: string (ISO timestamp)
}
```

**Validation Rules:**
- Name: Required, non-empty string
- Amount: Required, positive number
- Period: Required, must be 'weekly', 'monthly', or 'yearly'

---

### 3. Receipt Capture

**Status:** ✅ Implemented (Enhanced with OCR)

**Functionality:**
- Capture photos using device camera
- Select images from device gallery
- Automatic expense entry creation
- Image attachment to expenses
- OCR text extraction from receipts
- Pattern matching for vendor, amount, and date detection

**OCR Features:**
- Cloud OCR integration ready (Google Cloud Vision, AWS Textract)
- Local pattern matching fallback
- Automatic vendor name extraction
- Amount and date parsing
- Confidence scoring for extracted data

**Current Limitations:**
- Cloud OCR requires API key configuration
- Local OCR uses pattern matching (not full text recognition)
- Image storage as base64 or file path

---

### 4. Category Management

**Status:** ✅ Implemented

**Default Categories:**
1. Food & Dining (🍽️ #ef4444)
2. Transportation (🚗 #3b82f6)
3. Shopping (🛍️ #8b5cf6)
4. Entertainment (🎬 #ec4899)
5. Bills & Utilities (📄 #f59e0b)
6. Healthcare (🏥 #10b981)
7. Education (🎓 #06b6d4)
8. Other (⋯ #6b7280)

**Features:**
- Customizable categories
- Color-coded display
- Icon support

---

### 5. Search & Filter

**Status:** ✅ Implemented

**Functionality:**
- Search by vendor name (case-insensitive)
- Filter by category
- Sort options: newest first, oldest first, highest amount, lowest amount
- Clear filters button

---

### 6. Dashboard Analytics

**Status:** ✅ Implemented (Basic)

**Metrics:**
- Current month total spending
- Monthly budget progress percentage
- Remaining budget amount
- Transaction count (current month)
- Recent expenses (last 5)

**Visualizations:**
- Progress bar with color coding
- Stat cards with icons
- Recent expense list

---

### 7. Data Security & Storage

**Status:** ✅ Implemented (Enhanced)

**Storage Mechanism:**
- AsyncStorage for general data (expenses, budgets, categories, settings)
- Expo SecureStore for encryption keys and passcodes
- Local-only storage (no cloud sync)

**Security Features:**
- Encryption key generation and storage
- Data validation before save/load
- Error handling with fallback mechanisms
- Biometric authentication (fingerprint/face recognition)
- Passcode lock with SHA256 hashing
- Secure passcode storage in SecureStore

**Current Limitations:**
- Encryption implementation uses SHA256 hashing (not true encryption)
- Biometric requires device support
- Passcode is hashed but not salted

---

### 8. Settings & Preferences

**Status:** ✅ Implemented (Enhanced)

**Default Settings:**
```javascript
{
  monthlyBudget: 1550,
  currency: 'USD',
  notifications: true,
  darkMode: false,
  biometricAuth: false,
  autoBackup: false,
  passcodeLock: false
}
```

**Features:**
- Customizable monthly budget
- Multi-currency support with 15+ currencies
- Notification toggle with scheduling
- Dark mode full implementation
- Biometric authentication setup
- Passcode lock configuration
- Export/import data functionality
- Security settings management

---

### 9. Data Export/Import

**Status:** ✅ Implemented

**Functionality:**
- Export all data (expenses, budgets, categories, settings) as JSON
- Import data from JSON file
- Includes export timestamp and version info

**Export Format:**
```javascript
{
  expenses: [],
  budgets: [],
  categories: [],
  settings: {},
  exportDate: string (ISO timestamp),
  version: string
}
```

---

## Technical Architecture

### Project Structure

```
ReceiptTracker/
├── src/
│   ├── components/
│   │   └── AddExpenseModal.js          # Expense form modal
│   ├── navigation/
│   │   └── AppNavigator.js             # Tab & stack navigation
│   ├── screens/
│   │   ├── DashboardScreen.js          # Overview & stats
│   │   ├── ExpensesScreen.js           # Expense list & management
│   │   ├── BudgetsScreen.js            # Budget management
│   │   ├── CaptureScreen.js            # Receipt capture
│   │   └── SettingsScreen.js           # App settings
│   ├── services/
│   │   └── StorageService.js           # Data persistence layer
│   └── styles/
│       └── theme.js                    # Theme configuration
├── assets/                             # App icons & images
├── App.js                              # Root component
├── app.json                            # Expo configuration
├── package.json                        # Dependencies
└── index.js                            # Entry point
```

### Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 19.1.0 | UI framework |
| react-native | 0.81.5 | Mobile framework |
| expo | ~54.0.33 | Development platform |
| @react-navigation/native | ^7.1.28 | Navigation |
| @react-navigation/bottom-tabs | ^7.12.0 | Tab navigation |
| react-native-paper | ^5.16.0 | UI components |
| @react-native-async-storage/async-storage | ^2.2.0 | Data storage |
| expo-camera | ^17.0.10 | Camera access |
| expo-image-picker | ^17.0.10 | Gallery access |
| expo-secure-store | ^15.0.8 | Secure storage |
| react-hook-form | ^7.71.1 | Form management |

---

## Data Model

### Storage Keys

```javascript
STORAGE_KEYS = {
  EXPENSES: '@receipt_tracker_expenses',
  BUDGETS: '@receipt_tracker_budgets',
  CATEGORIES: '@receipt_tracker_categories',
  SETTINGS: '@receipt_tracker_settings',
  ENCRYPTION_KEY: '@receipt_tracker_encryption_key'
}
```

### Data Relationships

```
Settings
  └── monthlyBudget (used for Dashboard calculations)

Expenses
  └── category (references Category.id)

Budgets
  └── (independent, used for comparison with expenses)

Categories
  └── (predefined defaults, customizable)
```

### Validation Layer

**StorageService** provides validation for:
- `validateExpenseData()` - Ensures expense integrity
- `validateBudgetData()` - Ensures budget integrity
- Invalid records are filtered out during load

---

## Feature Roadmap

### Phase 1: Current Release (v1.0.0) ✅
- [x] Core expense tracking
- [x] Budget management
- [x] Receipt capture (basic)
- [x] Category management
- [x] Search & filter
- [x] Dashboard analytics
- [x] Local data storage
- [x] Data export/import

### Phase 2: In Development (v1.1.0)
- [x] Receipt OCR for automatic data extraction
- [x] Multi-currency support
- [x] Advanced analytics with charts/graphs
- [x] Budget alerts and notifications
- [x] Biometric authentication
- [x] Passcode lock
- [x] Dark mode full implementation
- [x] Recurring expenses

### Phase 3: Future Features (v2.0.0)
- [ ] Cloud sync and backup
- [ ] AI-powered spending insights
- [ ] PDF/CSV export reports
- [ ] Home screen widgets
- [ ] Apple Watch companion app
- [ ] Wear OS companion app
- [ ] Multi-user support
- [ ] Expense sharing & splitting

### 10. Recurring Expenses

**Status:** ✅ Implemented (Phase 2)

**Functionality:**
- Create recurring expenses with custom frequency
- Support for daily, weekly, bi-weekly, monthly, quarterly, yearly
- Set start and optional end dates
- Automatic expense creation on due dates
- View next due date for each recurring expense
- Edit and delete recurring expenses

**Data Structure:**
```javascript
{
  id: string,
  vendor: string,
  amount: number,
  category: string,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly',
  startDate: string (ISO format),
  endDate?: string (ISO format),
  notes?: string,
  isActive: boolean,
  nextDueDate: string (ISO timestamp),
  createdAt: string (ISO timestamp),
  updatedAt: string (ISO timestamp)
}
```

---

### 11. Advanced Analytics

**Status:** ✅ Implemented (Phase 2)

**Features:**
- Spending by category breakdown
- Spending trends over time (daily, weekly, monthly)
- Top vendors by spending
- Comprehensive spending statistics (total, average, median, min, max, standard deviation)
- Budget vs actual comparison
- Month-over-month comparison
- AI-powered insights and recommendations
- CSV export functionality

**Visualizations:**
- Category breakdown with progress bars
- Spending trend charts
- Top vendors list with transaction counts
- Insight cards with severity levels

---

### 12. Multi-Currency Support

**Status:** ✅ Implemented (Phase 2)

**Supported Currencies:** 15+ including:
- USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, MXN, SGD, HKD, NZD, ZAR, BRL

**Features:**
- Currency selection in settings
- Automatic formatting with currency symbols
- Exchange rate conversion
- Live exchange rate updates (placeholder for API integration)
- Historical rate tracking

**Data Structure:**
```javascript
{
  code: string,
  symbol: string,
  name: string,
  rate: number (exchange rate vs USD)
}
```

---

### 13. Notifications & Alerts

**Status:** ✅ Implemented (Phase 2)

**Features:**
- Budget alert notifications
- Daily budget summary notifications
- Weekly budget review notifications
- Expense reminder notifications
- Notification history tracking
- Customizable notification schedules

**Alert Types:**
- Budget exceeded alerts
- High spending warnings (75%+, 90%+)
- Spending spike detection
- Recurring expense reminders

---

### 14. Biometric & Passcode Security

**Status:** ✅ Implemented (Phase 2)

**Biometric Features:**
- Fingerprint authentication
- Face recognition support
- Device compatibility detection
- Biometric enable/disable toggle

**Passcode Features:**
- 4+ character passcode requirement
- Secure storage in SecureStore
- SHA256 hashing
- Change and remove passcode functionality
- Passcode verification on app launch

---

### 15. Dark Mode

**Status:** ✅ Fully Implemented (Phase 2)

**Features:**
- Complete light and dark theme definitions
- All UI components themed
- Smooth theme transitions
- Persistent theme preference
- Category and status colors optimized for both themes

**Theme Colors:**
- Light: Primary #6366f1, Background #f8fafc
- Dark: Primary #a5b4fc, Background #0f172a

---

## Known Issues & Limitations

### Current Limitations

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| Encryption not fully implemented | Medium | Open | Uses SHA256 hashing instead of true encryption |
| Cloud OCR requires API key | Medium | Open | Local pattern matching available as fallback |
| No cloud sync | Medium | Planned | Local storage only |
| Passcode not salted | Low | Open | Uses SHA256 without salt |
| Biometric requires device support | Low | Open | Graceful fallback to passcode |
| Exchange rates not live | Low | Open | Placeholder for API integration |
| No PDF export | Low | Planned | CSV export available |

### Browser/Platform Compatibility

- **iOS:** Full support via Expo
- **Android:** Full support via Expo
- **Web:** Partial support (camera/gallery limited)

### Performance Considerations

- All data stored locally (no server calls)
- Filtering/sorting done client-side
- No pagination implemented (suitable for typical user data volumes)
- Memoization used for expensive calculations

---

## Development Guidelines

### Code Style & Standards

**Language:** TypeScript (preferred for new code, JavaScript acceptable for existing)

**Key Principles:**
1. Follow existing code patterns and structure
2. Use React Hooks for state management
3. Keep components modular and reusable
4. Implement proper error handling
5. Add meaningful comments for complex logic
6. Validate all user input
7. Use consistent naming conventions

### Component Guidelines

- **Screens:** Full-page views with navigation integration
- **Components:** Reusable UI elements (modals, cards, buttons)
- **Services:** Business logic and data persistence
- **Styles:** Inline StyleSheet or theme-based

### Testing Requirements

- Test on both iOS and Android
- Verify data persistence across app restarts
- Test edge cases (empty states, invalid input, etc.)
- Validate error handling and user feedback

### Commit Message Format

```
[Feature|Fix|Refactor|Docs]: Brief description

Detailed explanation if needed
- Bullet points for multiple changes
```

### Before Committing

1. ✅ Code follows project style guide
2. ✅ All features tested on target platforms
3. ✅ Error handling implemented
4. ✅ Comments added for complex logic
5. ✅ No console errors or warnings
6. ✅ Data validation in place

---

## API Reference: StorageService

### Expenses

```javascript
// Get all expenses
await StorageService.getExpenses() → Promise<Expense[]>

// Add new expense
await StorageService.addExpense(expense) → Promise<Expense>

// Update expense
await StorageService.updateExpense(expenseId, updates) → Promise<Expense>

// Delete expense
await StorageService.deleteExpense(expenseId) → Promise<void>

// Save multiple expenses
await StorageService.saveExpenses(expenses) → Promise<void>
```

### Budgets

```javascript
// Get all budgets
await StorageService.getBudgets() → Promise<Budget[]>

// Add new budget
await StorageService.addBudget(budget) → Promise<Budget>

// Delete budget
await StorageService.deleteBudget(budgetId) → Promise<void>

// Save multiple budgets
await StorageService.saveBudgets(budgets) → Promise<void>
```

### Categories

```javascript
// Get categories
await StorageService.getCategories() → Promise<Category[]>

// Save categories
await StorageService.saveCategories(categories) → Promise<void>

// Get default categories
StorageService.getDefaultCategories() → Category[]
```

### Settings

```javascript
// Get settings
await StorageService.getSettings() → Promise<Settings>

// Save settings
await StorageService.saveSettings(settings) → Promise<void>

// Get default settings
StorageService.getDefaultSettings() → Settings
```

### Data Management

```javascript
// Export all data
await StorageService.exportData() → Promise<ExportData>

// Import data
await StorageService.importData(data) → Promise<void>

// Clear all data
await StorageService.clearAllData() → Promise<void>
```

---

## UI/UX Guidelines

### Color Scheme

- **Primary:** #6366f1 (Indigo)
- **Success:** #10b981 (Green)
- **Error:** #ef4444 (Red)
- **Warning:** #f59e0b (Amber)
- **Background:** #f8fafc (Light Gray)
- **Surface:** #ffffff (White)
- **Text Primary:** #1e293b (Dark Gray)
- **Text Secondary:** #64748b (Medium Gray)

### Typography

- **Title:** 28px, Bold, #1e293b
- **Heading:** 18px, Semi-bold, #1e293b
- **Body:** 16px, Regular, #1e293b
- **Caption:** 12-14px, Regular, #64748b

### Spacing

- **Padding:** 16px standard, 20px for sections
- **Margin:** 12-20px between elements
- **Gap:** 8-12px between flex items

### Icons

- **Size:** 20px (standard), 24px (large), 48px (empty state)
- **Color:** Matches text color or category color

---

## Change Log

### v1.0.0 (2026-02-07)
**Initial Release**
- Core expense tracking
- Budget management
- Receipt capture
- Category management
- Search & filter
- Dashboard analytics
- Local data storage with encryption
- Material Design UI
- Dark mode support
- Data export/import
- Multi-platform support (iOS, Android, Web)

---

## Contact & Support

For questions or issues:
- Create an issue on GitHub
- Review the [README.md](README.md)
- Check [Expo documentation](https://docs.expo.dev/)
- Review [React Native documentation](https://reactnative.dev/)

---

**Document Status:** Active  
**Last Review:** February 7, 2026  
**Next Review:** TBD
