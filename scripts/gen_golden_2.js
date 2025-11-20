const { rotateCharacters, FRAME_W, FRAME_H } = require('../dist/index.cjs');

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

const centerX = Math.floor(FRAME_W / 2);
const centerY = Math.floor(FRAME_H / 2);

const input = inputLines.join('\n');
const rotated = rotateCharacters(input, 45, centerX, centerY);

console.log('OUTPUT_START');
console.log(rotated);
console.log('OUTPUT_END');

