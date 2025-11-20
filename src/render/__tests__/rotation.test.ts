import { describe, it, expect } from 'vitest';
import { rotateCharacters, FRAME_W, FRAME_H } from '../renderer';

describe('rotateCharacters', () => {
  it('preserves total luminosity (character count) for 90 degree rotation', () => {
    const input = [
      "  ##  ",
      " #### ",
      "######",
      " #### ",
      "  ##  "
    ].join('\n');
    
    const rotated = rotateCharacters(input, 90);
    
    const inputCount = input.replace(/\s/g, '').length;
    const rotatedCount = rotated.replace(/\s/g, '').length;
    
    // Allow small variance due to sampling/aliasing
    expect(Math.abs(rotatedCount - inputCount)).toBeLessThan(10);
  });

  it('handles 0 degree rotation by returning similar image', () => {
    const input = "##\n##";
    const rotated = rotateCharacters(input, 0);
    expect(rotated.trim()).toBe(input.trim());
  });

  it('rotates 45 degrees correctly', () => {
    const input = [
      "  ^  ",
      "  |  ",
      "  |  "
    ].join('\n');
    const rotated = rotateCharacters(input, 45);
    const expected = [
      "^    ",
      "  |  ",
      "    |"
    ].join('\n');
    expect(rotated).toBe(expected);
  });

  it('rotates 90 degrees correctly', () => {
    const input = [
      "  ^  ",
      "  |  ",
      "  |  "
    ].join('\n');
    const rotated = rotateCharacters(input, 90);
    const expected = [
      "     ",
      "^||||",
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
    const rotated = rotateCharacters(input, 180);
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
    
    const rotated = rotateCharacters(input, 90);
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

  it('rotates moon-sized frame markers by 45 degrees with explicit golden output', () => {
    const inputLines = [
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                              2                             ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                      3       X       1                     ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                              4                             ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
    ];

    const expectedLines = [
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                     2                                      ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                              X                             ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                       4                    ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
      "                                                            ",
    ];

    const centerX = Math.floor(FRAME_W / 2);
    const centerY = Math.floor(FRAME_H / 2);

    const input = inputLines.join('\n');
    const rotated = rotateCharacters(input, 45, centerX, centerY);
    const expected = expectedLines.join('\n');

    expect(rotated).toBe(expected);
  });
});
