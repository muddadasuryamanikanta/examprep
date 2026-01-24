
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Assumes script is in server/scripts/
const PROJECT_ROOT = path.resolve(__dirname, '../'); 
const SRC_ROOT = path.join(PROJECT_ROOT, 'src');

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        arrayOfFiles.push(fullPath);
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles(SRC_ROOT);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const dir = path.dirname(file);

  // Regex to match:
  // from "..."
  // from '...'
  // import "..."
  // import '...'
  // Capture the path if it starts with .
  const importRegex = /(from|import)\s+['"](\.[^'"]+)['"]/g;

  let changed = false;
  // @ts-ignore
  const newContent = content.replace(importRegex, (match, p1, p2) => {
    // p1: 'from' or 'import'
    // p2: the relative path, e.g. '../models/User'

    const absoluteImportPath = path.resolve(dir, p2);
    
    // Check if it resolves to inside src
    if (absoluteImportPath.startsWith(SRC_ROOT)) {
      let relativeToSrc = path.relative(SRC_ROOT, absoluteImportPath);
      // Ensure forward slashes for Windows compatibility (though user matches Mac, good practice)
      relativeToSrc = relativeToSrc.split(path.sep).join('/');
      
      const newPath = `@/${relativeToSrc}`;
      // console.log(`Mapping ${p2} -> ${newPath} in ${path.relative(PROJECT_ROOT, file)}`);
      changed = true;
      // Reconstruct the match with the new path
      // We need to preserve the quote style. Match contained the full string including quotes?
      // No, the regex matches the keyword and spaces and opening quote... wait.
      // My regex: `(from|import)\s+['"](\.[^'"]+)['"]`
      // It consumes the quotes.
      // But I am capturing the content inside quotes in p2.
      // I need to preserve the quote character used.
      
      // Let's refine regex to capture quote
      // But replace works on the whole match.
      
      // Simpler: find the quote char from the match string.
      const quoteChar = match.includes("'") ? "'" : '"';
      
      // Rebuild
      return `${p1} ${quoteChar}${newPath}${quoteChar}`;
    }
    return match;
  });

  if (changed) {
    console.log(`Updated imports in ${path.relative(PROJECT_ROOT, file)}`);
    fs.writeFileSync(file, newContent, 'utf8');
  }
});
