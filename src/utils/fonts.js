/**
 * Ubuntu Font Family Configuration
 * 
 * This file provides font constants for the Ubuntu font family.
 * Use these constants in your StyleSheet definitions.
 */

export const UbuntuFonts = {
  // Regular weights
  thin: 'UbuntuSans-Thin',
  extraLight: 'UbuntuSans-ExtraLight',
  light: 'UbuntuSans-Light',
  regular: 'UbuntuSans-Regular',
  medium: 'UbuntuSans-Medium',
  semiBold: 'UbuntuSans-SemiBold',
  bold: 'UbuntuSans-Bold',
  extraBold: 'UbuntuSans-ExtraBold',
  
  // Italic weights
  thinItalic: 'UbuntuSans-ThinItalic',
  extraLightItalic: 'UbuntuSans-ExtraLightItalic',
  lightItalic: 'UbuntuSans-LightItalic',
  italic: 'UbuntuSans-Italic',
  mediumItalic: 'UbuntuSans-MediumItalic',
  semiBoldItalic: 'UbuntuSans-SemiBoldItalic',
  boldItalic: 'UbuntuSans-BoldItalic',
  extraBoldItalic: 'UbuntuSans-ExtraBoldItalic',
};

/**
 * Font weight mappings for convenience
 */
export const FontWeights = {
  thin: UbuntuFonts.thin,
  extraLight: UbuntuFonts.extraLight,
  light: UbuntuFonts.light,
  regular: UbuntuFonts.regular,
  normal: UbuntuFonts.regular, // Alias for regular
  medium: UbuntuFonts.medium,
  semiBold: UbuntuFonts.semiBold,
  bold: UbuntuFonts.bold,
  extraBold: UbuntuFonts.extraBold,
};

/**
 * Helper function to get font family with weight
 * @param {string} weight - Font weight (thin, light, regular, medium, semiBold, bold, extraBold)
 * @param {boolean} italic - Whether to use italic variant
 * @returns {string} Font family name
 */
export const getUbuntuFont = (weight = 'regular', italic = false) => {
  const weightKey = weight.toLowerCase();
  
  if (italic) {
    const italicKey = `${weightKey}Italic`;
    return UbuntuFonts[italicKey] || UbuntuFonts.italic;
  }
  
  return UbuntuFonts[weightKey] || UbuntuFonts.regular;
};

/**
 * Default font family (regular weight)
 */
export const defaultFont = UbuntuFonts.regular;

