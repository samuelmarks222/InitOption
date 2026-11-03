/** Arithmetic Brownian motion. All randomness is server-side simulation only. */
export class BrownianMarket {
  constructor({price = 100, drift = 0, volatility = .06, precision = 8, support = 98, resistance = 102, boundaryStrength = .08, random = Math.random} = {}) {
    if (![price,drift,volatility,support,resistance,boundaryStrength].every(Number.isFinite) || price <= 0 || volatility < 0 || support <= 0 || resistance <= support || boundaryStrength < 0 || !Number.isInteger(precision) || precision < 0 || precision > 10) throw new Error('Invalid market configuration');
    Object.assign(this,{price,drift,volatility,precision,support,resistance,boundaryStrength,random}); this.remaining = 0; this.regimeDrift = 0;
  }
  next() {
    if (--this.remaining <= 0) {
      const direction = this.random();
      this.regimeDrift = direction < .4 ? 0 : (direction < .7 ? -1 : 1)*this.volatility*(.1+this.random()*.35);
      this.remaining = 20+Math.floor(this.random()*61); // 2–8 seconds at 10 Hz.
    }
    const normal = Math.sqrt(-2*Math.log(Math.max(Number.EPSILON,this.random())))*Math.cos(2*Math.PI*this.random());
    const boundary = Math.max(0,this.support-this.price)-Math.max(0,this.price-this.resistance);
    const sigma = this.volatility*(this.regimeDrift === 0 ? .4 : 1);
    this.price = Math.max(10**-this.precision,this.price+(this.drift+this.regimeDrift+boundary*this.boundaryStrength)*.1+sigma*Math.sqrt(.1)*normal);
    return this.price.toFixed(this.precision);
  }
}
