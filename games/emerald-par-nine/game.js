import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas=document.getElementById('gl');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x0b1a2e);
scene.fog=new THREE.FogExp2(0x0b1a2e,0.0018);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,2000);
camera.position.set(0,30,60);
const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.minDistance=8;controls.maxDistance=200;controls.enabled=false;
scene.add(new THREE.HemisphereLight(0xbfefff,0x081018,1.1));
const sun=new THREE.DirectionalLight(0xfff2d8,1.3);sun.position.set(80,120,60);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);scene.add(sun);

const groundMat=new THREE.MeshStandardMaterial({color:0x2a5a3a,roughness:0.9});
const fairwayMat=new THREE.MeshStandardMaterial({color:0x3a8a55,roughness:0.85});
const greenMat=new THREE.MeshStandardMaterial({color:0x4db86f,roughness:0.6});
const sandMat=new THREE.MeshStandardMaterial({color:0xd2c08a,roughness:1});
const waterMat=new THREE.MeshStandardMaterial({color:0x1a5fb4,roughness:0.2,metalness:0.3,transparent:true,opacity:0.75});

const ball=new THREE.Mesh(new THREE.SphereGeometry(0.35,32,32),new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.3}));
ball.castShadow=true;scene.add(ball);
const ballTrail=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x7de3ff,transparent:true,opacity:0.4}));
scene.add(ballTrail);

let holes=[],currentHole=0,strokes=0,ballVel=new THREE.Vector3(),onGround=true,inHole=false;
let teePos,pinPos;
const hudHole=document.getElementById('hud-hole');
const hudPar=document.getElementById('hud-par');
const hudStrokes=document.getElementById('hud-strokes');
const hudDist=document.getElementById('hud-dist');

function createHole(i){
  const g=new THREE.Group();scene.add(g);
  const seed=i+1;const len=80+seed*8;const par=seed<=3?3:seed<=6?4:5;
  const terrain=new THREE.Mesh(new THREE.PlaneGeometry(200,200,128,128),groundMat);
  terrain.rotation.x=-Math.PI/2;terrain.receiveShadow=true;
  const pos=terrain.geometry.attributes.position;
  for(let k=0;k<pos.count;k++){const x=pos.getX(k);const z=pos.getZ(k);let y=Math.sin(x*0.02+seed)*0.5+Math.cos(z*0.03-seed)*0.5;const d=Math.abs(z-(len*0.5-seed*2));if(d<20)y+=1.5*Math.exp(-(d*d)/200);const dx=x-(len-10);const dz=z-(Math.sin(seed*1.3)*6);if(Math.sqrt(dx*dx+dz*dz)<12)y=0.3;pos.setY(k,y);}
  terrain.geometry.computeVertexNormals();g.add(terrain);
  const fair=new THREE.Mesh(new THREE.PlaneGeometry(30,len,1,1),fairwayMat);fair.rotation.x=-Math.PI/2;fair.position.set(len*0.5,0.01,0);g.add(fair);
  const green=new THREE.Mesh(new THREE.CircleGeometry(9,64),greenMat);green.rotation.x=-Math.PI/2;green.position.set(len-10,0.02,Math.sin(seed*1.3)*6);g.add(green);
  const pin=new THREE.Vector3(len-10,0.5,Math.sin(seed*1.3)*6);
  const hole=new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.6,0.8,32),new THREE.MeshStandardMaterial({color:0x0a0a0a}));hole.position.set(pin.x,0.4,pin.z);hole.rotation.x=Math.PI/2;g.add(hole);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,6,8),new THREE.MeshStandardMaterial({color:0xffffff}));pole.position.set(pin.x,3,pin.z);g.add(pole);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(2,1.5),new THREE.MeshStandardMaterial({color:0xff4d4d,side:THREE.DoubleSide}));flag.position.set(pin.x+0.01,4.5,pin.z);g.add(flag);
  const tee=new THREE.Mesh(new THREE.CylinderGeometry(0.8,0.8,0.1,32),new THREE.MeshStandardMaterial({color:0xffffff}));tee.position.set(0,0.05,0);tee.rotation.x=Math.PI/2;g.add(tee);
  const hazards=[];
  for(let k=0;k<2+(seed%3);k++){const hx=10+k*22+Math.sin(seed+k)*4;const hz=Math.random()*14-7;const s=new THREE.Mesh(new THREE.CircleGeometry(6+Math.random()*3,32),sandMat);s.rotation.x=-Math.PI/2;s.position.set(hx,0.01,hz);g.add(s);hazards.push({type:'sand',pos:new THREE.Vector3(hx,0,hz),r:6+Math.random()*3});}

function clearHole(i){const h=holes[i];if(h){scene.remove(h.group);}}
function loadHole(i){clearHole(i);const d=createHole(i);teePos=d.tee.clone();pinPos=d.pin.clone();ball.position.copy(teePos);ballVel.set(0,0,0);onGround=true;inHole=false;strokes=0;updateHUD();controls.target.copy(ball.position);camera.position.set(teePos.x,18,teePos.z+30);}
function updateHUD(){hudHole.textContent=`${currentHole+1} / 9`;hudPar.textContent=holes[currentHole]?holes[currentHole].par:'-';hudStrokes.textContent=strokes;hudDist.textContent=`${ball.position.distanceTo(pinPos).toFixed(1)} m`;}
const scoreGrid=document.getElementById('scoreGrid');for(let i=0;i<9;i++){const c=document.createElement('div');c.className='score-cell'+(i===currentHole?' active':'');c.textContent=i+1;scoreGrid.appendChild(c);}
const attract=document.getElementById('attract');const startBtn=document.getElementById('startBtn');let started=false;
function startGame(){if(started)return;started=true;attract.classList.add('hidden');controls.enabled=true;loadHole(0);requestAnimationFrame(loop);}
startBtn.addEventListener('click',startGame);addEventListener('keydown',e=>{if(e.code==='Enter'&&!started)startGame();});

let dragging=false,dragStart=new THREE.Vector2();const raycaster=new THREE.Raycaster();const mouse=new THREE.Vector2();const dragPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const crosshair=document.getElementById('crosshair');const powerRing=document.getElementById('powerRing');
renderer.domElement.addEventListener('pointerdown',e=>{if(!started||!onGround||inHole)return;dragging=true;dragStart.set(e.clientX,e.clientY);});
renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;const p=Math.min(Math.hypot(e.clientX-dragStart.x,e.clientY-dragStart.y)/4,120);powerRing.style.opacity=Math.min(p/120,1);powerRing.classList.add('show');crosshair.style.left=e.clientX+'px';crosshair.style.top=e.clientY+'px';crosshair.classList.add('show');});
renderer.domElement.addEventListener('pointerup',e=>{if(!dragging)return;dragging=false;crosshair.classList.remove('show');powerRing.classList.remove('show');
const dx=e.clientX-dragStart.x;const dy=e.clientY-dragStart.y;const power=Math.min(Math.hypot(dx,dy)/4,120);
mouse.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);raycaster.setFromCamera(mouse,camera);const target=new THREE.Vector3();raycaster.ray.intersectPlane(dragPlane,target);
const dir=new THREE.Vector3().subVectors(target,ball.position);dir.y=0;dir.normalize();ballVel.copy(dir.multiplyScalar(power*0.15));ballVel.y=Math.min(power*0.04,6);onGround=false;strokes++;updateHUD();});
document.getElementById('camBtn').addEventListener('click',()=>controls.enabled=!controls.enabled);
addEventListener('keydown',e=>{if(e.key==='r'||e.key==='R'){ball.position.copy(teePos);ballVel.set(0,0,0);onGround=true;inHole=false;}if(e.key==='n'||e.key==='N'){if(currentHole<8){currentHole++;loadHole(currentHole);}});
const clock=new THREE.Clock();const trail=[];function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),0.033);
if(!inHole&&!onGround){ballVel.y-=9.81*dt;ball.position.addScaledVector(ballVel,dt);if(ball.position.y<=0.35){ball.position.y=0.35;ballVel.y*=-0.35;if(Math.abs(ballVel.y)<0.3)ballVel.y=0;ballVel.x*=0.98;ballVel.z*=0.98;if(Math.hypot(ballVel.x,ballVel.z)<0.05){ballVel.set(0,0,0);onGround=true;}}}
const h=holes[currentHole];if(h){for(const hz of h.hazards){if(ball.position.distanceTo(hz.pos)<hz.r){if(hz.type==='sand')ballVel.multiplyScalar(0.92);if(hz.type==='water'){ball.position.copy(teePos);ballVel.set(0,0,0);onGround=true;}}}}
if(ball.position.distanceTo(pinPos)<0.7&&Math.abs(ball.position.y-0.35)<0.2&&ballVel.length()<0.4){inHole=true;ball.position.y=0.1;}
trail.push(ball.position.clone());if(trail.length>200)trail.shift();ballTrail.geometry.setFromPoints(trail);controls.update();updateHUD();renderer.render(scene,camera);
const desired=ball.position.clone().add(new THREE.Vector3(0,18,30));camera.position.lerp(desired,0.05);controls.target.lerp(ball.position,0.1);
}
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});

  const water=new THREE.Mesh(new THREE.CircleGeometry(10,64),waterMat);water.rotation.x=-Math.PI/2;water.position.set(len*0.4,0.01,10+Math.sin(seed)*2);g.add(water);hazards.push({type:'water',pos:new THREE.Vector3(len*0.4,0,10+Math.sin(seed)*2),r:10});
  for(let k=0;k<8;k++){const tx=5+k*9+Math.cos(seed+k)*2;const tz=Math.random()*20-10;const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.3,3,8),new THREE.MeshStandardMaterial({color:0x5b3a1a}));trunk.position.set(tx,1.5,tz);const fol=new THREE.Mesh(new THREE.ConeGeometry(1.5,4,8),new THREE.MeshStandardMaterial({color:0x2f5d2f}));fol.position.set(tx,4.2,tz);g.add(trunk);g.add(fol);}
  holes[i]={group:g,tee:new THREE.Vector3(0,0.5,0),pin,par,hazards};
  return {tee:new THREE.Vector3(0,0.5,0),pin,par};
}
