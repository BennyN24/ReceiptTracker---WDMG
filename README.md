# ReceiptTracker

A modern React Native expense tracking application built with Expo that helps you manage your daily expenses, track budgets, and capture receipts on the go.

## Features

### 📸 Receipt Capture
- Take photos of receipts using your device camera
- Automatic expense entry from receipt images
- Image gallery support for existing receipt photos

### 💰 Expense Management
- Add, edit, and delete expenses
- Categorize expenses with customizable categories
- Track expense details (vendor, amount, date, notes)
- Search and filter expenses

### 📊 Budget Tracking
- Set monthly, weekly, or yearly budgets
- Monitor spending against budget limits
- Visual budget progress indicators
- Budget alerts and notifications

### 📱 User Interface
- Clean, intuitive Material Design interface
- Dark mode support
- Responsive design for all screen sizes
- Smooth animations and transitions

### 🔒 Security & Privacy
- Local data storage with encryption
- Biometric authentication support
- Passcode lock option
- Data export/import functionality

### 📈 Analytics
- Expense analytics and insights
- Category-wise spending breakdown
- Monthly/yearly spending reports
- Visual charts and graphs

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation
- **UI Components**: React Native Paper
- **Storage**: AsyncStorage + SecureStore
- **Icons**: Expo Vector Icons
- **Forms**: React Hook Form
- **Date Handling**: React Native Date Picker

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Physical iOS/Android device or emulator/simulator

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/ReceiptTracker.git
cd ReceiptTracker
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm start
# or
yarn start
```

4. Run the app:
- **iOS**: `npm run ios` or `yarn ios`
- **Android**: `npm run android` or `yarn android`
- **Web**: `npm run web` or `yarn web`

## Project Structure

```
ReceiptTracker/
├── src/
│   ├── components/          # Reusable UI components
│   │   └── AddExpenseModal.js
│   ├── navigation/          # Navigation configuration
│   │   └── AppNavigator.js
│   ├── screens/            # App screens
│   │   ├── DashboardScreen.js
│   │   ├── ExpensesScreen.js
│   │   ├── BudgetsScreen.js
│   │   ├── CaptureScreen.js
│   │   └── SettingsScreen.js
│   ├── services/           # Business logic and data services
│   │   └── StorageService.js
│   └── styles/             # Theme and styling
│       └── theme.js
├── assets/                 # Static assets (images, icons)
├── App.js                  # Main app component
├── package.json           # Dependencies and scripts
└── app.json              # Expo configuration
```

## Usage

### Adding Expenses
1. Tap the "+" button on the Dashboard or Expenses screen
2. Fill in expense details (vendor, amount, category, date)
3. Optionally add a photo by tapping the camera icon
4. Save the expense

### Managing Budgets
1. Navigate to the Budgets screen
2. Tap "Add Budget" to create a new budget
3. Set budget name, amount, and period
4. Monitor your spending against the budget

### Capturing Receipts
1. Go to the Capture screen
2. Choose camera to take a new photo or gallery to select existing
3. The app will automatically create an expense entry
4. Edit the details as needed

### Viewing Analytics
1. Access the Dashboard for overview statistics
2. View detailed breakdowns by category
3. Track monthly/yearly spending trends

## Data Storage

All data is stored locally on your device:
- **Expenses**: Transaction records with receipt images
- **Budgets**: Budget limits and tracking
- **Categories**: Customizable expense categories
- **Settings**: User preferences and app configuration

Data is encrypted using device secure storage for privacy protection.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Guidelines

- Follow React Native and Expo best practices
- Use TypeScript for type safety (if applicable)
- Write meaningful commit messages
- Test on both iOS and Android platforms
- Follow the existing code style and structure

## Troubleshooting

### Common Issues

**Metro bundler not starting:**
```bash
npx expo start --clear
```

**Camera permissions not working:**
- Ensure camera permissions are granted in device settings
- Check app.json for proper permissions configuration

**Build failures:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Expo cache: `expo r -c`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions:
- Create an issue on GitHub
- Check the [Expo documentation](https://docs.expo.dev/)
- Review the [React Native documentation](https://reactnative.dev/)

## Version History

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes and updates.

---

**Happy tracking!** 📊💰
