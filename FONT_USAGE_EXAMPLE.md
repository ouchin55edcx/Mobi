# Ubuntu Font Usage Guide

The Ubuntu font family has been fully integrated into your React Native app. Here's how to use it:

## Available Font Weights

- **Thin** - UbuntuSans-Thin
- **ExtraLight** - UbuntuSans-ExtraLight
- **Light** - UbuntuSans-Light
- **Regular** - UbuntuSans-Regular (default)
- **Medium** - UbuntuSans-Medium
- **SemiBold** - UbuntuSans-SemiBold
- **Bold** - UbuntuSans-Bold
- **ExtraBold** - UbuntuSans-ExtraBold

Each weight also has an italic variant (e.g., UbuntuSans-BoldItalic).

## Usage Methods

### Method 1: Using Font Constants (Recommended)

```javascript
import { UbuntuFonts } from './src/utils/fonts';

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontFamily: UbuntuFonts.bold,
    color: '#1A1A1A',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: UbuntuFonts.medium,
    color: '#666666',
  },
  body: {
    fontSize: 14,
    fontFamily: UbuntuFonts.regular,
    color: '#1A1A1A',
  },
  italicText: {
    fontSize: 14,
    fontFamily: UbuntuFonts.italic,
    color: '#666666',
  },
});
```

### Method 2: Using Helper Function

```javascript
import { getUbuntuFont } from './src/utils/fonts';

const styles = StyleSheet.create({
  heading: {
    fontSize: 20,
    fontFamily: getUbuntuFont('bold'),
    color: '#1A1A1A',
  },
  italicHeading: {
    fontSize: 20,
    fontFamily: getUbuntuFont('bold', true), // bold + italic
    color: '#1A1A1A',
  },
});
```

### Method 3: Direct Font Name

```javascript
const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontFamily: 'UbuntuSans-Regular',
    color: '#1A1A1A',
  },
  boldText: {
    fontSize: 16,
    fontFamily: 'UbuntuSans-Bold',
    color: '#1A1A1A',
  },
});
```

## Example Component

```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UbuntuFonts } from '../utils/fonts';

const ExampleComponent = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.thin}>Thin Text</Text>
      <Text style={styles.light}>Light Text</Text>
      <Text style={styles.regular}>Regular Text</Text>
      <Text style={styles.medium}>Medium Text</Text>
      <Text style={styles.semiBold}>SemiBold Text</Text>
      <Text style={styles.bold}>Bold Text</Text>
      <Text style={styles.extraBold}>ExtraBold Text</Text>
      <Text style={styles.italic}>Italic Text</Text>
      <Text style={styles.boldItalic}>Bold Italic Text</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  thin: {
    fontFamily: UbuntuFonts.thin,
    fontSize: 16,
  },
  light: {
    fontFamily: UbuntuFonts.light,
    fontSize: 16,
  },
  regular: {
    fontFamily: UbuntuFonts.regular,
    fontSize: 16,
  },
  medium: {
    fontFamily: UbuntuFonts.medium,
    fontSize: 16,
  },
  semiBold: {
    fontFamily: UbuntuFonts.semiBold,
    fontSize: 16,
  },
  bold: {
    fontFamily: UbuntuFonts.bold,
    fontSize: 16,
  },
  extraBold: {
    fontFamily: UbuntuFonts.extraBold,
    fontSize: 16,
  },
  italic: {
    fontFamily: UbuntuFonts.italic,
    fontSize: 16,
  },
  boldItalic: {
    fontFamily: UbuntuFonts.boldItalic,
    fontSize: 16,
  },
});

export default ExampleComponent;
```

## Notes

- All fonts are automatically loaded when the app starts
- The app will show the splash screen until fonts are loaded
- If a font fails to load, the app will still function (fallback to system font)
- Use the font constants from `src/utils/fonts.js` for consistency across your app

