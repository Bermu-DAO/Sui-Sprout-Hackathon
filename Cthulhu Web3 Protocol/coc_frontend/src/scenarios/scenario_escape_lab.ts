/**
 * scenario_escape_lab.ts
 * 逃離實驗室 — 劇本資料定義
 * ─────────────────────────────────────────────────────
 * 屬性縮寫對照：
 *   str=力量  con=體質  siz=體型  dex=敏捷
 *   app=魅力  int=智力  pow=意志  edu=教育  luck=幸運
 */

export type Stat = 'str' | 'con' | 'siz' | 'dex' | 'app' | 'int' | 'pow' | 'edu' | 'luck';

export interface Choice {
  id: string;
  text: string;           // 顯示文字
  stat: Stat;             // 對應屬性
  successText: string;    // 成功描述
  failText: string;       // 失敗描述
  successEffect?: Partial<GameDelta>;
  failEffect?: Partial<GameDelta>;
}

export interface GameDelta {
  hp: number;             // HP 變化 (負數為傷害)
  san: number;            // 理智變化
  addFlag?: string;       // 記錄某個旗標（如 found_insurance）
}

export interface FloorEvent {
  id: string;
  floor: number;          // 10=頂樓, 1=一樓出口, -1=地下一樓, -2=Boss層
  isStair?: boolean;      // 是否為樓梯隨機事件
  title: string;
  description: string;
  choices: Choice[];
  skipCondition?: string; // 旗標名稱：存在時此事件不觸發
}

export interface BossRound {
  playerHp: number;
  bossHp: number;
  log: string[];
}

// ─────────────────────────────────────────────────────
// 主要劇本事件清單
// ─────────────────────────────────────────────────────
export const SCENARIO_EVENTS: FloorEvent[] = [
  // ══ 序幕：實驗室辦公室 8F ══
  {
    id: 'intro_blackout',
    floor: 8,
    title: '突然停電',
    description:
      '你剛把一疊資料放進老闆辦公室，背後傳來「喀嗒」一聲。整棟樓的燈全滅了。手機螢幕在黑暗中突然亮起，電子門閉鎖提示紅燈閃爍。你意識到——所有門全鎖上了。',
    choices: [
      {
        id: 'search_desk',
        text: '【調查】趁著手機燈翻找老闆桌上的文件',
        stat: 'int',
        successText: '你在碎紙機旁發現了一份未銷毀的復印件——那是老板剛幫公司投保的一張鉅額意外保險單。保費高得驚人，受益人卻是老闆個人的境外帳戶。你迅速拍下照片。',
        failText: '黑暗中你打翻了好幾疊文件，慌亂中什麼也沒找到。時間消逝在絕望的搜索中。',
        successEffect: { san: -1, addFlag: 'found_insurance' },
        failEffect: { hp: -1, san: -2 },
      },
      {
        id: 'force_door',
        text: '【力量】用椅子砸破辦公室玻璃門',
        stat: 'str',
        successText: '椅子狠狠擊中門框，玻璃碎成大片，你撐著碎玻璃跨越出去，手掌微微割傷但人已脫困。',
        failText: '椅子彈回來砸到你的小腿，玻璃只是出現裂縫。你損耗了珍貴的體力，卻毫無進展。',
        successEffect: { hp: -1 },
        failEffect: { hp: -3 },
      },
      {
        id: 'calm_wait',
        text: '【意志】冷靜下來，找緊急出口指示牌',
        stat: 'pow',
        successText: '你強迫自己不恐慌。螢幕燈照向天花板，緊急出口的螢光貼紙隱約發光——那邊有服務梯！你找到了路。',
        failText: '恐慌吞沒你的理智。你在辦公室裡繞了一圈，直到膝蓋軟了才找到方向，理智受損。',
        successEffect: { san: 1 },
        failEffect: { san: -3 },
      },
    ],
  },

  // ══ 8F→7F 逃生梯 ══
  {
    id: 'stair_8_crowd',
    floor: 8,
    isStair: true,
    title: '第八層：人群推擠',
    description: '樓梯間擠滿了試圖逃跑的同事，恐慌的叫喊聲在水泥牆壁間迴盪。有人摔倒了，人群還在往前推。',
    choices: [
      {
        id: 'push_through',
        text: '【力量】用身體強行擠開人群',
        stat: 'str',
        successText: '你穩住重心，將身體側過去，一步步頂著人流挺進，磕磕碰碰地衝了出去。',
        failText: '你被人流推倒，踩在地上被踢到幾腳，才勉強爬起來。胸口悶痛。',
        successEffect: {},
        failEffect: { hp: -2 },
      },
      {
        id: 'shout_calm',
        text: '【魅力】大喊指揮，讓人群讓出通道',
        stat: 'app',
        successText: '「靠右！靠右走！」你的聲音穿透噪音，幾個人回頭，竟真的往右邊靠，通道出現了。',
        failText: '你的喊聲被淹沒在噪音裡，沒有人搭理你。你白費了唇舌。',
        successEffect: { san: 1 },
        failEffect: {},
      },
      {
        id: 'wait_gap',
        text: '【敏捷】貼著牆壁等人流稀疏，再伺機穿過',
        stat: 'dex',
        successText: '你背貼牆面，等待人群密度降低的瞬間，靈活地側身滑過。',
        failText: '你等待的時機太慢，被後方涌來的人拖著走，跌了一跤。',
        successEffect: {},
        failEffect: { hp: -1 },
      },
    ],
  },

  // ══ 7F 大廳事件 ══
  {
    id: 'floor7_smoke',
    floor: 7,
    title: '第七層：濃煙',
    description: '7樓走廊已經開始冒煙，你看不清通往樓梯的方向。煙味刺鼻，眼睛開始流淚。',
    choices: [
      {
        id: 'smoke_low',
        text: '【體質】壓低身體，捂住口鼻，從煙霧中穿越',
        stat: 'con',
        successText: '你把外套蓋在臉上，貼著地板前行。煙霧在上方飄動，你成功穿越。',
        failText: '濃煙嗆入肺部，你劇烈咳嗽，頭暈但還是撐了過去，代價是體力大耗。',
        successEffect: {},
        failEffect: { hp: -3, san: -1 },
      },
      {
        id: 'find_route',
        text: '【教育】試圖回憶建築逃生圖，找繞行路線',
        stat: 'edu',
        successText: '你記起新人訓練時看過逃生圖——7樓有個備用通道在東側茶水間旁邊！你繞過去了。',
        failText: '你試圖回憶路線，但煙霧讓你分心，走錯方向浪費了時間。',
        successEffect: { san: 1 },
        failEffect: { hp: -1 },
      },
      {
        id: 'break_window',
        text: '【力量】打破走廊窗戶排煙，爭取通過時間',
        stat: 'str',
        successText: '你抓起滅火器砸向窗戶，氣流涌入，煙霧稀薄了一點。你趁機通過。',
        failText: '滅火器太重，你只砸出一個裂縫，外側玻璃沒碎，徒費力氣。',
        successEffect: {},
        failEffect: { hp: -2 },
      },
    ],
  },

  // ══ 7F→6F 樓梯 ══
  {
    id: 'stair_7_fire',
    floor: 7,
    isStair: true,
    title: '樓梯：起火',
    description: '轉角處的逃生梯突然竄出火焰，樓梯欄杆的油漆已經在燃燒。你必須通過那一段。',
    choices: [
      {
        id: 'run_fast',
        text: '【敏捷】全力衝刺，快速穿越火線',
        stat: 'dex',
        successText: '你深吸一口氣，拼命衝刺，火焰的熱浪撲面而來，但你已越過。衣袖燒焦了一小角。',
        failText: '你速度不夠快，被火焰燒到手臂，撲打後才逃過。',
        successEffect: {},
        failEffect: { hp: -3 },
      },
      {
        id: 'soak_cloth',
        text: '【智力】脫下外套用水壺打濕當防護，慢慢通過',
        stat: 'int',
        successText: '你把水壺的水倒在外套上，裹住身體蜷縮著走過火線。聰明的選擇，幾乎毫髮無損。',
        failText: '你找不到水壺，濕外套計劃失敗，最後還是要硬衝，烤焦了一點。',
        successEffect: {},
        failEffect: { hp: -1 },
      },
      {
        id: 'find_other',
        text: '【幸運】回頭找其他出路，也許命運留了後門',
        stat: 'luck',
        successText: '你往回走了兩步——牆上有一個從來沒注意的維修門微微開著。穿進去，繞過了火線！',
        failText: '你浪費了時間繞回去，所謂的後路根本不通，最後還是要衝火線，且更加疲憊。',
        successEffect: { san: 1 },
        failEffect: { hp: -4 },
      },
    ],
  },

  // ══ 6F ══
  {
    id: 'floor6_guard',
    floor: 6,
    title: '第六層：保安阻攔',
    description: '兩個保安擋在6樓入口，大喊「回去！樓上才安全！消防隊馬上到！」他們似乎在執行某種命令，眼神不對勁。',
    choices: [
      {
        id: 'talk_guard',
        text: '【魅力】說服保安，告訴他們樓上已經著火',
        stat: 'app',
        successText: '你指向天花板的煙感器——那個紅燈在狂閃。保安面面相覷，讓開了路。',
        failText: '保安不相信你，一把推到你「聽話點！」你只好找其他辦法。',
        successEffect: {},
        failEffect: { hp: -1, san: -1 },
      },
      {
        id: 'trick_guard',
        text: '【智力】假裝看見後方有人需要救援，趁機繞過',
        stat: 'int',
        successText: '「那邊有人暈倒了！」你大喊。兩個保安轉頭，你從側邊一溜煙穿過。',
        failText: '保安根本不理你的喊聲，一個還伸手抓住你，你費盡力氣才掙脫。',
        successEffect: {},
        failEffect: { hp: -2 },
      },
      {
        id: 'push_guard',
        text: '【體型】肩膀硬扛，強行撞開保安',
        stat: 'siz',
        successText: '你體型夠大，一個衝刺就把一個保安撞到牆上，另一個愣住了，你衝了出去。',
        failText: '你沒撞開，反而被兩個保安按住。你狼狽地掙脫，傷了手腕。',
        successEffect: {},
        failEffect: { hp: -3 },
      },
    ],
  },

  // ══ 6F→5F 樓梯 ══
  {
    id: 'stair_6_creature',
    floor: 6,
    isStair: true,
    title: '樓梯：奇怪生物',
    description: '樓梯口有個……東西。在黑暗中，你看到一個低矮、扭曲的輪廓，發出濕潤的哧哧聲。它似乎注意到你了。',
    choices: [
      {
        id: 'sneak_past',
        text: '【敏捷】放輕腳步，緊貼另一邊牆悄悄通過',
        stat: 'dex',
        successText: '你幾乎停止呼吸，一步一步滑過去，那生物扭動了一下，但沒有追來。',
        failText: '你踩到一截碎玻璃，「哧——」那東西撲了過來，你奮力推開跑掉，但受了傷。',
        successEffect: {},
        failEffect: { hp: -3, san: -2 },
      },
      {
        id: 'stare_sanity',
        text: '【意志】直視它，試圖辨認那是什麼',
        stat: 'pow',
        successText: '你強迫自己看清楚——那只是一隻受驚逃跑的研究室白鼠，因為陰影顯得巨大。你的意志保住了理智。',
        failText: '你的目光與那個形體的兩個發光點對上了。你的理智碎了一點。你哆嗦著跑過去。',
        successEffect: { san: 2 },
        failEffect: { san: -4 },
      },
      {
        id: 'throw_distract',
        text: '【幸運】隨手丟出什麼東西吸引它的注意力',
        stat: 'luck',
        successText: '你的鑰匙圈飛出去，叮地一聲打在對面牆壁。那生物的頭轉了過去。你溜走了。',
        failText: '你丟的東西正好打到它身上。它嘶叫一聲，憤怒地往你衝，你拼命跑，摔了一跤。',
        successEffect: {},
        failEffect: { hp: -2, san: -2 },
      },
    ],
  },

  // ══ 5F ══
  {
    id: 'floor5_debris',
    floor: 5,
    title: '第五層：堆積物品',
    description: '走廊被一堆不知何時堆在這裡的文件箱和設備完全塞滿，根本無路可走。另一端可以看到逃生梯的出口燈。',
    choices: [
      {
        id: 'climb_over',
        text: '【體型/力量】強行攀爬翻越這些堆積物',
        stat: 'str',
        successText: '你用兩隻手撐著箱子，一個翻滾越過去，雖然手磨破了，但成功了。',
        failText: '你爬上去，箱子突然塌陷，連人帶箱子倒下，砸到背部。你爬起來繼續。',
        successEffect: {},
        failEffect: { hp: -3 },
      },
      {
        id: 'find_side_path',
        text: '【智力】冷靜觀察，看看側邊有沒有繞過去的縫隙',
        stat: 'int',
        successText: '你注意到最左側和牆壁之間有一個勉強擠過去的空隙。側著身，你穿過去了。',
        failText: '你研究了半天，沒看出什麼好辦法，最後還是要硬爬，比別人慢多了。',
        successEffect: { san: 1 },
        failEffect: { hp: -1 },
      },
      {
        id: 'wait_help',
        text: '【意志】大喊求援，等待對面有人拉開部分障礙',
        stat: 'pow',
        successText: '「有人嗎！」對面真的有個同事，他把最外層的箱子推倒，給你開了條路。',
        failText: '你喊了很久，沒有人回應。最後你心灰意冷地硬爬，膝蓋磨出血了。',
        successEffect: {},
        failEffect: { hp: -2, san: -1 },
      },
    ],
  },

  // ══ 5F→4F 樓梯 ══
  {
    id: 'stair_5_panic',
    floor: 5,
    isStair: true,
    title: '樓梯：踩踏危機',
    description: '樓梯間某個地方踩踏發生了，有人在哭喊，有人摔滑，扶手已人滿為患。你前方有個老人摔倒了。',
    choices: [
      {
        id: 'help_old',
        text: '【力量】扶起老人，帶著他一起逃',
        stat: 'str',
        successText: '你扶起老人，讓他扶著你的手臂，你們互相支撐慢慢通過。你耗盡了氣力，但良知完整。',
        failText: '你扶起老人，但人群壓力太大，你們兩個都被撞倒了，你保護他的同時自己受傷。',
        successEffect: { san: 2 },
        failEffect: { hp: -3, san: 1 },
      },
      {
        id: 'shout_space',
        text: '【魅力】大聲指揮，讓人群留出空間',
        stat: 'app',
        successText: '你的聲音穿透噪音：「讓開！有人跌倒了！」周圍的人停下，場面稍微穩定，你們都通過了。',
        failText: '你的指揮沒人理，你被側面推來的人流擠到欄杆上，肋骨撞到硬鐵。',
        successEffect: { san: 1 },
        failEffect: { hp: -2 },
      },
      {
        id: 'push_alone',
        text: '【敏捷】踩著縫隙，自己先衝過去',
        stat: 'dex',
        successText: '你找到人群中的空隙，靈活地穿越，雖然內心有點愧疚，但人已安全通過。',
        failText: '你試圖擠過去卻被腳絆倒，踩到別人的手，對方嚎叫，場面更混亂了。',
        successEffect: { san: -1 },
        failEffect: { hp: -2, san: -2 },
      },
    ],
  },

  // ══ 4F ══
  {
    id: 'floor4_explosion',
    floor: 4,
    title: '第四層：局部爆炸',
    description: '轟的一聲！4樓化學品儲藏室方向傳來爆炸，衝擊波把你推倒。天花板的一片揚下來，落在你腿上。',
    choices: [
      {
        id: 'adrenaline_lift',
        text: '【力量+幸運】腎上腺素爆發，搬開壓著腿的障礙物',
        stat: 'str',
        successText: '恐懼化為力量，你咆嘯著把那片天花板推開，站起身，腿有點麻，但沒有骨折。',
        failText: '你搬不動，費盡力氣才用腿勉強踢開，但腳踝扭傷了。',
        successEffect: {},
        failEffect: { hp: -2 },
      },
      {
        id: 'calm_pry',
        text: '【智力】冷靜判斷槓桿點，找支撐物撬開',
        stat: 'int',
        successText: '你注意到一段斷裂的扶手，把它當槓桿，三下兩下就把天花板撬開。',
        failText: '你的判斷失誤，槓桿斷了，只好硬扯，傷了手。',
        successEffect: {},
        failEffect: { hp: -1 },
      },
      {
        id: 'call_help',
        text: '【意志】忍住疼痛大聲求救',
        stat: 'pow',
        successText: '你忍著疼痛高聲呼喊，旁邊兩個熱心的路人幫你搬開了障礙物，你謝過他們繼續前行。',
        failText: '疼痛讓你難以呼喊，你幾乎崩潰，最後靠著殘存的意志力掙脫出來。',
        successEffect: { san: 1 },
        failEffect: { hp: -3, san: -2 },
      },
    ],
  },

  // ══ 3F ══
  {
    id: 'floor3_office_fire',
    floor: 3,
    title: '第三層：辦公室大火',
    description: '3樓整排辦公室已全面起火。過道旁的座位在燃燒，天花板的火警噴水頭終於啟動，地上積了一層水。你聞到燃燒塑料的氣味。',
    choices: [
      {
        id: 'sprint',
        text: '【敏捷】全力衝刺，不思考，直接越過火場',
        stat: 'dex',
        successText: '你屏住呼吸衝刺，火舌掃過你背部，但你已到達安全區域。',
        failText: '你衝到一半被煙嗆到跪下，只能爬行越過剩余路段，皮膚燒傷幾處。',
        successEffect: {},
        failEffect: { hp: -4 },
      },
      {
        id: 'use_sprinkler',
        text: '【智力】利用噴水頭的水澆濕身體和路徑',
        stat: 'int',
        successText: '你站在噴灑頭下面讓全身淋透，然後快速穿越。火焰在濕身保護下沒能傷到你。',
        failText: '噴灑頭的水不夠，你抬頭的一瞬間，熱蒸氣燙了你的臉。',
        successEffect: {},
        failEffect: { hp: -2 },
      },
      {
        id: 'edge_path',
        text: '【體型】貼著沒有燃燒的內牆，靠著體型優勢擠過人群',
        stat: 'siz',
        successText: '你靠著格外高大的體型，把周圍的人和雜物推開，在最靠近牆的地方擠出了一條路。',
        failText: '你的體型反而讓你礙手礙腳，被困在人群中動彈不得，被煙嗆了很久才脫困。',
        successEffect: {},
        failEffect: { hp: -2, san: -1 },
      },
    ],
  },

  // ══ 2F ══
  {
    id: 'floor2_outside_fire',
    floor: 2,
    title: '第二層：窗外漫延的火焰',
    description: '樓梯轉角的窗戶碎了，你看到外面已有消防車趕到，但大樓外牆的火焰也從窗口捲進來。一個男人在考慮從窗口跳下去。',
    choices: [
      {
        id: 'stop_man',
        text: '【魅力】勸阻他，說消防員馬上到',
        stat: 'app',
        successText: '「別跳！消防員在下面！快了！」你的語氣讓他猶豫，最終他放棄了跳窗，你們一起繼續往下走。',
        failText: '你還沒說完，他就跳了。你只能繼續自己的路，心裡非常沉重。',
        successEffect: { san: 2 },
        failEffect: { san: -4 },
      },
      {
        id: 'ignore_run',
        text: '【意志】不管他，繼續逃生',
        stat: 'pow',
        successText: '你告訴自己，每個人都要為自己的選擇負責。你繼續快跑，沒有回頭。',
        failText: '你走出幾步，良知讓你停下來，你猶豫浪費了時間，最後內疚地離開。',
        successEffect: { san: -1 },
        failEffect: { san: -2 },
      },
      {
        id: 'help_rope',
        text: '【力量+智力】用電線和窗簾製作簡易繩索幫他下樓',
        stat: 'edu',
        successText: '你扯下幾條窗簾，打結成繩，固定在暖氣管上。他順著繩子安全滑到下一層的窗台。',
        failText: '繩子打的結不夠牢，你花了太長時間，最後被逼放棄，趕快逃走。',
        successEffect: { san: 3 },
        failEffect: { hp: -1, san: -1 },
      },
    ],
  },

  // ══ 1F：到達出口 ══
  {
    id: 'floor1_exit',
    floor: 1,
    title: '第一層：出口在眼前',
    description: '你終於跑到1樓！大廳的玻璃旋轉門被撞破了，外面的新鮮空氣拍在臉上。消防員的聲音從外面傳來。現在你有兩個選擇。',
    choices: [
      {
        id: 'escape_now',
        text: '【逃出】衝出大門！',
        stat: 'dex',
        successText: '你跑出大門，撲倒在地上，感覺身後的熱氣撲來。你活下來了。',
        failText: '你衝出去時被碎玻璃割傷，但還是跑出去了。你活下來了。',
        successEffect: { addFlag: 'escaped' },
        failEffect: { hp: -1, addFlag: 'escaped' },
      },
      {
        id: 'go_deeper',
        text: '【調查】等等——地下室還有什麼？你決定往下走。',
        stat: 'pow',
        successText: '你意志力壓過了求生本能。地下室，你去弄清楚這一切。',
        failText: '你意志不夠強，腳步還是鬼使神差地走向地下入口……',
        successEffect: { addFlag: 'going_basement' },
        failEffect: { addFlag: 'going_basement' },
      },
    ],
  },

  // ══ B1 地下室 ══
  {
    id: 'basement1_darkness',
    floor: -1,
    title: '地下一層：絕對黑暗',
    description: '地下室的燈全滅了，比樓上更安靜，安靜得詭異。有什麼東西在黑暗中緩緩移動的聲音。水管在滴水。你的手電筒電量只剩一點點。',
    choices: [
      {
        id: 'use_light',
        text: '【智力】省點電，用最低亮度緩慢前進',
        stat: 'int',
        successText: '你把手電筒調到最暗。雙眼漸漸適應，你看清了走廊輪廓，一步一步推進。',
        failText: '黑暗讓你估算錯距離，你撞在一根柱子上，手電筒也掉了，完全黑暗。',
        successEffect: {},
        failEffect: { hp: -1, san: -2 },
      },
      {
        id: 'confront_fear',
        text: '【意志】放棄手電筒，在黑暗中用聽覺感知前方',
        stat: 'pow',
        successText: '你閉上眼睛，讓聽覺主導。滴水聲、通風噪音、你自己的心跳。你感知到了路的方向。',
        failText: '黑暗中你的恐懼爆發，你開始顫抖，理智承受了沉重打擊。',
        successEffect: { san: -1 },
        failEffect: { san: -4 },
      },
      {
        id: 'feel_wall',
        text: '【體質】用身體感知，貼著牆壁一路摸到深處',
        stat: 'con',
        successText: '你把一隻手貼著牆壁，根據牆面質地和空氣流向判斷方向，你找到了深處的通道。',
        failText: '摸索中你被什麼鋒利的東西割傷了手，心跳加速但還是繼續前進。',
        successEffect: {},
        failEffect: { hp: -2 },
      },
    ],
  },
];

// ─────────────────────────────────────────────────────
// 隨機樓梯事件（抽選用）
// ─────────────────────────────────────────────────────
export const RANDOM_STAIR_EVENTS: FloorEvent[] = [
  {
    id: 'random_help',
    floor: 0,
    isStair: true,
    title: '樓梯：有人求助',
    description: '一個受傷的女性倒在樓梯角落，她的腳踝扭傷，掙扎著站起來。她看向你，眼神中有一絲希望。',
    choices: [
      {
        id: 'carry_her',
        text: '【力量】背起她一起跑',
        stat: 'str',
        successText: '你把她背起，沉重但你撐住了，兩人一起平安通過。',
        failText: '你試著背她，但走了幾步就撐不住，她讓你放下她，兩人各自努力。',
        successEffect: { san: 2 },
        failEffect: { hp: -2 },
      },
      {
        id: 'guide_her',
        text: '【魅力】給她鼓勵，讓她扶著你的手走',
        stat: 'app',
        successText: '「你能做到的，跟我走！」她咬著牙，一步一步跟上，你們都通過了。',
        failText: '她不信任你，搖搖頭說讓你先走，你的良心受損。',
        successEffect: { san: 3 },
        failEffect: { san: -1 },
      },
      {
        id: 'leave',
        text: '【意志】告訴自己無能為力，繼續前進',
        stat: 'pow',
        successText: '你告訴自己消防員會來，繼續走，雖然沉重，但活著。',
        failText: '你走了半截又折回來等她，浪費了很多時間，但帶著她一起逃了。',
        successEffect: { san: -2 },
        failEffect: { hp: -1, san: 1 },
      },
    ],
  },
];

// ─────────────────────────────────────────────────────
// Boss 數據
// ─────────────────────────────────────────────────────
export const BOSS_DATA = {
  id: 'boss_professor',
  floor: -2,
  title: '地下二層：真正的老闆',
  description:
    '黑暗盡頭，有個龐大的影子。那是你的老闆。或者說，曾經是。他的西裝已撕裂，背後和手臂長出了灰紫色的觸手，顫動著，滴著粘液。他的眼睛發出幽光，嘴角上揚：\n\n「好孩子……你竟然到這裡來了……是命運啊……」\n\n你知道你必須和他戰鬥。',
  bossHp: 7,
  bossAtk: '1d4' as const,
  playerAtk: '1d3' as const,
};

// ─────────────────────────────────────────────────────
// 結局定義
// ─────────────────────────────────────────────────────
export const ENDINGS = {
  escaped: {
    id: 'escaped',
    title: '逃出生天',
    titleEn: 'ESCAPE',
    description:
      '你衝出了大樓。背後，火焰在那棟建築裡肆虐。你跌坐在地上，大口呼吸著外面的冷空氣。\n\n消防車的警報、旁觀者的喧囂、老板不在場的詭異……一切事情都說得通了。但你還是活著。\n\n幾周後，警方調查確認大火為人為縱火，保險公司拒絕理賠。老闆至今下落不明。',
    flavor: '你活下來了。但有些問題永遠沒有答案。',
    color: 'text-green-400',
    bg: 'border-green-500/40',
    emoji: '🚪',
  },
  escaped_with_evidence: {
    id: 'escaped_with_evidence',
    title: '帶著真相逃出生天',
    titleEn: 'TRUTH & ESCAPE',
    description:
      '你衝出了大樓。你的手機裡有那張保險單的照片。\n\n消防員看到你第一句說的話是「謝天謝地」，但你腦海裡只有那張保單。\n\n你把照片提供給調查人員。三個月後，老闆因涉嫌縱火詐保被發出國際通緝令。\n\n你是唯一知道真相的人。',
    flavor: '正義也許遲到，但它來了。',
    color: 'text-blue-400',
    bg: 'border-blue-500/40',
    emoji: '📋',
  },
  died_inside: {
    id: 'died_inside',
    title: '永留公司',
    titleEn: 'NEVER LEFT',
    description:
      '你沒有逃出去。\n\n也許是體力耗盡，也許是被濃煙壓倒，也許是某個可怕的東西在地下找到了你。\n\n消防報告裡，你的遺體在三樓找到，面朝下，手機裡有一張模糊的照片。\n\n沒有人知道那照片是什麼。',
    flavor: '有些公司，你一旦進去，就出不來了。',
    color: 'text-red-500',
    bg: 'border-red-700/40',
    emoji: '🔒',
  },
  boss_defeated: {
    id: 'boss_defeated',
    title: '擊敗真兇',
    titleEn: 'TRUTH SLAYER',
    description:
      '老闆倒下了，那些觸手漸漸縮回，消失在他殘破的身體裡。他以一個普通人的姿態癱在地上。\n\n你站在地下二層的黑暗中，滿身是傷，褲腿滴著血，旁邊是曾經的老闆——現在是一個等待審判的囚犯。\n\n你拖著他爬上地面，交給警察。新聞標題第二天這樣寫：\n\n「火場英雄擒魔頭，神秘觸手事件震驚醫界」\n\n你知道那不只是標題。你見過的東西是真實的。',
    flavor: '有些真相，只有最勇敢的人才能揭露。',
    color: 'text-yellow-400',
    bg: 'border-yellow-500/40',
    emoji: '⚔️',
  },
};

import {
  SCENARIO_EVENTS_EN,
  RANDOM_STAIR_EVENTS_EN,
  BOSS_DATA_EN,
  ENDINGS_EN,
} from './scenario_escape_lab_en';

export const getScenarioEvents = (lang: string): FloorEvent[] => {
  return lang === 'en' ? SCENARIO_EVENTS_EN : SCENARIO_EVENTS;
};

export const getRandomStairEvents = (lang: string): FloorEvent[] => {
  return lang === 'en' ? RANDOM_STAIR_EVENTS_EN : RANDOM_STAIR_EVENTS;
};

export const getBossData = (lang: string) => {
  return lang === 'en' ? BOSS_DATA_EN : BOSS_DATA;
};

export const getEndings = (lang: string) => {
  return lang === 'en' ? ENDINGS_EN : ENDINGS;
};

