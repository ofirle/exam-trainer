import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imagesDir = path.join(__dirname, '../public/images');
const outputFile = path.join(__dirname, '../src/lib/availableImages.ts');

// Get all image files from public/images
const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

const files = fs.readdirSync(imagesDir)
  .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
  .sort((a, b) => {
    // Sort numerically if possible, otherwise alphabetically
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }
    return a.localeCompare(b);
  })
  .map(file => `/images/${file}`);

// Generate TypeScript file
const content = `// Auto-generated file - do not edit manually
// Run "npm run generate-images" to update

export const AVAILABLE_IMAGES: string[] = [
${files.map(f => `  '${f}',`).join('\n')}
];
`;

fs.writeFileSync(outputFile, content);
console.log(`Generated ${outputFile} with ${files.length} images`);
