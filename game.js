import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Send, Share2, RefreshCw, Sparkles, Feather, User, Bot, Crown, HeartCrack, Gem, Flower, X } from 'lucide-react';

// --- 設定 ---
const apiKey = "AIzaSyDTHwr1ijGcXLOSMxDERpotFgjFv56NXd0" ;

// 10ターンのビートシート（悪役令嬢編）
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

// アーキタイプ
const ARCHETYPES = [
  { 
    id: "Arrogant_Queen", 
    name: "傲慢（プライド）", 
    desc: "「私が間違っているはずがない」", 
    color: "text-rose-400", 
    bg: "bg-rose-950/40", 
    border: "border-rose-800",
    icon: <Crown size={24} />
  },
  { 
    id: "Ice_Schemer", 
    name: "冷徹（クール）", 
    desc: "「……全て、計算通りよ」", 
    color: "text-blue-300", 
    bg: "bg-slate-900/60", 
    border: "border-blue-800",
    icon: <Gem size={24} />
  },
  { 
    id: "Tragic_Heroine", 
    name: "悲劇（ヒロイン）", 
    desc: "「どうして信じてくれないの…」", 
    color: "text-purple-300", 
    bg: "bg-purple-950/40", 
    border: "border-purple-800",
    icon: <HeartCrack size={24} />
  },
  { 
    id: "Wild_Spirit", 
    name: "歓喜（フリーダム）", 
    desc: "「やっと自由になれるわ！」", 
    color: "text-emerald-300", 
    bg: "bg-emerald-950/40", 
    border: "border-emerald-800",
    icon: <Feather size={24} />
  }
];

// --- AI API Helper (Storyteller) ---
async function callGeminiGM(history, archetype, currentTurn) {
  const currentBeat = BEAT_SHEET[currentTurn - 1];
  
  const systemPrompt = `
あなたは「悪役令嬢の追放劇」を司るストーリーテラーです。
世界観は「中世ヨーロッパ風の貴族社会」。
文体は「優雅」かつ「毒」を含んだもので、舞踏会の華やかさと、その裏にある人間の醜さを対比させて描写してください。

現在のターン: ${currentTurn} / 10
現在のテーマ: ${currentBeat.theme}
進行指示: ${currentBeat.instruction}

プレイヤーの性格: ${archetype.name} (${archetype.desc})

# ルール
1. 描写は200〜300文字程度。情景（ドレス、音楽、香水）と感情を交えてください。
2. ストーリーテラーは、少し皮肉屋の「観測者」のような視点で語ってください。
3. 最後に、プレイヤーが取れそうな行動の選択肢を3つ提案してください。
4. 必ずJSON形式で返答してください。

# JSON Response Format
{
  "narrative": "ストーリーテラーの描写テキスト...",
  "suggested_actions": ["行動案1", "行動案2", "行動案3"]
}
`;

  const conversationText = history.map(h => `${h.role}: ${h.text}`).join("\n");
  const userPrompt = `${conversationText}\n\n(次のシーンを描写し、JSON形式で返してください)`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error("API Error:", error);
    return {
      narrative: "……インクが滲んで読めない。（通信エラーが発生しました。再試行してください）",
      suggested_actions: ["再試行する"]
    };
  }
}

// --- AI API Helper (Personality Analysis) ---
async function analyzePersonality(history, archetype) {
  const logText = history.map(h => `[${h.role === 'user' ? 'プレイヤー' : '状況'}] ${h.text}`).join("\n");

  const systemPrompt = `
あなたは辛口かつ優雅な「悪役令嬢評論家」です。
プレイヤーのゲームプレイログを分析し、その「悪役令嬢としての素質」を診断してください。

# 分析のポイント
- 選択肢だけでなく、自由入力（User発言）の内容を重視すること。
- 感情的か理性的か、攻撃的か守備的か、高潔か卑劣か。

# 出力ルール
必ず以下のJSON形式で出力してください。

{
  "rank": "S級：国傾けの魔女 / A級：社交界の女王 / B級：計算高い悪女 / C級：ただのワガママ娘 / 圏外：聖女（皮肉） ...など、ユニークなランク付け",
  "title": "プレイヤーを表す二つ名（例：『慈悲なき氷の微笑』）",
  "stats": {
    "pride": 1-5の整数（高慢さ）,
    "intelligence": 1-5の整数（知略）,
    "madness": 1-5の整数（狂気）,
    "charisma": 1-5の整数（カリスマ）,
    "survival": 1-5の整数（生存力）
  },
  "comment": "総評コメント（200文字程度）。ユーモアと毒を含め、プレイヤーの行動を具体的に引用して褒める、または貶してください。"
}
`;

  const userPrompt = `
プレイヤーの性格設定: ${archetype.name}
プレイログ:
${logText}

このプレイヤーの悪役令嬢診断書を作成せよ。
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error("Analysis Error:", error);
    return null;
  }
}

// --- プロンプト生成 ---
const generateNovelPrompt = (history, archetype) => {
  const logText = history.map(h => `[${h.role === 'user' ? '令嬢の行動' : '状況描写'}] ${h.text}`).join("\n");
  
  return `# Role
あなたは「悪役令嬢もの」「婚約破棄もの」で絶大な人気を誇るライトノベル作家です。
以下のプレイログを元に、**文字数3,000〜4,000文字**のドラマチックな短編小説を執筆してください。

# プレイログ (Villainess History)
${logText}

# 執筆ガイドライン (重要)

## 1. 文字数と密度の確保
本文は必ず3000文字以上とする。
3000文字未満で物語を完結させることは禁止。
文字数が3000文字に達するまでは、結末を書いてはならない。
- ログは「あらすじ」に過ぎません。これを小説化する際は、一瞬の出来事を「スローモーション」のように引き伸ばして描写してください。
- 1ターンの出来事に対し、その5倍の分量の「心理描写」と「情景描写」を肉付けしてください。

## 2. 徹底的な五感と装飾の描写
- **視覚**: シャンデリアの煌めき、ドレスの裾の動き、王子の軽蔑した瞳の色。
- **聴覚**: 止まった音楽、絹擦れの音、ヒールの足音、心無い囁き声。
- **嗅覚**: むせ返るような香水の匂い、冷たい夜気の匂い。
- **触覚**: 握りしめた扇の硬さ、頬を打つ冷たい風、指先の震え。
これらを執拗に描写し、貴族社会の「美しさ」と「残酷さ」を表現してください。

## 3. 余白の補完（ログにない描写の追加）
- ログとログの間にある「沈黙の時間」や「移動中の回想」を創作して埋めてください。
- 「かつて王子と交わした約束」や「幼い頃の記憶」をフラッシュバックとして挿入し、現在の断罪との落差（エモさ）を強調してください。

## 4. 文体
- 主人公の性格（${archetype.name}）に基づいた、没入感のある一人称視点。
- 自由入力（Turn 5など）でプレイヤーが放った言葉は、物語最大の**「決め台詞」**として劇的に演出してください。

# 出力形式
- タイトル（Web小説風のキャッチーなもの）
- キャッチコピー（3行）
- 本文（マークダウン形式）
`;
};

// --- Sub Components ---

const IntroScreen = ({ initGame }) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a0505] text-rose-50 p-6 font-serif relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
      <div className="absolute top-10 left-10 w-64 h-64 bg-rose-900 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-purple-900 rounded-full blur-[100px]"></div>
    </div>

    <div className="max-w-4xl w-full text-center space-y-10 animate-fade-in relative z-10">
      <div className="space-y-4">
        <Crown size={56} className="mx-auto text-amber-500/80 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
        <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-200 to-amber-200 pb-2">
          悪役令嬢の追放劇
        </h1>
        <div className="flex items-center justify-center gap-4 text-rose-300/60 text-sm tracking-[0.2em]">
          <span className="h-[1px] w-12 bg-rose-800"></span>
          <span>THE VILLAINESS CHRONICLE</span>
          <span className="h-[1px] w-12 bg-rose-800"></span>
        </div>
      </div>

      <p className="text-rose-100/70 text-lg leading-relaxed font-light">
        今宵、あなたは断罪される。<br/>
        その時、涙を流すか、高らかに笑うか。
      </p>

      <div className="grid grid-cols-2 gap-4 md:gap-6 mt-12 text-left px-2 md:px-4">
        {ARCHETYPES.map((arch) => (
          <button
            key={arch.id}
            onClick={() => initGame(arch)}
            // 修正箇所: flex-col, h-full, justify-between/min-h を削除し、gap-4 で要素間隔を自然に詰める
            className={`group relative p-4 md:p-6 border transition-all duration-300 hover:scale-[1.02] ${arch.border} ${arch.bg} hover:bg-opacity-60 overflow-hidden flex flex-col gap-3 h-full text-left`}
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-full">
              <div className="flex items-start justify-between">
                <h3 className={`text-lg md:text-xl font-bold ${arch.color} tracking-wide`}>{arch.name}</h3>
                <span className={`opacity-50 group-hover:opacity-100 transition-opacity ${arch.color}`}>{arch.icon}</span>
              </div>
            </div>
            <p className="text-xs md:text-sm text-rose-100/60 font-light italic border-t border-white/5 pt-3 w-full">
              {arch.desc}
            </p>
          </button>
        ))}
      </div>
    </div>
  </div>
);

const PlayScreen = ({ 
  archetype, 
  turn, 
  history, 
  isLoading, 
  suggestions, 
  inputText, 
  setInputText, 
  handleAction, 
  scrollRef 
}) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleAction(inputText);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0f0404] text-rose-50 font-serif bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2a0a0a] to-[#0f0404]">
      <div className="bg-[#1a0505]/80 p-4 border-b border-rose-900/30 flex justify-between items-center z-10 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3">
          <span className={`p-2 rounded-full bg-black/30 border border-white/10 ${archetype.color}`}>
            {archetype.icon}
          </span>
          <div>
            <span className={`font-bold block text-sm ${archetype.color}`}>{archetype.name}</span>
            <span className="text-[10px] text-rose-400/50 tracking-wider">ROLE PLAYING</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-xs text-rose-500/70 tracking-widest mb-1">CHAPTER</div>
          <div className="flex gap-1">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 h-6 rounded-sm transition-all duration-500 ${
                  i < turn ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "bg-rose-900/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth" ref={scrollRef}>
        {history.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className={`max-w-[90%] md:max-w-[75%] relative group ${
              msg.role === 'user' ? 'ml-12' : 'mr-12'
            }`}>
              <div className={`absolute -bottom-2 ${msg.role === 'user' ? '-right-4' : '-left-4'} p-1 rounded-full bg-[#0f0404] border border-rose-900/30 text-rose-500/50`}>
                {msg.role === 'user' ? <User size={12} /> : <Feather size={12} />}
              </div>

              <div className={`p-6 leading-loose whitespace-pre-wrap text-base shadow-2xl backdrop-blur-sm border ${
                msg.role === 'user' 
                  ? 'bg-rose-950/30 border-rose-800/30 rounded-2xl rounded-tr-none text-rose-100' 
                  : 'bg-[#150505]/80 border-amber-900/20 rounded-2xl rounded-tl-none text-rose-200/90'
              }`}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-3 text-rose-400/50 text-sm tracking-widest animate-pulse">
              <Feather size={14} className="animate-bounce" />
              <span>物語を執筆中...</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#120505] p-6 border-t border-rose-900/20 space-y-5 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        {!isLoading && (
          <div className="flex flex-wrap gap-3 justify-center">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => handleAction(sug)}
                className="px-5 py-2.5 bg-[#1a0808] border border-rose-900/30 hover:border-amber-500/50 hover:bg-rose-900/20 text-rose-200/70 hover:text-amber-200 transition-all text-sm rounded-lg"
              >
                {sug}
              </button>
            ))}
          </div>
        )}

        <div className="max-w-4xl mx-auto flex gap-3 relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="次の行動、あるいは言葉を..."
            disabled={isLoading}
            className="flex-1 bg-[#1a0a0a] border border-rose-900/40 rounded-xl px-6 py-4 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-900/40 text-white placeholder-rose-200/30 disabled:opacity-50 transition-all shadow-inner font-medium"
          />
          <button
            onClick={() => handleAction(inputText)}
            disabled={!inputText.trim() || isLoading}
            className="px-8 bg-gradient-to-r from-rose-900 to-rose-800 hover:from-rose-800 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-rose-100 rounded-xl flex items-center gap-2 font-bold transition-all shadow-lg border border-rose-700/50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// 日本語訳用のマップ
const STAT_TRANSLATIONS = {
  pride: "プライド",
  intelligence: "知性",
  madness: "狂気",
  charisma: "カリスマ",
  survival: "生存力"
};

const ResultScreen = ({ history, archetype, copied, copyToClipboard, resetGame }) => {
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const startAnalysis = async () => {
    setAnalyzing(true);
    setShowAnalysis(true);
    const result = await analyzePersonality(history, archetype);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const AnalysisModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="max-w-2xl w-full bg-[#1a0505] border border-rose-800 rounded-lg shadow-[0_0_50px_rgba(225,29,72,0.3)] overflow-hidden relative flex flex-col max-h-[90vh]">
        <button 
          onClick={() => setShowAnalysis(false)} 
          className="absolute top-4 right-4 text-rose-400 hover:text-rose-200"
        >
          <X size={24} />
        </button>

        {analyzing ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <Sparkles size={48} className="text-amber-500 animate-spin-slow" />
            <p className="text-rose-200 text-lg tracking-widest animate-pulse">
              あなたの本性を暴いています...
            </p>
          </div>
        ) : analysis ? (
          <div className="p-8 overflow-y-auto">
            <div className="text-center mb-8">
              <span className="text-xs text-rose-500 tracking-[0.3em] uppercase block mb-2">Villainess Rank</span>
              <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-rose-200 to-amber-200 pb-2">
                {analysis.rank}
              </h2>
              <div className="w-16 h-1 bg-rose-800 mx-auto my-4"></div>
              <p className="text-xl text-rose-100 font-serif italic">"{analysis.title}"</p>
            </div>

            {/* 修正箇所: 1カラムに変更 */}
            <div className="grid grid-cols-1 gap-8 mb-8">
              <div className="space-y-4">
                {Object.entries(analysis.stats).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-4">
                    <span className="w-24 text-xs text-rose-300 uppercase opacity-70">
                      {STAT_TRANSLATIONS[key] || key}
                    </span>
                    <div className="flex-1 h-2 bg-black/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-rose-900 to-rose-500 transition-all duration-1000"
                        style={{ width: `${(val / 5) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-rose-200 font-bold">{val}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-[#0f0404] p-6 rounded-lg border border-rose-900/30">
                <h4 className="text-sm text-rose-400 uppercase tracking-widest mb-4">批評</h4>
                <p className="text-rose-100/80 leading-relaxed text-sm font-light">
                  {analysis.comment}
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-xs text-rose-500/50">※この診断はAIによる独断と偏見です</p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-rose-300">
            診断に失敗しました。もう一度お試しください。
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f0404] text-rose-100 flex flex-col items-center justify-center p-6 font-serif">
      <div className="max-w-3xl w-full space-y-12 animate-fade-in text-center relative z-10">
        <div className="space-y-6">
          <div className="inline-block p-4 rounded-full bg-rose-950/30 border border-rose-900/50 mb-4">
            <BookOpen size={40} className="text-amber-500/80" />
          </div>
          <h2 className="text-4xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-amber-200 to-rose-200">
            終幕
          </h2>
          <p className="text-rose-300/60 text-lg font-light">
            断罪の夜は明け、あなたの物語は歴史となった。<br/>
            この記録を持ち帰り、書物に記そう。
          </p>
        </div>

        <div className="bg-[#150505] border border-rose-900/30 rounded-xl p-8 shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-rose-900/30 rounded-tl-xl"></div>
          <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-rose-900/30 rounded-br-xl"></div>

          <div className="h-72 overflow-y-auto bg-black/40 p-6 rounded-lg text-sm font-light text-rose-200/70 whitespace-pre-wrap border border-rose-900/20 text-left custom-scrollbar leading-relaxed">
            {history.map(h => `[${h.role === 'user' ? '令嬢' : '語り部'}] ${h.text}`).join("\n\n")}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={copyToClipboard}
              className={`w-full py-4 rounded-lg font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 tracking-wide border ${
                copied 
                  ? "bg-emerald-900/20 border-emerald-800 text-emerald-400" 
                  : "bg-amber-900/20 border-amber-800/50 text-amber-400 hover:bg-amber-900/30 hover:scale-[1.01]"
              }`}
            >
              {copied ? (
                <>✓ 記録完了</>
              ) : (
                <>
                  <Share2 size={20} />
                  ログをコピー
                </>
              )}
            </button>

            {/* 性格診断ボタン */}
            <button
              onClick={startAnalysis}
              className="w-full py-4 rounded-lg font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-3 tracking-wide border bg-rose-900/20 border-rose-800/50 text-rose-400 hover:bg-rose-900/30 hover:scale-[1.01]"
            >
              <Flower size={20} />
              悪役令嬢 性格診断
            </button>
          </div>
          
          <button
            onClick={resetGame}
            className="w-full py-3 rounded-lg border border-rose-900/30 hover:bg-rose-900/20 text-rose-400/60 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <RefreshCw size={16} />
            別の運命を歩む
          </button>
        </div>
      </div>

      {showAnalysis && <AnalysisModal />}
    </div>
  );
};

// --- Main Component ---

export default function VillainessTRPG_v2() {
  const [gameState, setGameState] = useState('intro');
  const [archetype, setArchetype] = useState(null);
  const [turn, setTurn] = useState(1);
  const [history, setHistory] = useState([]);
  const [currentNarrative, setCurrentNarrative] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef(null);

  const initGame = async (selectedArch) => {
    setArchetype(selectedArch);
    setGameState('playing');
    setIsLoading(true);
    setHistory([]);

    const startPrompt = [{ role: 'system', text: '舞踏会の開幕' }];
    const gmResponse = await callGeminiGM(startPrompt, selectedArch, 1);
    
    setCurrentNarrative(gmResponse.narrative);
    setSuggestions(gmResponse.suggested_actions);
    setHistory([{ role: 'model', text: gmResponse.narrative }]);
    setIsLoading(false);
  };

  const handleAction = async (actionText) => {
    if (!actionText.trim() || isLoading) return;

    const newHistory = [...history, { role: 'user', text: actionText }];
    setHistory(newHistory);
    setInputText("");
    setIsLoading(true);

    if (turn >= 10) {
      const gmResponse = await callGeminiGM(newHistory, archetype, 10);
      const finalHistory = [...newHistory, { role: 'model', text: gmResponse.narrative }];
      setHistory(finalHistory);
      setGameState('result');
      setIsLoading(false);
    } else {
      const nextTurn = turn + 1;
      setTurn(nextTurn);
      const gmResponse = await callGeminiGM(newHistory, archetype, nextTurn);
      
      setCurrentNarrative(gmResponse.narrative);
      setSuggestions(gmResponse.suggested_actions);
      setHistory([...newHistory, { role: 'model', text: gmResponse.narrative }]);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, currentNarrative, isLoading]);

  const resetGame = () => {
    setGameState('intro');
    setTurn(1);
    setCopied(false);
  };

  const copyToClipboard = () => {
    const prompt = generateNovelPrompt(history, archetype);
    const textArea = document.createElement("textarea");
    textArea.value = prompt;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(244, 63, 94, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(244, 63, 94, 0.4);
        }
      `}</style>
      
      {gameState === 'intro' && (
        <IntroScreen initGame={initGame} />
      )}
      
      {gameState === 'playing' && (
        <PlayScreen 
          archetype={archetype}
          turn={turn}
          history={history}
          isLoading={isLoading}
          suggestions={suggestions}
          inputText={inputText}
          setInputText={setInputText}
          handleAction={handleAction}
          scrollRef={scrollRef}
        />
      )}
      
      {gameState === 'result' && (
        <ResultScreen 
          history={history}
          archetype={archetype}
          copied={copied}
          copyToClipboard={copyToClipboard}
          resetGame={resetGame}
        />
      )}
    </>
  );
}

