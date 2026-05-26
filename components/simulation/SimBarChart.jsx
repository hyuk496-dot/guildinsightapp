'use client';
import { useEffect, useRef } from "react";
export function SimBarChart({t,data}){
  const ref=useRef(null);
  useEffect(()=>{
    const cv=ref.current;if(!cv)return;
    const dpr=window.devicePixelRatio||1;
    const W=cv.offsetWidth,H=cv.offsetHeight;if(!W||!H)return;
    cv.width=W*dpr;cv.height=H*dpr;
    const ctx=cv.getContext("2d");ctx.scale(dpr,dpr);
    ctx.clearRect(0,0,W,H);
    const max=Math.max(...data.map(d=>Math.max(d.score,d.sim||d.score)))+200;
    const bw=Math.floor((W-48)/(data.length*2+1));
    const gap=bw;const top=18,bot=30,hh=H-top-bot;
    data.forEach((d,i)=>{
      const x=24+i*(bw*2+gap);
      const barH=Math.floor((d.score/max)*hh);
      ctx.fillStyle=d.ours?t.accent:`rgba(${t.radarRgb},0.28)`;
      if(typeof ctx.roundRect==="function") ctx.roundRect(x,top+hh-barH,bw,barH,3);
      else ctx.rect(x,top+hh-barH,bw,barH);
      ctx.fill();
      if(d.sim&&d.sim!==d.score){
        const sH=Math.floor((d.sim/max)*hh);
        ctx.fillStyle=d.ours?"rgba(76,255,145,0.7)":`rgba(${t.radarRgb},0.12)`;
        if(typeof ctx.roundRect==="function") ctx.roundRect(x+bw+1,top+hh-sH,bw,sH,3);
        else ctx.rect(x+bw+1,top+hh-sH,bw,sH);
        ctx.fill();
      }
      ctx.fillStyle=d.ours?t.accent:t.chartLabel;ctx.font=`8px 'Courier New'`;ctx.textAlign="center";
      ctx.fillText(d.name.slice(0,5),x+bw/2,H-6);
      ctx.fillStyle=t.text;ctx.font=`9px 'Courier New'`;
      ctx.fillText(d.score,x+bw/2,top+hh-barH-4);
    });
  },[t,data]);
  return <canvas ref={ref} style={{width:"100%",height:"100%",display:"block"}}/>;
}