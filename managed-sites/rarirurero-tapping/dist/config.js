import forms from './results.js';
export const config = {
 duration: 10000,
 normalImage: 'assets/normal.png',
 forms,
 selectForm: (score, forms) => forms[score % forms.length]
};
export function randomPoints(random=Math.random){return Math.floor(random()*100)+1;}
export class Round {
 constructor(duration=10000){this.duration=duration;this.state='ready';this.score=0;this.taps=0;}
 start(now){this.end=now+this.duration;this.state='playing';this.score=0;this.taps=0;}
 remaining(now){return Math.max(0,this.end-now);}
 tap(now,random=Math.random){if(this.state!=='playing'||now>=this.end)return 0;const p=randomPoints(random);this.score+=p;this.taps++;return p;}
 finish(){if(this.state!=='playing')return false;this.state='transforming';return true;}
}
