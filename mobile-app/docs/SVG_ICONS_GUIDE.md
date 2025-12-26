# SVG Icons Guide

## How to Add New Icons

### Quick Method (Recommended)

1. **Add your SVG file** to `src/assets/icons/`
2. **Run the fix script**:
   ```bash
   node scripts/fix-svg-colors.js
   ```
3. **Import and use** in your component:
   ```tsx
   import MyIcon from '@/assets/icons/my-icon.svg';
   
   <MyIcon color="#ff0000" width={24} height={24} />
   ```

### Manual Method

If you prefer to manually prepare your SVG:

1. Open the SVG file in a text editor
2. Replace any hardcoded colors with `currentColor`:
   - Change `fill="#000000"` to `fill="currentColor"`
   - Change `stroke="#ff0000"` to `stroke="currentColor"`
3. Remove inline styles like `style="opacity:1;"`
4. Save the file

### Example

**Before:**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#000000" style="opacity:1;">
  <path d="M12 2L2 7v10l10 5 10-5V7z"/>
</svg>
```

**After:**
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2L2 7v10l10 5 10-5V7z"/>
</svg>
```

## Using Icons in Components

### Basic Usage

```tsx
import TrashIcon from '@/assets/icons/trash.svg';

<TrashIcon width={20} height={20} color="#ff0000" />
```

### Dynamic Colors

```tsx
<TrashIcon 
  width={20} 
  height={20} 
  color={isDisabled ? '#666666' : '#ffffff'} 
/>
```

### With Opacity

```tsx
<TrashIcon 
  width={20} 
  height={20} 
  color="#ffffff" 
  opacity={0.5}
/>
```

## Available Props

All SVG icons support these props from `react-native-svg`:

- `width` - Icon width (number)
- `height` - Icon height (number)
- `color` - Icon color (string, hex or named color)
- `opacity` - Icon opacity (number, 0-1)
- `fill` - Override fill color (string)
- `stroke` - Override stroke color (string)
- `strokeWidth` - Stroke width (number)

## Troubleshooting

### Color prop not working?

1. Make sure the SVG uses `fill="currentColor"` or `stroke="currentColor"`
2. Run the fix script: `node scripts/fix-svg-colors.js`
3. Restart Metro bundler: `npm run start:reset`
4. Rebuild the app

### Icon not appearing?

1. Check that the SVG file is in `src/assets/icons/`
2. Verify `metro.config.js` has the SVG transformer configured
3. Check `src/declarations.d.ts` has the SVG module declaration
4. Restart Metro bundler and rebuild

### Icon looks wrong?

- Check the `viewBox` attribute matches the icon's design
- Verify `width` and `height` props are set appropriately
- Some complex SVGs may need manual adjustment

## Best Practices

1. **Use simple, single-color SVGs** for icons
2. **Keep file sizes small** (under 5KB is ideal)
3. **Use consistent sizing** (24x24 or 48x48 viewBox)
4. **Name files descriptively** (e.g., `trash.svg`, `arrow-left.svg`)
5. **Always run the fix script** after adding new icons
6. **Test icons** with different colors before committing

## Script Reference

### Fix all icons
```bash
node scripts/fix-svg-colors.js
```

### Fix specific icon
```bash
node scripts/fix-svg-colors.js src/assets/icons/my-icon.svg
```

## Resources

- [react-native-svg documentation](https://github.com/software-mansion/react-native-svg)
- [SVG currentColor reference](https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill)
- [Icon sources](https://github.com/iconic/open-iconic) (Open Iconic - used in this project)

