// FILEPATH: /home/joca/SDLE/project/src/cdrt/test/aworset_test.js
const AWORSET = require('../AWORSET.js');

describe('AWORSET', () => {
  let set1, set2;

  beforeEach(() => {
    set1 = new AWORSET('set1');
    set2 = new AWORSET('set2');
  });

  it('should initialize correctly', () => {
    expect(set1.toString()).toBe('AWORSET: ()');
    expect(set2.toString()).toBe('AWORSET: ()');
  });

  it('should add elements correctly', () => {
    set1.add('a');
    set1.add('b');
    expect(set1.toString()).toBe('AWORSET: (a, b)');
  });

  it('should remove elements correctly', () => {
    set1.add('a');
    set1.add('b');
    set1.remove('a');
    expect(set1.toString()).toBe('AWORSET: (b)');
  });

  it('should join sets correctly', () => {
    set1.add('a');
    set1.toString();
    set2.add('b');
    set2.toString();
    set1.join(set2);
    expect(set1.toString()).toBe('AWORSET: (a, b)');
  });

  it('should check for element presence correctly', () => {
    set1.add('a');
    expect(set1.in('a')).toBe(true);
    expect(set1.in('b')).toBe(false);
  });
});