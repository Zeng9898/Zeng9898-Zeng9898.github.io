// The uploaded filenames and image contents are currently inverted:
// - 2-1-2-sugar-saturation-chart.png contains the beaker/layer diagram
// - 2-3-sugar-saturation-layer.png contains the chart pair
import sugarSaturationLayerDiagramImg from "../assets/2-1-2-sugar-saturation-chart.png";
import sugarSaturationChartsImg from "../assets/2-3-sugar-saturation-layer.png";

export type QuestionConfig = {
  id: number;
  title: string;
  initialMessage: string;
  scenarioText: string;
  scenarioImage?: string;
  scenarioImageClassName?: string;
  scenarioImageZoomable?: boolean;
};

export type LevelConfig = {
  id: string;
  label: string;
  title: string;
  description: string;
  isCurrent?: boolean;
  questions: QuestionConfig[];
};

const QUESTION_CONFIGS: QuestionConfig[] = [
  {
    id: 0,
    title: "論證議題 1",
    initialMessage: `請根據剛才的情境，說說你的想法：糖水放到磅秤上秤重，糖水會變輕嗎？
如果把這杯水放太陽下曬乾，砂糖還會出現嗎？`,
    scenarioText:
      "小華將 10 公克的砂糖加入 100 公克的水中，攪拌後砂糖完全消失不見了。\n小華把這杯糖水放到磅秤上秤重，並思考：糖水會變輕嗎？\n如果把這杯水放太陽下曬乾，砂糖還會出現嗎？",
  },
  {
    id: 1,
    title: "論證議題 2",
    initialMessage:
      "哪些是溶解現象？這些物質能被取回嗎？請提出你的主張，也就是你的看法",
    scenarioText: `請判斷以下生活中處理食物的過程，哪些是「溶解現象」？
A.煮湯加鹽巴 B.熱湯加粗粒黑胡椒 C.把米煮成稀飯
D.在水中加維他命C錠 E.在豆漿中加入砂糖 F.奶茶加珍珠

你判斷出現「溶解現象」的標準是什麼？這些物質能被取回嗎？
請提出你的主張並說明原因。`,
  },
  {
    id: 2,
    title: "論證議題 3",
    initialMessage:
      "請對照圖甲與圖乙的數據趨勢，你覺得妹妹說「糖也跟著消失了」對嗎？你覺得妹妹說得對嗎？先說說你的「主張」，也就是你的看法",
    scenarioText:
      "初始條件：將一杯含有 10 克糖的 110 克糖水（含糖和水）放在陽光下。\n\n圖甲（折線圖）：X 軸為「曝曬天數」，Y 軸為「整杯糖水的總重量」，趨勢線逐日往下降。\n圖乙（折線圖）：X 軸為「曝曬天數」，Y 軸為「杯底析出固體砂糖重量」，前幾天為 0，接著逐日上升，最終停留在 10 克。\n\n妹妹看著圖甲的數據下降，哭著說：「陽光把我的糖水變不見了！裡面的糖也跟著消失了！」\n對照圖甲與圖乙的數據趨勢，你覺得妹妹說「糖也跟著消失了」對嗎？你先說說你的想法，為什麼呢？",
  },
  {
    id: 3,
    title: "論證議題 1",
    initialMessage:
      "你認為 A 杯（上層）和 B 杯（下層）的糖水，哪一杯喝起來比較甜？請先提出你的主張。",
    scenarioText:
      "小明想在家裡複製飲料店超甜的「特調砂糖水」。他拿了一杯 100 毫升的水，一平匙一平匙地加入砂糖並不斷攪拌。根據實驗紀錄，加到第 7 匙時，小明發現無論他怎麼用力攪拌，杯子底部始終剩下一層白白的砂糖沉澱，無法再消失。\n\n小明心想：「既然底部有這麼多砂糖沉澱，那這杯水最底層（靠近沉澱處）的水一定比最上層的水還要甜吧？」於是他小心地將上層的糖水倒出一半到 A 杯，再將下層（但不含底部固體砂糖）的糖水倒出另一半到 B 杯，仔細觀察兩杯糖水的顏色是一樣的。\n\n問題：你認為 A 杯（上層）和 B 杯（下層）的糖水，哪一杯喝起來比較甜？",
    scenarioImage: sugarSaturationLayerDiagramImg,
    scenarioImageClassName: "max-w-[380px] md:max-w-[520px]",
    scenarioImageZoomable: true,
  },
  {
    id: 4,
    title: "論證議題 2",
    initialMessage:
      "在已經有沉澱的情況下，繼續加入砂糖並攪拌，這杯糖水的甜度（濃度）會繼續增加嗎？請先說說你的主張。",
    scenarioText:
      "接續小明做的實驗，他在已經有沉澱（飽和）的糖水中，又多加了三平匙的砂糖並瘋狂攪拌。他認為：「雖然有沉澱，但我加了更多糖，這杯糖水一定會變得比剛才更甜！」\n\n問題：在已經有沉澱的情況下，繼續加入砂糖並攪拌，這杯糖水的「甜度（濃度）」會繼續增加嗎？",
    scenarioImage: sugarSaturationLayerDiagramImg,
    scenarioImageClassName: "max-w-[380px] md:max-w-[520px]",
    scenarioImageZoomable: true,
  },
  {
    id: 5,
    title: "論證議題 3",
    initialMessage:
      "請對照圖甲與圖乙的趨勢，小明的說法正確嗎？先提出你的主張，再說明理由。",
    scenarioText:
      "小明看了這兩張圖表後說：「因為圖甲顯示糖水的總重量一直增加，代表砂糖都有加進去，所以圖乙的甜度折線畫錯了，甜度應該也要跟著一直上升才對！」\n\n請對照圖甲與圖乙的趨勢，小明的說法正確嗎？",
    scenarioImage: sugarSaturationChartsImg,
  },
];

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    id: "level-1",
    label: "第一次科學論證",
    title: "第一次科學論證",
    description: "以水溶液情境練習主張、證據與推理。",
    isCurrent: true,
    questions: [QUESTION_CONFIGS[2], QUESTION_CONFIGS[1]],
  },
  {
    id: "level-2",
    label: "飽和糖水與甜度",
    title: "飽和糖水與甜度",
    description: "練習判斷飽和糖水上下層甜度、持續加糖是否更甜，以及圖表判讀。",
    questions: [QUESTION_CONFIGS[3], QUESTION_CONFIGS[4], QUESTION_CONFIGS[5]],
  },
];

export const DEFAULT_LEVEL_ID = LEVEL_CONFIGS[0]?.id ?? "level-1";

export function getLevelConfig(
  levelId: string | null | undefined
): LevelConfig {
  return (
    LEVEL_CONFIGS.find((level) => level.id === levelId) ?? LEVEL_CONFIGS[0]
  );
}
