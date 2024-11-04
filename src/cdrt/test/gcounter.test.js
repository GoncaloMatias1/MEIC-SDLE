// FILEPATH: /home/joca/SDLE/project/src/cdrt/test/gcounter_test.js
const GCounter = require('../gcounter.js');

describe('GCounter', () => {
  let g1, g2;

  beforeEach(() => {
    g1 = new GCounter(10, 10, 1); 
    g2 = new GCounter(5, 5, 2);
  });

  it('should initialize correctly', () => {
    expect(g1.read()).toBe(10);
    expect(g1.local()).toBe(10);
    expect(g1.toString()).toBe('GCounter: ( 1->10 )');

    expect(g2.read()).toBe(5);
    expect(g2.local()).toBe(5);
    expect(g2.toString()).toBe('GCounter: ( 2->5 )');
  });

  it('should increment correctly', () => {
    g1.inc(3); 

    expect(g1.read()).toBe(13);
    expect(g1.local()).toBe(13);
  });

  it('should join correctly', () => {
    g1.join(g2);
    expect(g1.read()).toBe(15); 
    expect(g1.toString()).toBe('GCounter: ( 1->10 2->5 )'); 
  });

  it('should check for no stock correctly', () => {
    expect(g1.noStock()).toBe(false);
    const g3 = new GCounter(0, 0, 3);
    expect(g3.noStock()).toBe(true);
  });

  it('should check equality correctly', () => {
    expect(g1.equals(g2)).toBe(false);
    const g3 = new GCounter(10, 10, 1);
    expect(g1.equals(g3)).toBe(true); 
  });
});