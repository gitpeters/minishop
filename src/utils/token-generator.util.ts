import * as crypto from 'crypto';

export const generateRandomString = (length: number): string => {
  if (length <= 0) {
    throw new Error('Length must be a positive integer.');
  }
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

export const generateRandomDigit = (length: number): string => {
  if (length <= 0) {
    throw new Error('Length must be a positive integer.');
  }

  let randomDigits = '';
  while (randomDigits.length < length) {
    const byte = crypto.randomBytes(1).toString('hex');
    const digit = parseInt(byte, 16);
    if (digit < 10) {
      // Ensure the digit is between 0 and 9
      randomDigits += digit.toString();
    }
  }
  return randomDigits.slice(0, length);
};
