/**
 * Reverses a string for display purposes.
 * Used because the Hebrew text in the JSON is stored in reverse order.
 * Preserves number sequences (digits should stay LTR even in RTL text).
 */
export const reverseText = (text: string): string => {
  // First, reverse the entire string
  const reversed = text.split('').reverse().join('');

  // Then, reverse back any number sequences to restore their correct order
  // This regex finds sequences of digits (possibly with decimal points or commas)
  return reversed.replace(/[\d]+([.,][\d]+)*/g, (match) => {
    return match.split('').reverse().join('');
  });
};
