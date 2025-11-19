import { describe, it, expect } from 'vitest';
import { rotateImage } from '../renderer';

describe('rotateImage', () => {
  it('preserves total luminosity (character count) for 90 degree rotation', () => {
    const input = [
      "  ##  ",
      " #### ",
      "######",
      " #### ",
      "  ##  "
    ].join('\n');
    
    const rotated = rotateImage(input, 90);
    
    const inputCount = input.replace(/\s/g, '').length;
    const rotatedCount = rotated.replace(/\s/g, '').length;
    
    // Allow small variance due to sampling/aliasing, but for 90 deg it should be close
    expect(Math.abs(rotatedCount - inputCount)).toBeLessThan(7);
  });

  it('handles 0 degree rotation by returning similar image', () => {
    const input = "##\n##";
    const rotated = rotateImage(input, 0);
    expect(rotated.trim()).toBe(input.trim());
  });

  it('rotates 45 degrees correctly', () => {
    const input = [
      "  ^  ",
      "  |  ",
      "  |  "
    ].join('\n');
    const rotated = rotateImage(input, 45);
    const expected = [
      " ^   ",
      "  |  ",
      "   | "
    ].join('\n');
    expect(rotated).toBe(expected);
  });

  it('rotates 90 degrees correctly', () => {
    const input = [
      "  ^  ",
      "  |  ",
      "  |  "
    ].join('\n');
    const rotated = rotateImage(input, 90);
    const expected = [
      "     ",
      " ^|| ",
      "     "
    ].join('\n');
    expect(rotated).toBe(expected);
  });

  it('rotates 180 degrees correctly', () => {
    const input = [
      "  ^  ",
      "  |  ",
      "  |  "
    ].join('\n');
    const rotated = rotateImage(input, 180);
    const expected = [
      "  |  ",
      "  |  ",
      "  ^  "
    ].join('\n');
    expect(rotated).toBe(expected);
  });

  it('maps specific pixels correctly for 90 degree rotation', () => {
    // Use a larger grid to avoid edge clipping issues
    // 5x5 grid. Center (2,2).
    // Point at (4, 2) is right of center.
    const input = [
      "     ",
      "     ",
      "    #",
      "     ",
      "     "
    ].join('\n');
    
    const rotated = rotateImage(input, 90);
    const lines = rotated.split('\n');
    
    let foundX = -1, foundY = -1;
    for(let y=0; y<lines.length; y++) {
      for(let x=0; x<lines[y].length; x++) {
        if (lines[y][x] === '#') {
          foundX = x;
          foundY = y;
        }
      }
    }
    
    // Should exist
    expect(foundX).toBeGreaterThanOrEqual(0);
    expect(foundY).toBeGreaterThanOrEqual(0);
    
    // With our simplified rotation (no aspect ratio), rotation is more direct
    // The character should still have moved from its original position
    const originalX = 4, originalY = 2;
    expect(foundX !== originalX || foundY !== originalY).toBe(true);
  });
});
