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

const availableImageNums = new Set(availableImages.map(img => img.num));

// Pattern to match "בתמונה X" where X is a number
// In Hebrew: בתמונה = "in image"
const imagePattern = /בתמונה\s+(\d+)/g;

let updatedCount = 0;
let notFoundImages = [];

questions.forEach((question) => {
  // Get the display version of the question text
  const displayText = reverseText(question.question);

  // Also check the options
  const allText = [
    displayText,
    ...question.options.map(opt => reverseText(opt.text))
  ].join(' ');

  // Find all image references
  const matches = [...allText.matchAll(imagePattern)];

  if (matches.length > 0) {
    const imageNumbers = matches.map(m => parseInt(m[1]));
    const uniqueImageNumbers = [...new Set(imageNumbers)];

    // Find corresponding image files
    const imagePaths = [];

    for (const num of uniqueImageNumbers) {
      // Find the image file with this number
      const imageFile = availableImages.find(img => img.num === num);

      if (imageFile) {
        imagePaths.push(`/images/${imageFile.file}`);
      } else {
        notFoundImages.push({ questionId: question.id, imageNum: num });
      }
    }

    if (imagePaths.length > 0) {
      // Check if images are already attached
      const existingImages = question.images || (question.image ? [question.image] : []);
      const newImages = imagePaths.filter(p => !existingImages.includes(p));

      if (newImages.length > 0) {
        // Merge with existing images
        question.images = [...new Set([...existingImages, ...imagePaths])];
        // Clear legacy single image field if we're using images array
        if (question.image && question.images.includes(question.image)) {
          delete question.image;
        }
        updatedCount++;
        console.log(`Question ${question.id}: Added images ${imagePaths.join(', ')}`);
      }
    }
  }
});

// Write updated questions back to file
fs.writeFileSync(questionsPath, JSON.stringify(questions, null, 2));

console.log('\n--- Summary ---');
console.log(`Updated ${updatedCount} questions with images`);

if (notFoundImages.length > 0) {
  console.log('\nImages not found:');
  notFoundImages.forEach(({ questionId, imageNum }) => {
    console.log(`  Question ${questionId}: Image ${imageNum} not found in public/images/`);
  });
}
