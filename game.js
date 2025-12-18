// --- ライブラリのセットアップ ---
const { useState, useEffect, useRef } = React;
const { BookOpen, Send, Share2, RefreshCw, Sparkles, Feather, User, Bot, Crown, HeartCrack, Gem, Flower, X } = Lucide;

// --- 設定 ---
const apiKey = "AIzaSyDTHwr1ijGcXLOSMxDERpotFgjFv56NXd0"; 

// 10ターンのビートシート
const BEAT_SHEET = [
  { turn: 1, theme: "断罪のファンファーレ", instruction: "舞踏会の最中、音楽が止まる。王子が婚約破棄を宣言する。衆人環視の恥辱。" },
  { turn: 2, theme: "泥棒猫の涙", instruction: "ライバルの男爵令嬢が「いじめられた」と嘘泣きをする。王子はそれを信じ切っている。" },
  { turn: 3, theme: "氷の視線", instruction: "昨日まで媚びてきた周囲の貴族たちが、一斉に掌を返し、嘲笑や軽蔑の目を向けてくる。" },
  { turn: 4, theme: "偽りの証拠", instruction: "身に覚えのない「証拠（手紙や宝石）」が提示される。弁明するか、笑い飛ばすか。" },
  { turn: 5, theme: "幕引きの一撃（クライマックス）", instruction: "会場を去る直前。王子たち、あるいは社交界全体へ、忘れられない「捨て台詞」や行動を叩きつける。" },
  { turn: 6, theme: "夜の馬車", instruction: "喧騒から遮断された馬車の中。張り詰めていた糸が切れる瞬間、あるいは静かな怒りの再燃。" },
  { turn: 7, theme: "家門の閉門", instruction: "実家にて。父（当主）は娘を守ろうとせず、体面を気にして勘当・追放を言い渡す。" },
  { turn: 8, theme: "最後の選択（重要アイテム）", instruction: "自室で荷造り。ドレスを脱ぎ、何を持っていくか。宝石（過去）、短剣（意思）、手紙（秘密）。" },
  { turn: 9, theme: "影の忠誠", instruction: "裏口から去ろうとする時、一人だけ付いて来ようとする者（侍女、庭師、護衛など）の描写。" },
  { turn: 10, theme: "夜明けの境界線", instruction: "領地を出る境界線。朝日が昇る。振り返らずに新しい世界（隣国、平民街、あるいは荒野）へ踏み出す。" }
];

const ARCHETYPES = [
  { id: "Arrogant_Queen", name: "傲慢（プライド）", desc: "「私が間違っているはずがない」", color: "text-rose-400", bg: "bg-rose-950/40", border: "border-rose-800", icon: React.createElement(Crown, { size: 24 }) },
  { id: "Ice_Schemer", name: "冷徹（クール）", desc: "「……全て、計算通りよ」", color: "text-blue-300", bg: "bg-slate-900/60", border: "border-blue-800", icon: React.createElement(Gem, { size: 24 }) },
  { id: "Tragic_Heroine", name: "悲劇（ヒロイン）", desc: "「どうして信じてくれないの…」", color: "text-purple-300", bg: "bg-purple-950/40", border: "border-purple-800", icon: React.createElement(HeartCrack, { size: 24 }) },
  { id: "Wild_Spirit", name: "歓喜（フリーダム）", desc: "「やっと自由になれるわ！」", color: "text-emerald-300", bg: "bg-emerald-950/40", border: "border-emerald-800", icon: React.createElement(Feather, { size: 24 }) }
];

// --- API Helper ---
async function callGeminiGM(history, archetype, currentTurn) {
  const currentBeat = BEAT_SHEET[currentTurn - 1];
  const systemPrompt = `あなたは「悪役令嬢の追放劇」を司るストーリーテラーです。世界観は「中世ヨーロッパ風の貴族社会」。文体は「優雅」かつ「毒」を含んだもので描写してください。必ずJSON形式で返答してください。{"narrative": "描写...", "suggested_actions": ["案1", "案2", "案3"]}`;
  const conversationText = history.map(h => `${h.role}: ${h.text}`).join("\n");
  const userPrompt = `${conversationText}\n\n(次のシーンを描写し、JSON形式で返してください)`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (error) {
    return { narrative: "通信エラーが発生しました。", suggested_actions: ["再試行する"] };
  }
}

async function analyzePersonality(history, archetype) {
  const logText = history.map(h => `[${h.role === 'user' ? 'プレイヤー' : '状況'}] ${h.text}`).join("\n");
  const systemPrompt = `悪役令嬢診断書をJSONで作ってください。{"rank": "...", "title": "...", "stats": {"pride":5, "intelligence":5, "madness":5, "charisma":5, "survival":5}, "comment": "..."}`;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: logText }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (e) { return null; }
}

const generateNovelPrompt = (history, archetype) => {
  const logText = history.map(h => `[${h.role === 'user' ? '令嬢' : '状況'}] ${h.text}`).join("\n");
  return `以下のログを元に小説を書いてください：\n${logText}`;
};

// --- Components ---
const IntroScreen = ({ initGame }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a0505] text-rose-50 p-6 font-serif text-center">
    <div className="space-y-4 mb-10">
      <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-amber-200">悪役令嬢の追放劇</h1>
      <p className="text-rose-100/70">今宵、あなたは断罪される。</p>
    </div>
    <div className="grid grid-cols-2 gap-4 max-w-2xl">
      {ARCHETYPES.map((arch) => (
        <button key={arch.id} onClick={() => initGame(arch)} className={`p-4 border ${arch.border} ${arch.bg} rounded-lg text-left hover:scale-105 transition-all`}>
          <div className="flex justify-between items-center mb-2">
            <span className={`font-bold ${arch.color}`}>{arch.name}</span>
            {arch.icon}
          </div>
          <p className="text-xs opacity-60">{arch.desc}</p>
        </button>
      ))}
    </div>
  </div>
);

const PlayScreen = ({ archetype, turn, history, isLoading, suggestions, inputText, setInputText, handleAction, scrollRef }) => (
  <div className="flex flex-col h-screen bg-[#0f0404] text-rose-50 font-serif">
    <div className="p-4 border-b border-rose-900/30 flex justify-between bg-[#1a0505]">
      <span className={archetype.color}>{archetype.name} - Turn {turn}/10</span>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
      {history.map((msg, idx) => (
        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] p-4 rounded-lg ${msg.role === 'user' ? 'bg-rose-900/40' : 'bg-[#1a0505]'}`}>
            {msg.text}
          </div>
        </div>
      ))}
      {isLoading && <div className="animate-pulse text-rose-400">物語を執筆中...</div>}
    </div>
    <div className="p-4 bg-[#120505] border-t border-rose-900/30">
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {suggestions.map((s, i) => (
          <button key={i} onClick={() => handleAction(s)} className="whitespace-nowrap px-3 py-1 bg-rose-950 border border-rose-800 rounded text-xs">
            {s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAction(inputText)} className="flex-1 bg-black p-3 rounded border border-rose-900" placeholder="行動を入力..." />
        <button onClick={() => handleAction(inputText)} className="bg-rose-800 px-6 rounded"><Send size={20}/></button>
      </div>
    </div>
  </div>
);

const ResultScreen = ({ history, archetype, resetGame }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  return (
    <div className="min-h-screen bg-[#0f0404] text-rose-100 p-6 flex flex-col items-center justify-center text-center">
      <h2 className="text-4xl font-bold mb-6">終幕</h2>
      <div className="max-w-xl w-full bg-[#150505] p-8 rounded-xl border border-rose-900/30">
        {analysis ? (
          <div className="space-y-4">
            <h3 className="text-2xl text-amber-200">{analysis.rank}</h3>
            <p className="italic">"{analysis.title}"</p>
            <p className="text-sm opacity-80">{analysis.comment}</p>
          </div>
        ) : (
          <button onClick={async () => { setLoading(true); const res = await analyzePersonality(history, archetype); setAnalysis(res); setLoading(false); }} className="bg-rose-800 px-8 py-3 rounded-full font-bold">
            {loading ? "分析中..." : "悪役令嬢 性格診断を受ける"}
          </button>
        )}
        <button onClick={resetGame} className="mt-8 text-rose-500 underline block w-full">別の運命を歩む</button>
      </div>
    </div>
  );
};

// --- Main App ---
function VillainessTRPG() {
  const [gameState, setGameState] = useState('intro');
  const [archetype, setArchetype] = useState(null);
  const [turn, setTurn] = useState(1);
  const [history, setHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  const initGame = async (arch) => {
    setArchetype(arch);
    setGameState('playing');
    setIsLoading(true);
    const res = await callGeminiGM([{ role: 'system', text: '舞踏会の開幕' }], arch, 1);
    setHistory([{ role: 'model', text: res.narrative }]);
    setSuggestions(res.suggested_actions);
    setIsLoading(false);
  };

  const handleAction = async (text) => {
    if (!text || isLoading) return;
    const newHistory = [...history, { role: 'user', text }];
    setHistory(newHistory);
    setInputText("");
    setIsLoading(true);
    if (turn >= 10) {
      setGameState('result');
    } else {
      const nextTurn = turn + 1;
      setTurn(nextTurn);
      const res = await callGeminiGM(newHistory, archetype, nextTurn);
      setHistory([...newHistory, { role: 'model', text: res.narrative }]);
      setSuggestions(res.suggested_actions);
    }
    setIsLoading(false);
  };

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [history]);

  return (
    <div>
      {gameState === 'intro' && <IntroScreen initGame={initGame} />}
      {gameState === 'playing' && <PlayScreen archetype={archetype} turn={turn} history={history} isLoading={isLoading} suggestions={suggestions} inputText={inputText} setInputText={setInputText} handleAction={handleAction} scrollRef={scrollRef} />}
      {gameState === 'result' && <ResultScreen history={history} archetype={archetype} resetGame={resetGame} />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(VillainessTRPG));
