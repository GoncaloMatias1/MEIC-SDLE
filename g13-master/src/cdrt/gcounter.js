module.exports =  class GCounter {
    // This GCounter is done with the idea that will only exist decrements.

    constructor(value) {
      this.value = value;
    }

    // Check if value is 0
    noStock() {
      return this.value === 0;
    }
  
    //Check if current is equal to another object
    equals(o) {
      if (this.value !== o.value) return false;
      return true;
    }

  
    // Not used! 
    read() {
      return this.value;
    }
  
  
    join(o) {
      this.value = Math.max(this.value, o.value)
    }


    getCurrent(){
      return this.value;
    }
  
  
    toString() {
      let str = "GCounter: ( ";
      str += "value: ";
      str += this.value
      str += ")";
      return str;
    }
}