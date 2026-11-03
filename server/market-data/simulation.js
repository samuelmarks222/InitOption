/** Arithmetic Brownian motion: dP = drift*dt + volatility*sqrt(dt)*N(0,1).
 * Regime changes and soft boundary forces affect drift, never client rendering. */
export class SimulationMarket {
  constructor({symbol = 'DEMO/USD', price = 100, drift = .02, volatility = .2, precision = 5, support = 90, resistance = 110, boundaryStrength = .3, random = Math.random} = {}) {
    if (![price,drift,volatility,support,resistance,boundaryStrength].every(Number.isFinite) || price <= 0 || volatility < 0 || support <= 0 || resistance <= support || boundaryStrength < 0 || !Number.isInteger(precision) || precision < 0 || precision > 10) throw new Error('Invalid simulation configuration');
    Object.assign(this, {symbol,price,drift,volatility,precision,support,resistance,boundaryStrength,random});
    this.sequence = 0; this.regime = 0; this.remaining = 0;
  }
  next(timestamp = Date.now()/1000) {
    if (this.remaining-- <= 0) {
      this.regime = this.random() < .4 ? 0 : this.random() < .5 ? -1 : 1;
      this.remaining = 80 + Math.floor(this.random()*320);
    }
    const normal = Math.sqrt(-2*Math.log(Math.max(Number.EPSILON,this.random()))) * Math.cos(2*Math.PI*this.random());
    const width = (this.resistance-this.support)*.1;
    const force = Math.max(0, this.support+width-this.price) - Math.max(0, this.price-this.resistance+width);
    const drift = this.drift + this.regime*this.volatility*.5 + force*this.boundaryStrength;
    this.price = Math.max(10**-this.precision, this.price + drift*.1 + this.volatility*(this.regime === 0 ? .35 : 1)*Math.sqrt(.1)*normal);
    return {type:'tick',symbol:this.symbol,timestamp,price:Number(this.price.toFixed(this.precision)),sequence:++this.sequence,source:'simulated',volume:1};
  }
}
