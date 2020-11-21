import React from 'react';
import {NeuralNetwork} from './nn';
import './App.css';

const GENISLIK = 1280;
const YUKSEKLIK = 720;
const BORU_GENISLIK = 80;
const BORU_BOSLUK = 180;
const TOPLAM_KUS = 250;
const FPS = 1000;

class Kus {
  constructor(ctx, beyin, kuvvetlikus) {
    this.ctx = ctx;
    this.x = 100;
    this.y = YUKSEKLIK/2
    this.yercekimi = 0;
    this.ivme = 0.1;
    this.yas = 0;
    this.kuvvetlikus = kuvvetlikus
    if (beyin) {
      this.beyin = beyin.copy()
      this.mutasyon()
    } else {
      this.beyin = new NeuralNetwork(5, 6, 2)
    }
  }

  ciz(ctx) {
    this.ctx.fillStyle = this.kuvvetlikus === true ? "rgba(0, 0, 255, 1)" : "rgba(255, 0, 0, 0.1)";
    this.ctx.beginPath();
    this.kuvvetlikus === true ?  this.ctx.arc(this.x, this.y, 10, 0, 2 * Math.PI) : this.ctx.arc(this.x, this.y, 10, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  update(ustborux, ustboruy, yakinboruy) {
    this.yas += 1
    this.yercekimi += this.ivme;
    this.yercekimi = Math.min(4, this.yercekimi);
    this.y += this.yercekimi
    this.dusun(ustborux, ustboruy, yakinboruy)
  }

  dusun(ustborux, ustboruy, yakinboruy) {
    let girisler = [
      ((ustborux - (this.x)) / (GENISLIK - this.x)).toFixed(2),
      (ustboruy / YUKSEKLIK).toFixed(2),
      (yakinboruy / YUKSEKLIK).toFixed(2),
      (this.y / YUKSEKLIK).toFixed(2),
      Math.abs((this.yercekimi / 4)).toFixed(2)
    ]
    //console.log(girisler)
    let cikis = this.beyin.predict(girisler);
    if( cikis[0] < cikis[1] ){
      this.zipla()
    }
  }

  mutasyon() {
    this.beyin.mutate((x) => {
      if (Math.random() < 0.1) {
        const offset = Math.random();
        return x + offset;
      }
      return x;
    });
  }

  zipla() {
    this.yercekimi = -3;
  }
}

class Boru {
  constructor(ctx, y, yukseklik) {
    this.ctx = ctx;
    this.x = GENISLIK;
    this.y = y ? YUKSEKLIK - y : 0;
    this.genislik = BORU_GENISLIK;
    this.durum = true
    this.bosluk = BORU_BOSLUK
    this.yukseklik = y || 80 + ( Math.random() * (YUKSEKLIK - BORU_BOSLUK - 80 * 2) );
  }

  ciz(ctx) {
    this.ctx.fillStyle = "black";
    this.altboruyukseklik = YUKSEKLIK - (this.yukseklik + this.bosluk)
    this.ctx.fillRect(this.x, this.y, this.genislik, this.yukseklik);
  }

  update() {
    this.x -= 2;
    if( (this.x + BORU_GENISLIK ) < 0) {
      this.durum = false;
    }
  }
}

class App extends React.Component {
  constructor(props)  {
    super(props);
    this.canvasRef = React.createRef();
    this.SKOR = 0;
    this.borular = [];
    this.kuslar = [];
    this.olukuslar = [];
    this.state = {
      gamespeed: FPS
    }
    this.best = 0;
    this.score = 0;
    this.generation = 1
  }

  ctxAl() {
    return this.canvasRef.current.getContext('2d');
  }

  componentDidMount() {
    this.yeniden_baslat()
  }

  onKeyDown = (e) => {
    if(e.code === 'Space') {
      this.kuslar[0].zipla()
    }
  }

  boruUretici() {
    const ctx = this.ctxAl()

    const ustboru = new Boru(ctx, null);
    const altboru = new Boru(ctx, YUKSEKLIK - ustboru.yukseklik - ustboru.bosluk)
    return [ustboru, altboru]
  }

  kusUretici(kuvvetlikus) {
    const ctx = this.ctxAl()
    var kuslar = []
    for (let index = 0; index < TOPLAM_KUS; index++) {
      if(index === 0 && kuvvetlikus !== null) {
        const beyin = kuvvetlikus.beyin
        const yenikus = new Kus(ctx, beyin, kuvvetlikus !== null ? true : false)
        kuslar.push(yenikus)
      } else {
        const beyin = this.olukuslar.length && this.kussec().beyin
        const yenikus = new Kus(ctx, beyin, false)
        kuslar.push(yenikus)
      }
    }
    return kuslar
  }

  dongu() {
    this.update()
    this.ciz()
  }

  yakinborusec(bird) {
    for (let i = 0; i < this.borular.length; i++) {
      if(this.borular[i].x > (bird.x - BORU_GENISLIK)) {
        return this.borular[i]
      }
    }
  }

  update() {
    this.SKOR += 1
    if( this.SKOR % (100*2.5) === 0) {
      if(this.SKOR > 250) {
        this.score += 1
      }
      const uretilenboru = this.boruUretici();
      this.borular.push(...uretilenboru);
    }

    this.borular.forEach(boru => boru.update())   
    this.kuslar.forEach(kus => {
      const yakinboru = this.yakinborusec(kus);
      kus.update(yakinboru.x, yakinboru.y + yakinboru.yukseklik, yakinboru.y)
    })

    this.borular = this.borular.filter(boru => boru.durum === true)
    this.kus_durum_guncelle()
    this.olukuslar.push(...this.kuslar.filter(kus => kus.durum === true))
    this.kuslar = this.kuslar.filter(kus => !kus.durum === true)

    if (this.kuslar.length === 0) {
      let totalyas = 0;
      this.olukuslar.forEach(olukus => totalyas += olukus.yas);
      this.olukuslar.forEach(olukus => olukus.kuvvet = olukus.yas / totalyas)
      
      this.bestkuslar = this.olukuslar
      this.bestkuslar.sort((a,b) => a.kuvvet < b.kuvvet)
      const kuvvetli = this.bestkuslar[this.bestkuslar.length-1]
      
      this.yeniden_baslat(kuvvetli)
    }
  } 

  kussec() {
    let index = 0;
    let r = Math.random();
    while ( r > 0 ) {
      r -= this.olukuslar[index].kuvvet;
      index +=1;
    }
    index -=1;
    return this.olukuslar[index]
  }

  kus_durum_guncelle() {
    this.kuslar.forEach(kus => {
      this.borular.forEach(boru => {
        const solust = { x: boru.x, y: boru.y }
        const sagust = { x: boru.x + boru.genislik, y: boru.y }
        const solalt = { x: boru.x, y: boru.y + boru.yukseklik }
        if( kus.y <= 0 || kus.y >= YUKSEKLIK || (
          kus.x >= solust.x && kus.x <= sagust.x
          && kus.y >= solust.y && kus.y <= solalt.y)
        ) {
          kus.durum = true;
        }
      })
    })
  }

  yeniden_baslat(kuvvetlikus) {
    this.SKOR = 0;
    console.log(`generation: ${this.generation} | best: ${this.best > this.score ? this.score : this.best}`)
    this.best < this.score ? this.best = this.score : this.best = this.best
    this.score =0;
    this.generation += 1
    clearInterval(this.loop)
    const ctx = this.canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, GENISLIK, YUKSEKLIK);

    this.borular = this.boruUretici();
    this.kuslar = this.kusUretici(kuvvetlikus ? kuvvetlikus : null);
    this.olukuslar = []
    this.loop = setInterval(() => {this.dongu()}, 1000 / this.state.gamespeed);
  }

  ciz() {
    const ctx = this.canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, GENISLIK, YUKSEKLIK);

    this.borular.forEach(boru => boru.ciz())
    this.kuslar.forEach(kus => kus.ciz())
  }

  render() {
    return (
      <div className="App">
        <canvas ref={this.canvasRef} width={GENISLIK} height={YUKSEKLIK} id="mainCanvas" style={{ marginTop: "50px", border: "1px solid black"}}></canvas>
        <br></br>
        <input type="range" min="120" max="1000" value={this.state.gamespeed} onChange={e => this.setState({gamespeed: e.target.value}, this.yeniden_baslat())}></input>
      </div>
    );
  }
}

export default App;
