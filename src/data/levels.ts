// The uploaded filenames and image contents are currently inverted:
// - 2-1-2-sugar-saturation-chart.png contains the beaker/layer diagram
// - 2-3-sugar-saturation-layer.png contains the chart pair
import sugarSaturationLayerDiagramImg from "../assets/2-1-2-sugar-saturation-chart.png";
import sugarSaturationChartsImg from "../assets/2-3-sugar-saturation-layer.png";
import level4SoilPhYearsImg from "../assets/level4-1-soil-ph-years.png";
import level4SoilPhYieldImg from "../assets/level4-1-soil-ph-yield.png";
import level4SarsaparillaIndicatorImg from "../assets/level4-2-sarsaparilla-indicator.png";
import level4SarsaparillaTableImg from "../assets/level4-2-sarsaparilla-table.png";
import level5AcidGasImg from "../assets/level5-2-acid-gas.png";

export type QuestionConfig = {
  id: number;
  title: string;
  initialMessage: string;
  scenarioText: string;
  scenarioImage?: string;
  scenarioImages?: string[];
  scenarioImageClassName?: string;
  scenarioImageZoomable?: boolean;
};

export type LevelConfig = {
  id: string;
  label: string;
  title: string;
  description: string;
  isCurrent?: boolean;
  isDisabled?: boolean;
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
      "請對照圖甲與圖乙的趨勢，小明的說法正確嗎？先提出你的想法，再說明理由。",
    scenarioText:
      "小明看了這兩張圖表後說：「因為圖甲顯示糖水的總重量一直增加，代表砂糖都有加進去，所以圖乙的甜度折線畫錯了，甜度應該也要跟著一直上升才對！」\n\n請對照圖甲與圖乙的趨勢，小明的說法正確嗎？",
    scenarioImage: sugarSaturationChartsImg,
  },
  {
    id: 6,
    title: "論證議題 1",
    initialMessage:
      "你覺得肥皂水可以減緩蟻酸造成的腫痛嗎？先說說你的想法，也就是你的主張。",
    scenarioText:
      "小翔在爬山時被紅螞蟻咬傷，老師建議他用肥皂水（鹼性）沖洗來緩解蟻酸（酸性）造成的腫痛。這讓他聯想到：爸爸胃酸過多（酸性）不舒服時，服用含有碳酸氫鈉（鹼性）的胃藥也能緩解不適。\n\n為了驗證「鹼性物質是否真的能抵銷酸性的特質」，小翔在實驗室建立了一個模擬實驗：\n他用白醋（酸性）代表蟻酸與胃酸，加入紫色高麗菜汁後呈現紅色。\n他用小蘇打水（鹼性）代表肥皂水與胃藥。\n他將小蘇打水慢慢滴入紅色的白醋中，加入紫色高麗菜汁後呈現紫色。\n\n問題：你覺得肥皂水可以減緩蟻酸造成的腫痛嗎？先說說你的想法，也就是你的主張。",
  },
  {
    id: 7,
    title: "論證議題 2",
    initialMessage:
      "你覺得熟石灰可以幫助改善酸化的土壤嗎？先說說你的想法。",
    scenarioText:
      "農夫阿公發現農田因為長期施肥或酸雨影響，土壤變得太酸，作物長不好。老師建議阿公可以在田裡撒一些熟石灰（鹼性）來改良土壤。\n\n小翔想到自己做過的模擬實驗：酸性的白醋加入鹼性的小蘇打水後，溶液會從紅色變回紫色，表示溶液變得比較接近中性。\n\n問題：你覺得熟石灰可以幫助改善酸化的土壤嗎？先說說你的想法。",
  },
  {
    id: 8,
    title: "論證議題 1",
    initialMessage:
      "小華建議阿公「撒越多越好」。你覺得小華的說法是完全正確的嗎？請提出你的主張。",
    scenarioText:
      "農夫阿公發現農田最近幾年收成越來越差。小華拿了圖甲跟圖乙給阿公看，並建議：「阿公，我們應該在田裡大量撒入『熟石灰（鹼性）』，而且撒越多越好，這樣作物就會長得好！」請分析兩張圖表的趨勢。\n\n問題：小華建議阿公「撒越多越好」。你覺得小華的說法是完全正確的嗎？請提出你的主張。",
    scenarioImages: [level4SoilPhYearsImg, level4SoilPhYieldImg],
    scenarioImageClassName: "max-w-[720px]",
    scenarioImageZoomable: true,
  },
  {
    id: 9,
    title: "論證議題 2",
    initialMessage:
      "根據表中的數據，你覺得新鮮沙士是酸性、鹼性還是中性？請先說說你的主張。",
    scenarioText:
      "小魚想知道為什麼沙士喝起來會辣辣刺激的，她懷疑這跟它的酸鹼性有關。她設計了一個對照實驗，觀察「純水」、「鹽水」、「沙士」以及「加熱趕走氣泡後的沙士」在指示劑下的反應。\n\n問題：根據表中的數據，你覺得新鮮沙士是酸性、鹼性還是中性？請先說說你的主張。",
    scenarioImages: [level4SarsaparillaIndicatorImg, level4SarsaparillaTableImg],
    scenarioImageClassName: "max-w-[760px]",
    scenarioImageZoomable: true,
  },
  {
    id: 10,
    title: "論證議題 1",
    initialMessage:
      "為什麼乾燥的粉末不能讓試紙變色，而加了水之後卻可以？請提出你的主張和想法。",
    scenarioText:
      "小華聽說「檸檬酸粉末」可以用來清除熱水瓶裡的鹼性水垢。他為了確認粉末的性質，拿出一張乾燥的藍色石蕊試紙（或是塗有紫色高麗菜汁的乾燥紙片），直接灑上一些「乾燥的檸檬酸粉末」。結果他驚奇地發現：試紙的顏色竟然完全沒有改變！小華心想：「難道檸檬酸粉末不是酸性的嗎？」接著，他只不過在粉末上滴了一滴純水，試紙竟然立刻變成了紅色。\n\n問題：為什麼乾燥的粉末不能讓試紙變色，而加了水之後卻可以？請提出你的主張和想法。",
  },
  {
    id: 11,
    title: "論證議題 2",
    initialMessage:
      "你贊成這位市民的看法嗎？請說明你的主張和想法。",
    scenarioText:
      "工廠排放了大量酸性廢氣。有市民看著圖甲說：「你看！廢氣濃度再高，測試紙都沒有變紅，代表這些廢氣根本沒有酸性，不用擔心污染植物！」你贊成這位市民的看法嗎？請對照圖甲與圖乙的趨勢，說明你的主張和想法。\n\n問題：你贊成這位市民的看法嗎？請說明你的主張和想法。",
    scenarioImage: level5AcidGasImg,
    scenarioImageClassName: "max-w-[760px]",
    scenarioImageZoomable: true,
  },
  {
    id: 12,
    title: "論證議題 3",
    initialMessage:
      "為什麼乾燥的石灰岩無法讓試紙變色，必須在有水的情況下才能展現鹼性？請説説看你的想法。",
    scenarioText:
      "小強在野外看到許多石灰岩（主要成分為碳酸鈣，呈弱鹼性）。他拿乾燥的石蕊試紙直接貼在乾燥的石灰岩表面，試紙沒有反應；但他若先將石蕊試紙噴濕再貼上去，試紙就慢慢變藍了。\n\n問題：為什麼乾燥的石灰岩無法讓試紙變色，必須在有水的情況下才能展現鹼性？請説説看你的想法。",
  },
  {
    id: 13,
    title: "論證議題 1",
    initialMessage:
      "對照圖甲與圖乙的數據趨勢，檢驗小強的說法合理嗎？請說明你的看法。",
    scenarioText:
      "小強同學認為：「只要把固體粉末加進水裡攪拌均勻，水就會變得比較濃，濃水就能讓電路流通、燈泡發亮。」\n\n問題：對照圖甲與圖乙的數據趨勢，檢驗小強的說法合理嗎？請說明你的看法。",
  },
  {
    id: 14,
    title: "論證議題 2",
    initialMessage:
      "為什麼迴紋針和食鹽水可以讓燈泡發亮，但橡皮擦和糖水卻不行？請說明你的看法",
    scenarioText:
      "小明利用電池和燈泡組成一個電路，在中間留了一個斷口。\n\n他分別用：\n\n迴紋針（金屬）\n橡皮擦（塑膠）\n\n去連接這個斷口。\n\n結果發現：\n\n用迴紋針時，燈泡亮了\n用橡皮擦時，燈泡沒有亮\n\n而前一題中，我們也發現：\n\n食鹽水可以讓燈泡發亮\n糖水則不能\n\n問題：為什麼迴紋針和食鹽水可以讓燈泡發亮，但橡皮擦和糖水卻不行？請說明你的看法",
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
  {
    id: "level-3",
    label: "酸鹼中和與生活應用",
    title: "酸鹼中和與生活應用",
    description: "從螞蟻咬傷、胃藥與酸化土壤情境，練習用模擬實驗支持主張。",
    questions: [QUESTION_CONFIGS[6], QUESTION_CONFIGS[7]],
  },
  {
    id: "level-4",
    label: "圖表趨勢與酸鹼判斷",
    title: "圖表趨勢與酸鹼判斷",
    description: "分析土壤 pH、收成量與沙士對照實驗，練習用多張圖表提出主張。",
    questions: [QUESTION_CONFIGS[8], QUESTION_CONFIGS[9]],
  },
  {
    id: "level-5",
    label: "水與酸鹼反應",
    title: "水與酸鹼反應",
    description: "從乾燥粉末、酸性廢氣與石灰岩情境，練習判斷水在酸鹼測試中的角色。",
    questions: [QUESTION_CONFIGS[10], QUESTION_CONFIGS[11], QUESTION_CONFIGS[12]],
  },
  {
    id: "level-6",
    label: "水溶液與導電",
    title: "水溶液與導電",
    description: "從固體粉末加水與不同材料接入電路的情境，練習判斷導電現象與水溶液性質的關係。",
    isCurrent: true,
    questions: [QUESTION_CONFIGS[13], QUESTION_CONFIGS[14]],
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
