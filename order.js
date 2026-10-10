(function(){
const {
  activityVerbs, byZh, particles, patterns, sentences, words,
} = window.ShouyuData;

function kindOf(text){
  if(particles.includes(text)) return "drop";
  return byZh[text]?.kind ?? "unk";
}

function normalize(text){
  return text.replace(/[\s,。！？、,.!?「」『』（）()]/g,"");
}

function tokenize(input){
  const source=input.trim();
  const tokens=[];
  let i=0, buf="";
  const flush=()=>{ if(buf){ tokens.push({text:buf,kind:"unk"}); buf=""; } };
  while(i<source.length){
    const ch=source[i]??"";
    if(punct.test(ch)){ flush(); i++; continue; }
    const hit=lexicon.find(w=>source.startsWith(w,i));
    if(hit){ flush(); tokens.push({text:hit,kind:kindOf(hit)}); i+=hit.length; }
    else { buf+=ch; i++; }
  }
  flush();
  return tokens;
}

function arrange(input){
  const original=tokenize(input);
  const rules=[];
  for(const p of patterns) if(input.includes(p.pattern)) rules.push(p.rule);
  const droppedParticles=original.filter(t=>t.kind==="drop");
  if(droppedParticles.length){
    const names=[...new Set(droppedParticles.map(t=>t.text))];
    rules.push(`刪除沒有獨立手勢的虛字：${names.join("、")}。`);
  }
  const kept=original.filter(t=>t.kind!=="drop").map(t=>({...t}));
  let omittedGo=false;
  if(kept.some(t=>activityVerbs.has(t.text))){
    for(const t of kept) if(t.text==="去"){ t.kind="drop"; t.dropped=true; omittedGo=true; }
    if(omittedGo) rules.push("活動動詞前面的「去」常常不單獨打。");
  }
  const live=kept.filter(t=>t.kind!=="drop");
  const time=live.filter(t=>t.kind==="time");
  const person=live.filter(t=>t.kind==="person");
  const place=live.filter(t=>t.kind==="place");
  const things=live.filter(t=>t.kind==="object"||t.kind==="unk");
  const question=live.filter(t=>t.kind==="question");
  const action=live.filter(t=>!["time","person","place","object","unk","question"].includes(t.kind));
  if(time.length) rules.push(`時間／課表事件放到句首：${time.map(t=>t.text).join("、")}。`);
  if(place.length||things.length) rules.push("地點與物品通常在動詞前面。");
  if(question.length) rules.push(`疑問詞放到句尾：${question.map(t=>t.text).join("、")}。`);
  const gloss=[...time,...person,...place,...things,...action,...question];
  if(droppedParticles.some(t=>t.text==="嗎") && question.length===0){
    gloss.push({text:"（疑問表情）",kind:"question"});
    rules.push("「嗎」改用疑問的表情與頭部動作，而不是一個獨立手勢。");
  }
  if(live.some(t=>t.kind==="unk")) rules.push("虛線詞彙尚未收進本課詞庫，可能需要指拼，或查辭典、請教手語老師。");
  if(!rules.length) rules.push("這句大致維持原序，不必大幅調動。");
  const dictionary=sentences.find(s=>normalize(s.translation)===normalize(input))??null;
  return {
    original: original.map(t => t.kind==="drop"||(omittedGo&&t.text==="去")?{...t,dropped:true}:t),
    gloss, rules, dictionary,
  };
}

window.ShouyuOrder = { arrange };
})();
