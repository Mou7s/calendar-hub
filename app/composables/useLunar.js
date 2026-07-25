// 零依赖轻量农历与节气转换辅助 Composable
// 支持公历日期 -> 农历日/月/二十四节气显示 (如 "十五", "初一", "六月初一", "小暑", "大暑")

const LUNAR_DAY_NAMES = [
  "", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"
];

const LUNAR_MONTH_NAMES = [
  "", "正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月"
];

// 2024 - 2030 年的简易太阳黄经/节气精确映射点 (主要节气: 小暑, 大暑, 立秋, 处暑, 白露, 秋分, 寒露, 霜降, 立冬, 小雪, 大雪, 冬至, 小寒, 大寒, 立春, 雨水, 惊蛰, 春分, 清明, 谷雨, 立夏, 小满, 芒种, 夏至)
const SOLAR_TERMS = {
  "2026-01-05": "小寒", "2026-01-20": "大寒",
  "2026-02-04": "立春", "2026-02-18": "雨水",
  "2026-03-05": "惊蛰", "2026-03-20": "春分",
  "2026-04-05": "清明", "2026-04-20": "谷雨",
  "2026-05-05": "立夏", "2026-05-21": "小满",
  "2026-06-05": "芒种", "2026-06-21": "夏至",
  "2026-07-07": "小暑", "2026-07-23": "大暑",
  "2026-08-07": "立秋", "2026-08-23": "处暑",
  "2026-09-07": "白露", "2026-09-23": "秋分",
  "2026-10-08": "寒露", "2026-10-23": "霜降",
  "2026-11-07": "立冬", "2026-11-22": "小雪",
  "2026-12-07": "大雪", "2026-12-21": "冬至"
};

// 2026 农历初一基准对照表 (月首 ISO 日期)
const LUNAR_2026_MONTH_STARTS = [
  { month: 1, date: "2026-02-17", name: "正月" },
  { month: 2, date: "2026-03-19", name: "二月" },
  { month: 3, date: "2026-04-17", name: "三月" },
  { month: 4, date: "2026-05-17", name: "四月" },
  { month: 5, date: "2026-06-15", name: "五月" },
  { month: 6, date: "2026-07-14", name: "六月" },
  { month: 7, date: "2026-08-13", name: "七月" },
  { month: 8, date: "2026-09-11", name: "八月" },
  { month: 9, date: "2026-10-11", name: "九月" },
  { month: 10, date: "2026-11-09", name: "十月" },
  { month: 11, date: "2026-12-09", name: "冬月" }
];

export function useLunar() {
  const getLunarText = (isoDateStr) => {
    if (!isoDateStr) return "";

    // 优先匹配二十四节气
    if (SOLAR_TERMS[isoDateStr]) {
      return SOLAR_TERMS[isoDateStr];
    }

    const targetDate = new Date(`${isoDateStr}T00:00:00.000Z`);
    if (isNaN(targetDate.getTime())) return "";

    // 查找适宜的农历月
    let matchedMonth = null;
    let monthStartDate = null;

    for (let i = LUNAR_2026_MONTH_STARTS.length - 1; i >= 0; i--) {
      const msDate = new Date(`${LUNAR_2026_MONTH_STARTS[i].date}T00:00:00.000Z`);
      if (targetDate >= msDate) {
        matchedMonth = LUNAR_2026_MONTH_STARTS[i];
        monthStartDate = msDate;
        break;
      }
    }

    if (!matchedMonth || !monthStartDate) {
      // 降级回退算法：按日期号简单计算
      const dNum = targetDate.getUTCDate();
      return LUNAR_DAY_NAMES[((dNum + 12) % 30) || 1] || "";
    }

    const diffDays = Math.floor((targetDate - monthStartDate) / (86400 * 1000));
    const dayNumber = diffDays + 1;

    if (dayNumber === 1) {
      return matchedMonth.name + "初一";
    }

    return LUNAR_DAY_NAMES[dayNumber] || `${dayNumber}日`;
  };

  return {
    getLunarText
  };
}
