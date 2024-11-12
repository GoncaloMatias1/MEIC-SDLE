class DotContext {
    constructor() {
      this.cc = new Map(); // Compact causal context
      this.dc = new Set(); // Dot cloud
    }
    

    // Copies class values
    assign() {
      this.cc = new Map(o.cc);
      this.dc = new Set(o.dc);
      return this;
    }

    // Checks if object is equal
    equals(o) {
        if (this.cc.size !== o.cc.size) return false;
        if (this.dc.size !== o.dc.size) return false;
        for (let [key, val] of this.cc) {
            if (o.cc.get(key) !== val) return false;
        }
        for (let dot of this.dc) {
            if (!o.dc.has(dot)) return false;
        }
        return true;
    }
  
    // Converts object to string
    toString() {
      let output = "Context: CC ( ";
      for (const [key, value] of this.cc.entries()) {
        output += `${key}:${value} `;
      }
      output += ") DC ( ";
      for (const dot of this.dc) {
        output += `${dot[0]}:${dot[1]} `;
      }
      output += ")";
      return output;
    }
  
    // Checks if d is in the context
    // d must be a pair of key and value
    dotIn(d) {
      const [key, value] = d;
      const itm = this.cc.get(key);
      if (itm !== undefined && value <= itm) return true;
      return this.dc.has(d);
    }

    // Compacts DC to CC if possible
    compact() {
      let flag;
      do {
        flag = false;
        for (let dot of this.dc) {
          const [key, value] = dot;
          const ccValue = this.cc.get(key);
          if (ccValue === undefined) { //No value found
            if (value === 1) { //Can compact
              this.cc.set(key, value);
              this.dc.delete(dot);
              flag = true;
            }
          } else if (value === ccValue + 1) { //Contiguous, can compact
            this.cc.set(key, value);
            this.dc.delete(dot);
            flag = true;
          } else if (value <= ccValue) { // Dominated, so prune
            this.dc.delete(dot);
            // no extra compaction opportunity so flag untouched
          }
        }
      } while (flag);
    }


    // Creates a new dot
    // Returns a pair
    makeDot(id) {
      let val = this.cc.get(id) || 0;
      this.cc.set(id, val + 1);
      return [id, val + 1];
    }
  
    //Inserts a dot, and compacts if told to
    insertDot(dot, compactNow = true) {
      this.dc.add(dot);
      if (compactNow) this.compact();
    }
  
    // Joins two contexts
    join(o) {
      if(this === o) return;
      
      let mit = this.cc.entries();
      let mito = o.cc.entries();

      let mitEntry = mit.next();
      let mitoEntry = mito.next();

      do {
          if (!mitEntry.done && (mitoEntry.done || mitEntry.value[0] < mitoEntry.value[0])) {
              // Entry only at here
              mitEntry = mit.next();
          } else if (!mitoEntry.done && (mitEntry.done || mitoEntry.value[0] < mitEntry.value[0])) {
              // Entry only at other
              this.cc.set(mitoEntry.value[0], mitoEntry.value[1]);
              mitoEntry = mito.next();
          } else if (!mitEntry.done && !mitoEntry.done) {
              // In both
              this.cc.set(mitEntry.value[0], Math.max(mitEntry.value[1], mitoEntry.value[1]));
              mitEntry = mit.next();
              mitoEntry = mito.next();
          }
      } while (!mitEntry.done || !mitoEntry.done);
  
      for (const dot of o.dc) {
        this.insertDot(dot, false);
      }
  
      this.compact();
    }
  }
  
  class DotKernel {
    constructor(sharedContext = null) {
      this.ds = new Map(); // Map of dots to values
      this.c = sharedContext || new DotContext();
    }
    equals(o) {
      //console.log(o.c,this.c)
      if (!this.c.equals(o.c)) return false;
      if (this.ds.size !== o.ds.size) return false;
      for (let [key, val] of this.ds) {
        console.log(key, val, o.ds.get(key))
        if (o.ds.get(key) !== val) return false;
      }
      return true;
    }
  
    assign(adk) {
      if (this === adk) return this;
      if (this.c !== adk.c) this.c = adk.c;
      this.ds = new Map(adk.ds);
      return this;
    }
  
    toString() {
      let output = "( ";
      for (const [dot, value] of this.ds.entries()) {
        output += `${dot[0]}:${dot[1]}->${value} `;
      }
      output += ")";
      return output;
    }
  
    join(o) {
      if (this === o) return; // Join is idempotent, but just don't do it.

      let it = this.ds.entries();
      let ito = o.ds.entries();

      let itEntry = it.next();
      let itoEntry = ito.next();

      do {
          if (!itEntry.done && (itoEntry.done || itEntry.value[0] < itoEntry.value[0])) {
              // Dot only at this
              if (o.c.dotIn(itEntry.value[0])) {
                  // Other knows dot, must delete here
                  this.ds.delete(itEntry.value[0]);
                  itEntry = it.next();
              } else {
                  // Keep it
                  itEntry = it.next();
              }
          } else if (!itoEntry.done && (itEntry.done || itoEntry.value[0] < itEntry.value[0])) {
              // Dot only at other
              if (!this.c.dotIn(itoEntry.value[0])) {
                  // If I don't know, import
                  this.ds.set(itoEntry.value[0], itoEntry.value[1]);
              }
              itoEntry = ito.next();
          } else if (!itEntry.done && !itoEntry.done) {
              // Dot in both
              itEntry = it.next();
              itoEntry = ito.next();
          }
      } while (!itEntry.done || !itoEntry.done);

      // CC
      this.c.join(o.c);
     }
  
  
    //TODO: PROBLEMA AQUI
    add(id, val) {
      const newDot = this.c.makeDot(id);
      this.ds.set(newDot, val);
      const res = new DotKernel();
      res.ds.set(newDot, val);
      res.c.insertDot(newDot);
      return res;
    }
  
    remove(val) {
      const res = new DotKernel();
      for (let [dot, storedVal] of this.ds) {
        //console.log(dot, storedVal);
        if (storedVal === val) {
          res.c.insertDot(dot, false);
          this.ds.delete(dot);
        }
      }
      res.c.compact();
      return res;
    }
  
    removeAll() {
      const res = new DotKernel();
      for (const dot of this.ds.keys()) {
        res.c.insertDot(dot, false);
      }
      res.c.compact();
      this.ds.clear();
      return res;
    }
  }
  
  module.exports = class AWORSet {
    constructor(id, sharedContext = null) {
      this.dk = new DotKernel(sharedContext);
      this.id = id;
    }
  
    context() {
      return this.dk.c;
    }
  
    toString() {
      const values = new Set();
      for (const [_, value] of this.dk.ds.entries()) {
        values.add(value);
      }
      return `AWORSET: (${Array.from(values).join(', ')})`;
    }
  
    read() {
      const res = new Set();
      for (const [_, value] of this.dk.ds.entries()) {
        res.add(value);
      }
      return res;
    }
  
    in(val) {
      return this.read().has(val);
    }
  
    add(val) {
      const res = new AWORSet(this.id);
      res.dk = this.dk.remove(val);
      res.dk.join(this.dk.add(this.id, val));
      return res;
    }
  
    remove(val) {
      const res = new AWORSet(this.id);
      res.dk = this.dk.remove(val);
      return res;
    }
  
    reset() {
      const res = new AWORSet(this.id);
      res.dk = this.dk.removeAll();
      return res;
    }
  
    join(o) {
      this.dk.join(o.dk);
    }
  
    equals(o) {
      return this.dk.equals(o.dk);
    }
  };
