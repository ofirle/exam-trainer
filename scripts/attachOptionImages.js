import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const questionsPath = path.join(__dirname, '../src/data/questions.json');
const imagesDir = path.join(__dirname, '../public/images');

// Reverse text function (same logic as in textUtils.ts)
const reverseText = (text) => {
  const reversed = text.split('').reverse().join('');
  // Re-reverse number sequences to restore correct order
  return reversed.replace(/[\d]+([.,][\d]+)*/g, (match) => {
    return match.split('').reverse().join('');
  });
};

// Read questions
const questions = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'));

// Get list of available images
const availableImages = fs.readdirSync(imagesDir)
  .filter(file => file.match(/^\d+\.(png|jpg|jpeg|gif|webp)$/i))
  .map(file => {
    const num = parseInt(file.match(/^(\d+)/)[1]);
    return { num, file };
  });

// Pattern to match "בתמונה X" where X is a number
const imagePattern = /בתמונה\s+(\d+)/g;

let updatedOptionsCount = 0;
let updatedQuestionsCount = 0;
let notFoundImages = [];

questions.forEach((question) => {
  let questionUpdated = false;

  question.options.forEach((option, optIndex) => {
    // Get the display version of the option text
    const displayText = reverseText(option.text);

    // Find image references in this option
    const matches = [...displayText.matchAll(imagePattern)];

    if (matches.length > 0) {
      // Take the first image reference for this option
      const imageNum = parseInt(matches[0][1]);

      // Find the image file with this number
      const imageFile = availableImages.find(img => img.num === imageNum);

      if (imageFile) {
        const imagePath = `/images/${imageFile.file}`;

        // Only update if not already set
        if (!option.image) {
          option.image = imagePath;
          updatedOptionsCount++;
          questionUpdated = true;
          console.log(`Question ${question.id}, Option ${option.key}: Added image ${imagePath}`);
        }
      } else {
        notFoundImages.push({ questionId: question.id, optionKey: option.key, imageNum });
      }
    }
  });

  if (questionUpdated) {
    updatedQuestionsCount++;
  }
});

// Write updated questions back to file
fs.writeFileSync(questionsPath, JSON.stringify(questions, null, 2));

console.log('\n--- Summary ---');
console.log(`Updated ${updatedOptionsCount} options across ${updatedQuestionsCount} questions`);

if (notFoundImages.length > 0) {
  console.log('\nImages not found:');
  notFoundImages.forEach(({ questionId, optionKey, imageNum }) => {
    console.log(`  Question ${questionId}, Option ${optionKey}: Image ${imageNum} not found`);
  });
}
