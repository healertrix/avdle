// Crorepati: more questions (part 8) - the wider world, the way international Millionaire shows ask:
// world history, space, science, geography, art, literature, sport and inventions. Same shape as data/kbc.js.
(() => {
  const D = window.KBC_DATA;
  if (!D || !D.tiers) return;
  const add = (tier, list) => D.tiers[tier].push(...list);

  // ₹1,000 – ₹5,000
  add(0, [
    ["Which is the largest continent by area?", ["Asia", "Africa", "North America", "Europe"], 0, "Asia covers about 30% of the Earth's land and is home to about 60% of its people."],
    ["Which animal is known as the 'Ship of the Desert'?", ["Camel", "Horse", "Elephant", "Donkey"], 0, "Camels can go for days without water and their wide feet don't sink into the sand."],
    ["How many continents are there, by the most common count?", ["7", "5", "6", "8"], 0, "Asia, Africa, North America, South America, Antarctica, Europe and Australia (Oceania)."],
    ["Which is the coldest continent?", ["Antarctica", "Europe", "Asia", "North America"], 0, "The lowest temperature ever measured on the ground, −89.2 °C, was recorded at Vostok Station in Antarctica in 1983."],
    ["What is the boiling point of water at sea level?", ["100 °C", "90 °C", "50 °C", "212 °C"], 0, "Water boils at 100 °C (212 °F) at sea level. Higher up, where air pressure is lower, it boils at a lower temperature."],
    ["Which gas do humans need to breathe in to live?", ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], 0, "Air is about 21% oxygen and 78% nitrogen."],
    ["Which is the tallest animal in the world?", ["Giraffe", "Elephant", "Camel", "Ostrich"], 0, "A tall male giraffe can stand about 5.5 m high."],
    ["In which country are the pyramids of Giza?", ["Egypt", "Mexico", "Iraq", "Greece"], 0, "The Great Pyramid, built for the pharaoh Khufu, is the only one of the Seven Wonders of the Ancient World still standing."],
    ["Which country gifted the Statue of Liberty to the United States?", ["France", "Britain", "Spain", "Italy"], 0, "It was dedicated in New York Harbor in 1886. Gustave Eiffel designed its inner iron frame."],
    ["Which planet is closest to the Sun?", ["Mercury", "Venus", "Earth", "Mars"], 0, "Mercury takes just 88 days to go round the Sun."],
    ["What is the name of the force that pulls things down towards the Earth?", ["Gravity", "Magnetism", "Friction", "Pressure"], 0, "Isaac Newton described gravity in 1687. On the Moon, gravity is only about a sixth as strong."],
    ["Which instrument has 88 keys?", ["Piano", "Harmonium", "Guitar", "Violin"], 0, "A standard piano has 52 white keys and 36 black keys."],
    ["Which is the largest mammal on Earth?", ["Blue whale", "Elephant", "Giraffe", "Hippopotamus"], 0, "A blue whale can be about 30 m long, the largest animal known to have ever lived."],
    ["In which city is the Eiffel Tower?", ["Paris", "London", "Rome", "Berlin"], 0, "It was built for the 1889 World's Fair and was meant to stand for only 20 years."],
    ["How many sides does a hexagon have?", ["6", "5", "7", "8"], 0, "Bees build their honeycomb cells as hexagons."],
    ["Which sport is played at Wimbledon?", ["Tennis", "Cricket", "Golf", "Football"], 0, "Wimbledon, first held in 1877, is the oldest tennis tournament in the world and is played on grass."],
    ["What do honeybees make from flower nectar?", ["Honey", "Silk", "Wool", "Milk"], 0, "A worker bee makes only about a twelfth of a teaspoon of honey in her whole life."],
    ["Which ocean lies between Africa and Australia?", ["Indian Ocean", "Atlantic Ocean", "Pacific Ocean", "Arctic Ocean"], 0, "The Indian Ocean is the only ocean named after a country."],
    ["Who was the first person to step onto the Moon?", ["Neil Armstrong", "Yuri Gagarin", "Buzz Aldrin", "John Glenn"], 0, "He said: 'That's one small step for man, one giant leap for mankind.'"],
    ["What is frozen water called?", ["Ice", "Steam", "Dew", "Fog"], 0, "Water freezes at 0 °C. Unlike most things, it expands when it freezes, which is why ice floats."],
  ]);

  // ₹10,000 – ₹80,000
  add(1, [
    ["Which ancient wonder was a huge bronze statue of the sun god at a Greek harbour?", ["Colossus of Rhodes", "Statue of Zeus", "Lighthouse of Alexandria", "Mausoleum at Halicarnassus"], 0, "It stood about 33 m tall and fell in an earthquake around 226 BCE, about 54 years after it was built."],
    ["Who was the first woman to fly solo across the Atlantic Ocean?", ["Amelia Earhart", "Amy Johnson", "Bessie Coleman", "Valentina Tereshkova"], 0, "Earhart flew from Newfoundland to Northern Ireland in 1932. She disappeared over the Pacific in 1937."],
    ["Which explorer led the first expedition to reach the South Pole?", ["Roald Amundsen", "Robert Falcon Scott", "Ernest Shackleton", "Edmund Hillary"], 0, "Amundsen's Norwegian team got there on 14 December 1911, five weeks before Scott's British team."],
    ["Which wall divided a German city from 1961 to 1989?", ["The Berlin Wall", "Hadrian's Wall", "The Great Wall", "The Western Wall"], 0, "The Berlin Wall split East and West Berlin. Germany reunited in 1990."],
    ["Who painted the ceiling of the Sistine Chapel?", ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], 0, "Michelangelo painted it between 1508 and 1512, much of it standing on scaffolding with his head tilted back."],
    ["Who wrote 'Romeo and Juliet'?", ["William Shakespeare", "Charles Dickens", "Jane Austen", "Leo Tolstoy"], 0, "Shakespeare wrote it in the mid-1590s. It is set in Verona, Italy."],
    ["What is the hardest natural substance?", ["Diamond", "Gold", "Iron", "Quartz"], 0, "A diamond is pure carbon arranged in a tight crystal. Only another diamond can scratch it."],
    ["What is the chemical symbol for gold?", ["Au", "Ag", "Go", "Gd"], 0, "'Au' comes from the Latin 'aurum'. 'Ag' is silver, from 'argentum'."],
    ["Which is the longest river in South America?", ["Amazon", "Paraná", "Orinoco", "São Francisco"], 0, "The Amazon carries more water than any other river, about a fifth of all the river water that flows into the sea."],
    ["Which country is home to the kangaroo?", ["Australia", "New Zealand", "South Africa", "Brazil"], 0, "Kangaroos are marsupials: their young grow in a pouch. A group of kangaroos is called a mob."],
    ["Which city was buried when Mount Vesuvius erupted in 79 CE?", ["Pompeii", "Athens", "Carthage", "Venice"], 0, "Ash preserved Pompeii so well that we can still see its streets, shops and wall paintings."],
    ["Who made the first practical, long-lasting electric light bulb, in 1879?", ["Thomas Edison", "Nikola Tesla", "Alexander Graham Bell", "Michael Faraday"], 0, "Others had made electric lights before, but Edison's carbon-filament bulb could burn for many hours."],
    ["Which country's flag has a red maple leaf?", ["Canada", "Japan", "Switzerland", "Peru"], 0, "Canada adopted the maple leaf flag in 1965."],
    ["Which is the largest desert in the world, counting cold deserts?", ["Antarctica", "Sahara", "Gobi", "Arabian"], 0, "A desert is a place with very little rain or snow. By that measure Antarctica is the largest; the Sahara is the largest hot desert."],
    ["Which planet is known for being tipped on its side, with rings and moons circling it sideways?", ["Uranus", "Neptune", "Saturn", "Jupiter"], 0, "Uranus's axis is tilted about 98 degrees, probably after a huge collision long ago."],
    ["How many planets are in our solar system?", ["8", "9", "7", "10"], 0, "Pluto was counted as the ninth until 2006, when it was reclassified as a dwarf planet."],
    ["What is a group of lions called?", ["A pride", "A pack", "A herd", "A flock"], 0, "A pride usually has a few males, several related females and their cubs."],
    ["Which language has the most native speakers in the world?", ["Mandarin Chinese", "English", "Spanish", "Hindi"], 0, "Mandarin has over 900 million native speakers. English has the most speakers if you count those who learned it as a second language."],
    ["Who developed the theory of relativity?", ["Albert Einstein", "Isaac Newton", "Galileo Galilei", "Stephen Hawking"], 0, "Einstein published special relativity in 1905 and general relativity in 1915. E = mc² comes from special relativity."],
    ["Which empire was ruled by Julius Caesar's adopted heir, Augustus?", ["The Roman Empire", "The Greek Empire", "The Persian Empire", "The Ottoman Empire"], 0, "Augustus became the first Roman emperor in 27 BCE. The month of August is named after him."],
    ["Which mountain range has the world's highest peaks?", ["Himalayas", "Andes", "Alps", "Rockies"], 0, "All 14 of the world's peaks over 8,000 m are in the Himalayas and the nearby Karakoram."],
    ["Which city is known as the 'Big Apple'?", ["New York", "Los Angeles", "Chicago", "London"], 0, "The nickname was popularised in the 1920s by a sports writer and later by a tourism campaign in the 1970s."],
    ["What is the currency of Japan?", ["Yen", "Won", "Yuan", "Ringgit"], 0, "The won is South Korea's currency and the yuan (renminbi) is China's."],
    ["In which sport is the Ballon d'Or awarded?", ["Football", "Basketball", "Cricket", "Tennis"], 0, "It is given each year to the best footballer. Lionel Messi has won it a record eight times."],
    ["Who wrote 'The Lord of the Rings'?", ["J.R.R. Tolkien", "C.S. Lewis", "J.K. Rowling", "George R.R. Martin"], 0, "Tolkien, an Oxford professor, published it in 1954–55. He also invented the Elvish languages spoken in it."],
  ]);
})();
