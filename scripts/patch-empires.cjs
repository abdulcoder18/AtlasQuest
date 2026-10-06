// content patch: adds builder/reach/darkSide (+deepLore for famous ones) to empires.json and appends 10 new empires.
const fs = require("fs");
const d = JSON.parse(fs.readFileSync("data/empires.json", "utf8"));

const F = {
  "roman-empire": {
    builder: "Augustus (Octavian), heir of Julius Caesar, after decades of civil war.",
    reach: "About 5 million km2 at its height under Trajan: Britain to the Persian Gulf, the Rhine to the Sahara, roughly 60-70 million people.",
    darkSide: "Conquest meant enslavement on an industrial scale - Gaul lost perhaps a third of its population in Caesar's campaigns, and Carthage was erased so completely the fields were salted by legend. Crucifixion, arena executions and mass slave markets were the machinery of empire; emperors were betrayed by their own guards more often than by foreign foes - Caligula, Claudius and Gaius all died by palace knives.",
    deepLore: "Rome's genius was turning enemies into stakeholders: conquered elites could become citizens, senators, even emperors from Spain, Africa and the Balkans. The legions built roads, aqueducts and cities that outlived the empire by millennia. But the Pretorian Guard - created to protect the emperor - became his most frequent assassins, auctioning the throne in 193 AD. When Diocletian split administration and Constantine moved the capital east to Byzantium, the western half was left to pay for its own defense; within 80 years it hired the very barbarians who buried it.",
  },
  "byzantine-empire": {
    builder: "Constantine the Great, refounding Byzantium as New Rome in 330 AD.",
    reach: "At its peak under Justinian it reclaimed Italy, North Africa and southern Spain - about 2.8 million km2 - and it held Asia Minor and the Balkans for most of a millennium.",
    darkSide: "Court intrigue was a blood sport: emperors were blinded, castrated or strangled by uncles, wives and generals - Basil I murdered his patron Michael III to take the throne. The Fourth Crusade of 1204, aimed at Jerusalem, was diverted to Constantinople by Venetian money and a betrayed claimant; the city was raped and looted for three days by fellow Christians. Religious dissenters suffered persecution, most famously the Iconoclast purges.",
    deepLore: "Byzantium survived 1,123 years by diplomacy as much as war - the 'Byzantine' playbook of marriage alliances, bribes, hostages and playing enemies against each other is literally the word for scheming today. It preserved Greek and Roman texts that would later ignite the Renaissance. Greek fire guarded the Bosporus for seven centuries until the secret died with the empire. In the end, cannon ended what Attila and the Avars could not: on the last day, 29 May 1453, the emperor removed his imperial insignia and died unrecognized in the breach.",
  },
  "ottoman-empire": {
    builder: "Osman I, a frontier beylik chief in Anatolia around 1299.",
    reach: "Around 5.2 million km2 under Suleiman: Hungary to Yemen, Algeria to the Caucasus, three continents and the entire Mediterranean Arab world.",
    darkSide: "The devshirme system took Christian boys from their families to become janissaries - loyal, but stolen. Succession was fratricide by law: a new sultan's brothers were legally strangled with silk cords, and one sultan killed 19 of them in a single night. The Armenian genocide of 1915, in the empire's dying years, remains its darkest atrocity. Viziers served at the pleasure of the sultan and many lost their heads - literally - when favors turned.",
    deepLore: "The Ottomans ran one of history's most pragmatic machines: Christians and Jews ran as autonomous millets, paid taxes instead of serving, and the Orthodox Patriarch became an Ottoman official. Suleiman's law code shaped the Middle East into modern times. The empire's fatal flaw was succession: fratricide gave way to the Kafes (the Cage), where heirs were imprisoned in the harem until crowned - producing long-reigning fools. By the 1800s the 'Sick Man of Europe' survived only because rivals couldn't agree who got the corpse.",
  },
  "british-empire": {
    builder: "Merchant companies and crown charters - the East India Company, the Virginia Company - before Parliament took over.",
    reach: "35.5 million km2, a quarter of the world's land and people: India, Canada, Australia, half of Africa, islands on every ocean.",
    darkSide: "The Bengal famine of 1943 killed around 3 million under Churchill's war cabinet while grain ships passed by; the Amritsar massacre of 1919 shot 1,000 unarmed Indians in ten minutes. The Atlantic slave trade ran on British ships for 150 years. Australia's settler frontier devastated Aboriginal nations; concentration camps were pioneered in the Boer War, where 26,000 women and children died. Ireland lost a million to famine under export-protecting landlordism.",
    deepLore: "Britain's trick was ruling on the cheap: one civil servant per 200,000 Indians, governing through princes, landlords and sepoys. It built 100,000 km of Indian railways - mostly to move cotton and troops. The empire's endgame was seeded by its own education: Gandhi, Nehru and Kenyatta learned law and self-determination in London. In 1947 the Raj was partitioned in six weeks; a million died in the Partition massacres, the empire's last and largest wound.",
  },
  "spanish-empire": {
    builder: "The Catholic Monarchs Ferdinand and Isabella, who funded Columbus and finished the Reconquista in 1492.",
    reach: "About 13.7 million km2 - the Americas from California to Tierra del Fuego, the Philippines, the Low Countries and parts of Italy.",
    darkSide: "The conquistadors butchered their way across two continents: Tenochtitlan's siege killed 100,000+ in 1521, Pizarro strangled the Inca state after executing Atahualpa over a roomful of ransom gold. The encomienda system worked indigenous populations to death in mines like Potosi, where millions died; smallpox and measles erased perhaps 90% of the Americas' people within a century - the greatest demographic collapse in human history. The Inquisition burned heretics at home and abroad.",
    deepLore: "Spain's empire was run from a desk in Seville - the Casa de Contratacion licensed every ship, every migrant, every map (its master chart was a state secret). Silver from Potosi and Mexico funded Habsburg wars across Europe and inflated the world economy for a century, then vanished into Dutch and English banks when Spanish debt crashed. The empire's enlightenment came too late: reformers like Charles III modernized too slowly, and when Napoleon kidnapped the Spanish king in 1808, America's colonies declared home rule and never looked back.",
  },
  "napoleonic-empire": {
    builder: "Napoleon Bonaparte, a minor Corsican artillery noble who seized a revolution.",
    reach: "Around 2.1 million km2 directly, with vassals and allies ruling from Barcelona to Warsaw - 44 million subjects at the 1812 peak.",
    darkSide: "The Napoleonic Wars killed 3.5-6 million people across Europe. Spain's Peninsular War saw guerrillas and French reprisals commit mutual atrocities that torched whole provinces. Napoleon restored slavery in the colonies in 1802, triggering a Haitian war of extermination; his failed Russian invasion left perhaps 400,000 of his own men frozen or starved. He crowned himself emperor of a republic he had already strangled.",
    deepLore: "Napoleon's true weapon was not the bayonet but the Code - civil law by merit, not birth, exported to every land his armies crossed and still the backbone of law on four continents. He centralized science (Egyptology was born from his expedition), standardized weights, and sold Louisiana to fund his wars. His genius and his hubris were the same instinct: Austerlitz was won by giving away ground; Moscow was lost the same way. Exiled to Elba, he returned for the Hundred Days - and Waterloo ended 20 years of continental war in one rainy afternoon.",
  },
  "mongol-empire": {
    builder: "Temujin - Genghis Khan - who united the steppe tribes in 1206.",
    reach: "24 million km2, the largest contiguous land empire ever: Korea to Hungary, Siberia to Vietnam, conquered mostly within 70 years.",
    darkSide: "Cities that resisted were annihilated as policy: Nishapur's towers were built of skulls, Merv's massacre killed perhaps 700,000, and Baghdad's fall in 1258 drowned the Tigris in books and blood. Merchants who slighted Genghis triggered wars that depopulated whole regions - Khwarezm lost entire cities. Terror was deliberate logistics: word of massacre emptied the next city without a fight. Entire populations were deported as artisan slaves across the steppe.",
    deepLore: "The Mongols ran the world's first globalization: the Yam postal relay moved mail 300 km a day, paper money crossed borders, and the Pax Mongolica let Marco Polo walk from Venice to Khanbaliq. They practiced religious tolerance centuries before Europe, promoted by merit (including women regents), and their law code - the Yassa - banned steppe feuds under pain of death. The empire broke apart because it was held by personality, not institutions: four khanates drifted into local dynasties, and the Black Death traveled their roads home to Europe.",
  },
  "mughal-empire": {
    builder: "Babur, a Timurid prince exiled from Samarkand, who won Panipat with cannon in 1526.",
    reach: "Around 4 million km2 under Aurangzeb - nearly the whole subcontinent, a quarter of humanity and perhaps 25% of world GDP.",
    darkSide: "Aurangzeb reimposed the jizya tax on Hindus, demolished temples and warred for 26 years in the Deccan, bleeding the treasury white. Succession was open war: Shah Jahan's sons fought so brutally that Aurangzeb executed two brothers and imprisoned his own father for his last eight years above the Taj Mahal. War elephants and scorched-earth campaigns depopulated whole provinces; Rajput and Sikh uprisings were answered with massacres.",
    deepLore: "The Mughals fused three worlds - Persian court culture, Turkic cavalry tradition, and India's own genius - into an empire of the Taj Mahal, Urdu poetry, miniature painting and Mughlai cuisine. Akbar married Rajput princesses, abolished the jizya and ran a faith-agnostic court; his revenue system (the zabti) was so fair it survived the empire. The rot began with Aurangzeb's orthodoxy: Marathas, Sikhs and the British East India Company each ate a slice until 1857, when the last Mughal - a poet-king - was exiled to Rangoon and his sons shot by a British captain.",
  },
  "soviet-union": {
    builder: "Vladimir Lenin's Bolsheviks, who seized the collapsing Russian state in October 1917.",
    reach: "22.4 million km2, one-sixth of the planet, with influence across Eastern Europe, Cuba, Vietnam and half of Africa's revolutions.",
    darkSide: "Stalin's rule killed millions: the Holodomor famine in Ukraine (1932-33) took about 3.5 million, the Great Purge shot 700,000 in two years, and the Gulag archipelago worked 18 million prisoners at any time. The 1939 partition of Poland with Hitler included the Katyn massacre of 22,000 Polish officers. Hungary 1956 and Prague 1968 were crushed by tanks; Afghanistan became its Vietnam.",
    deepLore: "The USSR was history's fastest industrial revolution - from wooden plows to Sputnik in 40 years, at a human cost no democracy could have imposed. It beat the Nazis at Stalingrad and took Berlin, losing 27 million people. Its science schools (mathematics, space, nuclear) remain world-class. But central planning couldn't price a screw: by the 1980s queues, not missiles, defeated it. Gorbachev tried to reform a one-party state into an open one and discovered the contradiction - openness dissolved it in 1,236 days.",
  },
  "russian-empire": {
    builder: "Peter the Great, who westernized the state and beat Sweden at Poltava; Catherine the Great expanded it.",
    reach: "22.8 million km2 by 1866, from Poland to Alaska across eleven time zones, 125 million people by 1897.",
    darkSide: "Serfdom bound the majority until 1861 - decades after the rest of Europe abolished it - and land hunger kept them poor. The Pale of Settlement confined Jews to the west; pogroms were tolerated and sometimes organized. Poland was partitioned out of existence and its 1830 and 1863 uprisings crushed with deportations to Siberia. The Okhrana secret police and the katorga penal system became synonyms of tyranny.",
    deepLore: "Russia's empire was a paradox: a European great power that exported grain worldwide, yet a state where 80% of people could not read their tsar's name. It produced Tolstoy, Dostoevsky, Tchaikovsky and Mendeleev while famine stalked the villages. The Trans-Siberian railway stitched the giant together in 1904 - too late for the war with Japan. WWI broke the state in weeks: bread queues became revolution, and the Romanov 300-year dynasty ended in a cellar in Yekaterinburg.",
  },
  "empire-of-japan": {
    builder: "The Meiji oligarchs - samurai who toppled the shogun in 1868 and industrialized at forced speed.",
    reach: "About 7.4 million km2 at its 1942 height: Korea, Taiwan, Manchuria, coastal China, Southeast Asia and the Pacific islands.",
    darkSide: "The 1937 Nanjing massacre killed 200,000-300,000 Chinese civilians in six weeks; Unit 731 ran biological warfare experiments on living prisoners. The 'comfort women' system enslaved up to 200,000 women across Asia. Korean and Taiwanese subjects were forced into labor and language; the Three Alls policy in China - kill all, burn all, loot all - devastated the north. The end came only after two atomic bombs.",
    deepLore: "Japan did in 40 years what Europe took 400 to do: feudal island to carrier navy. Victory over Russia in 1905 electrified colonized Asia - here was proof Europe could be beaten. The empire's tragedy was structural: the army answered only to the emperor, and young officers assassinated moderating ministers until the state could not stop its own generals. After 1945 the same industriousness rebuilt Japan into an economic superpower under a constitution that renounced war - written in six days by American lawyers.",
  },
  "qing-dynasty": {
    builder: "Nurhaci and his son Hong Taiji, who unified the Manchu tribes; the Ming let them through the Wall in 1644.",
    reach: "13.1 million km2 at its height - Tibet, Xinjiang, Mongolia, Taiwan - China's largest-ever territory and 450 million people by 1900.",
    darkSide: "The conquest massacres of Yangzhou and Jiading set the tone; the Queue Order made haircutting a capital issue. The Dzungar genocide (1755-57) wiped out an entire Mongol people - the word Dzungaria outlived only on maps. Later, the Taiping Rebellion (triggered by Qing misrule) killed 20-30 million, and Empress Dowager Cixi diverted navy funds to rebuild a marble boat while the empire drowned.",
    deepLore: "The Qing was China's most successful dynasty and its most humiliating - both true. Its emperors (Kangxi, Qianlong) ran a multi-ethnic empire with a Manchu core, Confucian administration and steppe diplomacy, doubling the state's size. But it met industrial Europe with a tribute worldview: the Opium Wars, unequal treaties and Hong Kong's loss began the 'Century of Humiliation' that still drives Chinese politics. In 1912 a six-year-old emperor abdicated; two millennia of imperial China ended with a regent's signature.",
  },
};

const NEW_EMPIRES = [
  { slug: "babylonian-empire", name: "Babylonian Empire", emoji: "🧱", years: "1894 BC – 539 BC", capital: "Babylon",
    peak: "Nebuchadnezzar II's Babylon was the largest city on Earth, ringed by walls so thick a chariot could turn on top, home to the Ishtar Gate and the legendary Hanging Gardens.",
    rise: "Hammurabi turned a river town into an empire around 1750 BC with the world's first written law code - 282 rules carved on a black stone pillar. Centuries later Nebuchadnezzar II rebuilt it into the wonder of the ancient world, conquering Jerusalem in 587 BC and marching its elite to exile in Babylon.",
    fall: "In 539 BC Cyrus the Great took Babylon in one night by diverting the Euphrates and walking his army under the walls - as the regent Belshazzar feasted, per the Book of Daniel. Babylon kept blooming under Persians and Greeks until its bricks were carted off to build other cities.",
    legacy: "The 60-minute hour, 360-degree circle, base-60 math, written law, and the epic of Gilgamesh all come from Babylon's scribes.",
    modernCountries: ["IRQ", "SYR", "ISR", "PSE", "JOR", "KWT"], quizFact: "Hammurabi's Code included consumer protection: a builder whose house collapsed and killed the owner was himself put to death.",
    builder: "Hammurabi the lawgiver; Nebuchadnezzar II the builder-king.",
    reach: "Mesopotamia and the Levant - roughly 100,000 km2 - small in land but the intellectual superpower of the ancient Near East for 1,300 years.",
    darkSide: "Jerusalem's two sieges ended with the city burned, the Temple razed and Judah's elite marched to captivity in 587 BC - the Babylonian Exile. Rebellious cities were deported wholesale, their populations swapped like livestock to break identity.", },
  { slug: "hittite-empire", name: "Hittite Empire", emoji: "⚒️", years: "1650 BC – 1178 BC", capital: "Hattusa (near modern Ankara)",
    peak: "The first empire of iron, fielding the chariot armies that fought Egypt's Ramesses II to a standstill at Kadesh (1274 BC) - history's earliest recorded great battle.",
    rise: "An Indo-European people in Anatolia who mastered iron smelting and chariot warfare, the Hittites sacked Babylon in 1595 BC and built a state of fortified rock cities. Their legal code fined crimes instead of maiming - startlingly humane for the Bronze Age.",
    fall: "The Bronze Age Collapse (around 1180 BC) - drought, famine, the Sea Peoples and internal collapse - burned Hattusa and erased the empire within a generation. Scribes stopped writing; the capital lay forgotten for 3,000 years until excavated in 1906.",
    legacy: "Iron working spread to the world from their forges; the Treaty of Kadesh with Egypt is the oldest surviving peace treaty - its copy hangs at the UN.",
    modernCountries: ["TUR", "SYR", "LBN", "ISR"], quizFact: "The Hittites signed the world's first peace treaty - with Egypt - 3,200 years before the United Nations printed a copy.",
    builder: "Kings like Suppiluliuma I and Muwatalli II of the Hattusa dynasty.",
    reach: "Anatolia and northern Syria, about 300,000 km2 - the superpower that checked Egypt and toppled Babylon.",
    darkSide: "Hittite raids deported whole populations to work royal estates, and their succession was a century of fratricide - queen mothers poisoned princes and princes murdered brothers. Sack of Babylon aside, their vassal treaties promised enslavement for rebellion in clause after clause.", },
  { slug: "delhi-sultanate", name: "Delhi Sultanate", emoji: "🕌", years: "1206 – 1526", capital: "Delhi",
    peak: "Five dynasties deep, it ruled nearly the whole subcontinent north of the Deccan and built Delhi into one of the world's largest cities.",
    rise: "Born from the leftovers of Muhammad Ghori's conquest, the slave-general Qutb al-Din Aibak founded a Turkic dynasty in Delhi in 1206. Under Alauddin Khalji the sultanate repelled the Mongols repeatedly, fixed prices by decree and raided the fabled southern kingdoms.",
    fall: "1526: Babur's cannons and cavalry destroyed the last Lodi sultan at Panipat - the same battle that founded the Mughal Empire on the sultanate's bones.",
    legacy: "The Qutb Minar, Indo-Islamic architecture, Urdu's birth from camp languages, and Delhi's rise as India's political center.",
    modernCountries: ["IND", "PAK", "BGD"], quizFact: "Alauddin Khalji's market reforms fixed prices so strictly that a broken weight was punished by cutting an equal piece of flesh from the shopkeeper.",
    builder: "Qutb al-Din Aibak, a Turkic slave who rose to kingship - the Mamluk (slave) dynasty.",
    reach: "Most of the Indian subcontinent at its height, around 2.5 million km2 under Alauddin Khalji.",
    darkSide: "Khalji's Gujarat and Devagiri campaigns enslaved tens of thousands; Mongol prisoners were trampled by elephants. Temple taxation (jizya) and the sack of brilliant cities like Devagiri marked the conquest; Timur's 1398 sack of Delhi - killing 100,000 of its own citizens in a day - came when the sultanate was too weak to stop it.", },
  { slug: "vijayanagara-empire", name: "Vijayanagara Empire", emoji: "🛕", years: "1336 – 1646", capital: "Hampi (Vijayanagara)",
    peak: "Krishnadevaraya's Hampi: a city of 500,000 - larger than any in Europe at the time - of gold-leafed temples, aqueducts and one of the world's great bazaars.",
    rise: "Founded in 1336 by brothers Harihara and Bukka to defend Hindu kingdoms against the Delhi Sultanate's southern raids, Vijayanagara ('City of Victory') grew into a 300-year shield and a golden age of Telugu and Kannada literature.",
    fall: "The Battle of Talikota (1565): five allied sultanates destroyed the army and sacked Hampi for six months. The city was never rebuilt - its stone chariots and temples still stand in ruins, a UNESCO site.",
    legacy: "Hampi's ruins, Carnatic music's patronage, and the survival of southern Hindu political power for two more centuries.",
    modernCountries: ["IND"], quizFact: "Foreign traders wrote that in Hampi's markets diamonds were sold by the heap, not the stone - people simply poured them out like grain.",
    builder: "Brothers Harihara I and Bukka Raya I of the Sangama dynasty.",
    reach: "All of South India and parts of the Deccan, about 500,000 km2 under Krishnadevaraya.",
    darkSide: "Krishnadevaraya's wars against the Bahmani sultanates featured mass executions of captured garrisons; the empire's own succession was rotten - royal sons poisoned fathers and the 1565 defeat ended in the sacking and massacre of Hampi's civilians.", },
  { slug: "ayutthaya-kingdom", name: "Ayutthaya Kingdom (Siam)", emoji: "🛶", years: "1351 – 1767", capital: "Ayutthaya",
    peak: "One of the world's great trading ports: by 1700 Ayutthaya had a million residents - more than London - with Japanese, Persian, Portuguese and Chinese quarters on its canals.",
    rise: "Founded by U Thong in 1351 on the Chao Phraya floodplain, Ayutthaya fused Khmer administration with Thai power, dominating the Malay peninsula and the China trade for 400 years.",
    fall: "In 1767 the Burmese army sacked the city after a 14-month siege, burning the temples and beheading the Buddha images. The court fled south and founded Bangkok - the Chakri dynasty that still reigns.",
    legacy: "Modern Thailand's royal institution, Ayutthaya's ruined temples (a UNESCO site), and the only Southeast Asian state never colonized by Europe.",
    modernCountries: ["THA", "LAO", "KHM"], quizFact: "Ayutthaya's king kept a Japanese samurai bodyguard corps, and one of them - Yamada Nagamasa - became a provincial governor.",
    builder: "King U Thong (Ramathibodi I), a refugee prince who married into Lopburi royalty.",
    reach: "The Chao Phraya basin and the Malay peninsula - tribute from Laos, Cambodia and the Shan states.",
    darkSide: "Court politics were lethal: usurpations killed six dynasties of kings, and succession struggles between princes were settled by elephant duels to the death. Wars with Burma and the Khmer included mass deportations of entire cities' populations to Siam's rice fields.", },
  { slug: "asante-empire", name: "Asante Empire", emoji: "🪙", years: "1701 – 1902", capital: "Kumasi",
    peak: "The gold coast's superpower: a disciplined army of 200,000, a capital of British-comparable street lighting, and the Golden Stool as the living soul of the nation.",
    rise: "Osei Tutu and the priest Okomfo Anokye united the Asante clans around the Golden Stool (1701) and built a federation of tribute states that out-organized every rival on the Guinea coast, controlling the gold and kola trade with Europeans.",
    fall: "Four Anglo-Asante wars; in 1900, when a British governor demanded to sit on the Golden Stool, the Asante went to war one last time under Yaa Asantewaa - a queen mother in her 60s. Britain annexed the empire in 1902.",
    legacy: "Ghana's modern identity, kente cloth, Adinkra symbols, and the Golden Stool - never surrendered, still enthroned in Kumasi.",
    modernCountries: ["GHA", "CIV"], quizFact: "The Golden Stool was never sat on - not even by kings - and when the British demanded it in 1900, the Asante went to war rather than hand it over.",
    builder: "Osei Tutu with the priest Okomfo Anokye, who 'conjured' the Golden Stool from the sky.",
    reach: "About 250,000 km2 of West Africa's gold forests, from the Volta to the Ivory Coast.",
    darkSide: "Asante's power ran on tribute and terror: rebellious vassals were sacrificed in mass ceremonies (human sacrifice at royal funerals reached the hundreds), and the state raided neighbors for captives to work gold fields and trade with coastal slavers.", },
  { slug: "kingdom-of-benin", name: "Kingdom of Benin", emoji: "🐆", years: "1180 – 1897", capital: "Benin City",
    peak: "Benin City in 1691: walls four times longer than the Great Wall of China in combined length, streets lit at night by palm-oil lamps - Europe's envoys called it 'Great Benin'.",
    rise: "The Edo kingdom grew from the 12th century into West Africa's artistic superpower, its brass plaques and heads (cast by the guild of bronze-smiths since the 1200s) documenting 700 years of kings and conquests.",
    fall: "The 1897 British punitive expedition: troops burned the city and looted thousands of brasses and ivories, which now sit in museums across Europe and America. The Oba was exiled; the monarchy survives today as a traditional throne.",
    legacy: "The Benin Bronzes - among the greatest artworks ever made in Africa - and the current global debate over returning looted heritage.",
    modernCountries: ["NGA"], quizFact: "Benin City's earthworks stretched 16,000 km - four times the length of the Great Wall of China - enclosing a city that impressed Portuguese visitors more than Lisbon.",
    builder: "The Oba dynasty, said to descend from Ife's Oduduwa lineage - consolidated by Oba Ewuare the Great in the 1400s.",
    reach: "The Edo forest belt between the Niger and Lagos, trading pepper, cloth and ivory to Portugal and the Netherlands.",
    darkSide: "Benin was a slave-trading partner of the Atlantic trade for two centuries, and its court ritually sacrificed servants at royal funerals. Its prosperity rested on the same human commerce that emptied the African coast.", },
  { slug: "kievan-rus", name: "Kievan Rus", emoji: "🛡️", years: "882 – 1240", capital: "Kiev (Novgorod first)",
    peak: "Under Yaroslav the Wise (1019-1054) Kiev had 400 churches, Europe's largest library east of Constantinople, and marriage alliances with France, Norway and Hungary.",
    rise: "Viking princes (the Rus) sailing the river routes fused with Slavic trade towns: Oleg took Kiev in 882, and Rus' grew into a federation of principalities from the Baltic to the Black Sea. Vladimir the Great adopted Byzantine Christianity in 988 - the baptism that made Russia, Ukraine and Belarus Orthodox.",
    fall: "The Mongols: Batu Khan's 1237-1240 campaign burned Vladimir, Kiev and a dozen cities - Kiev's Cathedral of the Tithes collapsed under refugees. The northeast principalities survived as Mongol tributaries, birthing Muscovy; the west turned to Lithuania and Poland.",
    legacy: "The shared birth myth of Russia, Ukraine and Belarus; the Orthodox faith; and the word 'tsar' from Caesar.",
    modernCountries: ["UKR", "RUS", "BLR", "MDA"], quizFact: "When Kiev fell to the Mongols in 1240, escaping refugees brought tales so dire that Europe feared 'the Tartars' were the apocalypse's army.",
    builder: "Prince Oleg of Novgorod and the Rurikid dynasty that followed him.",
    reach: "About 1.3 million km2 of river-linked forest and steppe from Ladoga to the Black Sea.",
    darkSide: "The princely system ran on succession wars - brothers blinded cousins and burned their towns as routine policy (a blinded prince could not rule). Slavic and Turkic captives were exported down the rivers to Byzantine and Caspian slave markets for centuries.", },
  { slug: "serbian-empire", name: "Serbian Empire", emoji: "🦅", years: "1346 – 1371", capital: "Skopje, Prizren",
    peak: "Stefan Dusan the Mighty ruled from the Danube to the Gulf of Corinth - the most powerful Balkan state since Byzantium, with its own law code (Dusan's Code) and a crowned emperor.",
    rise: "Rising as Byzantium weakened, Dusan conquered Macedonia, Albania, Epirus and Thessaly in 20 years, had himself crowned 'Emperor of Serbs and Greeks' in 1346, and was planning to take Constantinople itself.",
    fall: "Dusan died suddenly (possibly poisoned) in 1355 mid-campaign. His empire split between feuding lords, and in 1371 the Ottoman army destroyed the Serbian nobility at the Maritsa river - the Ottoman doorstep into Europe.",
    legacy: "Dusan's Code, Serbian medieval monasteries (UNESCO sites), and the memory of the empire that anchors Serbian national identity.",
    modernCountries: ["SRB", "MKD", "ALB", "MNE", "BIH", "GRC"], quizFact: "Dusan's Code had 201 articles - including bans on bribery of judges and protections for villagers against raiding soldiers, 600 years ago.",
    builder: "Stefan Dusan the Mighty of the Nemanjic dynasty.",
    reach: "About 180,000 km2 across the central Balkans and northern Greece.",
    darkSide: "Dusan's conquests depopulated Greek cities with deportations; his law code prescribed mutilation for bandits and burning for heretics. After his death, his half-brother and lords fought civil wars - and invited Ottoman troops as mercenaries, opening Europe's door to them.", },
  { slug: "congo-free-state", name: "Congo Free State", emoji: "🩸", years: "1885 – 1908", capital: "Boma",
    peak: "King Leopold II's private possession - 2.3 million km2 run as one man's company, extracting rubber and ivory with an army of 19,000 African soldiers.",
    rise: "Leopold II of Belgium grabbed the Congo basin under the guise of a humanitarian 'International African Association' at the 1884 Berlin Conference, and ran it as personal property - not a Belgian colony - until 1908.",
    fall: "The Casement Report (1904) and missionary photographs of mutilated hands shocked the world; in 1908 even the Belgian parliament took it over. Estimates of the death toll from murder, famine, disease and collapsed birth rates range from 1 to 15 million.",
    legacy: "The 20th century's first great human-rights campaign, Heart of Darkness, and a Congolese trauma that shaped its politics to today.",
    modernCountries: ["COD", "COG"], quizFact: "Soldiers in Leopold's Congo had to present a severed hand per bullet used - proof they hadn't 'wasted' ammunition on hunting.",
    builder: "Leopold II, King of the Belgians - as a private business venture disguised as philanthropy.",
    reach: "The entire Congo basin, 76 times the size of Belgium.",
    darkSide: "The rubber regime took hostages (usually women and children) against village quotas, cut hands and noses as punishment, and burned villages. Missionaries documented villages of one-handed adults. Populations in some regions fell by half - Leopold became rich while the world's first photo-atrocity campaign formed against him.", },
];

for (const [slug, fields] of Object.entries(F)) {
  const e = d.find(x => x.slug === slug);
  if (!e) { console.log("skip (not found):", slug); continue; }
  Object.assign(e, fields);
}
for (const n of NEW_EMPIRES) {
  if (!d.find(x => x.slug === n.slug)) d.push(n);
}
fs.writeFileSync("data/empires.json", JSON.stringify(d, null, 1));
console.log("empires now:", d.length, "| enriched:", Object.keys(F).length, "| added:", NEW_EMPIRES.length);

// validate
const codes = new Set(require("./data/countries.json").map(c => c.cca3));
const bad = d.flatMap(e => e.modernCountries.filter(c => !codes.has(c)));
console.log("badCodes:", bad.join(",") || "none");
