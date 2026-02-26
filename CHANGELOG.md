# Changelog

All notable changes to ReceiptTracker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Ad Integration**: Google Mobile Ads SDK integration for monetization
  - Banner ads strategically placed on Dashboard, Expenses, Budgets, and Analytics screens
  - Interstitial ads shown after expense creation (every 3rd expense) and budget creation (every 2nd budget)
  - AdService for centralized ad configuration and initialization
  - BannerAd reusable component with error handling and theme compatibility
  - InterstitialAdManager for managing interstitial ad frequency and display logic
  - Test ad units configured for development, ready for production ad unit IDs
  - Non-intrusive ad placements that maintain good user experience
  - Ads work seamlessly with light and dark themes
- **Profile-Aware Export/Import**: Enhanced data backup and restore with multi-profile support
  - Export single profile data with profile metadata (profile name and ID included in filename)
  - Export all profiles at once with multi-profile JSON format
  - Import automatically detects format: single profile, multi-profile, or legacy
  - Profile context displayed in Settings screen export/import UI
  - CSV exports now include profile column for better data tracking
  - Import warnings when merging data from different profiles
  - Backward compatible with legacy exports (pre-profile system)
  - Multi-profile imports restore all profiles and their data automatically

### Changed
- **Performance Optimization**: Profile management system optimizations
  - Implemented caching layer for active profile ID (5-second TTL) to reduce AsyncStorage calls
  - Optimized profile stats loading with parallel Promise.all instead of sequential loops
  - Reduced profile context refetches by updating state directly after mutations
  - Added React.memo to ProfileCard component to prevent unnecessary re-renders
  - Extracted ProfileCard component for better component composition
  - Added useCallback/useMemo optimizations to ProfileManagementScreen handlers
  - Extracted and deduplicated validation logic in ProfileService
- **Export/Import UI**: Settings screen now shows active profile name in export/import descriptions
  - Export dialog offers single profile or all profiles option when multiple profiles exist
  - Import dialog clarifies that data will be merged into current profile
  - Toast notifications include profile information for better user feedback

### Planned (Phase 3)
- Cloud sync and backup functionality
- Export to PDF reports
- Widget support for home screen
- Apple Watch and Wear OS companion apps
- AI-powered spending insights (enhanced)
- Multi-user support
- Expense sharing & splitting

## [1.1.0] - 2026-02-25 (Phase 2 Complete)

### Added
- Receipt OCR for automatic data extraction
  - Cloud OCR integration ready (Google Cloud Vision, AWS Textract)
  - Local pattern matching fallback
  - Automatic vendor, amount, and date extraction
- Multi-currency support
  - 15+ supported currencies (USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY, INR, MXN, SGD, HKD, NZD, ZAR, BRL)
  - Currency conversion and exchange rates
  - Automatic formatting with currency symbols
- Advanced analytics with comprehensive insights
  - Spending by category breakdown
  - Spending trends over time (daily, weekly, monthly)
  - Top vendors analysis
  - Budget vs actual comparison
  - Month-over-month comparison
  - Statistical analysis (mean, median, standard deviation)
  - CSV export functionality
  - AI-powered insights and recommendations
- Budget alerts and notifications
  - Budget exceeded alerts
  - High spending warnings (75%+, 90%+)
  - Daily budget summary notifications
  - Weekly budget review notifications
  - Spending spike detection
  - Notification history tracking
- Biometric authentication
  - Fingerprint recognition
  - Face recognition support
  - Device compatibility detection
  - Enable/disable toggle
- Passcode lock
  - 4+ character passcode requirement
  - Secure storage in SecureStore
  - SHA256 hashing
  - Change and remove functionality
- Dark mode full implementation
  - Complete light and dark theme definitions
  - All UI components themed
  - Smooth theme transitions
  - Persistent theme preference
  - Optimized colors for both themes
- Recurring expenses
  - Daily, weekly, bi-weekly, monthly, quarterly, yearly frequencies
  - Start and optional end dates
  - Automatic expense creation on due dates
  - Edit and delete functionality
  - Next due date tracking
  - Recurring expense total calculations

### New Screens
- RecurringExpensesScreen: Manage recurring expenses
- AnalyticsScreen: View advanced analytics and insights
- SecuritySettingsScreen: Configure biometric and passcode security
- CurrencySettingsScreen: Select and manage currencies
- ProfileManagementScreen: Create and manage user profiles with custom avatars and colors

### New Services
- OCRService: Receipt text extraction and data parsing
- CurrencyService: Multi-currency support and conversion
- NotificationService: Budget alerts and scheduled notifications
- BiometricService: Biometric and passcode authentication
- RecurringExpenseService: Recurring expense management
- AnalyticsService: Advanced analytics and insights
- ThemeService: Light and dark theme management
- ProfileService: User profile management with custom avatars and statistics
- LocationService: Geolocation-based currency detection
- ImageStorageService: Receipt image storage and management
- ExportService: Data export functionality (JSON and CSV)
- ImportService: Data import from JSON and CSV files

### Changed
- Enhanced Settings screen with new options
- Improved Dashboard with analytics integration
- Updated StorageService with recurring expense support
- Enhanced data validation and error handling

### Technical Details
- Added expo-notifications for alert functionality
- Integrated theme management system
- Implemented secure passcode storage
- Added comprehensive analytics calculations
- Created modular service architecture for Phase 2 features

## [1.0.0] - 2026-02-07

### Added
- Initial release of ReceiptTracker
- Core expense tracking functionality
- Receipt capture via camera and gallery
- Budget management with limits and tracking
- Categorized expense organization
- Secure local data storage with encryption
- Material Design UI with React Native Paper
- Dark mode support
- Biometric authentication
- Data export/import functionality
- Analytics dashboard with spending insights
- Search and filter capabilities
- Multi-platform support (iOS, Android, Web)
- Responsive design for various screen sizes

### Features
#### Expense Management
- Add, edit, and delete expenses
- Automatic ID generation and timestamps
- Data validation for all expense fields
- Category-based organization
- Receipt image attachment

#### Budget Tracking
- Create and manage budgets
- Weekly, monthly, and yearly budget periods
- Real-time budget progress tracking
- Visual indicators for budget status

#### User Interface
- Clean, intuitive navigation
- Bottom tab navigation
- Modal forms for data entry
- Consistent Material Design components
- Smooth animations and transitions

#### Security
- Local data encryption
- Secure storage for sensitive information
- Biometric authentication options
- Passcode lock functionality

#### Data Management
- AsyncStorage for general data
- SecureStore for sensitive information
- Data validation and error handling
- Export/import for backup and migration

### Technical Details
- Built with React Native and Expo SDK 54
- React Navigation for app navigation
- React Native Paper for UI components
- React Hook Form for form management
- Expo Camera and Image Picker for receipt capture
- Comprehensive error handling and logging
- Modular service architecture

### Documentation
- Complete README with setup instructions
- API documentation for services
- Component documentation
- Troubleshooting guide

---

## Version Format

This changelog follows the format:
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

## Release Schedule

- **Major releases**: Significant new features or breaking changes
- **Minor releases**: New features, improvements, non-breaking changes
- **Patch releases**: Bug fixes, security updates, small improvements

## Support

For questions about specific changes or to report issues:
- Check the [GitHub Issues](https://github.com/yourusername/ReceiptTracker/issues)
- Review the documentation in the repository
- Contact the development team

---

*Last updated: February 25, 2026*
