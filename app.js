'use strict';
const KEY='pokemon-quick-roster-v1';
const byId=new Map(POKEMON_MASTER.map(p=>[p.id,p]));
const $=id=>document.getElementById(id);
let state={version:1,members:[]};let selected=new Set();let drag=null;
const colors=['#f76fa7','#66b4f7','#8fe08a','#f4d45d','#aa83f8','#f9a96b','#72d9d2'];
const escapeHtml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message){$('toast').textContent=message;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',3500)}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('saveStatus').textContent='✓ 自動保存済み'}catch(e){$('saveStatus').textContent='保存失敗';toast('保存に失敗しました。JSONバックアップを取ってください')}}
function load(){try{let raw=localStorage.getItem(KEY);if(raw){let data=JSON.parse(raw);if(valid(data))state=data}}catch(e){toast('保存データを読み込めませんでした')}}
function valid(data){return data&&data.version===1&&Array.isArray(data.members)&&data.members.length<=500&&data.members.every(m=>typeof m.id==='string'&&typeof m.name==='string'&&m.name.length<=100&&/^#[0-9a-f]{6}$/i.test(m.color)&&Array.isArray(m.pokemon)&&m.pokemon.length<=2000&&m.pokemon.every(id=>byId.has(id)))}
function id(){return globalThis.crypto?.randomUUID?.()||'m'+Date.now().toString(36)+Math.random().toString(36).slice(2)}
function render(){const rows=$('rows');rows.replaceChildren();for(const member of state.members){const row=document.createElement('div');row.className='member-row';row.dataset.member=member.id;const meta=document.createElement('div');meta.className='member-meta';meta.innerHTML=`<div class="name-line"><input class="name-input" maxlength="100" aria-label="メンバー名" value="${escapeHtml(member.name)}" style="background:${member.color}"><input class="color-input" type="color" aria-label="背景色" value="${member.color}"></div><div class="member-actions"><button class="clear-row">全削除</button><button class="delete">行を削除</button></div>`;meta.querySelector('.name-input').addEventListener('input',e=>{member.name=e.target.value;save()});meta.querySelector('.color-input').addEventListener('input',e=>{member.color=e.target.value;meta.querySelector('.name-input').style.background=member.color;save()});meta.querySelector('.clear-row').onclick=()=>{if(member.pokemon.length&&confirm('このメンバーの配置画像をすべて削除しますか？')){member.pokemon=[];save();render()}};meta.querySelector('.delete').onclick=()=>{if(confirm('このメンバーを削除しますか？')){state.members=state.members.filter(m=>m!==member);save();render()}};const zone=document.createElement('div');zone.className='dropzone';zone.setAttribute('aria-label',member.name+'の使用ポケモン');zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('over')});zone.addEventListener('dragleave',e=>{if(!zone.contains(e.relatedTarget))zone.classList.remove('over')});zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('over');let d=drag;try{if(!d)d=JSON.parse(e.dataTransfer.getData('text/plain'))}catch{}if(!d||!byId.has(d.pokemonId))return;if(d.memberId){let source=state.members.find(m=>m.id===d.memberId);if(!source||source.pokemon[d.index]!==d.pokemonId)return;source.pokemon.splice(d.index,1)}member.pokemon.push(d.pokemonId);drag=null;save();render()});member.pokemon.forEach((pokeId,index)=>{const poke=byId.get(pokeId);const chip=document.createElement('div');chip.className='chip';chip.draggable=true;chip.title=poke.name+'（ドラッグで移動）';const img=document.createElement('img');img.src='images/'+poke.image;img.alt=poke.name;img.onerror=()=>img.classList.add('missing');const remove=document.createElement('button');remove.textContent='×';remove.title='配置を削除';remove.onclick=()=>{member.pokemon.splice(index,1);save();render()};chip.append(img,remove);chip.addEventListener('dragstart',e=>{drag={pokemonId:pokeId,memberId:member.id,index};e.dataTransfer.setData('text/plain',JSON.stringify(drag));e.dataTransfer.effectAllowed='move'});chip.addEventListener('dragend',()=>drag=null);zone.append(chip)});row.append(meta,zone);rows.append(row)}}
function renderCatalog(){const q=$('search').value.trim().toLocaleLowerCase('ja');const list=POKEMON_MASTER.filter(p=>p.name.toLocaleLowerCase('ja').includes(q));$('count').textContent=`（${list.length} / ${POKEMON_MASTER.length}種類）`;const root=$('catalog');root.replaceChildren();for(const poke of list){const el=document.createElement('button');el.className='poke';el.title=poke.name;el.draggable=true;el.innerHTML=`<img src="images/${poke.image}" alt="${escapeHtml(poke.name)}"><span>${escapeHtml(poke.name)}</span>`;el.querySelector('img').onerror=e=>e.target.classList.add('missing');el.addEventListener('dragstart',e=>{drag={pokemonId:poke.id};e.dataTransfer.setData('text/plain',JSON.stringify(drag));e.dataTransfer.effectAllowed='copy'});el.addEventListener('dragend',()=>drag=null);root.append(el)}}
function download(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
$('addMember').onclick=()=>{state.members.push({id:id(),name:'プレイヤー'+(state.members.length+1),color:colors[state.members.length%colors.length],pokemon:[]});save();render()};$('search').oninput=renderCatalog;
function loadImage(url){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=url})}
function wrapText(ctx,text,max){let lines=[''];for(const char of [...text]){let i=lines.length-1;if(ctx.measureText(lines[i]+char).width>max&&lines[i])lines.push(char);else lines[i]+=char}return lines}
$('exportPng').onclick=async()=>{if(!state.members.length)return toast('先にメンバーを追加してください');const scale=2,width=1250,left=240,margin=18,icon=65,gap=8,contentWidth=width-left-margin*2,perLine=Math.max(1,Math.floor((contentWidth+gap)/(icon+gap)));const lineHeight=icon+gap;const heights=state.members.map(m=>Math.max(94,Math.ceil(m.pokemon.length/perLine)*lineHeight+margin*2));const height=92+heights.reduce((a,b)=>a+b,0)+16;const canvas=document.createElement('canvas');canvas.width=width*scale;canvas.height=height*scale;const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle='#0c1220';ctx.fillRect(0,0,width,height);ctx.fillStyle='#1e2942';ctx.fillRect(0,0,width,92);ctx.fillStyle='#f4f6ff';ctx.font='bold 28px sans-serif';ctx.fillText('ポケモン使用一覧',24,39);ctx.font='16px sans-serif';ctx.fillStyle='#afbdd4';ctx.fillText('メンバー',24,76);ctx.fillText('使用ポケモン',left+18,76);const images=new Map();await Promise.all([...new Set(state.members.flatMap(m=>m.pokemon))].map(async pokeId=>{images.set(pokeId,await loadImage('images/'+byId.get(pokeId).image))}));let y=92;for(let i=0;i<state.members.length;i++){const m=state.members[i],h=heights[i];ctx.fillStyle=i%2?'#141e32':'#101a2b';ctx.fillRect(0,y,width,h);ctx.fillStyle='#35425e';ctx.fillRect(0,y,width,1);ctx.fillRect(left,y,1,h);ctx.fillStyle=m.color;ctx.fillRect(16,y+18,left-32,Math.min(52,h-36));ctx.fillStyle='#111725';ctx.font='bold 18px sans-serif';const nameLines=wrapText(ctx,m.name,left-50);ctx.fillText(nameLines[0]||' ',27,y+50);if(nameLines.length>1)ctx.fillText('…',left-48,y+50);m.pokemon.forEach((pid,j)=>{const x=left+margin+(j%perLine)*(icon+gap),iy=y+margin+Math.floor(j/perLine)*lineHeight,img=images.get(pid);ctx.fillStyle='#283550';ctx.fillRect(x,iy,icon,icon);if(img)ctx.drawImage(img,x,iy,icon,icon);else{ctx.fillStyle='#fff';ctx.font='11px sans-serif';ctx.fillText(byId.get(pid).name.slice(0,5),x+3,iy+35)}});y+=h}canvas.toBlob(blob=>{if(blob)showPngPreview(blob);else toast('PNG生成に失敗しました')},'image/png')};load();render();renderCatalog();


// PNG出力: 生成画像をプレビューし、保存またはクリップボードへコピーする。
let previewObjectUrl=null;
function showPngPreview(blob){
  let dialog=document.getElementById('pngPreviewDialog');
  if(!dialog){
    dialog=document.createElement('dialog');
    dialog.id='pngPreviewDialog';
    dialog.setAttribute('aria-label','PNG出力プレビュー');
    dialog.innerHTML=`<div class="png-preview-head"><strong>PNGプレビュー</strong><button type="button" id="pngPreviewClose" aria-label="閉じる">× 閉じる</button></div><div class="png-preview-image"><img id="pngPreviewImage" alt="出力するポケモン使用一覧"></div><div class="png-preview-actions"><button type="button" id="pngPreviewSave" class="primary">画像を保存</button><button type="button" id="pngPreviewCopy">クリップボードにコピー</button></div><p id="pngPreviewMessage" role="status" aria-live="polite"></p>`;
    document.body.append(dialog);
    dialog.querySelector('#pngPreviewClose').onclick=()=>dialog.close();
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
    dialog.addEventListener('close',()=>{if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=null}});
  }
  if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl=URL.createObjectURL(blob);
  dialog.querySelector('#pngPreviewImage').src=previewObjectUrl;
  const message=dialog.querySelector('#pngPreviewMessage');
  message.textContent='';
  dialog.querySelector('#pngPreviewSave').onclick=()=>download(blob,'pokemon-roster.png');
  dialog.querySelector('#pngPreviewCopy').onclick=async()=>{
    try{
      if(!navigator.clipboard?.write||typeof ClipboardItem==='undefined')throw new Error('このブラウザでは画像コピーを利用できません');
      await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
      message.textContent='クリップボードにコピーしました';
    }catch(error){
      message.textContent='コピーできませんでした。Live Server（localhost）で開き、ブラウザのクリップボード許可を確認してください。';
    }
  };
  if(!dialog.open)dialog.showModal();
}
