#!/usr/bin/env node
/**
 * Script to fix SVG icons to support dynamic coloring via the `color` prop
 * 
 * Usage: node scripts/fix-svg-colors.js [path-to-svg-file]
 * 
 * This script replaces hardcoded fill colors with "currentColor" so that
 * SVG icons can be colored dynamically using the `color` prop in React Native.
 */

const fs = require('fs');
const path = require('path');

function fixSvgFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace common hardcoded fill patterns with currentColor
    const patterns = [
      /fill="#[0-9a-fA-F]{3,6}"/g,
      /fill='#[0-9a-fA-F]{3,6}'/g,
      /fill="(?:black|white|rgb\([^)]+\))"/g,
      /stroke="#[0-9a-fA-F]{3,6}"/g,
      /stroke='#[0-9a-fA-F]{3,6}'/g,
    ];
    
    let modified = false;
    patterns.forEach(pattern => {
      if (pattern.test(content)) {
        content = content.replace(pattern, (match) => {
          modified = true;
          return match.includes('fill') ? 'fill="currentColor"' : 'stroke="currentColor"';
        });
      }
    });
    
    // Remove inline opacity styles
    if (content.includes('style="opacity:1;"')) {
      content = content.replace(/\s*style="opacity:1;"/g, '');
      modified = true;
    }
    
    // Clean up extra spaces in path tags
    content = content.replace(/<path\s+\s+/g, '<path ');
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function fixAllSvgsInDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  let fixedCount = 0;
  
  files.forEach(file => {
    if (file.endsWith('.svg')) {
      const filePath = path.join(dirPath, file);
      if (fixSvgFile(filePath)) {
        fixedCount++;
      }
    }
  });
  
  console.log(`\n✨ Fixed ${fixedCount} SVG file(s)`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  // Default: fix all SVGs in assets/icons
  const iconsDir = path.join(__dirname, '../src/assets/icons');
  console.log(`Fixing all SVGs in: ${iconsDir}\n`);
  fixAllSvgsInDirectory(iconsDir);
} else {
  // Fix specific file
  const filePath = path.resolve(args[0]);
  fixSvgFile(filePath);
}

