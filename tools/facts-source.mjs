// Hand-curated trivia sets. Each set becomes one prompt.
//
// Rules for adding a set (keep the game fair):
//  - The answer list must be COMPLETE: anything missing marks a correct player wrong.
//  - Only stable facts (geography, history). Nothing that changes every year
//    (e.g. Michelin stars, F1 calendars) unless it's rebuilt from a dated source.
//  - Every answer gets a short "detail" that explains why it counts.
//  - `topic` is the Wikipedia article shown under "Learn more".
//
// Fields: id, family, text, topic, source, why (sentence before the detail), answers {ISO3: detail}

export const CURATED = [
  // ---------------- rivers ----------------
  {
    id: "danube", family: "river", topic: "Danube", source: "Wikipedia: Danube",
    text: "Pin a country the Danube flows through.",
    why: "The Danube, Europe's second-longest river, flows through",
    answers: {
      DEU: "Germany, where it rises in the Black Forest", AUT: "Austria, past Vienna", SVK: "Slovakia, past Bratislava",
      HUN: "Hungary, through the middle of Budapest", HRV: "Croatia, along its border with Serbia", SRB: "Serbia, past Belgrade",
      ROU: "Romania, ending in the Danube Delta on the Black Sea", BGR: "Bulgaria, along its northern border",
      MDA: "Moldova, which touches the river for only about 600 m", UKR: "Ukraine, at the delta",
    },
  },
  {
    id: "rhine", family: "river", topic: "Rhine", source: "Wikipedia: Rhine",
    text: "Pin a country the Rhine flows through or along.",
    why: "The Rhine runs from the Swiss Alps to the North Sea through",
    answers: {
      CHE: "Switzerland, where it rises in the Alps", LIE: "Liechtenstein, along its border with Switzerland",
      AUT: "Austria, into Lake Constance", DEU: "Germany, its longest stretch", FRA: "France, along the Alsace border",
      NLD: "the Netherlands, where it reaches the North Sea",
    },
  },
  {
    id: "nile", family: "river", topic: "Nile", source: "Wikipedia: Nile",
    text: "Pin a country the Nile, White Nile or Blue Nile flows through.",
    why: "The Nile system flows through",
    answers: {
      EGY: "Egypt, the Nile's final stretch to the Mediterranean", SDN: "Sudan, where the White and Blue Nile meet at Khartoum",
      SSD: "South Sudan, along the White Nile", UGA: "Uganda, where the White Nile leaves Lake Victoria",
      ETH: "Ethiopia, source of the Blue Nile at Lake Tana",
    },
  },
  {
    id: "amazon", family: "river", topic: "Amazon River", source: "Wikipedia: Amazon River",
    text: "Pin a country the Amazon River itself flows through.",
    why: "The main stem of the Amazon flows through",
    answers: { PER: "Peru, where it begins near Iquitos", COL: "Colombia, at Leticia", BRA: "Brazil, most of its length to the Atlantic" },
  },
  {
    id: "mekong", family: "river", topic: "Mekong", source: "Wikipedia: Mekong",
    text: "Pin a country the Mekong flows through or along.",
    why: "The Mekong flows from the Tibetan Plateau through",
    answers: {
      CHN: "China, where it's called the Lancang", MMR: "Myanmar, along its border with Laos", LAO: "Laos, past Vientiane",
      THA: "Thailand, along its border with Laos", KHM: "Cambodia, past Phnom Penh", VNM: "Vietnam, ending in the Mekong Delta",
    },
  },
  {
    id: "niger", family: "river", topic: "Niger River", source: "Wikipedia: Niger River",
    text: "Pin a country the Niger River flows through or along.",
    why: "The Niger curves through West Africa, flowing through",
    answers: {
      GIN: "Guinea, where it rises", MLI: "Mali, past Bamako and Timbuktu", NER: "Niger, past Niamey",
      BEN: "Benin, along its border with Niger", NGA: "Nigeria, ending in the Niger Delta",
    },
  },
  {
    id: "zambezi", family: "river", topic: "Zambezi", source: "Wikipedia: Zambezi",
    text: "Pin a country the Zambezi flows through or along.",
    why: "The Zambezi, home of Victoria Falls, flows through",
    answers: {
      ZMB: "Zambia, where it rises", AGO: "Angola", NAM: "Namibia, along the Caprivi Strip", BWA: "Botswana, touching it at Kazungula",
      ZWE: "Zimbabwe, sharing Victoria Falls with Zambia", MOZ: "Mozambique, to the Indian Ocean",
    },
  },
  {
    id: "tigris-euphrates", family: "river", topic: "Tigris–Euphrates river system", source: "Wikipedia: Tigris; Euphrates",
    text: "Pin a country the Tigris or Euphrates flows through.",
    why: "The rivers of ancient Mesopotamia flow through",
    answers: { TUR: "Türkiye, where both rivers rise", SYR: "Syria, crossed by the Euphrates", IRQ: "Iraq, where they join as the Shatt al-Arab" },
  },
  {
    id: "indus", family: "river", topic: "Indus River", source: "Wikipedia: Indus River",
    text: "Pin a country the Indus flows through.",
    why: "The Indus flows from Tibet to the Arabian Sea through",
    answers: { CHN: "China (Tibet), where it rises", IND: "India, through Ladakh", PAK: "Pakistan, its longest stretch" },
  },
  {
    id: "parana", family: "river", topic: "Paraná River", source: "Wikipedia: Paraná River",
    text: "Pin a country the Paraná River flows through or along.",
    why: "The Paraná, South America's second-longest river, flows through",
    answers: { BRA: "Brazil, where it begins", PRY: "Paraguay, along its borders", ARG: "Argentina, to the Río de la Plata" },
  },

  // ---------------- seas ----------------
  {
    id: "mediterranean", family: "sea", topic: "Mediterranean Sea", source: "Wikipedia: Mediterranean Sea",
    text: "Pin a country with a Mediterranean coastline.",
    why: "The Mediterranean Sea coastline includes",
    answers: {
      ESP: "Spain", FRA: "France", MCO: "Monaco", ITA: "Italy", MLT: "Malta", SVN: "Slovenia (a short stretch near Koper)", HRV: "Croatia",
      BIH: "Bosnia and Herzegovina (about 20 km at Neum)", MNE: "Montenegro", ALB: "Albania", GRC: "Greece", TUR: "Türkiye", CYP: "Cyprus",
      SYR: "Syria", LBN: "Lebanon", ISR: "Israel", PSE: "Palestine (Gaza)", EGY: "Egypt", LBY: "Libya", TUN: "Tunisia", DZA: "Algeria", MAR: "Morocco",
    },
  },
  {
    id: "baltic", family: "sea", topic: "Baltic Sea", source: "Wikipedia: Baltic Sea",
    text: "Pin a country with a Baltic Sea coastline.",
    why: "The Baltic Sea coastline includes",
    answers: { SWE: "Sweden", FIN: "Finland", RUS: "Russia (St Petersburg and Kaliningrad)", EST: "Estonia", LVA: "Latvia", LTU: "Lithuania", POL: "Poland", DEU: "Germany", DNK: "Denmark" },
  },
  {
    id: "black-sea", family: "sea", topic: "Black Sea", source: "Wikipedia: Black Sea",
    text: "Pin a country with a Black Sea coastline.",
    why: "The Black Sea coastline includes",
    answers: { TUR: "Türkiye", BGR: "Bulgaria", ROU: "Romania", UKR: "Ukraine", RUS: "Russia", GEO: "Georgia" },
  },
  {
    id: "caspian", family: "sea", topic: "Caspian Sea", source: "Wikipedia: Caspian Sea",
    text: "Pin a country on the shores of the Caspian Sea.",
    why: "The Caspian Sea, the world's largest inland body of water, is bordered by",
    answers: { RUS: "Russia", KAZ: "Kazakhstan", TKM: "Turkmenistan", IRN: "Iran", AZE: "Azerbaijan (Baku is on its shore)" },
  },
  {
    id: "red-sea", family: "sea", topic: "Red Sea", source: "Wikipedia: Red Sea",
    text: "Pin a country with a Red Sea coastline (including the Gulfs of Suez and Aqaba).",
    why: "The Red Sea coastline includes",
    answers: { EGY: "Egypt", SDN: "Sudan", ERI: "Eritrea", DJI: "Djibouti, at the Bab-el-Mandeb strait", SAU: "Saudi Arabia", YEM: "Yemen", ISR: "Israel (Eilat)", JOR: "Jordan (Aqaba)" },
  },
  {
    id: "persian-gulf", family: "sea", topic: "Persian Gulf", source: "Wikipedia: Persian Gulf",
    text: "Pin a country with a coastline on the Persian Gulf.",
    why: "The Persian Gulf coastline includes",
    answers: { IRN: "Iran", IRQ: "Iraq (a short coast at Umm Qasr)", KWT: "Kuwait", SAU: "Saudi Arabia", BHR: "Bahrain", QAT: "Qatar", ARE: "the United Arab Emirates", OMN: "Oman (the Musandam exclave)" },
  },
  {
    id: "north-sea", family: "sea", topic: "North Sea", source: "Wikipedia: North Sea",
    text: "Pin a country with a North Sea coastline.",
    why: "The North Sea coastline includes",
    answers: { GBR: "the United Kingdom", NOR: "Norway", DNK: "Denmark", DEU: "Germany", NLD: "the Netherlands", BEL: "Belgium", FRA: "France (a short stretch around Dunkirk)" },
  },

  // ---------------- mountains & deserts ----------------
  {
    id: "alps", family: "mountains", topic: "Alps", source: "Alpine Convention member states",
    text: "Pin a country that the Alps reach into.",
    why: "The Alps stretch across eight countries, including",
    answers: { FRA: "France (Mont Blanc)", CHE: "Switzerland", ITA: "Italy", MCO: "Monaco, at the range's southern end", LIE: "Liechtenstein", AUT: "Austria", DEU: "Germany (Zugspitze)", SVN: "Slovenia (Triglav)" },
  },
  {
    id: "andes", family: "mountains", topic: "Andes", source: "Wikipedia: Andes",
    text: "Pin a country the Andes run through.",
    why: "The Andes, the world's longest mountain range, run through",
    answers: { VEN: "Venezuela", COL: "Colombia", ECU: "Ecuador (Chimborazo)", PER: "Peru", BOL: "Bolivia", CHL: "Chile", ARG: "Argentina (Aconcagua, the highest peak outside Asia)" },
  },
  {
    id: "eight-thousanders", family: "mountains", topic: "Eight-thousander", source: "Wikipedia: Eight-thousander",
    text: "Pin a country with a mountain over 8,000 metres.",
    why: "All fourteen peaks over 8,000 m are in the Himalaya and Karakoram:",
    answers: { NPL: "Nepal has eight, including Everest", CHN: "China shares Everest, K2 and others", PAK: "Pakistan has K2 and four more", IND: "India shares Kangchenjunga with Nepal" },
  },
  {
    id: "sahara", family: "desert", topic: "Sahara", source: "Wikipedia: Sahara",
    text: "Pin a country the Sahara Desert covers part of.",
    why: "The Sahara, the largest hot desert, covers part of",
    answers: { DZA: "Algeria", TCD: "Chad", EGY: "Egypt", LBY: "Libya", MLI: "Mali", MRT: "Mauritania", MAR: "Morocco", NER: "Niger", SDN: "Sudan", TUN: "Tunisia" },
  },
  {
    id: "gobi", family: "desert", topic: "Gobi Desert", source: "Wikipedia: Gobi Desert",
    text: "Pin a country the Gobi Desert lies in.",
    why: "The Gobi lies in",
    answers: { MNG: "southern Mongolia", CHN: "northern China (Inner Mongolia)" },
  },
  {
    id: "kalahari", family: "desert", topic: "Kalahari Desert", source: "Wikipedia: Kalahari Desert",
    text: "Pin a country the Kalahari Desert lies in.",
    why: "The Kalahari covers",
    answers: { BWA: "most of Botswana", NAM: "eastern Namibia", ZAF: "northern South Africa" },
  },

  // ---------------- animals ----------------
  {
    id: "tigers", family: "animals", topic: "Tiger", source: "IUCN Red List: Panthera tigris (2022)",
    text: "Pin a country where tigers still live in the wild.",
    why: "Wild tigers survive in only about ten countries, including",
    answers: {
      IND: "India, home to about three-quarters of the world's wild tigers", BGD: "Bangladesh, in the Sundarbans mangroves", BTN: "Bhutan",
      NPL: "Nepal", CHN: "China (a few in the far northeast)", RUS: "Russia, home of the Siberian (Amur) tiger", THA: "Thailand",
      MYS: "Malaysia (Malayan tiger)", IDN: "Indonesia (Sumatran tiger)", MMR: "Myanmar",
    },
  },
  {
    id: "snow-leopards", family: "animals", topic: "Snow leopard", source: "Global Snow Leopard and Ecosystem Protection Program",
    text: "Pin a country where wild snow leopards live.",
    why: "Snow leopards roam the high mountains of twelve countries, including",
    answers: {
      AFG: "Afghanistan (Wakhan Corridor)", BTN: "Bhutan", CHN: "China, with the largest population", IND: "India", KAZ: "Kazakhstan",
      KGZ: "Kyrgyzstan", MNG: "Mongolia", NPL: "Nepal", PAK: "Pakistan", RUS: "Russia", TJK: "Tajikistan", UZB: "Uzbekistan",
    },
  },
  {
    id: "asian-elephants", family: "animals", topic: "Asian elephant", source: "IUCN Red List: Elephas maximus",
    text: "Pin a country where wild Asian elephants live.",
    why: "Wild Asian elephants live in thirteen countries, including",
    answers: {
      IND: "India, with most of them", LKA: "Sri Lanka", NPL: "Nepal", BTN: "Bhutan", BGD: "Bangladesh", MMR: "Myanmar", THA: "Thailand",
      LAO: "Laos, once called 'land of a million elephants'", KHM: "Cambodia", VNM: "Vietnam", MYS: "Malaysia", IDN: "Indonesia (Sumatra and Borneo)", CHN: "China (Yunnan)",
    },
  },
  {
    id: "orangutans", family: "animals", topic: "Orangutan", source: "IUCN Red List: Pongo",
    text: "Pin a country where wild orangutans live.",
    why: "Orangutans live only on Borneo and Sumatra:",
    answers: { IDN: "Indonesia (Borneo and Sumatra)", MYS: "Malaysia (Sabah and Sarawak on Borneo)" },
  },
  {
    id: "polar-bears", family: "animals", topic: "Polar bear", source: "Agreement on the Conservation of Polar Bears (range states)",
    text: "Pin a country where wild polar bears live.",
    why: "Polar bears live in five Arctic countries:",
    answers: { CAN: "Canada, with about two-thirds of them", USA: "the United States (Alaska)", RUS: "Russia", NOR: "Norway (Svalbard)", DNK: "Denmark (Greenland)" },
  },
  {
    id: "gorillas", family: "animals", topic: "Gorilla", source: "IUCN Red List: Gorilla",
    text: "Pin a country where wild gorillas live.",
    why: "Wild gorillas live in the forests of",
    answers: {
      NGA: "Nigeria (Cross River gorilla)", CMR: "Cameroon", CAF: "the Central African Republic", GNQ: "Equatorial Guinea", GAB: "Gabon",
      COG: "the Republic of the Congo", COD: "DR Congo (including eastern lowland gorillas)", AGO: "Angola (Cabinda)",
      UGA: "Uganda (mountain gorillas of Bwindi)", RWA: "Rwanda (mountain gorillas of the Virunga volcanoes)",
    },
  },

  // ---------------- culture & landmarks ----------------
  {
    id: "disney", family: "landmarks", topic: "Disney Experiences", source: "Disney parks and resorts",
    text: "Pin a country with a Disney theme park resort.",
    why: "Disney runs theme park resorts in",
    answers: {
      USA: "the United States: Disneyland (California) and Walt Disney World (Florida)", FRA: "France: Disneyland Paris",
      JPN: "Japan: Tokyo Disney Resort", CHN: "China: Shanghai Disney Resort and Hong Kong Disneyland",
    },
  },
  {
    id: "new7wonders", family: "landmarks", topic: "New 7 Wonders of the World", source: "New7Wonders Foundation (2007)",
    text: "Pin a country home to one of the New Seven Wonders of the World.",
    why: "The New Seven Wonders (voted 2007) include",
    answers: {
      CHN: "the Great Wall of China", JOR: "Petra, the rock-cut city in Jordan", BRA: "Christ the Redeemer in Rio de Janeiro, Brazil",
      PER: "Machu Picchu in Peru", MEX: "Chichén Itzá in Mexico", ITA: "the Colosseum in Rome, Italy", IND: "the Taj Mahal in Agra, India",
    },
  },
  {
    id: "summer-olympics", family: "sport", topic: "Summer Olympic Games", source: "IOC: Olympic Games host cities",
    text: "Pin a country that has hosted the Summer Olympics.",
    why: "Summer Olympic hosts include",
    answers: {
      GRC: "Greece: Athens 1896 and 2004", FRA: "France: Paris 1900, 1924 and 2024", USA: "the US: St Louis 1904, Los Angeles 1932 and 1984, Atlanta 1996",
      GBR: "the UK: London 1908, 1948 and 2012", SWE: "Sweden: Stockholm 1912", BEL: "Belgium: Antwerp 1920", NLD: "the Netherlands: Amsterdam 1928",
      DEU: "Germany: Berlin 1936 and Munich 1972", FIN: "Finland: Helsinki 1952", AUS: "Australia: Melbourne 1956 and Sydney 2000",
      ITA: "Italy: Rome 1960", JPN: "Japan: Tokyo 1964 and 2020 (held in 2021)", MEX: "Mexico: Mexico City 1968", CAN: "Canada: Montreal 1976",
      RUS: "Russia: Moscow 1980 (then the Soviet Union)", KOR: "South Korea: Seoul 1988", ESP: "Spain: Barcelona 1992", CHN: "China: Beijing 2008",
      BRA: "Brazil: Rio de Janeiro 2016",
    },
  },
  {
    id: "winter-olympics", family: "sport", topic: "Winter Olympic Games", source: "IOC: Olympic Games host cities",
    text: "Pin a country that has hosted the Winter Olympics.",
    why: "Winter Olympic hosts include",
    answers: {
      FRA: "France: Chamonix 1924, Grenoble 1968, Albertville 1992", CHE: "Switzerland: St. Moritz 1928 and 1948",
      USA: "the US: Lake Placid 1932 and 1980, Squaw Valley 1960, Salt Lake City 2002", DEU: "Germany: Garmisch-Partenkirchen 1936",
      NOR: "Norway: Oslo 1952, Lillehammer 1994", ITA: "Italy: Cortina 1956, Turin 2006, Milan–Cortina 2026", AUT: "Austria: Innsbruck 1964 and 1976",
      JPN: "Japan: Sapporo 1972, Nagano 1998", BIH: "Bosnia and Herzegovina: Sarajevo 1984 (then Yugoslavia)", CAN: "Canada: Calgary 1988, Vancouver 2010",
      RUS: "Russia: Sochi 2014", KOR: "South Korea: Pyeongchang 2018", CHN: "China: Beijing 2022",
    },
  },
  {
    id: "world-cup-hosts", family: "sport", topic: "FIFA World Cup hosts", source: "FIFA: World Cup hosts 1930–2026",
    text: "Pin a country that has hosted (or co-hosted) the men's FIFA World Cup.",
    why: "World Cup hosts include",
    answers: {
      URY: "Uruguay: the first World Cup, 1930", ITA: "Italy: 1934 and 1990", FRA: "France: 1938 and 1998", BRA: "Brazil: 1950 and 2014",
      CHE: "Switzerland: 1954", SWE: "Sweden: 1958", CHL: "Chile: 1962", GBR: "the UK: England 1966", MEX: "Mexico: 1970, 1986 and 2026 (co-host)",
      DEU: "Germany: 1974 (West Germany) and 2006", ARG: "Argentina: 1978", ESP: "Spain: 1982", USA: "the US: 1994 and 2026 (co-host)",
      KOR: "South Korea: 2002 (co-host)", JPN: "Japan: 2002 (co-host)", ZAF: "South Africa: 2010, the first in Africa", RUS: "Russia: 2018",
      QAT: "Qatar: 2022", CAN: "Canada: 2026 (co-host)",
    },
  },

  // ---------------- science ----------------
  {
    id: "human-spaceflight", family: "science", topic: "Human spaceflight", source: "Wikipedia: Human spaceflight",
    text: "Pin a country that has launched people into orbit on its own rockets.",
    why: "Only three countries have flown their own crewed orbital missions:",
    answers: { RUS: "Russia: Yuri Gagarin, 1961 (as the Soviet Union)", USA: "the United States: John Glenn's first orbit, 1962", CHN: "China: Yang Liwei on Shenzhou 5, 2003" },
  },
  {
    id: "cern", family: "science", topic: "CERN", source: "CERN",
    text: "Pin a country the Large Hadron Collider runs beneath.",
    why: "The LHC's 27 km ring at CERN crosses the border between",
    answers: { CHE: "Switzerland (CERN's main site near Geneva)", FRA: "France (most of the ring lies under French soil)" },
  },
];

// Hand corrections to the computed latitude-line lists (see build-data.mjs).
export const LINE_FIXES = {
  equator: { add: { STP: "the islet of Ilhéu das Rolas" }, remove: [] },
  cancer: { add: {}, remove: ["MAR"] }, // the map's Morocco includes Western Sahara
  capricorn: { add: {}, remove: [] },
  arctic: { add: { ISL: "the small island of Grímsey" }, remove: [] },
  meridian: { add: {}, remove: ["FJI"] }, // Fiji straddles 180°, not 0°
};
