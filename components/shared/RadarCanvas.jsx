'use client';
import { useEffect, useRef } from "react";
import { RADAR_LABELS } from "@/lib/constants";
export function RadarCanvas({t,vals,size=160}){
  const ref=useRef(null);
  useEffect(()=>{
    const cv=ref.current;if(!cv)return;
    const dpr=window.devicePixelRatio||1;
    cv.width=size*dpr;cv.height=size*dpr;
    const ctx=cv.getContext("2d");ctx.scale(dpr,dpr);
    const cx=size/2,cy=size/2,R=size*0.34,n=RADAR_LABELS.length,step=Math.PI*2/n;
    for(let ring=1;ring<=4;ring++){
      const rr=R*ring/4;ctx.beginPath();
      for(let i=0;i<n;i++){const a=step*i-Math.PI/2;const x=cx+rr*Math.cos(a),y=cy+rr*Math.sin(a);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
      ctx.closePath();ctx.strokeStyle=`rgba(${t.radarRgb},${0.07+ring*0.04})`;ctx.lineWidth=0.5;ctx.stroke();
    }
    for(let i=0;i<n;i++){const a=step*i-Math.PI/2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+R*Math.cos(a),cy+R*Math.sin(a));ctx.strokeStyle=t.border;ctx.lineWidth=0.5;ctx.stroke();}
    const hasData=vals&&vals.length===n&&vals.some(v=>v>0);
    if(hasData){
      const norm=vals.map(v=>v/100);
      ctx.beginPath();
      norm.forEach((v,i)=>{const a=step*i-Math.PI/2;const x=cx+R*v*Math.cos(a),y=cy+R*v*Math.sin(a);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
      ctx.closePath();ctx.fillStyle=t.accentFaint;ctx.fill();ctx.strokeStyle=t.accent;ctx.lineWidth=1.5;ctx.stroke();
      norm.forEach((v,i)=>{const a=step*i-Math.PI/2;const x=cx+R*v*Math.cos(a),y=cy+R*v*Math.sin(a);ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fillStyle=t.accent;ctx.fill();});
    }
    RADAR_LABELS.forEach((lbl,i)=>{
      const a=step*i-Math.PI/2;const x=cx+(R+17)*Math.cos(a),y=cy+(R+17)*Math.sin(a);
      ctx.fillStyle=t.accentDim;ctx.font=`8px 'Courier New'`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(lbl,x,y);
    });
  },[t,vals,size]);
  return <canvas ref={ref} width={size} height={size} style={{width:size,height:size}}/>;
}