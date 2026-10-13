(function(){
const {
  activityVerbs, byZh, particles, particleNotes, extraWords, motionVerbs,
  patterns, sentences, words,
} = window.ShouyuData;

const punct = /[\s,。！？、,.!?「」『』（）()]/;
<<<<<<< HEAD
const extraByZh = Object.fromEntries(extraWords.map(w => [w.zh, w]));
const lexicon = [...new Set([
  ...words.map(w => w.zh), ...extraWords.map(w => w.zh), ...particles,
])].sort((a, b) => b.length - a.length);
=======
const lexicon = [...new Set([...words.map(w => w.zh), ...particles])]
  .sort((a, b) => b.length - a.length);
>>>>>>> 0592df9e37f7b757d003fe6572450324d0d0e3aa

function kindOf(text){
  if(particles.includes(text)) return "drop";
  return byZh[text]?.kind ?? extraByZh[text]?.kind ?? "unk";
}

function normalize(text){
  return text.replace(punct, "");
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
    const plain=names.filter(n=>!particleNotes[n]);
    if(plain.length) rules.push(`刪除沒有獨立手勢的虛字：${plain.join("、")}。`);
    for(const n of names) if(particleNotes[n]) rules.push(particleNotes[n]);
  }

  const kept=original.filter(t=>t.kind!=="drop").map(t=>({...t}));
  let omittedGo=false;
  if(kept.some(t=>activityVerbs.has(t.text))){
    for(const t of kept) if(t.text==="去"){ t.kind="drop"; t.dropped=true; omittedGo=true; }
    if(omittedGo) rules.push("活動動詞前面的「去」常常不單獨打。");
  }

  const live=kept.filter(t=>t.kind!=="drop");
  const please=live.filter(t=>t.text==="請");
  const motion=live.filter(t=>motionVerbs.has(t.text));
  const rest=live.filter(t=>!please.includes(t)&&!motion.includes(t));
  const time=rest.filter(t=>t.kind==="time");
  const person=rest.filter(t=>t.kind==="person");
  const place=rest.filter(t=>t.kind==="place");
  const things=rest.filter(t=>t.kind==="object"||t.kind==="unk");
  const question=rest.filter(t=>t.kind==="question");
  const action=rest.filter(t=>!["time","person","place","object","unk","question"].includes(t.kind));

  if(please.length) rules.push("「請」在辭典例句（請 再 說…）放句首。");
  if(time.length) rules.push(`時間／課表事件常放到句首：${time.map(t=>t.text).join("、")}。`);
  if(motion.length&&place.length) rules.push(`「${motion.map(t=>t.text).join("、")}」照辭典例句（下課 去 商店…）放在地點前面。`);
  if(place.length||things.length) rules.push("地點與物品通常在動詞前面。");
  if(live.some(t=>t.text==="不")) rules.push("「不」緊貼被否定的詞。它在動詞前或後，目前沒有辭典例句可佐證，請對照辭典影片或請教手語老師。");
  if(person.length>=2&&live.some(t=>t.text==="問")) rules.push("「問」可以把對象融進動作（辭典例句：他 問我），不一定要另外打對象。");
  if(question.length) rules.push(`疑問詞常放到句尾：${question.map(t=>t.text).join("、")}。（辭典也有放在中間的自問自答用法。）`);

  const gloss=[...please,...time,...person,...motion,...place,...things,...action,...question];
  if(droppedParticles.some(t=>t.text==="嗎") && question.length===0){
    gloss.push({text:"（疑問表情）",kind:"question"});
    rules.push("「嗎」改用疑問的表情與頭部動作，而不是一個獨立手勢。");
  }
  if(live.some(t=>t.kind==="unk")) rules.push("虛線詞彙尚未收進本課詞庫，可能需要指拼，或查辭典、請教手語老師。");
  if(!rules.length) rules.push("這句大致維持原序，不必大幅調動。");
  rules.push("以上是教學示意，不是逐句翻譯器；實際打法請以辭典影片和手語老師為準。");

  const dictionary=sentences.find(s=>normalize(s.translation)===normalize(input))??null;
  return {
    original: original.map(t => t.kind==="drop"||(omittedGo&&t.text==="去")?{...t,dropped:true}:t),
    gloss, rules, dictionary,
  };
}

window.ShouyuOrder = { arrange };
})();
