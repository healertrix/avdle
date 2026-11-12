// More hand-curated trivia sets: origins, voyages, history, food, culture, politics,
// flags, nature, landmarks, sport and science. Same rules as facts-source.mjs:
// complete answer lists, stable facts, a short detail for every answer.
//
// Open-ended questions ("a famous martial art") can't have a complete list, so those
// prompts name the items: "...one of these: karate, judo, ..." Every item is answerable.

const NATO_NAMES = {
  USA: "The United States", CAN: "Canada", GBR: "The United Kingdom", FRA: "France", BEL: "Belgium", NLD: "The Netherlands", LUX: "Luxembourg",
  DNK: "Denmark", NOR: "Norway", ISL: "Iceland", ITA: "Italy", PRT: "Portugal", GRC: "Greece", TUR: "Turkey", DEU: "Germany", ESP: "Spain",
  CZE: "Czechia", HUN: "Hungary", POL: "Poland", BGR: "Bulgaria", EST: "Estonia", LVA: "Latvia", LTU: "Lithuania", ROU: "Romania", SVK: "Slovakia",
  SVN: "Slovenia", ALB: "Albania", HRV: "Croatia", MNE: "Montenegro", MKD: "North Macedonia", FIN: "Finland", SWE: "Sweden",
};

export const MORE = [
  // ================= where did it originate =================
  {
    id: "martial-arts", family: "origins", topic: "Martial arts", source: "Wikipedia: list of martial arts by origin",
    text: "Pin the birthplace of one of these martial arts: karate, judo, taekwondo, kung fu, Muay Thai, capoeira, sambo, savate, kalaripayattu, arnis or Vovinam.",
    why: "",
    answers: {
      JPN: "Japan gave the world karate (from Okinawa) and judo, founded by Kanō Jigorō in Tokyo in 1882",
      KOR: "Taekwondo was developed in South Korea in the 1940s and 50s",
      CHN: "Kung fu is the umbrella name for China's martial arts, linked with the Shaolin Temple",
      THA: "Muay Thai, \"the art of eight limbs\", comes from Thailand",
      BRA: "Capoeira, part fight and part dance, was created by enslaved Africans in Brazil",
      RUS: "Sambo was developed for the Red Army in the 1920s and 30s",
      FRA: "Savate is French kickboxing, from the streets of 19th-century Paris and Marseille",
      IND: "Kalaripayattu from Kerala in India is one of the oldest fighting systems still practised",
      PHL: "Arnis (also called eskrima or kali) is the national martial art of the Philippines",
      VNM: "Vovinam was founded in Vietnam in 1938",
    },
  },
  {
    id: "sports-invented", family: "origins", topic: "Sport", source: "Wikipedia: origins of each sport",
    text: "Pin the country where one of these sports was invented: cricket, golf, rugby, basketball, volleyball, ice hockey, snooker, kabaddi, korfball, hurling, pétanque or Australian rules football.",
    why: "",
    answers: {
      GBR: "Cricket and rugby come from England (rugby is named after Rugby School) and golf from Scotland",
      USA: "Basketball (Springfield, 1891) and volleyball (Holyoke, 1895) were both invented in Massachusetts",
      CAN: "Modern ice hockey took shape in Montreal; the first indoor game was played there in 1875",
      IND: "Snooker was invented by British officers in Jabalpur, India, in 1875, and kabaddi is an ancient Indian game",
      NLD: "Korfball was invented by a Dutch schoolteacher in Amsterdam in 1902",
      IRL: "Hurling, played with a stick and ball, is one of the oldest field games and Ireland's own",
      FRA: "Pétanque was born in La Ciotat, near Marseille, in 1907",
      AUS: "Australian rules football was codified in Melbourne in 1859",
    },
  },
  {
    id: "dishes", family: "food", topic: "National dish", source: "Wikipedia: origin of each dish",
    text: "Pin the homeland of one of these dishes: pizza, sushi, paella, tacos, kimchi, phở, ceviche, goulash, poutine, feijoada, pad thai, fondue, haggis, Peking duck or bobotie.",
    why: "",
    answers: {
      ITA: "Pizza as we know it comes from Naples in Italy", JPN: "Sushi comes from Japan", ESP: "Paella comes from Valencia in Spain",
      MEX: "Tacos come from Mexico", KOR: "Kimchi, fermented spicy cabbage, is Korea's national dish",
      VNM: "Phở, the noodle soup, comes from northern Vietnam", PER: "Ceviche, raw fish cured in lime, is Peru's national dish",
      HUN: "Goulash is Hungary's national dish", CAN: "Poutine (fries, cheese curds and gravy) comes from Quebec in Canada",
      BRA: "Feijoada, a black-bean stew, is Brazil's national dish", THA: "Pad thai comes from Thailand",
      CHE: "Cheese fondue is Switzerland's national dish", GBR: "Haggis comes from Scotland",
      CHN: "Peking duck comes from Beijing in China", ZAF: "Bobotie, a spiced mince bake, is South African",
    },
  },
  {
    id: "drinks", family: "food", topic: "Alcoholic drink", source: "Wikipedia: origin of each drink",
    text: "Pin the country one of these drinks comes from: champagne, tequila, sake, port, tea, Guinness, ouzo, grappa, soju or Coca-Cola.",
    why: "",
    answers: {
      FRA: "Champagne can only come from the Champagne region of France", MEX: "Tequila is made from blue agave around Tequila, Jalisco, in Mexico",
      JPN: "Sake is Japanese rice wine", PRT: "Port wine comes from the Douro Valley in Portugal",
      CHN: "Tea was first drunk in China, thousands of years ago", IRL: "Guinness has been brewed in Dublin since 1759",
      GRC: "Ouzo is Greece's anise spirit", ITA: "Grappa is Italy's grape-pomace brandy", KOR: "Soju is South Korea's national spirit",
      USA: "Coca-Cola was invented in Atlanta, Georgia, in 1886",
    },
  },
  {
    id: "cheeses", family: "food", topic: "Cheese", source: "Wikipedia: origin of each cheese",
    text: "Pin the home of one of these cheeses: Parmesan, mozzarella, Roquefort, Camembert, Gouda, feta, manchego, cheddar, Emmental or halloumi.",
    why: "",
    answers: {
      ITA: "Parmesan (Parmigiano-Reggiano) and mozzarella are Italian", FRA: "Roquefort and Camembert are French",
      NLD: "Gouda is named after the Dutch city of Gouda", GRC: "Feta is protected as a Greek cheese",
      ESP: "Manchego comes from La Mancha in Spain", GBR: "Cheddar is named after the village of Cheddar in Somerset, England",
      CHE: "Emmental comes from the Emme valley in Switzerland", CYP: "Halloumi comes from Cyprus",
    },
  },
  {
    id: "spices", family: "food", topic: "Spice trade", source: "Wikipedia: Spice trade",
    text: "Pin the country where one of these spices first grew: vanilla, black pepper, nutmeg, cloves or true cinnamon.",
    why: "",
    answers: {
      MEX: "Vanilla is a Mexican orchid, first used by the Totonac and Aztec peoples",
      IND: "Black pepper is native to the Malabar Coast of India",
      IDN: "Nutmeg and cloves come from the Banda and Maluku islands of Indonesia, the original Spice Islands",
      LKA: "True cinnamon (Ceylon cinnamon) is native to Sri Lanka",
    },
  },
  {
    id: "music-genres", family: "origins", topic: "Music genre", source: "Wikipedia: origin of each genre",
    text: "Pin the birthplace of one of these music or dance styles: tango, flamenco, samba, reggae, K-pop, fado, polka, calypso, merengue, cumbia, jazz, highlife or Afrobeat.",
    why: "",
    answers: {
      ARG: "Tango was born in the port districts of Buenos Aires", URY: "Tango was born on both banks of the Río de la Plata, Montevideo included",
      ESP: "Flamenco comes from Andalusia in southern Spain", BRA: "Samba comes from Bahia and Rio de Janeiro in Brazil",
      JAM: "Reggae comes from Jamaica", KOR: "K-pop is South Korean pop", PRT: "Fado is Lisbon's song of longing",
      CZE: "Polka began as a Bohemian dance in what is now Czechia", TTO: "Calypso comes from Trinidad and Tobago",
      DOM: "Merengue is the national dance of the Dominican Republic", COL: "Cumbia comes from Colombia's Caribbean coast",
      USA: "Jazz was born in New Orleans", GHA: "Highlife comes from Ghana", NGA: "Afrobeat was created by Fela Kuti in Lagos, Nigeria",
    },
  },
  {
    id: "inventions", family: "science", topic: "Timeline of historic inventions", source: "Wikipedia: history of each invention",
    text: "Pin the country where one of these was invented: paper, the printing press, dynamite, the World Wide Web, Lego, the motor car, the aeroplane, the telescope, the Rubik's Cube, Tetris, insulin treatment or penicillin.",
    why: "",
    answers: {
      CHN: "Paper was invented in China around 100 CE", DEU: "Gutenberg built his printing press in Mainz (c. 1440) and Karl Benz the first motor car in 1886, both in Germany",
      SWE: "Alfred Nobel invented dynamite in Sweden in 1867", CHE: "Tim Berners-Lee invented the World Wide Web at CERN in Switzerland in 1989",
      DNK: "Lego comes from Billund in Denmark", USA: "The Wright brothers made the first powered flight in North Carolina in 1903",
      NLD: "The telescope was invented in the Netherlands in 1608", HUN: "Ernő Rubik invented his cube in Budapest in 1974",
      RUS: "Alexey Pajitnov created Tetris in Moscow in 1984", CAN: "Banting and Best discovered insulin treatment in Toronto in 1921",
      GBR: "Alexander Fleming discovered penicillin in London in 1928",
    },
  },
  {
    id: "board-games", family: "origins", topic: "Board game", source: "Wikipedia: origin of each game",
    text: "Pin the country where one of these games was invented: chess, Go, mahjong, ludo (pachisi), backgammon's ancestor, sudoku or Monopoly.",
    why: "",
    answers: {
      IND: "Chess began as chaturanga in India, and ludo comes from the Indian game pachisi",
      CHN: "Go and mahjong both come from China", IRN: "Backgammon's ancestor, nard, comes from ancient Persia",
      USA: "Monopoly and the modern sudoku (first published in New York in 1979 as \"Number Place\") are American",
    },
  },

  // ================= voyages & journeys =================
  {
    id: "columbus", family: "voyages", topic: "Voyages of Christopher Columbus", source: "Wikipedia: Voyages of Christopher Columbus",
    text: "Pin a present-day country where Christopher Columbus landed on his four voyages to the Americas (1492–1504).",
    why: "",
    answers: {
      BHS: "His first landfall, on 12 October 1492, was on an island in the Bahamas he called San Salvador",
      CUB: "He reached Cuba on his first voyage, 28 October 1492", HTI: "His flagship Santa María ran aground off Haiti on Christmas Day 1492",
      DOM: "He founded La Isabela, the first European town in the Americas, in today's Dominican Republic (1493)",
      JAM: "He reached Jamaica in 1494 and was stranded there for a year on his fourth voyage",
      USA: "He landed on Puerto Rico and Saint Croix (now US territories) on his second voyage, 1493",
      FRA: "He landed on Guadeloupe (1493) and Martinique (1502), now part of France",
      TTO: "He reached Trinidad on his third voyage, 1498", VEN: "On his third voyage (1498) he landed on the Paria Peninsula of Venezuela, his first step on the American mainland",
      HND: "On his fourth voyage (1502) he reached Guanaja and the Honduran coast", NIC: "In 1502 he sailed down and landed on the coast of Nicaragua",
      CRI: "In 1502 he anchored at today's Puerto Limón in Costa Rica", PAN: "In 1502–03 he explored the coast of Panama and tried to found a settlement",
    },
  },
  {
    id: "da-gama", family: "voyages", topic: "Vasco da Gama", source: "Wikipedia: Vasco da Gama's first voyage",
    text: "Pin a present-day country where Vasco da Gama's fleet stopped on its first voyage to India (1497–99).",
    why: "",
    answers: {
      PRT: "The fleet sailed from Lisbon in July 1497 and returned there in 1499", CPV: "The fleet stopped at Santiago in the Cape Verde islands",
      ZAF: "The fleet landed at St Helena Bay and Mossel Bay after rounding the Cape of Good Hope", MOZ: "The fleet stopped at Quelimane and Mozambique Island",
      KEN: "At Malindi, in Kenya, da Gama hired a pilot to guide him across the Indian Ocean", IND: "The fleet reached Calicut (Kozhikode) in Kerala on 20 May 1498",
    },
  },
  {
    id: "magellan", family: "voyages", topic: "Magellan expedition", source: "Wikipedia: Magellan expedition",
    text: "Pin a present-day country where the Magellan–Elcano expedition, the first to sail around the world, made landfall (1519–22).",
    why: "",
    answers: {
      ESP: "The expedition left Seville in 1519 and returned there in 1522 with one ship and 18 men", BRA: "The fleet stopped in the bay of Rio de Janeiro",
      URY: "The fleet explored the Río de la Plata past today's Montevideo", ARG: "The fleet wintered at San Julián in Patagonia",
      CHL: "The fleet found the strait at the tip of South America now named after Magellan", USA: "The fleet's first Pacific landfall was Guam, now a US territory",
      PHL: "Magellan was killed at the Battle of Mactan in the Philippines in 1521", BRN: "The survivors visited the sultan of Brunei",
      IDN: "The survivors reached the Spice Islands (Maluku) and loaded cloves at Tidore", CPV: "The last ship stopped in Cape Verde on the way home",
    },
  },
  {
    id: "beagle", family: "voyages", topic: "Second voyage of HMS Beagle", source: "Wikipedia: Second voyage of HMS Beagle",
    text: "Pin a present-day country Charles Darwin went ashore in on the voyage of HMS Beagle (1831–36).",
    why: "",
    answers: {
      GBR: "The voyage began and ended in England (with stops on the Falklands and Saint Helena)", CPV: "His first stop on land was Santiago in Cape Verde",
      BRA: "He explored the rainforest near Salvador and Rio de Janeiro", URY: "The Beagle often returned to Montevideo and Maldonado",
      ARG: "He found giant fossil mammals in Patagonia", CHL: "He felt the 1835 Concepción earthquake in Chile",
      PER: "The Beagle stopped at Callao, the port of Lima", ECU: "His visit to the Galápagos Islands of Ecuador inspired his ideas on evolution",
      FRA: "The Beagle stopped at Tahiti, now in French Polynesia", NZL: "The Beagle visited the Bay of Islands in New Zealand",
      AUS: "He visited Sydney, Tasmania and King George Sound", MUS: "The Beagle stopped at Mauritius", ZAF: "The Beagle stopped at Cape Town",
      PRT: "The Beagle stopped in the Azores on its way home",
    },
  },
  {
    id: "motorcycle-diaries", family: "voyages", topic: "The Motorcycle Diaries", source: "Wikipedia: The Motorcycle Diaries",
    text: "Pin a country Che Guevara travelled through on his 1952 \"Motorcycle Diaries\" journey across South America.",
    why: "",
    answers: {
      ARG: "He set out from Buenos Aires with his friend Alberto Granado", CHL: "Their motorcycle, La Poderosa, broke down for good in Chile",
      PER: "He visited Machu Picchu and worked at the San Pablo leper colony on the Amazon", COL: "They crossed into Leticia and went on to Bogotá",
      VEN: "The journey ended in Caracas",
    },
  },
  {
    id: "einstein-lived", family: "voyages", topic: "Albert Einstein", source: "Wikipedia: Albert Einstein",
    text: "Pin a country Albert Einstein lived in.",
    why: "",
    answers: {
      DEU: "He was born in Ulm, grew up in Munich and worked in Berlin", ITA: "His family moved to Pavia and Milan in 1894",
      CHE: "He studied in Zurich and wrote his 1905 papers while working at the patent office in Bern",
      CZE: "He was a professor in Prague in 1911–12", BEL: "He stayed on the Belgian coast at De Haan after leaving Germany in 1933",
      GBR: "He hid in a hut in Norfolk, England, for a few weeks in 1933", USA: "He lived in Princeton, New Jersey, from 1933 until his death in 1955",
    },
  },

  // ================= history & empires =================
  {
    id: "soviet", family: "history", topic: "Post-Soviet states", source: "Wikipedia: Post-Soviet states",
    text: "Pin a country that was part of the Soviet Union.",
    why: "",
    answers: {
      RUS: "Russia was the largest Soviet republic", UKR: "Ukraine was the Ukrainian SSR", BLR: "Belarus was the Byelorussian SSR",
      EST: "Estonia was occupied and annexed in 1940 and regained independence in 1991", LVA: "Latvia was annexed in 1940 and became independent again in 1991",
      LTU: "Lithuania was the first republic to declare independence, in March 1990", MDA: "Moldova was the Moldavian SSR",
      GEO: "Georgia was the Georgian SSR (Stalin was born there)", ARM: "Armenia was the Armenian SSR", AZE: "Azerbaijan was the Azerbaijan SSR",
      KAZ: "Kazakhstan was the last republic to declare independence, in December 1991", UZB: "Uzbekistan was the Uzbek SSR",
      TKM: "Turkmenistan was the Turkmen SSR", KGZ: "Kyrgyzstan was the Kirghiz SSR", TJK: "Tajikistan was the Tajik SSR",
    },
  },
  {
    id: "yugoslavia", family: "history", topic: "Breakup of Yugoslavia", source: "Wikipedia: Breakup of Yugoslavia",
    text: "Pin a country that was once part of Yugoslavia.",
    why: "",
    answers: {
      SVN: "Slovenia left first, in 1991", HRV: "Croatia declared independence in 1991", BIH: "Bosnia and Herzegovina declared independence in 1992",
      MKD: "North Macedonia left peacefully in 1991", SRB: "Serbia was the largest republic; Belgrade was Yugoslavia's capital",
      MNE: "Montenegro stayed with Serbia until 2006", UNK: "Kosovo was an autonomous province of Serbia and declared independence in 2008",
    },
  },
  {
    id: "austria-hungary", family: "history", topic: "Austria-Hungary", source: "Wikipedia: Austria-Hungary",
    text: "Pin a present-day country that was all or partly in Austria-Hungary (1867–1918).",
    why: "",
    answers: {
      AUT: "Austria was the empire's heart; Vienna was its capital", HUN: "Hungary was the empire's other half, ruled from Budapest",
      CZE: "Bohemia and Moravia (today's Czechia) were Austrian crown lands", SVK: "Slovakia was part of the Kingdom of Hungary",
      SVN: "Slovenia's lands were Austrian provinces", HRV: "Croatia-Slavonia was an autonomous kingdom under Hungary",
      BIH: "Bosnia and Herzegovina was occupied in 1878 and annexed in 1908; the archduke was shot in Sarajevo in 1914",
      POL: "Southern Poland (Galicia, with Kraków) was Austrian", UKR: "Western Ukraine (Lviv and Bukovina) was Austrian",
      ROU: "Transylvania, now in Romania, was Hungarian", SRB: "Vojvodina, now in northern Serbia, was Hungarian",
      ITA: "Trieste and Trentino, now Italian, were Austrian", MNE: "The Bay of Kotor in Montenegro was Austrian",
    },
  },
  {
    id: "inca", family: "history", topic: "Inca Empire", source: "Wikipedia: Inca Empire",
    text: "Pin a present-day country that was all or partly in the Inca Empire.",
    why: "",
    answers: {
      PER: "Peru was the empire's heart; Cusco was its capital and Machu Picchu a royal estate", ECU: "Quito, Ecuador's capital, was the empire's northern capital",
      BOL: "Lake Titicaca, in Bolivia and Peru, was the Incas' sacred birthplace", CHL: "The empire reached the Maule River in central Chile",
      ARG: "The empire reached north-western Argentina, around Mendoza", COL: "The empire's northern edge was near Pasto in southern Colombia",
    },
  },
  {
    id: "gran-colombia", family: "history", topic: "Gran Colombia", source: "Wikipedia: Gran Colombia",
    text: "Pin a present-day country that was part of Gran Colombia (1819–31), Simón Bolívar's republic.",
    why: "",
    answers: {
      COL: "Colombia was its core, with Bogotá as capital", VEN: "Venezuela, Bolívar's birthplace, broke away in 1830",
      ECU: "Ecuador left in 1830", PAN: "Panama was part of Colombia until 1903",
    },
  },
  {
    id: "split-cold-war", family: "history", topic: "Divided country", source: "Wikipedia: Divided country",
    text: "Pin a country that was split into two rival states during the Cold War.",
    why: "",
    answers: {
      DEU: "Germany was divided into West and East from 1949 until reunification in 1990", KOR: "Korea was divided at the 38th parallel in 1945 and still is",
      PRK: "North Korea is the northern half of the divided Korean peninsula", VNM: "Vietnam was split into North and South from 1954 until 1976",
      YEM: "Yemen was North and South Yemen until they united in 1990",
    },
  },
  {
    id: "axis", family: "history", topic: "Axis powers", source: "Wikipedia: Axis powers",
    text: "Pin one of the three main Axis powers of World War II.",
    why: "",
    answers: { DEU: "Germany, under Hitler", ITA: "Italy, under Mussolini", JPN: "Japan, under Emperor Hirohito's government" },
  },
  {
    id: "portuguese-empire", family: "history", topic: "Portuguese Empire", source: "Wikipedia: Portuguese Empire",
    text: "Pin a former Portuguese colony that is now an independent Portuguese-speaking country.",
    why: "",
    answers: {
      BRA: "Brazil, independent since 1822", AGO: "Angola, independent since 1975", MOZ: "Mozambique, independent since 1975",
      CPV: "Cape Verde, independent since 1975", GNB: "Guinea-Bissau, independent since 1973–74", STP: "São Tomé and Príncipe, independent since 1975",
      TLS: "Timor-Leste, independent since 2002",
    },
  },
  {
    id: "ancient-wonders", family: "landmarks", topic: "Seven Wonders of the Ancient World", source: "Wikipedia: Seven Wonders of the Ancient World",
    text: "Pin a country where one of the Seven Wonders of the Ancient World stood.",
    why: "",
    answers: {
      EGY: "Egypt: the Great Pyramid of Giza (the only wonder still standing) and the Lighthouse of Alexandria",
      IRQ: "Iraq: the Hanging Gardens of Babylon", GRC: "Greece: the Statue of Zeus at Olympia and the Colossus of Rhodes",
      TUR: "Turkey: the Temple of Artemis at Ephesus and the Mausoleum at Halicarnassus (Bodrum)",
    },
  },
  {
    id: "ancient-sites", family: "landmarks", topic: "World Heritage Site", source: "UNESCO World Heritage List",
    text: "Pin the country of one of these ancient sites: Angkor Wat, Borobudur, Bagan, Petra, Persepolis, Stonehenge, the moai of Easter Island, Great Zimbabwe, Timbuktu or Pompeii.",
    why: "",
    answers: {
      KHM: "Angkor Wat, the world's largest religious monument, is in Cambodia", IDN: "Borobudur, the largest Buddhist temple, is on Java in Indonesia",
      MMR: "Bagan, with over 2,000 temples, is in Myanmar", JOR: "Petra, the rose-red city carved in rock, is in Jordan",
      IRN: "Persepolis, capital of the Persian Empire, is in Iran", GBR: "Stonehenge is in England",
      CHL: "Easter Island (Rapa Nui) and its moai belong to Chile", ZWE: "Great Zimbabwe gave the country its name",
      MLI: "Timbuktu, the desert city of scholars, is in Mali", ITA: "Pompeii, buried by Vesuvius in 79 CE, is in Italy",
    },
  },

  // ================= culture & religion =================
  {
    id: "scripts", family: "culture", topic: "List of writing systems", source: "Wikipedia: list of writing systems",
    text: "Pin a country that officially uses one of these scripts: Georgian, Armenian, Greek, Hebrew, Hangul, Thai, Lao, Khmer, Burmese, Sinhala, Thaana or Ge'ez.",
    why: "",
    answers: {
      GEO: "Georgian has its own 33-letter alphabet", ARM: "Armenian has had its own alphabet since 405 CE",
      GRC: "Greek is written in the Greek alphabet", CYP: "Greek, in the Greek alphabet, is an official language of Cyprus",
      ISR: "Hebrew is written in the Hebrew alphabet", KOR: "Korean is written in Hangul, invented in 1443", PRK: "Korean is written in Hangul (called Chosŏn'gŭl in the North)",
      THA: "Thai has its own script", LAO: "Lao has its own script", KHM: "Khmer has the longest alphabet in the world (74 letters)",
      MMR: "Burmese has a round script", LKA: "Sinhala has its own script", MDV: "Dhivehi is written in Thaana, used nowhere else",
      ETH: "Amharic is written in the Ge'ez script", ERI: "Tigrinya is written in the Ge'ez script",
    },
  },
  {
    id: "cyrillic", family: "culture", topic: "Cyrillic script", source: "Wikipedia: Cyrillic script",
    text: "Pin a country whose national language is officially written in the Cyrillic alphabet.",
    why: "The national language written in Cyrillic here is",
    answers: {
      RUS: "Russian", UKR: "Ukrainian", BLR: "Belarusian", BGR: "Bulgarian (the alphabet was created in the First Bulgarian Empire)",
      SRB: "Serbian (also written in Latin letters)", MKD: "Macedonian", MNE: "Montenegrin, in both Cyrillic and Latin",
      BIH: "Serbian, one of its official languages, uses Cyrillic", KAZ: "Kazakh (switching to Latin letters by 2031)",
      KGZ: "Kyrgyz", TJK: "Tajik", MNG: "Mongolian (alongside the traditional vertical script)",
    },
  },
  {
    id: "buddhist-majority", family: "culture", topic: "Buddhism by country", source: "Pew Research Center: Global Religious Landscape",
    text: "Pin a country where most people are Buddhist.",
    why: "",
    answers: {
      THA: "About 93% of Thais are Buddhist", KHM: "About 97% of Cambodians are Buddhist", MMR: "About 88% of people in Myanmar are Buddhist",
      BTN: "About 75% of Bhutanese follow Vajrayana Buddhism", LKA: "About 70% of Sri Lankans are Buddhist", LAO: "About 65% of Laotians are Buddhist",
      MNG: "About 50–55% of Mongolians follow Tibetan Buddhism",
    },
  },
  {
    id: "hindu-majority", family: "culture", topic: "Hinduism by country", source: "Pew Research Center: Global Religious Landscape",
    text: "Pin a Hindu-majority country.",
    why: "",
    answers: { IND: "About 80% of Indians are Hindu", NPL: "About 81% of Nepalis are Hindu" },
  },
  {
    id: "festivals", family: "culture", topic: "Festival", source: "Wikipedia: each festival",
    text: "Pin the country famous for one of these festivals: Oktoberfest, Rio Carnival, La Tomatina, the Day of the Dead, Songkran, Holi, Carnival of Venice, St Patrick's Day, Inti Raymi, Naadam or Hogmanay.",
    why: "",
    answers: {
      DEU: "Oktoberfest is held in Munich", BRA: "Rio Carnival is in Rio de Janeiro", ESP: "La Tomatina, the tomato fight, is in Buñol near Valencia",
      MEX: "The Day of the Dead (Día de los Muertos) is Mexican", THA: "Songkran, the water-fight new year, is Thai",
      IND: "Holi, the festival of colours, is celebrated across India", NPL: "Holi, the festival of colours, is a national holiday in Nepal",
      ITA: "The Carnival of Venice is famous for its masks", IRL: "St Patrick's Day honours Ireland's patron saint",
      PER: "Inti Raymi, the Inca festival of the sun, is held in Cusco", MNG: "Naadam (wrestling, archery and horse racing) is Mongolian",
      GBR: "Hogmanay is the Scottish new year",
    },
  },
  {
    id: "film-festivals", family: "culture", topic: "International film festival", source: "FIAPF: competitive feature film festivals",
    text: "Pin the home of one of the \"Big Three\" film festivals: Cannes, Venice or Berlin.",
    why: "",
    answers: { FRA: "Cannes, on the French Riviera", ITA: "Venice, the oldest film festival (1932)", DEU: "Berlin (the Berlinale)" },
  },

  // ================= politics & money =================
  {
    id: "eu", family: "politics", topic: "Member state of the European Union", source: "European Union: member countries",
    text: "Pin a member of the European Union.",
    why: "",
    answers: Object.fromEntries([
      ["AUT", "Austria (1995)"], ["BEL", "Belgium (founder, 1958)"], ["BGR", "Bulgaria (2007)"], ["HRV", "Croatia, the newest member (2013)"],
      ["CYP", "Cyprus (2004)"], ["CZE", "Czechia (2004)"], ["DNK", "Denmark (1973)"], ["EST", "Estonia (2004)"], ["FIN", "Finland (1995)"],
      ["FRA", "France (founder, 1958)"], ["DEU", "Germany (founder, 1958)"], ["GRC", "Greece (1981)"], ["HUN", "Hungary (2004)"],
      ["IRL", "Ireland (1973)"], ["ITA", "Italy (founder, 1958)"], ["LVA", "Latvia (2004)"], ["LTU", "Lithuania (2004)"],
      ["LUX", "Luxembourg (founder, 1958)"], ["MLT", "Malta, the smallest member (2004)"], ["NLD", "the Netherlands (founder, 1958)"],
      ["POL", "Poland (2004)"], ["PRT", "Portugal (1986)"], ["ROU", "Romania (2007)"], ["SVK", "Slovakia (2004)"], ["SVN", "Slovenia (2004)"],
      ["ESP", "Spain (1986)"], ["SWE", "Sweden (1995)"],
    ].map(([k, v]) => [k, `${v} is one of the EU's 27 members`])),
  },
  {
    id: "nato", family: "politics", topic: "Member states of NATO", source: "NATO: member countries",
    text: "Pin a member of NATO.",
    why: "",
    answers: Object.fromEntries([
      ["USA", "a founder (1949)"], ["CAN", "a founder (1949)"], ["GBR", "a founder (1949)"], ["FRA", "a founder (1949)"], ["BEL", "a founder (1949)"],
      ["NLD", "a founder (1949)"], ["LUX", "a founder (1949)"], ["DNK", "a founder (1949)"], ["NOR", "a founder (1949)"], ["ISL", "a founder (1949), with no army of its own"],
      ["ITA", "a founder (1949)"], ["PRT", "a founder (1949)"], ["GRC", "a member since 1952"], ["TUR", "a member since 1952"], ["DEU", "a member since 1955"],
      ["ESP", "a member since 1982"], ["CZE", "a member since 1999"], ["HUN", "a member since 1999"], ["POL", "a member since 1999"],
      ["BGR", "a member since 2004"], ["EST", "a member since 2004"], ["LVA", "a member since 2004"], ["LTU", "a member since 2004"],
      ["ROU", "a member since 2004"], ["SVK", "a member since 2004"], ["SVN", "a member since 2004"], ["ALB", "a member since 2009"], ["HRV", "a member since 2009"],
      ["MNE", "a member since 2017"], ["MKD", "a member since 2020"], ["FIN", "a member since 2023"], ["SWE", "a member since 2024"],
    ].map(([k, v]) => [k, `${NATO_NAMES[k]} is ${v}`])),
  },
  {
    id: "g7", family: "politics", topic: "G7", source: "G7",
    text: "Pin a member of the G7.",
    why: "The G7 group of major economies includes",
    answers: { CAN: "Canada", FRA: "France", DEU: "Germany", ITA: "Italy", JPN: "Japan", GBR: "the United Kingdom", USA: "the United States" },
  },
  {
    id: "g20", family: "politics", topic: "G20", source: "G20",
    text: "Pin a country that is a member of the G20.",
    why: "The G20's 19 member countries (plus the EU and the African Union) include",
    answers: {
      ARG: "Argentina", AUS: "Australia", BRA: "Brazil", CAN: "Canada", CHN: "China", FRA: "France", DEU: "Germany", IND: "India", IDN: "Indonesia",
      ITA: "Italy", JPN: "Japan", KOR: "South Korea", MEX: "Mexico", RUS: "Russia", SAU: "Saudi Arabia", ZAF: "South Africa", TUR: "Turkey",
      GBR: "the United Kingdom", USA: "the United States",
    },
  },
  {
    id: "opec", family: "politics", topic: "OPEC", source: "OPEC: member countries (2024)",
    text: "Pin a member of OPEC, the oil exporters' club.",
    why: "OPEC's members include",
    answers: {
      DZA: "Algeria", COG: "the Republic of the Congo", GNQ: "Equatorial Guinea", GAB: "Gabon", IRN: "Iran (a founder, 1960)", IRQ: "Iraq (a founder, 1960)",
      KWT: "Kuwait (a founder, 1960)", LBY: "Libya", NGA: "Nigeria", SAU: "Saudi Arabia (a founder, 1960)", ARE: "the United Arab Emirates",
      VEN: "Venezuela (a founder, 1960)",
    },
  },
  {
    id: "un-p5", family: "politics", topic: "Permanent members of the United Nations Security Council", source: "United Nations Charter",
    text: "Pin a permanent member of the UN Security Council.",
    why: "The five permanent members, each with a veto, are",
    answers: { CHN: "China", FRA: "France", RUS: "Russia", GBR: "the United Kingdom", USA: "the United States" },
  },
  {
    id: "nuclear", family: "politics", topic: "List of states with nuclear weapons", source: "SIPRI Yearbook",
    text: "Pin a country that has nuclear weapons.",
    why: "",
    answers: {
      USA: "The United States built the first bomb in 1945", RUS: "Russia (as the Soviet Union) tested its first bomb in 1949", GBR: "The UK tested its first bomb in 1952",
      FRA: "France tested its first bomb in 1960", CHN: "China tested its first bomb in 1964", IND: "India tested in 1974 and 1998",
      PAK: "Pakistan tested in 1998", PRK: "North Korea tested its first bomb in 2006", ISR: "Israel is widely believed to have about 90 warheads, though it has never confirmed it",
    },
  },
  {
    id: "asean", family: "politics", topic: "ASEAN", source: "ASEAN member states",
    text: "Pin a member of ASEAN, the Association of Southeast Asian Nations.",
    why: "ASEAN's members are",
    answers: {
      IDN: "Indonesia (founder, 1967)", MYS: "Malaysia (founder, 1967)", PHL: "the Philippines (founder, 1967)", SGP: "Singapore (founder, 1967)",
      THA: "Thailand (founder, 1967)", BRN: "Brunei (1984)", VNM: "Vietnam (1995)", LAO: "Laos (1997)", MMR: "Myanmar (1997)", KHM: "Cambodia (1999)",
      TLS: "Timor-Leste, the newest member (2025)",
    },
  },
  {
    id: "europe-monarchies", family: "politics", topic: "Monarchies in Europe", source: "Wikipedia: Monarchies in Europe",
    text: "Pin a European country that has a monarch as head of state.",
    why: "",
    answers: {
      GBR: "The United Kingdom has King Charles III", ESP: "Spain has King Felipe VI", BEL: "Belgium has King Philippe", NLD: "The Netherlands has King Willem-Alexander",
      LUX: "Luxembourg is a grand duchy, Europe's last", DNK: "Denmark has King Frederik X, from Europe's oldest monarchy", NOR: "Norway has King Harald V",
      SWE: "Sweden has King Carl XVI Gustaf", MCO: "Monaco has Prince Albert II", LIE: "Liechtenstein has Prince Hans-Adam II",
      AND: "Andorra has two co-princes: the President of France and the Bishop of Urgell", VAT: "Vatican City is ruled by the Pope, an elected absolute monarch",
    },
  },
  {
    id: "antarctic-claims", family: "politics", topic: "Territorial claims in Antarctica", source: "Antarctic Treaty Secretariat",
    text: "Pin a country that claims part of Antarctica.",
    why: "",
    answers: {
      ARG: "Argentina claims Argentine Antarctica", AUS: "Australia claims the largest share, about 42%", CHL: "Chile claims the Chilean Antarctic Territory",
      FRA: "France claims Adélie Land", NZL: "New Zealand claims the Ross Dependency", NOR: "Norway claims Queen Maud Land and Peter I Island",
      GBR: "The UK claims the British Antarctic Territory",
    },
  },

  // ================= flags =================
  {
    id: "flag-crescent", family: "flags", topic: "Star and crescent", source: "Wikipedia: flags with crescents",
    text: "Pin a country whose flag has a crescent moon.",
    why: "",
    answers: {
      TUR: "Turkey's flag has a white crescent and star on red", PAK: "Pakistan's flag has a crescent and star", DZA: "Algeria's flag has a red crescent and star",
      TUN: "Tunisia's flag has a crescent and star in a white disc", LBY: "Libya's flag has a white crescent and star", MRT: "Mauritania's flag has a gold crescent and star",
      AZE: "Azerbaijan's flag has a white crescent and an eight-pointed star", TKM: "Turkmenistan's flag has a crescent and five stars",
      UZB: "Uzbekistan's flag has a crescent and twelve stars", MYS: "Malaysia's flag has a yellow crescent and 14-pointed star",
      SGP: "Singapore's flag has a crescent and five stars", MDV: "The Maldives' flag has a white crescent on green", COM: "Comoros' flag has a white crescent and four stars",
      NPL: "Nepal's two-pennant flag shows a crescent moon and a sun",
    },
  },
  {
    id: "flag-nordic", family: "flags", topic: "Nordic cross flag", source: "Wikipedia: Nordic cross flag",
    text: "Pin a country whose flag has a Nordic (Scandinavian) cross.",
    why: "",
    answers: {
      DNK: "Denmark's Dannebrog is the oldest national flag still in use", NOR: "Norway's flag has a blue cross outlined in white on red",
      SWE: "Sweden's flag has a yellow cross on blue", FIN: "Finland's flag has a blue cross on white", ISL: "Iceland's flag has a red cross outlined in white on blue",
    },
  },
  {
    id: "flag-union-jack", family: "flags", topic: "Union Jack", source: "Wikipedia: flags with the Union Jack",
    text: "Pin a country whose national flag includes the Union Jack.",
    why: "",
    answers: {
      GBR: "The Union Jack is the UK's own flag", AUS: "Australia's flag has the Union Jack in the corner with the Southern Cross",
      NZL: "New Zealand's flag has the Union Jack and four red stars", TUV: "Tuvalu's flag has the Union Jack and nine stars for its islands",
      FJI: "Fiji's light-blue flag has the Union Jack and a shield",
    },
  },

  // ================= nature =================
  {
    id: "seven-summits", family: "nature", topic: "Seven Summits", source: "Wikipedia: Seven Summits",
    text: "Pin a country with one of the Seven Summits, the highest peaks of each continent.",
    why: "",
    answers: {
      NPL: "Everest (8,849 m) sits on the Nepal–China border", CHN: "Everest's north side is in Tibet, China", ARG: "Aconcagua (6,961 m) is in Argentina",
      USA: "Denali (6,190 m) is in Alaska", TZA: "Kilimanjaro (5,895 m) is in Tanzania", RUS: "Elbrus (5,642 m) is in Russia's Caucasus",
      IDN: "Puncak Jaya (4,884 m) in Papua counts for Oceania", AUS: "Mount Kosciuszko (2,228 m) counts for mainland Australia",
    },
  },
  {
    id: "himalayas", family: "mountains", topic: "Himalayas", source: "Wikipedia: Himalayas",
    text: "Pin a country the Himalayas pass through.",
    why: "The Himalayas span five countries:",
    answers: { NPL: "Nepal", BTN: "Bhutan", IND: "India", CHN: "China", PAK: "Pakistan" },
  },
  {
    id: "lake-victoria", family: "lakes", topic: "Lake Victoria", source: "Wikipedia: Lake Victoria",
    text: "Pin a country on the shores of Lake Victoria, Africa's largest lake.",
    why: "Lake Victoria is shared by",
    answers: { UGA: "Uganda", KEN: "Kenya", TZA: "Tanzania, which holds about half of it" },
  },
  {
    id: "lake-tanganyika", family: "lakes", topic: "Lake Tanganyika", source: "Wikipedia: Lake Tanganyika",
    text: "Pin a country on the shores of Lake Tanganyika, the world's longest freshwater lake.",
    why: "Lake Tanganyika is shared by",
    answers: { TZA: "Tanzania", COD: "the DR Congo", BDI: "Burundi", ZMB: "Zambia" },
  },
  {
    id: "lake-malawi", family: "lakes", topic: "Lake Malawi", source: "Wikipedia: Lake Malawi",
    text: "Pin a country on the shores of Lake Malawi.",
    why: "Lake Malawi (Lake Nyasa) is shared by",
    answers: { MWI: "Malawi", MOZ: "Mozambique", TZA: "Tanzania" },
  },
  {
    id: "lake-chad", family: "lakes", topic: "Lake Chad", source: "Wikipedia: Lake Chad",
    text: "Pin a country that borders Lake Chad.",
    why: "Lake Chad, which has shrunk by 90% since the 1960s, touches",
    answers: { TCD: "Chad", CMR: "Cameroon", NER: "Niger", NGA: "Nigeria" },
  },
  {
    id: "titicaca", family: "lakes", topic: "Lake Titicaca", source: "Wikipedia: Lake Titicaca",
    text: "Pin a country on Lake Titicaca, the highest navigable lake.",
    why: "Lake Titicaca (3,812 m up) is shared by",
    answers: { PER: "Peru", BOL: "Bolivia" },
  },
  {
    id: "dead-sea", family: "lakes", topic: "Dead Sea", source: "Wikipedia: Dead Sea",
    text: "Pin a country on the shore of the Dead Sea, the lowest place on land.",
    why: "The Dead Sea (430 m below sea level) is bordered by",
    answers: { JOR: "Jordan", ISR: "Israel", PSE: "Palestine (the West Bank)" },
  },
  {
    id: "great-lakes", family: "lakes", topic: "Great Lakes", source: "Wikipedia: Great Lakes",
    text: "Pin a country on the Great Lakes of North America.",
    why: "The Great Lakes are shared by",
    answers: { USA: "the United States (all five)", CAN: "Canada (all but Lake Michigan)" },
  },
  {
    id: "amazon-rainforest", family: "nature", topic: "Amazon rainforest", source: "Wikipedia: Amazon rainforest",
    text: "Pin a country with part of the Amazon rainforest.",
    why: "The Amazon rainforest covers parts of",
    answers: {
      BRA: "Brazil, about 60% of it", PER: "Peru, about 13%", COL: "Colombia", VEN: "Venezuela", ECU: "Ecuador", BOL: "Bolivia",
      GUY: "Guyana", SUR: "Suriname", FRA: "France, via French Guiana",
    },
  },
  {
    id: "congo-rainforest", family: "nature", topic: "Congolian rainforests", source: "Wikipedia: Congo Basin",
    text: "Pin a country with part of the Congo rainforest, the world's second largest.",
    why: "The Congo rainforest covers parts of",
    answers: {
      COD: "the DR Congo, about 60% of it", COG: "the Republic of the Congo", CMR: "Cameroon", GAB: "Gabon", CAF: "the Central African Republic", GNQ: "Equatorial Guinea",
    },
  },
  {
    id: "reefs", family: "nature", topic: "Coral reef", source: "Wikipedia: Great Barrier Reef; Mesoamerican Barrier Reef System",
    text: "Pin a country off whose coast the Great Barrier Reef or the Mesoamerican Barrier Reef lies.",
    why: "",
    answers: {
      AUS: "The Great Barrier Reef, the largest living structure on Earth, runs 2,300 km along Queensland", MEX: "The Mesoamerican reef starts off the Yucatán in Mexico",
      BLZ: "Belize's barrier reef, with the Great Blue Hole, is the heart of the Mesoamerican reef", GTM: "The Mesoamerican reef passes Guatemala's short Caribbean coast",
      HND: "The Mesoamerican reef ends at Honduras' Bay Islands",
    },
  },
  {
    id: "namib-thar", family: "desert", topic: "Namib", source: "Wikipedia: Namib; Thar Desert",
    text: "Pin a country with part of the Namib or the Thar desert.",
    why: "",
    answers: {
      NAM: "The Namib, perhaps the oldest desert on Earth, gave Namibia its name", AGO: "The Namib reaches into southern Angola",
      ZAF: "The Namib's southern tip reaches South Africa", IND: "The Thar (Great Indian Desert) covers much of Rajasthan", PAK: "The Thar extends into Sindh and Punjab in Pakistan",
    },
  },
  {
    id: "indian-ocean-islands", family: "nature", topic: "Indian Ocean", source: "Wikipedia: list of island countries",
    text: "Pin an island country in the Indian Ocean.",
    why: "This island country in the Indian Ocean is",
    answers: {
      MDG: "Madagascar, the world's fourth-largest island", LKA: "Sri Lanka, the teardrop island off India", MDV: "the Maldives, the world's lowest country",
      MUS: "Mauritius, home of the extinct dodo", SYC: "Seychelles, the smallest African country by population", COM: "Comoros, three volcanic islands between Madagascar and Mozambique",
    },
  },
  {
    id: "double-landlocked", family: "nature", topic: "Landlocked country", source: "Wikipedia: Landlocked country",
    text: "Pin a doubly landlocked country: surrounded only by other landlocked countries.",
    why: "",
    answers: { LIE: "Liechtenstein is surrounded by Switzerland and Austria", UZB: "Uzbekistan is surrounded by five landlocked countries" },
  },
  {
    id: "volcanoes", family: "landmarks", topic: "Volcano", source: "Smithsonian Global Volcanism Program",
    text: "Pin the country of one of these volcanoes: Vesuvius, Etna, Mount Fuji, Kilimanjaro, Krakatoa, Mount St. Helens, Eyjafjallajökull, Popocatépetl, Cotopaxi or Pinatubo.",
    why: "",
    answers: {
      ITA: "Vesuvius (which buried Pompeii) and Etna, Europe's most active volcano, are in Italy", JPN: "Mount Fuji is Japan's highest mountain",
      TZA: "Kilimanjaro is a dormant volcano in Tanzania", IDN: "Krakatoa's 1883 eruption was heard 4,800 km away", USA: "Mount St. Helens erupted in Washington state in 1980",
      ISL: "Eyjafjallajökull's 2010 ash cloud grounded European flights", MEX: "Popocatépetl towers near Mexico City", ECU: "Cotopaxi is one of the highest active volcanoes",
      PHL: "Pinatubo's 1991 eruption cooled the whole planet by about 0.5 °C",
    },
  },
  {
    id: "waterfalls", family: "landmarks", topic: "Waterfall", source: "Wikipedia: each waterfall",
    text: "Pin a country home to (or sharing) Angel Falls, Niagara Falls, Victoria Falls or Iguazu Falls.",
    why: "",
    answers: {
      VEN: "Angel Falls, the world's tallest waterfall (979 m), is in Venezuela", CAN: "Niagara's Horseshoe Falls are mostly in Canada", USA: "The American Falls at Niagara are in New York state",
      ZMB: "Victoria Falls (Mosi-oa-Tunya) is shared by Zambia", ZWE: "Victoria Falls is shared by Zimbabwe",
      ARG: "About 80% of Iguazu Falls are on the Argentine side", BRA: "Iguazu Falls' best views are from the Brazilian side",
    },
  },
  {
    id: "megastructures", family: "landmarks", topic: "Megastructure", source: "Wikipedia: each structure",
    text: "Pin a country home to the Great Wall, the Panama Canal, the Suez Canal or the Channel Tunnel.",
    why: "",
    answers: {
      CHN: "The Great Wall runs over 20,000 km across northern China", PAN: "The Panama Canal (1914) links the Atlantic and Pacific",
      EGY: "The Suez Canal (1869) links the Mediterranean and the Red Sea", GBR: "The Channel Tunnel runs from Folkestone in England", FRA: "The Channel Tunnel runs to Coquelles near Calais in France",
    },
  },
  {
    id: "tallest-buildings", family: "landmarks", topic: "List of tallest buildings", source: "CTBUH: tallest buildings (2025)",
    text: "Pin a country with one of the ten tallest buildings in the world (2025).",
    why: "",
    answers: {
      ARE: "The Burj Khalifa in Dubai (828 m) is the tallest building on Earth", MYS: "Merdeka 118 in Kuala Lumpur (679 m) is second",
      CHN: "China has six of the ten, led by the Shanghai Tower (632 m)", SAU: "The Makkah Royal Clock Tower in Mecca (601 m)",
      KOR: "Lotte World Tower in Seoul (555 m)", USA: "One World Trade Center in New York (541 m)",
    },
  },

  // ================= animals =================
  {
    id: "jaguars", family: "animals", topic: "Jaguar", source: "IUCN Red List: Panthera onca",
    text: "Pin a country where jaguars live in the wild.",
    why: "Wild jaguars live in",
    answers: {
      MEX: "Mexico", GTM: "Guatemala", BLZ: "Belize, home of the world's first jaguar reserve", HND: "Honduras", NIC: "Nicaragua", CRI: "Costa Rica",
      PAN: "Panama", COL: "Colombia", VEN: "Venezuela", GUY: "Guyana", SUR: "Suriname", FRA: "French Guiana (France)", ECU: "Ecuador", PER: "Peru",
      BOL: "Bolivia", BRA: "Brazil, about half of all jaguars, many in the Pantanal", PRY: "Paraguay", ARG: "Argentina",
      USA: "the United States, where a few cross into Arizona from Mexico",
    },
  },
  {
    id: "penguins", family: "animals", topic: "Penguin", source: "BirdLife International",
    text: "Pin a country where wild penguins breed (Antarctica doesn't count).",
    why: "",
    answers: {
      ARG: "Argentina has huge Magellanic penguin colonies at Punta Tombo", CHL: "Chile has Humboldt and Magellanic penguins", PER: "Peru has Humboldt penguins",
      ECU: "The Galápagos penguin is the only one that lives on the Equator", ZAF: "South Africa has African penguins at Boulders Beach", NAM: "Namibia has African penguins",
      AUS: "Australia has little penguins, the smallest species", NZL: "New Zealand has yellow-eyed and Fiordland penguins",
      GBR: "The Falklands and South Georgia (British) have king and gentoo penguins", FRA: "France's Kerguelen and Crozet islands have millions of king penguins",
      NOR: "Norway's Bouvet Island has chinstrap and macaroni penguins",
    },
  },
  {
    id: "kangaroos", family: "animals", topic: "Kangaroo", source: "Wikipedia: Macropodidae",
    text: "Pin a country where kangaroos (including tree kangaroos) live in the wild.",
    why: "",
    answers: { AUS: "Australia has red, grey and many other kangaroos", PNG: "Papua New Guinea has several tree kangaroos", IDN: "Indonesia's Papua region has tree kangaroos" },
  },
  {
    id: "lemurs", family: "animals", topic: "Lemur", source: "IUCN Red List: Lemuriformes",
    text: "Pin a country where lemurs live in the wild.",
    why: "",
    answers: { MDG: "Madagascar is home to over 100 kinds of lemur, found nowhere else", COM: "The mongoose lemur and common brown lemur also live on the Comoros" },
  },

  // ================= rivers =================
  {
    id: "ganges-brahmaputra", family: "river", topic: "Ganges", source: "Wikipedia: Ganges; Brahmaputra River",
    text: "Pin a country the Ganges or the Brahmaputra flows through.",
    why: "",
    answers: {
      IND: "The Ganges flows across northern India and the Brahmaputra through Assam", BGD: "Both rivers meet in Bangladesh to form the world's largest delta",
      CHN: "The Brahmaputra begins in Tibet, where it's called the Yarlung Tsangpo",
    },
  },
  {
    id: "rio-grande", family: "river", topic: "Rio Grande", source: "Wikipedia: Rio Grande",
    text: "Pin a country the Rio Grande flows through or along.",
    why: "",
    answers: { USA: "The Rio Grande rises in Colorado and flows through New Mexico", MEX: "The Rio Grande (Río Bravo) forms Mexico's border with Texas" },
  },
  {
    id: "orinoco", family: "river", topic: "Orinoco", source: "Wikipedia: Orinoco",
    text: "Pin a country the Orinoco flows through or along.",
    why: "",
    answers: { VEN: "Most of the Orinoco is in Venezuela", COL: "The Orinoco forms part of Colombia's border with Venezuela" },
  },
  {
    id: "senegal-river", family: "river", topic: "Senegal River", source: "Wikipedia: Senegal River",
    text: "Pin a country the Senegal River flows through or along.",
    why: "The Senegal River flows through or along",
    answers: { GIN: "Guinea, where its source rivers rise", MLI: "Mali, past Bafoulabé and Kayes", SEN: "Senegal, where it reaches the Atlantic at Saint-Louis", MRT: "Mauritania, along its southern border" },
  },
  {
    id: "elbe-oder", family: "river", topic: "Elbe", source: "Wikipedia: Elbe; Oder",
    text: "Pin a country the Elbe or the Oder flows through.",
    why: "",
    answers: { CZE: "Both rivers rise in Czechia", DEU: "The Elbe flows past Dresden and Hamburg, and the Oder forms the border with Poland", POL: "The Oder flows through Wrocław and reaches the sea at Szczecin" },
  },

  // ================= sport =================
  {
    id: "test-cricket", family: "sport", topic: "Test cricket", source: "ICC: Full Members",
    text: "Pin a country that plays Test cricket (including the West Indies nations).",
    why: "",
    answers: {
      GBR: "England played the first Test, against Australia, in 1877", AUS: "Australia played the first Test in 1877", ZAF: "South Africa, since 1889", NZL: "New Zealand, since 1930",
      IND: "India, since 1932", PAK: "Pakistan, since 1952", LKA: "Sri Lanka, since 1982", ZWE: "Zimbabwe, since 1992", BGD: "Bangladesh, since 2000",
      AFG: "Afghanistan, since 2018", IRL: "Ireland, since 2018",
      JAM: "Jamaica plays for the West Indies", TTO: "Trinidad and Tobago plays for the West Indies", BRB: "Barbados plays for the West Indies",
      GUY: "Guyana plays for the West Indies", ATG: "Antigua and Barbuda plays for the West Indies", KNA: "Saint Kitts and Nevis plays for the West Indies",
      LCA: "Saint Lucia plays for the West Indies", VCT: "Saint Vincent and the Grenadines plays for the West Indies", GRD: "Grenada plays for the West Indies",
      DMA: "Dominica plays for the West Indies",
    },
  },
  {
    id: "world-cup-winners", family: "sport", topic: "FIFA World Cup", source: "FIFA: World Cup winners 1930–2022",
    text: "Pin a country that won the men's FIFA World Cup between 1930 and 2022.",
    why: "",
    answers: {
      BRA: "Brazil won five: 1958, 1962, 1970, 1994 and 2002", DEU: "Germany won four: 1954, 1974, 1990 and 2014", ITA: "Italy won four: 1934, 1938, 1982 and 2006",
      ARG: "Argentina won three: 1978, 1986 and 2022", FRA: "France won two: 1998 and 2018", URY: "Uruguay won two: 1930 and 1950",
      GBR: "England won in 1966", ESP: "Spain won in 2010",
    },
  },
  {
    id: "rugby-world-cup", family: "sport", topic: "Rugby World Cup", source: "World Rugby: Rugby World Cup winners",
    text: "Pin a country that has won the men's Rugby World Cup.",
    why: "",
    answers: { ZAF: "South Africa has won four (1995, 2007, 2019, 2023)", NZL: "New Zealand has won three (1987, 2011, 2015)", AUS: "Australia has won two (1991, 1999)", GBR: "England won in 2003" },
  },
  {
    id: "cricket-world-cup", family: "sport", topic: "Cricket World Cup", source: "ICC: Men's Cricket World Cup winners",
    text: "Pin a country that has won the men's Cricket World Cup (West Indies nations count).",
    why: "",
    answers: {
      AUS: "Australia has won six", IND: "India won in 1983 and 2011", PAK: "Pakistan won in 1992", LKA: "Sri Lanka won in 1996", GBR: "England won in 2019",
      JAM: "Jamaica is part of the West Indies, champions in 1975 and 1979", TTO: "Trinidad and Tobago is part of the West Indies, champions in 1975 and 1979",
      BRB: "Barbados is part of the West Indies, champions in 1975 and 1979", GUY: "Guyana is part of the West Indies, champions in 1975 and 1979",
      ATG: "Antigua and Barbuda (Viv Richards' home) is part of the West Indies, champions in 1975 and 1979",
      KNA: "Saint Kitts and Nevis is part of the West Indies, champions in 1975 and 1979", LCA: "Saint Lucia is part of the West Indies, champions in 1975 and 1979",
      VCT: "Saint Vincent is part of the West Indies, champions in 1975 and 1979", GRD: "Grenada is part of the West Indies, champions in 1975 and 1979",
      DMA: "Dominica is part of the West Indies, champions in 1975 and 1979",
    },
  },
  {
    id: "tennis-slams", family: "sport", topic: "Grand Slam (tennis)", source: "ITF: Grand Slam tournaments",
    text: "Pin a country that hosts a tennis Grand Slam.",
    why: "",
    answers: { AUS: "The Australian Open is in Melbourne", FRA: "The French Open is at Roland-Garros in Paris", GBR: "Wimbledon is in London", USA: "The US Open is in New York" },
  },
  {
    id: "marathon-majors", family: "sport", topic: "World Marathon Majors", source: "Abbott World Marathon Majors",
    text: "Pin a country that hosts one of the World Marathon Majors.",
    why: "One of the World Marathon Majors is run in",
    answers: {
      JPN: "Tokyo", USA: "Boston (the oldest, since 1897), Chicago and New York", GBR: "London", DEU: "Berlin, where most world records are set",
      AUS: "Sydney, which joined the majors in 2025",
    },
  },

  // ================= science & space =================
  {
    id: "moon-landers", family: "science", topic: "Moon landing", source: "Wikipedia: list of Moon landings",
    text: "Pin a country that has soft-landed a spacecraft on the Moon.",
    why: "",
    answers: {
      RUS: "The Soviet Union's Luna 9 made the first soft landing in 1966", USA: "The US landed Apollo 11's astronauts in 1969, and is still the only country to land people",
      CHN: "China's Chang'e 4 made the first landing on the far side in 2019", IND: "India's Chandrayaan-3 made the first landing near the south pole in 2023",
      JPN: "Japan's SLIM landed in 2024, within 100 m of its target",
    },
  },
];
