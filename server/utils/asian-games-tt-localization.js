const eventLabels = {
  'zh-CN': {
    prefix: '2026 亚运会：',
    matchJoin: ' — ',
    versus: '对阵',
    countries: {
      China: '中国',
      Nepal: '尼泊尔',
      Japan: '日本',
      Uzbekistan: '乌兹别克斯坦',
      Vietnam: '越南',
      'Macao, China': '中国澳门',
      'Saudi Arabia': '沙特阿拉伯',
      'North Korea': '朝鲜',
      India: '印度',
      Thailand: '泰国',
      'South Korea': '韩国',
      'Hong Kong, China': '中国香港',
      'Chinese Taipei': '中国台北',
    },
    categories: {
      "Women's Team Group A": '女子团体 A组小组赛',
      "Women's Team Group B": '女子团体 B组小组赛',
      "Men's Team Group A": '男子团体 A组小组赛',
      "Women's Team Quarterfinal": '女子团体四分之一决赛',
      "Men's Team Quarterfinal": '男子团体四分之一决赛',
      "Women's Team Semifinal": '女子团体半决赛',
      "Men's Team Semifinal": '男子团体半决赛',
      "Men's Singles Round 1 & Women's Doubles Round 2": '男子单打第1轮、女子双打第2轮',
      "Women's Team Gold Medal Match": '女子团体金牌战',
      "Men's Team Gold Medal Match": '男子团体金牌战',
      "Men's & Women's Singles Round 2": '男女单打第2轮',
      "Men's Doubles Rounds 2-3 & Women's Doubles Round 3": '男子双打第2–3轮、女子双打第3轮',
      'Mixed Doubles Quarterfinals': '混合双打四分之一决赛',
      'Mixed Doubles Semifinals': '混合双打半决赛',
      "Men's & Women's Singles Round 3": '男女单打第3轮',
      "Men's & Women's Doubles Quarterfinals": '男女双打四分之一决赛',
      "Men's & Women's Singles Quarterfinals": '男女单打四分之一决赛',
      'Mixed Doubles Gold Medal Match': '混合双打金牌战',
      "Men's Doubles Semifinals": '男子双打半决赛',
      "Women's Singles Semifinals": '女子单打半决赛',
      "Men's Doubles Gold Medal Match": '男子双打金牌战',
      "Women's Singles Gold Medal Match": '女子单打金牌战',
      "Men's Singles Semifinals": '男子单打半决赛',
      "Women's Doubles Semifinals": '女子双打半决赛',
      "Women's Doubles Gold Medal Match": '女子双打金牌战',
      "Men's Singles Gold Medal Match": '男子单打金牌战',
    },
    vehicles: {
      "Men's Singles & Women's Doubles": '男子单打、女子双打',
      "Men's & Women's Doubles": '男子双打、女子双打',
    },
  },
  en: {
    prefix: 'Asian Games 2026: ',
    matchJoin: ' — ',
    versus: 'vs',
    countries: {
      China: 'China',
      Nepal: 'Nepal',
      Japan: 'Japan',
      Uzbekistan: 'Uzbekistan',
      Vietnam: 'Vietnam',
      'Macao, China': 'Macao, China',
      'Saudi Arabia': 'Saudi Arabia',
      'North Korea': 'North Korea',
      India: 'India',
      Thailand: 'Thailand',
      'South Korea': 'South Korea',
      'Hong Kong, China': 'Hong Kong, China',
      'Chinese Taipei': 'Chinese Taipei',
    },
  },
  ja: {
    prefix: '2026年アジア競技大会：',
    matchJoin: ' — ',
    versus: '対',
    countries: {
      China: '中国', Nepal: 'ネパール', Japan: '日本', Uzbekistan: 'ウズベキスタン',
      Vietnam: 'ベトナム', 'Macao, China': 'マカオ（中国）', 'Saudi Arabia': 'サウジアラビア',
      'North Korea': '北朝鮮', India: 'インド', Thailand: 'タイ', 'South Korea': '韓国',
      'Hong Kong, China': '香港（中国）', 'Chinese Taipei': 'チャイニーズタイペイ',
    },
    categories: {
      "Women's Team Group A": '女子団体 A組',
      "Women's Team Group B": '女子団体 B組',
      "Men's Team Group A": '男子団体 A組',
      "Women's Team Quarterfinal": '女子団体 準々決勝',
      "Men's Team Quarterfinal": '男子団体 準々決勝',
      "Women's Team Semifinal": '女子団体 準決勝',
      "Men's Team Semifinal": '男子団体 準決勝',
      "Men's Singles Round 1 & Women's Doubles Round 2": '男子シングルス第1回戦・女子ダブルス第2回戦',
      "Women's Team Gold Medal Match": '女子団体 金メダル決定戦',
      "Men's Team Gold Medal Match": '男子団体 金メダル決定戦',
      "Men's & Women's Singles Round 2": '男女シングルス第2回戦',
      "Men's Doubles Rounds 2-3 & Women's Doubles Round 3": '男子ダブルス第2・3回戦・女子ダブルス第3回戦',
      'Mixed Doubles Quarterfinals': '混合ダブルス準々決勝',
      'Mixed Doubles Semifinals': '混合ダブルス準決勝',
      "Men's & Women's Singles Round 3": '男女シングルス第3回戦',
      "Men's & Women's Doubles Quarterfinals": '男女ダブルス準々決勝',
      "Men's & Women's Singles Quarterfinals": '男女シングルス準々決勝',
      'Mixed Doubles Gold Medal Match': '混合ダブルス金メダル決定戦',
      "Men's Doubles Semifinals": '男子ダブルス準決勝',
      "Women's Singles Semifinals": '女子シングルス準決勝',
      "Men's Doubles Gold Medal Match": '男子ダブルス金メダル決定戦',
      "Women's Singles Gold Medal Match": '女子シングルス金メダル決定戦',
      "Men's Singles Semifinals": '男子シングルス準決勝',
      "Women's Doubles Semifinals": '女子ダブルス準決勝',
      "Women's Doubles Gold Medal Match": '女子ダブルス金メダル決定戦',
      "Men's Singles Gold Medal Match": '男子シングルス金メダル決定戦',
    },
    vehicles: {
      "Men's Singles & Women's Doubles": '男子シングルス・女子ダブルス',
      "Men's & Women's Doubles": '男子・女子ダブルス',
    },
  },
  ko: {
    prefix: '2026 아시안게임: ',
    matchJoin: ' — ',
    versus: '대',
    countries: {
      China: '중국', Nepal: '네팔', Japan: '일본', Uzbekistan: '우즈베키스탄',
      Vietnam: '베트남', 'Macao, China': '마카오(중국)', 'Saudi Arabia': '사우디아라비아',
      'North Korea': '북한', India: '인도', Thailand: '태국', 'South Korea': '대한민국',
      'Hong Kong, China': '홍콩(중국)', 'Chinese Taipei': '차이니즈 타이베이',
    },
    categories: {
      "Women's Team Group A": '여자 단체 A조 조별리그',
      "Women's Team Group B": '여자 단체 B조 조별리그',
      "Men's Team Group A": '남자 단체 A조 조별리그',
      "Women's Team Quarterfinal": '여자 단체 8강',
      "Men's Team Quarterfinal": '남자 단체 8강',
      "Women's Team Semifinal": '여자 단체 준결승',
      "Men's Team Semifinal": '남자 단체 준결승',
      "Men's Singles Round 1 & Women's Doubles Round 2": '남자 단식 1회전·여자 복식 2회전',
      "Women's Team Gold Medal Match": '여자 단체 금메달 결정전',
      "Men's Team Gold Medal Match": '남자 단체 금메달 결정전',
      "Men's & Women's Singles Round 2": '남녀 단식 2회전',
      "Men's Doubles Rounds 2-3 & Women's Doubles Round 3": '남자 복식 2·3회전·여자 복식 3회전',
      'Mixed Doubles Quarterfinals': '혼합 복식 8강',
      'Mixed Doubles Semifinals': '혼합 복식 준결승',
      "Men's & Women's Singles Round 3": '남녀 단식 3회전',
      "Men's & Women's Doubles Quarterfinals": '남녀 복식 8강',
      "Men's & Women's Singles Quarterfinals": '남녀 단식 8강',
      'Mixed Doubles Gold Medal Match': '혼합 복식 금메달 결정전',
      "Men's Doubles Semifinals": '남자 복식 준결승',
      "Women's Singles Semifinals": '여자 단식 준결승',
      "Men's Doubles Gold Medal Match": '남자 복식 금메달 결정전',
      "Women's Singles Gold Medal Match": '여자 단식 금메달 결정전',
      "Men's Singles Semifinals": '남자 단식 준결승',
      "Women's Doubles Semifinals": '여자 복식 준결승',
      "Women's Doubles Gold Medal Match": '여자 복식 금메달 결정전',
      "Men's Singles Gold Medal Match": '남자 단식 금메달 결정전',
    },
    vehicles: {
      "Men's Singles & Women's Doubles": '남자 단식·여자 복식',
      "Men's & Women's Doubles": '남녀 복식',
    },
  },
  es: {
    prefix: 'Juegos Asiáticos 2026: ',
    matchJoin: ' — ',
    versus: 'contra',
    countries: {
      China: 'China', Nepal: 'Nepal', Japan: 'Japón', Uzbekistan: 'Uzbekistán',
      Vietnam: 'Vietnam', 'Macao, China': 'Macao (China)', 'Saudi Arabia': 'Arabia Saudí',
      'North Korea': 'Corea del Norte', India: 'India', Thailand: 'Tailandia',
      'South Korea': 'Corea del Sur', 'Hong Kong, China': 'Hong Kong, China',
      'Chinese Taipei': 'China Taipéi',
    },
    categories: {
      "Women's Team Group A": 'Equipos femeninos, grupo A',
      "Women's Team Group B": 'Equipos femeninos, grupo B',
      "Men's Team Group A": 'Equipos masculinos, grupo A',
      "Women's Team Quarterfinal": 'Cuartos de final por equipos femeninos',
      "Men's Team Quarterfinal": 'Cuartos de final por equipos masculinos',
      "Women's Team Semifinal": 'Semifinal por equipos femeninos',
      "Men's Team Semifinal": 'Semifinal por equipos masculinos',
      "Men's Singles Round 1 & Women's Doubles Round 2": 'Individual masculino, ronda 1 y dobles femenino, ronda 2',
      "Women's Team Gold Medal Match": 'Final por equipos femeninos (medalla de oro)',
      "Men's Team Gold Medal Match": 'Final por equipos masculinos (medalla de oro)',
      "Men's & Women's Singles Round 2": 'Individuales masculino y femenino, ronda 2',
      "Men's Doubles Rounds 2-3 & Women's Doubles Round 3": 'Dobles masculino, rondas 2–3 y dobles femenino, ronda 3',
      'Mixed Doubles Quarterfinals': 'Cuartos de final de dobles mixtos',
      'Mixed Doubles Semifinals': 'Semifinales de dobles mixtos',
      "Men's & Women's Singles Round 3": 'Individuales masculino y femenino, ronda 3',
      "Men's & Women's Doubles Quarterfinals": 'Cuartos de final de dobles masculinos y femeninos',
      "Men's & Women's Singles Quarterfinals": 'Cuartos de final de individuales masculino y femenino',
      'Mixed Doubles Gold Medal Match': 'Final de dobles mixtos por la medalla de oro',
      "Men's Doubles Semifinals": 'Semifinales de dobles masculinos',
      "Women's Singles Semifinals": 'Semifinales de individual femenino',
      "Men's Doubles Gold Medal Match": 'Final de dobles masculinos por la medalla de oro',
      "Women's Singles Gold Medal Match": 'Final de individual femenino por la medalla de oro',
      "Men's Singles Semifinals": 'Semifinales de individual masculino',
      "Women's Doubles Semifinals": 'Semifinales de dobles femeninos',
      "Women's Doubles Gold Medal Match": 'Final de dobles femeninos por la medalla de oro',
      "Men's Singles Gold Medal Match": 'Final de individual masculino por la medalla de oro',
    },
    vehicles: {
      "Men's Singles & Women's Doubles": 'Individual masculino y dobles femenino',
      "Men's & Women's Doubles": 'Dobles masculinos y femeninos',
    },
  },
  fr: {
    prefix: 'Jeux asiatiques 2026 : ',
    matchJoin: ' — ',
    versus: 'contre',
    countries: {
      China: 'Chine', Nepal: 'Népal', Japan: 'Japon', Uzbekistan: 'Ouzbékistan',
      Vietnam: 'Vietnam', 'Macao, China': 'Macao (Chine)', 'Saudi Arabia': 'Arabie saoudite',
      'North Korea': 'Corée du Nord', India: 'Inde', Thailand: 'Thaïlande',
      'South Korea': 'Corée du Sud', 'Hong Kong, China': 'Hong Kong, Chine',
      'Chinese Taipei': 'Taipei chinois',
    },
    categories: {
      "Women's Team Group A": 'Équipe féminine, groupe A',
      "Women's Team Group B": 'Équipe féminine, groupe B',
      "Men's Team Group A": 'Équipe masculine, groupe A',
      "Women's Team Quarterfinal": 'Quart de finale par équipes féminines',
      "Men's Team Quarterfinal": 'Quart de finale par équipes masculines',
      "Women's Team Semifinal": 'Demi-finale par équipes féminines',
      "Men's Team Semifinal": 'Demi-finale par équipes masculines',
      "Men's Singles Round 1 & Women's Doubles Round 2": 'Simple messieurs, 1er tour et double dames, 2e tour',
      "Women's Team Gold Medal Match": 'Finale par équipes féminines pour la médaille d’or',
      "Men's Team Gold Medal Match": 'Finale par équipes masculines pour la médaille d’or',
      "Men's & Women's Singles Round 2": 'Simples messieurs et dames, 2e tour',
      "Men's Doubles Rounds 2-3 & Women's Doubles Round 3": 'Doubles messieurs, 2e et 3e tours et double dames, 3e tour',
      'Mixed Doubles Quarterfinals': 'Quarts de finale du double mixte',
      'Mixed Doubles Semifinals': 'Demi-finales du double mixte',
      "Men's & Women's Singles Round 3": 'Simples messieurs et dames, 3e tour',
      "Men's & Women's Doubles Quarterfinals": 'Quarts de finale des doubles messieurs et dames',
      "Men's & Women's Singles Quarterfinals": 'Quarts de finale des simples messieurs et dames',
      'Mixed Doubles Gold Medal Match': 'Finale du double mixte pour la médaille d’or',
      "Men's Doubles Semifinals": 'Demi-finales du double messieurs',
      "Women's Singles Semifinals": 'Demi-finales du simple dames',
      "Men's Doubles Gold Medal Match": 'Finale du double messieurs pour la médaille d’or',
      "Women's Singles Gold Medal Match": 'Finale du simple dames pour la médaille d’or',
      "Men's Singles Semifinals": 'Demi-finales du simple messieurs',
      "Women's Doubles Semifinals": 'Demi-finales du double dames',
      "Women's Doubles Gold Medal Match": 'Finale du double dames pour la médaille d’or',
      "Men's Singles Gold Medal Match": 'Finale du simple messieurs pour la médaille d’or',
    },
    vehicles: {
      "Men's Singles & Women's Doubles": 'Simple messieurs et double dames',
      "Men's & Women's Doubles": 'Doubles messieurs et dames',
    },
  },
  de: {
    prefix: 'Asienspiele 2026: ',
    matchJoin: ' — ',
    versus: 'gegen',
    countries: {
      China: 'China', Nepal: 'Nepal', Japan: 'Japan', Uzbekistan: 'Usbekistan',
      Vietnam: 'Vietnam', 'Macao, China': 'Macao (China)', 'Saudi Arabia': 'Saudi-Arabien',
      'North Korea': 'Nordkorea', India: 'Indien', Thailand: 'Thailand',
      'South Korea': 'Südkorea', 'Hong Kong, China': 'Hongkong (China)',
      'Chinese Taipei': 'Chinese Taipei',
    },
    categories: {
      "Women's Team Group A": 'Damen-Team, Gruppe A',
      "Women's Team Group B": 'Damen-Team, Gruppe B',
      "Men's Team Group A": 'Herren-Team, Gruppe A',
      "Women's Team Quarterfinal": 'Viertelfinale Damen-Team',
      "Men's Team Quarterfinal": 'Viertelfinale Herren-Team',
      "Women's Team Semifinal": 'Halbfinale Damen-Team',
      "Men's Team Semifinal": 'Halbfinale Herren-Team',
      "Men's Singles Round 1 & Women's Doubles Round 2": 'Herreneinzel, Runde 1 und Damendoppel, Runde 2',
      "Women's Team Gold Medal Match": 'Finale Damen-Team um Gold',
      "Men's Team Gold Medal Match": 'Finale Herren-Team um Gold',
      "Men's & Women's Singles Round 2": 'Einzel Herren und Damen, Runde 2',
      "Men's Doubles Rounds 2-3 & Women's Doubles Round 3": 'Herrendoppel, Runden 2–3 und Damendoppel, Runde 3',
      'Mixed Doubles Quarterfinals': 'Viertelfinale Mixed-Doppel',
      'Mixed Doubles Semifinals': 'Halbfinale Mixed-Doppel',
      "Men's & Women's Singles Round 3": 'Einzel Herren und Damen, Runde 3',
      "Men's & Women's Doubles Quarterfinals": 'Viertelfinale Doppel Herren und Damen',
      "Men's & Women's Singles Quarterfinals": 'Viertelfinale Einzel Herren und Damen',
      'Mixed Doubles Gold Medal Match': 'Finale Mixed-Doppel um Gold',
      "Men's Doubles Semifinals": 'Halbfinale Herrendoppel',
      "Women's Singles Semifinals": 'Halbfinale Dameneinzel',
      "Men's Doubles Gold Medal Match": 'Finale Herrendoppel um Gold',
      "Women's Singles Gold Medal Match": 'Finale Dameneinzel um Gold',
      "Men's Singles Semifinals": 'Halbfinale Herreneinzel',
      "Women's Doubles Semifinals": 'Halbfinale Damendoppel',
      "Women's Doubles Gold Medal Match": 'Finale Damendoppel um Gold',
      "Men's Singles Gold Medal Match": 'Finale Herreneinzel um Gold',
    },
    vehicles: {
      "Men's Singles & Women's Doubles": 'Herreneinzel und Damendoppel',
      "Men's & Women's Doubles": 'Herren- und Damendoppel',
    },
  },
}

const venueByLocale = {
  'zh-CN': 'Sky Hall Toyota，日本爱知县丰田市',
  en: 'Sky Hall Toyota, Toyota, Aichi',
  ja: 'Sky Hall Toyota（愛知県豊田市）',
  ko: 'Sky Hall Toyota, 일본 아이치현 도요타시',
  es: 'Sky Hall Toyota, Toyota, Aichi (Japón)',
  fr: 'Sky Hall Toyota, Toyota, Aichi (Japon)',
  de: 'Sky Hall Toyota, Toyota, Aichi, Japan',
}

function participantName(value) {
  if (typeof value === 'string') return value
  return typeof value?.name === 'string' ? value.name : ''
}

function englishEventCategory(mission) {
  const title = String(mission.titleEn || mission.title || '')
    .replace(/^Asian Games 2026:\s*/, '')

  if (participantName(mission.competitor1) && participantName(mission.competitor2)) {
    const matchupIndex = title.indexOf(' - ')
    if (matchupIndex >= 0) return title.slice(0, matchupIndex).trim()

    return String(mission.vehicle || '').split('·').pop()?.trim() || title
  }

  return title.replace(/\s*🥇\s*$/, '').trim()
}

function englishVehicle(mission, category) {
  const parts = String(mission.vehicle || '').split('·')
  return parts.length > 1 ? parts.slice(1).join('·').trim() : category
}

function countryName(value, locale) {
  if (!value) return ''
  return eventLabels[locale]?.countries?.[value] || value
}

/** Return only browser-facing Asian Games text; the ICS source remains English and unchanged. */
export function localizeAsianGamesTtMission(mission, locale = 'en') {
  const activeLocale = Object.hasOwn(eventLabels, locale) ? locale : 'en'
  const labels = eventLabels[activeLocale]
  const category = englishEventCategory(mission)
  const categoryLabel = labels.categories?.[category] || category
  const first = participantName(mission.competitor1)
  const second = participantName(mission.competitor2)
  const hasMatchup = Boolean(first && second)
  const matchup = hasMatchup
    ? `${labels.matchJoin}${countryName(first, activeLocale)} ${labels.versus} ${countryName(second, activeLocale)}`
    : ''
  const medal = String(mission.titleEn || mission.title || '').includes('🥇') ? ' 🥇' : ''
  const rawVehicleParts = String(mission.vehicle || '').split('·')
  const localizedVehicle = activeLocale === 'zh-CN'
    ? rawVehicleParts[0]?.trim()
    : hasMatchup
      ? categoryLabel
      : labels.vehicles?.[englishVehicle(mission, category)]
        || labels.categories?.[englishVehicle(mission, category)]
        || categoryLabel

  const winnerText = String(mission.winner || '')
  const winnerEnglish = winnerText.match(/\(([^)]+)\)/)?.[1]
  const winnerChinese = winnerText.split(/\s+\(/)[0]
  const winner = activeLocale === 'zh-CN'
    ? winnerChinese
    : countryName(winnerEnglish || winnerText, activeLocale)

  const gameScores = Array.isArray(mission.gameScores) && mission.gameScores.length
    ? activeLocale === 'zh-CN'
      ? mission.gameScores
      : mission.gameScores.map(score => String(score).split(/\s+\(/)[0])
    : undefined

  return {
    title: `${labels.prefix}${categoryLabel}${matchup}${medal}`,
    vehicle: localizedVehicle || categoryLabel,
    location: venueByLocale[activeLocale],
    winner: winner || undefined,
    gameScores,
  }
}
