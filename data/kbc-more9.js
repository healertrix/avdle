// Crorepati: more questions (part 9) - the wider world at the higher rungs, plus Fastest Finger First.
// Same shape as data/kbc.js.
(() => {
  const D = window.KBC_DATA;
  if (!D || !D.tiers) return;
  const add = (tier, list) => D.tiers[tier].push(...list);

  // ₹1.6 lakh – ₹6.4 lakh
  add(2, [
    ["The Hanging Gardens, one of the Seven Wonders of the Ancient World, are said to have been in which city?", ["Babylon", "Athens", "Alexandria", "Rome"], 0, "No trace of them has been found for certain, so some historians wonder if they were somewhere else, or only a legend."],
    ["Which ruler became the first emperor of a unified China in 221 BCE?", ["Qin Shi Huang", "Kublai Khan", "Liu Bang", "Wu Zetian"], 0, "He standardised writing, weights and coins, and was buried with the Terracotta Army."],
    ["In 1215, which English king put his seal to the Magna Carta?", ["King John", "Henry VIII", "Richard the Lionheart", "William the Conqueror"], 0, "The barons forced him to accept that even the king was under the law."],
    ["Which civilisation built Machu Picchu in the Andes?", ["Inca", "Maya", "Aztec", "Olmec"], 0, "It was built in the 15th century for the Inca emperor Pachacuti, high above the Urubamba valley in Peru."],
    ["Which ship carried the Pilgrims from England to America in 1620?", ["Mayflower", "Santa María", "Endeavour", "Victoria"], 0, "The Pilgrims landed at Plymouth, Massachusetts. The Santa María was Columbus's ship."],
    ["Who was the first President of the United States?", ["George Washington", "Thomas Jefferson", "Abraham Lincoln", "John Adams"], 0, "Washington took office in 1789 and refused to serve more than two terms."],
    ["In 1893, which country became the first to let all women vote in national elections?", ["New Zealand", "United Kingdom", "USA", "Finland"], 0, "Kate Sheppard led the campaign. Finland, in 1906, was the first to let women stand for parliament too."],
    ["Who became Britain's first woman Prime Minister, in 1979?", ["Margaret Thatcher", "Theresa May", "Queen Elizabeth II", "Indira Gandhi"], 0, "Thatcher served until 1990, longer than any British PM of the 20th century."],
    ["Which US President signed the Emancipation Proclamation to free enslaved people?", ["Abraham Lincoln", "George Washington", "Ulysses S. Grant", "Thomas Jefferson"], 0, "Lincoln issued it on 1 January 1863, during the Civil War."],
    ["Which philosopher was tutor to the young Alexander the Great?", ["Aristotle", "Plato", "Socrates", "Pythagoras"], 0, "Aristotle taught Alexander in Macedonia. Aristotle had been a student of Plato, who was a student of Socrates."],
    ["Which British Prime Minister led the country through most of the Second World War?", ["Winston Churchill", "Neville Chamberlain", "Clement Attlee", "Anthony Eden"], 0, "Churchill took over in May 1940. He also won the Nobel Prize in Literature in 1953."],
    ["In which city was the Titanic built?", ["Belfast", "Liverpool", "Southampton", "Glasgow"], 0, "Harland and Wolff built it in Belfast. It sailed from Southampton on its only voyage."],
    ["Which country hosted the first modern Olympic Games, in 1896?", ["Greece", "France", "USA", "Britain"], 0, "They were held in Athens. The marathon was won by a Greek water-carrier, Spyridon Louis."],
    ["Which is the brightest planet in the night sky?", ["Venus", "Jupiter", "Mars", "Saturn"], 0, "Only the Moon is brighter at night. Clouds on Venus reflect most of the sunlight that hits them."],
    ["What was the name of Apollo 11's lunar module, which landed on the Moon?", ["Eagle", "Columbia", "Falcon", "Intrepid"], 0, "'The Eagle has landed,' said Neil Armstrong. Columbia was the command module that stayed in orbit."],
    ["Which is the only planet not named after a Greek or Roman god?", ["Earth", "Mars", "Uranus", "Neptune"], 0, "Its name comes from old English and Germanic words for the ground. Uranus is named after a Greek sky god."],
    ["Which chemical element has the symbol Fe?", ["Iron", "Fluorine", "Lead", "Francium"], 0, "Fe comes from the Latin 'ferrum'. Lead is Pb, from 'plumbum'."],
    ["Who painted 'The Starry Night'?", ["Vincent van Gogh", "Claude Monet", "Pablo Picasso", "Salvador Dalí"], 0, "Van Gogh painted it in 1889 from his window at an asylum in Saint-Rémy, in southern France."],
    ["Who composed the 'Moonlight Sonata'?", ["Ludwig van Beethoven", "Wolfgang Amadeus Mozart", "Johann Sebastian Bach", "Frédéric Chopin"], 0, "Beethoven wrote it in 1801. The nickname came from a critic after his death."],
    ["Which is the smallest country in the world?", ["Vatican City", "Monaco", "San Marino", "Liechtenstein"], 0, "Vatican City covers just 0.44 km² inside Rome. Monaco is second."],
    ["What is the capital of Canada?", ["Ottawa", "Toronto", "Vancouver", "Montreal"], 0, "Queen Victoria chose Ottawa in 1857, partly because it sits between English- and French-speaking Canada."],
    ["The Bosphorus strait, dividing Europe from Asia, runs through which city?", ["Istanbul", "Athens", "Cairo", "Baku"], 0, "Istanbul is the only great city that lies on two continents."],
    ["Which river flows through Baghdad?", ["Tigris", "Euphrates", "Nile", "Jordan"], 0, "The Tigris and Euphrates frame Mesopotamia, 'the land between the rivers'."],
    ["Which men's tennis player has won the most Grand Slam singles titles?", ["Novak Djokovic", "Rafael Nadal", "Roger Federer", "Pete Sampras"], 0, "Djokovic won his 24th in 2023. Nadal won 22, a record 14 of them at the French Open."],
    ["Who wrote the novel 'One Hundred Years of Solitude'?", ["Gabriel García Márquez", "Jorge Luis Borges", "Pablo Neruda", "Isabel Allende"], 0, "The 1967 novel, set in the town of Macondo, made magical realism famous. He won the Nobel in 1982."],
    ["Which is the largest internal organ in the human body?", ["Liver", "Brain", "Lungs", "Heart"], 0, "The liver weighs about 1.5 kg and does hundreds of jobs, from cleaning the blood to storing energy."],
    ["Which blood cells fight infections in the body?", ["White blood cells", "Red blood cells", "Platelets", "Plasma cells only"], 0, "Red cells carry oxygen and platelets help blood clot. White cells attack germs."],
    ["Which scientist first argued, in 1912, that the continents slowly drift across the Earth?", ["Alfred Wegener", "Charles Darwin", "Charles Lyell", "James Hutton"], 0, "Wegener noticed that coastlines like South America and Africa fit together. Plate tectonics later explained how."],
    ["The ancient city of Petra, carved into rose-red cliffs, is in which country?", ["Jordan", "Egypt", "Turkey", "Saudi Arabia"], 0, "The Nabataeans carved it over 2,000 years ago. It is one of the New Seven Wonders of the World."],
    ["'Big Ben' in London is really the name of what?", ["The great bell in the clock tower", "The clock tower itself", "The clock's face", "The palace"], 0, "The tower was renamed the Elizabeth Tower in 2012. Big Ben is its 13-tonne bell."],
    ["Which Argentine footballer scored the 'Hand of God' goal against England in 1986?", ["Diego Maradona", "Lionel Messi", "Gabriel Batistuta", "Mario Kempes"], 0, "Four minutes later he scored the 'Goal of the Century', dribbling past five players."],
    ["Which team won the first Cricket World Cup, in 1975?", ["West Indies", "Australia", "England", "India"], 0, "Clive Lloyd's West Indies beat Australia at Lord's, and won again in 1979."],
    ["At the 1936 Berlin Olympics, which American athlete won four gold medals?", ["Jesse Owens", "Carl Lewis", "Jim Thorpe", "Usain Bolt"], 0, "Owens won the 100 m, 200 m, long jump and 4×100 m relay. Carl Lewis matched the feat in 1984."],
  ]);

  // ₹12.5 lakh – ₹50 lakh
  add(3, [
    ["Which Greek mathematician is said to have shouted 'Eureka!' in his bath?", ["Archimedes", "Pythagoras", "Euclid", "Thales"], 0, "He realised he could measure the volume of a crown by the water it pushed aside, and so test whether it was pure gold."],
    ["After his first defeat in 1814, Napoleon was exiled to which island?", ["Elba", "St Helena", "Corsica", "Malta"], 0, "He escaped from Elba in 1815 for the 'Hundred Days' that ended at Waterloo. He died on St Helena."],
    ["Which Mongol ruler founded China's Yuan dynasty?", ["Kublai Khan", "Genghis Khan", "Ögedei Khan", "Timur"], 0, "Kublai, Genghis Khan's grandson, ruled from Khanbaliq, today's Beijing. Marco Polo served at his court."],
    ["Which Carthaginian general crossed the Alps with war elephants to attack Rome?", ["Hannibal", "Hamilcar", "Scipio", "Spartacus"], 0, "Hannibal crossed in 218 BCE. Scipio finally beat him at Zama in 202 BCE."],
    ["Whose almost untouched tomb did Howard Carter find in the Valley of the Kings in 1922?", ["Tutankhamun", "Ramesses II", "Khufu", "Akhenaten"], 0, "The boy-king's tomb held more than 5,000 objects, including his famous gold mask."],
    ["Which empire had Constantinople as its capital until 1453?", ["Byzantine Empire", "Ottoman Empire", "Holy Roman Empire", "Persian Empire"], 0, "The Byzantine (Eastern Roman) Empire fell when the Ottomans under Mehmed II took the city."],
    ["Who co-wrote 'The Communist Manifesto' with Karl Marx in 1848?", ["Friedrich Engels", "Vladimir Lenin", "Leon Trotsky", "Joseph Stalin"], 0, "Engels, whose family owned cotton mills in Manchester, also helped pay for Marx's work."],
    ["Which dynasty ruled Russia until the revolution of 1917?", ["Romanov", "Habsburg", "Hohenzollern", "Rurik"], 0, "The Romanovs ruled for 304 years. Tsar Nicholas II and his family were killed in 1918."],
    ["What do astronomers call the boundary around a black hole beyond which nothing can escape?", ["Event horizon", "Photon sphere", "Accretion disc", "Singularity"], 0, "Once past the event horizon, even light can't get out. The singularity is the point at the very centre."],
    ["In about 5 billion years, what is the Sun expected to swell into, before ending as a white dwarf?", ["A red giant", "A black hole", "A neutron star", "A blue supergiant"], 0, "The Sun is too small to become a black hole or neutron star. As a red giant it may swallow Mercury and Venus."],
    ["Which planet has the fastest winds in the solar system, about 2,000 km/h?", ["Neptune", "Jupiter", "Saturn", "Venus"], 0, "Neptune's supersonic winds were measured by Voyager 2 in 1989."],
    ["Which moon of Jupiter is thought to have a salty ocean under its icy crust, making it a target in the search for life?", ["Europa", "Io", "Titan", "Phobos"], 0, "NASA's Europa Clipper, launched in 2024, will study it. Titan belongs to Saturn and Phobos to Mars."],
    ["Which spacecraft made the first flyby of Pluto, in 2015?", ["New Horizons", "Voyager 2", "Cassini", "Juno"], 0, "Its photos showed a heart-shaped plain of nitrogen ice, now called Tombaugh Regio."],
    ["What shape is the Milky Way galaxy?", ["Barred spiral", "Elliptical", "Ring", "Irregular"], 0, "It has a bar of stars across its centre and spiral arms; the Sun sits in a smaller arm called the Orion Spur."],
    ["Which is the most common element in the universe?", ["Hydrogen", "Helium", "Oxygen", "Carbon"], 0, "Roughly three-quarters of all normal matter is hydrogen."],
    ["Who developed the first widely used polio vaccine, tested in 1954?", ["Jonas Salk", "Albert Sabin", "Louis Pasteur", "Edward Jenner"], 0, "Salk refused to patent it. Albert Sabin's oral vaccine, given as drops, came a few years later."],
    ["What does 'DNA' stand for?", ["Deoxyribonucleic acid", "Dinitrogen acid", "Deoxyribose nitrate", "Double nucleic arrangement"], 0, "DNA's double helix was described by Watson and Crick in 1953, using Rosalind Franklin's X-ray images."],
    ["Who came up with the theory of evolution by natural selection at the same time as Darwin?", ["Alfred Russel Wallace", "Gregor Mendel", "Jean-Baptiste Lamarck", "Thomas Huxley"], 0, "Wallace sent Darwin his idea from Southeast Asia in 1858, and their papers were read together that year."],
    ["Which Spanish artist painted 'Guernica', about the bombing of a Basque town?", ["Pablo Picasso", "Salvador Dalí", "Joan Miró", "Francisco Goya"], 0, "Picasso painted it in 1937 for the Paris World's Fair."],
    ["Who composed 'The Four Seasons'?", ["Antonio Vivaldi", "Johann Sebastian Bach", "George Frideric Handel", "Joseph Haydn"], 0, "Vivaldi, a priest and violinist in Venice, published the four violin concertos in 1725."],
    ["Who wrote the novel 'War and Peace'?", ["Leo Tolstoy", "Fyodor Dostoevsky", "Anton Chekhov", "Ivan Turgenev"], 0, "It follows Russian families during Napoleon's invasion of 1812."],
    ["Which ancient Greek epic tells of Odysseus's ten-year journey home from Troy?", ["The Odyssey", "The Iliad", "The Aeneid", "The Argonautica"], 0, "Both the Odyssey and the Iliad are credited to Homer. The Aeneid is a Roman epic by Virgil."],
    ["Where is the deepest known point in the world's oceans?", ["Challenger Deep, in the Mariana Trench", "Puerto Rico Trench", "Java Trench", "Tonga Trench"], 0, "It is about 10,900 m deep. Film-maker James Cameron dived there alone in 2012."],
    ["Which is the longest mountain range on land?", ["Andes", "Himalayas", "Rockies", "Urals"], 0, "The Andes run about 7,000 km down the western side of South America."],
    ["Which lake is the main source of the White Nile?", ["Lake Victoria", "Lake Tanganyika", "Lake Malawi", "Lake Chad"], 0, "John Hanning Speke identified it as the source in 1858. The Blue Nile starts at Lake Tana in Ethiopia."],
    ["Which country is often said to have the most islands, more than 200,000?", ["Sweden", "Indonesia", "Philippines", "Canada"], 0, "Sweden counts around 267,000 islands, most of them tiny and uninhabited."],
    ["Which strait links the Mediterranean Sea with the Atlantic Ocean?", ["Strait of Gibraltar", "Strait of Hormuz", "Bosphorus", "Strait of Messina"], 0, "At its narrowest it is about 14 km wide, between Spain and Morocco."],
    ["Which country has the longest coastline in the world?", ["Canada", "Russia", "Indonesia", "Australia"], 0, "Canada's coastline, with all its islands, runs to about 240,000 km."],
    ["Which city-state's 300 soldiers made a famous stand at Thermopylae in 480 BCE?", ["Sparta", "Athens", "Corinth", "Thebes"], 0, "King Leonidas led them. Thousands of other Greeks also fought there, though the 300 Spartans are best remembered."],
    ["Who was the only woman to win Nobel Prizes in two different sciences?", ["Marie Curie", "Dorothy Hodgkin", "Irène Joliot-Curie", "Lise Meitner"], 0, "She won Physics in 1903 and Chemistry in 1911. Her daughter Irène also won a Nobel."],
    ["Who painted 'Girl with a Pearl Earring'?", ["Johannes Vermeer", "Rembrandt", "Jan van Eyck", "Peter Paul Rubens"], 0, "Vermeer painted it in Delft around 1665. It hangs in the Mauritshuis in The Hague."],
    ["Who wrote 'Don Quixote'?", ["Miguel de Cervantes", "Lope de Vega", "Federico García Lorca", "Gabriel García Márquez"], 0, "Its first part came out in 1605. It is often called the first modern novel."],
  ]);

  // ₹1 Crore
  add(4, [
    ["Which Babylonian king's law code included the rule of 'an eye for an eye'?", ["Hammurabi", "Nebuchadnezzar II", "Sargon of Akkad", "Ashurbanipal"], 0, "The code, carved on a black stone pillar around 1754 BCE, is now in the Louvre."],
    ["Which woman ruled Egypt as pharaoh and was often shown wearing a false beard?", ["Hatshepsut", "Cleopatra", "Nefertiti", "Nefertari"], 0, "Hatshepsut ruled for about 20 years in the 15th century BCE and built a great temple at Deir el-Bahari."],
    ["What was the capital of the Aztec Empire?", ["Tenochtitlan", "Cusco", "Teotihuacan", "Chichén Itzá"], 0, "It stood on an island in Lake Texcoco. Mexico City was built on its ruins."],
    ["Which explorer led the first voyage round the world, though he was killed before it ended?", ["Ferdinand Magellan", "Vasco da Gama", "Francis Drake", "James Cook"], 0, "Magellan died in the Philippines in 1521. Juan Sebastián Elcano brought one ship, the Victoria, home in 1522."],
    ["Which Frankish king did the Pope crown emperor in Rome on Christmas Day, 800?", ["Charlemagne", "Otto I", "Clovis", "Constantine"], 0, "Pope Leo III crowned Charlemagne in Rome. Otto I, crowned in 962, is often counted as the first Holy Roman Emperor."],
    ["Which empire built the palace city of Persepolis?", ["Achaemenid Persian Empire", "Assyrian Empire", "Roman Empire", "Ottoman Empire"], 0, "Darius I began it around 518 BCE. Alexander the Great burned it in 330 BCE."],
    ["Which Chinese admiral led huge 'treasure fleets' across the Indian Ocean in the early 1400s?", ["Zheng He", "Sun Tzu", "Kublai Khan", "Koxinga"], 0, "Zheng He made seven voyages between 1405 and 1433, reaching India, Arabia and East Africa."],
    ["Which 1494 treaty divided newly found lands between Spain and Portugal?", ["Treaty of Tordesillas", "Treaty of Utrecht", "Treaty of Paris", "Treaty of Westphalia"], 0, "The line ran north–south through the Atlantic, which is why Brazil speaks Portuguese."],
    ["Which revolution of 1917 brought Lenin's Bolsheviks to power?", ["October Revolution", "February Revolution", "Velvet Revolution", "Glorious Revolution"], 0, "By the old Russian calendar it took place in October; by ours it was 7 November."],
    ["What is carried on the 'Golden Records' aboard both Voyager spacecraft?", ["Sounds, music and pictures of Earth", "Maps of every star", "A list of all human languages", "Seeds of Earth plants"], 0, "Carl Sagan's team chose greetings in 55 languages, music from Bach to Chuck Berry, and natural sounds."],
    ["Which planet had a storm called the Great Dark Spot, photographed by Voyager 2 in 1989?", ["Neptune", "Uranus", "Saturn", "Jupiter"], 0, "By the time Hubble looked in 1994, the spot had disappeared."],
    ["Which dwarf planet is the largest object in the asteroid belt?", ["Ceres", "Pluto", "Eris", "Vesta"], 0, "Ceres holds about a third of the belt's mass. NASA's Dawn probe orbited it from 2015 to 2018."],
    ["Which Belgian priest and physicist first proposed that the universe began from a 'primeval atom'?", ["Georges Lemaître", "Edwin Hubble", "George Gamow", "Fred Hoyle"], 0, "Lemaître put the idea forward in 1931. Fred Hoyle, who disliked the theory, coined the name 'Big Bang' in 1949."],
    ["What is a 'magnetar'?", ["A neutron star with an extremely strong magnetic field", "A planet made of iron", "A comet's magnetic tail", "A type of telescope"], 0, "A magnetar's magnetic field is about a thousand trillion times stronger than Earth's."],
    ["In which city is the Hermitage, one of the world's largest art museums?", ["St Petersburg", "Moscow", "Vienna", "Paris"], 0, "It was founded by Catherine the Great in 1764 and fills the Winter Palace of the tsars."],
    ["Which is the only country to have played at every men's FIFA World Cup?", ["Brazil", "Germany", "Italy", "Argentina"], 0, "Brazil has also won the most titles, five."],
    ["Which empire was ruled from Cusco?", ["Inca Empire", "Aztec Empire", "Maya civilisation", "Olmec civilisation"], 0, "Cusco, in Peru's Andes, means 'navel of the world' in Quechua."],
  ]);

  // ₹7 Crore
  add(5, [
    ["Which Mesopotamian poem is often called the oldest great work of literature?", ["The Epic of Gilgamesh", "The Iliad", "The Book of the Dead", "The Rigveda"], 0, "Its oldest versions are about 4,000 years old. It includes a great flood story."],
    ["Which ancient script of Crete and Greece did Michael Ventris decipher in 1952?", ["Linear B", "Linear A", "Cuneiform", "Phoenician"], 0, "Ventris showed Linear B was an early form of Greek. Linear A is still undeciphered."],
    ["Which Byzantine emperor built the Hagia Sophia, finished in 537?", ["Justinian I", "Constantine I", "Theodosius II", "Basil II"], 0, "On entering, Justinian is said to have cried, 'Solomon, I have surpassed you!'"],
    ["Which Roman emperor gave his name to a second wall built north of Hadrian's Wall in Scotland?", ["Antoninus Pius", "Septimius Severus", "Trajan", "Marcus Aurelius"], 0, "The Antonine Wall was begun in 142 CE but abandoned about 20 years later."],
    ["Which astronomer catalogued the stars from his observatory, Uraniborg, on the island of Hven?", ["Tycho Brahe", "Johannes Kepler", "Nicolaus Copernicus", "Ole Rømer"], 0, "Tycho's measurements, made without a telescope, were so precise that Kepler used them to find the laws of planetary motion."],
    ["Who discovered the first pulsar in 1967, while still a graduate student?", ["Jocelyn Bell Burnell", "Vera Rubin", "Cecilia Payne", "Henrietta Leavitt"], 0, "The signal was so regular it was jokingly labelled 'LGM-1', for 'little green men'."],
    ["Whose discovery about Cepheid stars let astronomers measure the distance to other galaxies?", ["Henrietta Swan Leavitt", "Annie Jump Cannon", "Vera Rubin", "Caroline Herschel"], 0, "In 1912 she showed that brighter Cepheids pulse more slowly. Hubble used this to measure the distance to Andromeda."],
    ["Who showed in 1925 that stars are made mostly of hydrogen and helium?", ["Cecilia Payne-Gaposchkin", "Marie Curie", "Henrietta Leavitt", "Annie Jump Cannon"], 0, "Her PhD thesis was called 'probably the most brilliant ever written in astronomy'."],
    ["Which Soviet probe made the first soft landing on another planet, Venus, in 1970?", ["Venera 7", "Luna 9", "Mars 3", "Vega 1"], 0, "Venera 7 sent back signals for about 20 minutes from a surface hot enough to melt lead."],
    ["Which ancient Greek astronomer proposed a Sun-centred universe about 1,800 years before Copernicus?", ["Aristarchus of Samos", "Ptolemy", "Hipparchus", "Eratosthenes"], 0, "His idea was not accepted in his time; Ptolemy's Earth-centred model won out for 1,400 years."],
    ["The Antikythera mechanism, found in a Greek shipwreck, was mainly used for what?", ["Predicting the positions of the Sun, Moon and planets", "Navigating by the stars", "Measuring time with water", "Weighing cargo"], 0, "The bronze gear device, about 2,100 years old, is often called the first analogue computer."],
    ["Which NASA spacecraft made the first landing on an asteroid, on Eros in 2001?", ["NEAR Shoemaker", "Dawn", "OSIRIS-REx", "Hayabusa"], 0, "It was built only to orbit Eros, but controllers landed it gently at the end of its mission."],
    ["What is the name of the star nearest to our Sun?", ["Proxima Centauri", "Sirius", "Barnard's Star", "Alpha Centauri A"], 0, "Proxima is about 4.24 light-years away, a little closer than its neighbours Alpha Centauri A and B."],
    ["Which Hungarian-born physicist convinced Einstein to write to President Roosevelt about atomic bombs in 1939?", ["Leo Szilard", "Edward Teller", "John von Neumann", "Eugene Wigner"], 0, "Szilard drafted the letter, which led to the Manhattan Project."],
    ["The Rosetta Stone carries the same decree in hieroglyphs, Demotic and which other script?", ["Ancient Greek", "Latin", "Aramaic", "Phoenician"], 0, "Because scholars could read the Greek, they could work out the hieroglyphs."],
  ]);

  // Fastest Finger First: the wider world
  D.fff.push(
    ["Arrange these empires by when they began, earliest first.", ["Ottoman Empire", "Roman Empire", "Achaemenid Persian Empire", "Mongol Empire"], [2, 1, 3, 0], "Achaemenid Persia (c. 550 BCE), the Roman Empire (27 BCE), the Mongol Empire (1206), the Ottoman Empire (c. 1299)."],
    ["Arrange these voyages in order, earliest first.", ["Magellan's expedition sets out", "Columbus reaches the Americas", "James Cook's first voyage", "Vasco da Gama reaches India"], [1, 3, 0, 2], "Columbus (1492), Vasco da Gama (1498), Magellan (1519), Cook (1768)."],
    ["Arrange these inventions in order, earliest first.", ["The transistor", "Newcomen's steam engine", "The Wright brothers' aeroplane", "Edison's light bulb"], [1, 3, 2, 0], "Steam engine (1712), light bulb (1879), aeroplane (1903), transistor (1947)."],
    ["Arrange these space events in order, earliest first.", ["The James Webb telescope launches", "The first image of a black hole", "The Hubble telescope launches", "The first piece of the ISS goes up"], [2, 3, 1, 0], "Hubble (1990), first ISS module (1998), black hole image (2019), James Webb (2021)."],
    ["Arrange these planets by the length of their year, shortest first.", ["Jupiter", "Venus", "Mercury", "Mars"], [2, 1, 3, 0], "Mercury (88 days), Venus (225 days), Mars (687 days), Jupiter (about 12 years)."],
    ["Arrange these events of the 20th century in order, earliest first.", ["The Korean War begins", "World War II begins", "The Russian Revolution", "World War I begins"], [3, 2, 1, 0], "World War I (1914), the Russian Revolution (1917), World War II (1939), the Korean War (1950)."],
    ["Arrange these countries by area, largest first.", ["Australia", "Canada", "Brazil", "Russia"], [3, 1, 2, 0], "Russia (17.1 million km²), Canada (10.0), Brazil (8.5), Australia (7.7)."],
    ["Arrange these continents by area, largest first.", ["South America", "Africa", "North America", "Asia"], [3, 1, 2, 0], "Asia, Africa, North America, South America, then Antarctica, Europe and Australia."],
    ["Arrange these painters by when they were born, earliest first.", ["Pablo Picasso", "Rembrandt", "Leonardo da Vinci", "Vincent van Gogh"], [2, 1, 3, 0], "Leonardo (1452), Rembrandt (1606), Van Gogh (1853), Picasso (1881)."],
    ["Arrange these composers by when they were born, earliest first.", ["Tchaikovsky", "Beethoven", "Bach", "Mozart"], [2, 3, 1, 0], "Bach (1685), Mozart (1756), Beethoven (1770), Tchaikovsky (1840)."]
  );
})();
