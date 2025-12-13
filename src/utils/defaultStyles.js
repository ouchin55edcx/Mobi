/**
 * Default Styles with Ubuntu Font
 * 
 * Use these default text styles throughout the app for consistency
 */

import { UbuntuFonts } from './fonts';

export const defaultTextStyles = {
  // Headings
  h1: {
    fontSize: 32,
    fontFamily: UbuntuFonts.bold,
    fontWeight: 'bold',
  },
  h2: {
    fontSize: 24,
    fontFamily: UbuntuFonts.bold,
    fontWeight: 'bold',
  },
  h3: {
    fontSize: 20,
    fontFamily: UbuntuFonts.semiBold,
    fontWeight: '600',
  },
  h4: {
    fontSize: 18,
    fontFamily: UbuntuFonts.semiBold,
    fontWeight: '600',
  },
  
  // Body text
  body: {
    fontSize: 16,
    fontFamily: UbuntuFonts.regular,
  },
  bodySmall: {
    fontSize: 14,
    fontFamily: UbuntuFonts.regular,
  },
  bodyLarge: {
    fontSize: 18,
    fontFamily: UbuntuFonts.regular,
  },
  
  // Labels and captions
  label: {
    fontSize: 12,
    fontFamily: UbuntuFonts.semiBold,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  caption: {
    fontSize: 12,
    fontFamily: UbuntuFonts.regular,
  },
  
  // Buttons
  button: {
    fontSize: 18,
    fontFamily: UbuntuFonts.semiBold,
    fontWeight: '600',
  },
  buttonSmall: {
    fontSize: 14,
    fontFamily: UbuntuFonts.semiBold,
    fontWeight: '600',
  },
};

/**
 * Helper to merge default text style with custom styles
 */
export const getTextStyle = (styleName, customStyles = {}) => {
  const baseStyle = defaultTextStyles[styleName] || defaultTextStyles.body;
  return { ...baseStyle, ...customStyles };
};

