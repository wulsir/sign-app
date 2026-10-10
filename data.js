(function(){
const particles = ["的","了","著","過","嗎","呢","吧","啊"];
const words = [
  {zh:"今天",slug:"now",category:"時間",kind:"time",gloss:"today / now",note:"辭典將「今天」與「現在」收為同一支詞彙影片。"},
  {zh:"明天",slug:"tomorrow",category:"時間",kind:"time",gloss:"tomorrow"},
  {zh:"昨天",slug:"yesterday",category:"時間",kind:"time",gloss:"yesterday"},
  {zh:"現在",slug:"now",category:"時間",kind:"time",gloss:"now",note:"辭典將「今天」與「現在」收為同一支詞彙影片。"},
  {zh:"上午",slug:"morning",category:"時間",kind:"time",gloss:"morning"},
  {zh:"下午",slug:"afternoon",category:"時間",kind:"time",gloss:"afternoon"},
  {zh:"我",slug:"i",category:"人物",kind:"person",gloss:"I / me"},
  {zh:"你",slug:"you",category:"人物",kind:"person",gloss:"you"},
  {zh:"他",slug:"he",category:"人物",kind:"person",gloss:"he / she"},
  {zh:"老師",slug:"teacher",category:"人物",kind:"person",gloss:"teacher"},
  {zh:"同學",slug:"classmate",category:"人物",kind:"person",gloss:"classmate"},
  {zh:"去",slug:"go",category:"動作",kind:"action",gloss:"go"},
  {zh:"來",slug:"come",category:"動作",kind:"action",gloss:"come"},
  {zh:"看",slug:"look",category:"動作",kind:"action",gloss:"look / watch"},
  {zh:"吃",slug:"eat",category:"動作",kind:"action",gloss:"eat"},
  {zh:"喝",slug:"drink",category:"動作",kind:"action",gloss:"drink"},
  {zh:"寫",slug:"write",category:"動作",kind:"action",gloss:"write"},
  {zh:"讀",slug:"study",category:"動作",kind:"action",gloss:"read / study"},
  {zh:"學",slug:"imitate",category:"動作",kind:"action",gloss:"learn"},
  {zh:"問",slug:"ask",category:"動作",kind:"action",gloss:"ask"},
  {zh:"說",slug:"speak",category:"動作",kind:"action",gloss:"speak"},
  {zh:"懂",slug:"know",category:"動作",kind:"action",gloss:"understand"},
  {zh:"幫忙",slug:"help",category:"動作",kind:"action",gloss:"help"},
  {zh:"上課",slug:"attend_class",category:"動作",kind:"time",gloss:"class begins",note:"課表事件常當時間框架，放在句前段。"},
  {zh:"下課",slug:"dismiss_class",category:"動作",kind:"time",gloss:"class dismissed",note:"課表事件常當時間框架，放在句前段。"},
  {zh:"考試",slug:"test",category:"動作",kind:"action",gloss:"exam"},
  {zh:"交",slug:"supply",category:"動作",kind:"action",gloss:"hand in"},
  {zh:"學校",slug:"school",category:"地點",kind:"place",gloss:"school"},
  {zh:"教室",slug:"classroom",category:"地點",kind:"place",gloss:"classroom"},
  {zh:"書",slug:"book",category:"物品",kind:"object",gloss:"book"},
  {zh:"作業",slug:"homework",category:"物品",kind:"object",gloss:"homework"},
  {zh:"水",slug:"water",category:"物品",kind:"object",gloss:"water"},
  {zh:"飯",slug:"rice",category:"物品",kind:"object",gloss:"rice / meal"},
  {zh:"喜歡",slug:"like",category:"其他",kind:"other",gloss:"like"},
  {zh:"不",slug:"not",category:"其他",kind:"other",gloss:"not"},
  {zh:"好",slug:"good",category:"其他",kind:"other",gloss:"good"},
  {zh:"謝謝",slug:"thank",category:"其他",kind:"other",gloss:"thank you"},
  {zh:"對不起",slug:"sorry",category:"其他",kind:"other",gloss:"sorry"},
  {zh:"再見",slug:"goodbye",category:"其他",kind:"other",gloss:"goodbye"},
  {zh:"請",slug:"please",category:"其他",kind:"other",gloss:"please"},
  {zh:"什麼",slug:"what",category:"疑問",kind:"question",gloss:"what"},
  {zh:"誰",slug:"who",category:"疑問",kind:"question",gloss:"who"},
  {zh:"哪裡",slug:"where",category:"疑問",kind:"question",gloss:"where"},
  {zh:"為什麼",slug:"why",category:"疑問",kind:"question",gloss:"why"},
  {zh:"怎麼",slug:"how",category:"疑問",kind:"question",gloss:"how"},
  {zh:"幾",slug:"how_many",category:"疑問",kind:"question",gloss:"how many"},
];
const categories = ["時間","人物","動作","地點","物品","其他","疑問"];
const sentences = [
  {id:"now",words:["今天","現在"],gloss:["今天","星期幾"],translation:"今天是星期幾呢?",slug:"now"},
  {id:"now_2",words:["今天","現在"],gloss:["現在","幾時"],translation:"現在是幾點呢?",slug:"now_2"},
  {id:"tomorrow",words:["明天"],gloss:["明天","市長","要來"],translation:"明天市長要來",slug:"tomorrow"},
  {id:"yesterday",words:["昨天"],gloss:["我","昨天","電影","欣賞"],translation:"我昨天去看電影",slug:"yesterday"},
  {id:"eat",words:["吃"],gloss:["他","水餃","吃","好"],translation:"他包的餃子很好吃",slug:"eat"},
  {id:"drink",words:["喝"],gloss:["汽水","我","想","喝","你","幫我","去","買","好"],translation:"我想喝汽水，請你幫我去買好嗎",slug:"drink"},
  {id:"write",words:["寫"],gloss:["弟弟","寫","紀錄","張","紀錄","寫"],translation:"弟弟寫了一份備忘錄",slug:"write"},
  {id:"ask",words:["問"],gloss:["數學","題","他","問我"],translation:"他問了我一道數學題目",slug:"ask"},
  {id:"speak",words:["說"],gloss:["我","說","種類","三","會"],translation:"我會說三種語言",slug:"speak"},
  {id:"speak_2",words:["說"],gloss:["你","說話","聲音","說話","聲音","小"],translation:"你講話聲音太小了",slug:"speak_2"},
  {id:"dismiss_class",words:["下課"],gloss:["下課","去","買賣","地方","飲料","買"],translation:"下課去商店買飲料",slug:"dismiss_class"},
  {id:"school",words:["學校"],gloss:["學校","我","家","很遠"],translation:"從我家到學校很遠",slug:"school"},
  {id:"school_2",words:["學校"],gloss:["這","學校","建設","剛剛","建設"],translation:"這間學校剛蓋好",slug:"school_2"},
  {id:"rice",words:["飯"],gloss:["台灣","吃","大部分","什麼","米"],translation:"米是台灣的主食",slug:"rice"},
  {id:"sorry",words:["對不起"],gloss:["他","媽媽","我","向","媽媽","對不起"],translation:"他向媽媽說對不起",slug:"sorry"},
  {id:"please",words:["請"],gloss:["請","再","說","請","再","說","再","一"],translation:"請再說一次",slug:"please"},
  {id:"who",words:["誰"],gloss:["那","人","他","誰"],translation:"那個人是誰?",slug:"who"},
];
const prompts = ["明天我去學校","你吃飯了嗎","老師問你什麼","今天下午考試","我不懂作業","昨天我看電影","下課去教室","請你幫忙","昨天下午我去學校","我不喜歡考試"];
const featuredIds = ["yesterday","please","who","dismiss_class","eat","drink"];
const lessons = [
  {id:"time",kicker:"第一課",title:"時間在前面",body:"台灣手語常把時間框架放在句子前段，讓聽者先知道「什麼時候」。這不是絕對規則，辭典例句裡時間詞也可能跟在主詞後面。",words:["今天","明天","昨天","現在","上午","下午"],sentence:"今天下午考試"},
  {id:"people",kicker:"第二課",title:"誰在場",body:"人物指稱清楚：我、你、他，以及學校裡的老師與同學。手語裡角色可用空間定位，不必重複代詞。",words:["我","你","他","老師","同學"],sentence:"老師問你什麼"},
  {id:"ov",kicker:"第三課",title:"東西先，動作後",body:"中文常說「吃飯、看電影」；手語更常是物品在前、動詞在後，例如「飯 → 吃」「電影 → 看」。方向動詞「去」在活動動詞前有時不單獨打。",words:["吃","喝","看","寫","讀","飯","水","書","作業"],sentence:"你吃飯了嗎"},
  {id:"school",kicker:"第四課",title:"學校的一天",body:"地點常出現在人物之後、動詞之前。上課、下課像時間框架，常放句首，再接去哪裡、做什麼。",words:["學校","教室","上課","下課","考試","交","去","來"],sentence:"明天我去學校"},
  {id:"ask",kicker:"第五課",title:"把疑問留到最後",body:"疑問詞（什麼、誰、哪裡、為什麼、怎麼、幾）多半落在句尾。中文的「嗎」通常改用疑問表情與頭部動作，而不是一個獨立手勢。",words:["什麼","誰","哪裡","為什麼","怎麼","幾"],sentence:"老師問你什麼"},
  {id:"courtesy",kicker:"第六課",title:"禮貌與態度",body:"謝謝、對不起、請、再見、喜歡、好、不。否定「不」通常緊貼它所修飾的動詞。",words:["謝謝","對不起","請","再見","喜歡","好","不","懂","幫忙"],sentence:"請你幫忙"},
  {id:"negation",kicker:"第七課",title:"否定怎麼排",body:"「不」通常緊貼所修飾的動詞或形容詞，例如「懂 → 不」「喜歡 → 不」。整句仍可依時間、人物、物品的順序排。",words:["不","懂","喜歡","好","我","你","作業"],sentence:"我不懂作業"},
  {id:"combo",kicker:"第八課",title:"把軸串成完整句",body:"把前六課串起來：時間 → 人物 → 地點／物品 → 動作 → 疑問。這句「昨天下午我去學校」可練習時間與地點同時出現時的順序。",words:["昨天","下午","我","去","學校","看","書"],sentence:"昨天下午我去學校"},
  {id:"dict",kicker:"第九課",title:"對照辭典原句",body:"教學語序是示意；辭典例句可能把時間放在主詞後面，或用不同動詞。這一課用「昨天我看電影」對照辭典打法（辭典常用「欣賞」），練習接受真實語料的彈性。",words:["我","昨天","看","去"],sentence:"昨天我看電影"},
];
const songs = [
  {
    id: "wish",
    title: "願所有美好都如期而至",
    channel: "手語好好玩 Have fun in TSL",
    youtube: "https://www.youtube.com/watch?v=ZaTyHFcoYXw",
  },
  {
    id: "tomorrow",
    title: "明天會更好",
    channel: "手語好好玩 Have fun in TSL",
    youtube: "https://www.youtube.com/watch?v=0am18YKfoGE",
  },
  {
    id: "hand-in-hand",
    title: "手牽手",
    channel: "手語好好玩 Have fun in TSL",
    youtube: "https://www.youtube.com/watch?v=EaOFciYBMv8",
  },
  {
    id: "little-hand",
    title: "小手拉大手",
    channel: "手語好好玩 Have fun in TSL",
    youtube: "https://www.youtube.com/watch?v=G-bNQ1KPHrs",
  },
  {
    id: "photo",
    title: "用一張照片定格住時間",
    channel: "手語好好玩 Have fun in TSL",
    youtube: "https://www.youtube.com/watch?v=xJ6X_WCPY4g",
  },
  {
    id: "wings",
    title: "隱形的翅膀",
    channel: "手語好好玩 Have fun in TSL",
    youtube: "https://www.youtube.com/watch?v=M8egtX3EYJY",
  },
  {
    id: "thank-you",
    title: "聽我說謝謝你",
    channel: "SignTube",
    youtube: "https://www.youtube.com/watch?v=L4uyLh45434",
  },
  {
    id: "pass-love",
    title: "讓愛傳出去",
    channel: "大愛電視 Tzu Chi DaAiVideo",
    youtube: "https://www.youtube.com/watch?v=trD1zRrwQJA",
  },
];
const song = songs[0];
const dictionaryUrl = "https://twtsl.ccu.edu.tw/";
const dictionaryName = "台灣手語線上辭典（國立中正大學）";
const activityVerbs = new Set(["看","吃","喝","寫","讀","學","考試"]);
const patterns = [
  {pattern:"看電影",rule:"「看電影」改成物品在前：電影 → 看。辭典例句甚至用「欣賞」。"},
  {pattern:"吃飯",rule:"「吃飯」改成物品在前：飯 → 吃。"},
  {pattern:"喝水",rule:"「喝水」改成物品在前：水 → 喝。"},
  {pattern:"寫作業",rule:"「寫作業」改成物品在前：作業 → 寫。"},
  {pattern:"讀書",rule:"「讀書」改成物品在前：書 → 讀。"},
  {pattern:"去學校",rule:"地點常出現在動詞前：學校 → 去。"},
  {pattern:"去教室",rule:"地點常出現在動詞前：教室 → 去。"},
];
const byZh = Object.fromEntries(words.map(w => [w.zh, w]));
function wordVideo(zh){ const w=byZh[zh]; return w?`./videos/words/${w.slug}.mp4`:null; }
function wordPoster(zh){ const w=byZh[zh]; return w?`./videos/posters/${w.slug}.jpg`:null; }
function sentenceVideo(slug){ return `./videos/sentences/${slug}.mp4`; }
function sentencePoster(slug){ return `./videos/posters/s-${slug}.jpg`; }
function sentencesFor(zh){ return sentences.filter(s => s.words.includes(zh)); }
function wordOfDay(now=Date.now()){ return words[Math.floor(now/86400000)%words.length]; }
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function choiceOptions(answer, pool, count=3){
  const slug=byZh[answer]?.slug;
  const blocked = zh => zh===answer || (slug && byZh[zh]?.slug===slug);
  const unique=[...new Set(pool)].filter(zh=>!blocked(zh));
  return shuffle([answer, ...shuffle(unique).slice(0,count)]);
}

window.ShouyuData = {
  particles, words, categories, sentences, prompts, featuredIds, lessons, song, songs,
  dictionaryUrl, dictionaryName, activityVerbs, patterns, byZh,
  wordVideo, wordPoster, sentenceVideo, sentencePoster, sentencesFor, wordOfDay,
  shuffle, choiceOptions,
};
})();
