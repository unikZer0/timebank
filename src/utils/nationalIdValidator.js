/**
 * Thai National ID Validation Utility
 * Validates Thai national ID numbers using the official algorithm
 */

/**
 * Validates Thai National ID using the official checksum algorithm
 * @param {string} nationalId - The 13-digit national ID string
 * @returns {object} Validation result with success status and message
 */
export const validateThaiNationalId = (nationalId) => {
  // Remove any non-digit characters
  const cleanId = nationalId.replace(/\D/g, '');
  
  // Check if it's exactly 13 digits
  if (cleanId.length !== 13) {
    return {
      isValid: false,
      message: 'National ID must be exactly 13 digits',
      errorCode: 'INVALID_LENGTH'
    };
  }
  
  // Check if all characters are digits
  if (!/^\d{13}$/.test(cleanId)) {
    return {
      isValid: false,
      message: 'National ID must contain only numbers',
      errorCode: 'INVALID_FORMAT'
    };
  }
  
  // Thai National ID checksum validation
  const digits = cleanId.split('').map(Number);
  
  // Calculate checksum using Thai National ID algorithm
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (13 - i);
  }
  
  const checkDigit = (11 - (sum % 11)) % 10;
  
  if (digits[12] !== checkDigit) {
    return {
      isValid: false,
      message: 'Invalid National ID checksum',
      errorCode: 'INVALID_CHECKSUM'
    };
  }
  
  return {
    isValid: true,
    message: 'Valid National ID',
    errorCode: null,
    nationalId: cleanId
  };
};

/**
 * Formats national ID for display (adds dashes)
 * @param {string} nationalId - The 13-digit national ID
 * @returns {string} Formatted national ID (e.g., 1234567890123 -> 1-2345-67890-12-3)
 */
export const formatNationalId = (nationalId) => {
  const cleanId = nationalId.replace(/\D/g, '');
  if (cleanId.length === 13) {
    return `${cleanId.slice(0, 1)}-${cleanId.slice(1, 5)}-${cleanId.slice(5, 10)}-${cleanId.slice(10, 12)}-${cleanId.slice(12)}`;
  }
  return cleanId;
};

/**
 * Extracts information from Thai National ID
 * @param {string} nationalId - The 13-digit national ID
 * @returns {object} Extracted information
 */
export const extractNationalIdInfo = (nationalId) => {
  const cleanId = nationalId.replace(/\D/g, '');
  
  if (cleanId.length !== 13) {
    return null;
  }
  
  const firstDigit = parseInt(cleanId[0]);
  const birthYear = parseInt(cleanId.slice(1, 3));
  const birthMonth = parseInt(cleanId.slice(3, 5));
  const birthDay = parseInt(cleanId.slice(5, 7));
  
  // Determine century based on first digit
  let century;
  if (firstDigit === 1 || firstDigit === 2) {
    century = 1900;
  } else if (firstDigit === 3 || firstDigit === 4) {
    century = 2000;
  } else if (firstDigit === 5 || firstDigit === 6) {
    century = 2000; // For foreigners
  } else if (firstDigit === 7 || firstDigit === 8) {
    century = 2000; // For foreigners with permanent residence
  } else if (firstDigit === 9) {
    century = 2000; // For foreigners with temporary residence
  } else {
    century = 2000; // Default
  }
  
  const fullYear = century + birthYear;
  
  return {
    type: getNationalIdType(firstDigit),
    birthYear: fullYear,
    birthMonth,
    birthDay,
    birthDate: `${fullYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`,
    province: cleanId.slice(7, 9),
    sequence: cleanId.slice(9, 12),
    checkDigit: cleanId[12]
  };
};

/**
 * Gets the type of National ID based on first digit
 * @param {number} firstDigit - The first digit of the national ID
 * @returns {string} Type description
 */
const getNationalIdType = (firstDigit) => {
  const types = {
    1: 'Thai citizen born before 1984',
    2: 'Thai citizen born after 1984',
    3: 'Foreigner with permanent residence',
    4: 'Foreigner with permanent residence',
    5: 'Foreigner with temporary residence',
    6: 'Foreigner with temporary residence',
    7: 'Foreigner with permanent residence (special)',
    8: 'Foreigner with permanent residence (special)',
    9: 'Foreigner with temporary residence (special)'
  };
  
  return types[firstDigit] || 'Unknown type';
};

/**
 * Validates if the national ID matches the provided date of birth
 * @param {string} nationalId - The 13-digit national ID
 * @param {string} dob - Date of birth in YYYY-MM-DD format
 * @returns {boolean} True if the dates match
 */
export const validateNationalIdWithDOB = (nationalId, dob) => {
  const info = extractNationalIdInfo(nationalId);
  if (!info) return false;
  
  return info.birthDate === dob;
};
