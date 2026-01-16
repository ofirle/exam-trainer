/**
 * Reverses a string for display purposes.
 * Used because the Hebrew text in the JSON is stored in reverse order.
 */
export const reverseText = (text: string): string => {
  return text.split('').reverse().join('');
};
