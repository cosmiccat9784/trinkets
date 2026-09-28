const FACTS = [
  "Honey almost never goes bad. Sealed pots found in ancient Egyptian tombs were still edible after thousands of years.",
  "Octopuses have three hearts, and two of them stop beating when they swim.",
  "A group of flamingos is called a flamboyance.",
  "Bananas are berries, botanically speaking. Strawberries are not.",
  "Wombats produce cube-shaped droppings. They are the only known animal to do so.",
  "Sharks are older than trees, older than Saturn's rings, and older than the North Star.",
  "Oxford University is older than the Aztec Empire.",
  "A single day on Venus lasts longer than an entire year there.",
  "Sloths can hold their breath for up to 40 minutes, longer than dolphins can.",
  "The Eiffel Tower grows about 15 centimetres taller in the summer heat.",
  "Scotland's national animal is the unicorn.",
  "Cows have best friends, and get visibly stressed when separated from them.",
  "Sea otters hold hands while they sleep so they don't drift apart.",
  "A bolt of lightning is about five times hotter than the surface of the Sun.",
  "Humans share about 60% of their genes with bananas.",
  "There are more possible games of chess than atoms in the observable universe.",
  "The shortest war in history lasted roughly 38 minutes.",
  "Cleopatra lived closer in time to the Moon landing than to the building of the Great Pyramid.",
  "Under the right conditions, hot water can freeze faster than cold water. Physicists still argue about why.",
  "A group of crows is called a murder.",
  "Butterflies taste with their feet.",
  "Some turtles can breathe through their backsides.",
  "The Moon has moonquakes.",
  "Neptune has finished just one full orbit of the Sun since it was discovered.",
  "Your brain burns roughly 20% of your body's energy.",
  "Some snails can sleep for up to three years.",
  "By weight, some spider silks are tougher than steel.",
  "The dot over a lowercase i or j has a name: a tittle.",
  "Bookkeeper is one of the only common English words with three pairs of double letters in a row.",
  "Flamingos are born grey. They turn pink from the food they eat.",
  "A blue whale's heart can weigh over 400 pounds and beat as slowly as twice a minute on a deep dive.",
  "Kangaroos cannot walk backwards.",
  "The inventor of the Pringles can had his ashes buried in one.",
  "Bubble wrap was originally invented as textured wallpaper.",
  "The average person will walk about 100,000 miles in a lifetime, roughly four laps around the equator.",
  "Vending machines injure more people each year than sharks do.",
  "It is physically impossible to hum with your nose and mouth both closed.",
  "Peanuts have been used to make dynamite. Their oil can be processed into glycerol, a key ingredient.",
  "All the gold ever mined would fit into about three Olympic swimming pools.",
  "Cats cannot taste sweetness.",
  "Dolphins sleep with one half of their brain awake at a time.",
  "The English word with the most dictionary definitions is 'set', with over 400.",
  "A crocodile cannot stick its tongue out.",
  "The Twitter bird had an official name: Larry, after a basketball player.",
  "Nintendo was founded in 1889 to make hand-painted playing cards.",
  "The first computer 'bug' was a real moth, taped into a Harvard logbook in 1947.",
  "Astronauts on the space station see about 16 sunrises every day.",
  "A sugar-cube-sized chunk of neutron star would weigh about a billion tonnes.",
  "The longest recorded chicken flight lasted 13 seconds.",
  "A reindeer's eyes turn blue in winter to catch more light.",
  "There are more trees on Earth than stars in the Milky Way.",
  "Your stomach grows a fresh lining every three to four days, so it doesn't digest itself.",
  "An average puffy cloud weighs over a million pounds, heavier than a hundred elephants.",
  "Rats giggle in ultrasound when you tickle them.",
  "New car smell is mostly glue and plastic slowly gassing off.",
  "Antarctica is technically the largest desert on Earth.",
  "A day on Mercury, sunrise to sunrise, is longer than its whole year.",
  "Bees can learn to recognise human faces.",
  "The plastic tip of a shoelace is called an aglet.",
  "Cheetahs cannot roar. They chirp and meow instead.",
  "The longest fingernails ever measured stretched more than 8 metres combined.",
  "Humans glow. Our bodies emit visible light, about a thousand times too faint to see.",
  "The Eiffel Tower was first offered to Barcelona, who turned it down.",
  "One species of jellyfish can revert to a baby and start life over, potentially forever.",
  "The Great Wall of China is not visible from space with the naked eye.",
  "A goldfish's memory lasts months, not three seconds.",
  "Bats are the only mammals capable of true flight.",
  "Avocados contain more potassium than bananas do.",
  "The average person spends about six months of life waiting at red lights.",
  "A baker's dozen is 13, because medieval bakers could be punished for short-changing customers.",
  "A shrimp's heart sits in its head.",
  "Starfish have no brain and no blood.",
  "The word ketchup may come from a Hokkien word for fish sauce.",
  "Iceland has no mosquitoes at all.",
  "A single lightning bolt holds enough energy to toast around 100,000 slices of bread.",
  "Your ears and nose never stop growing.",
  "The King of Hearts is the only king without a moustache in a standard deck.",
  "There are more stars in the universe than grains of sand on all of Earth's beaches.",
  "The first thing ever sold on eBay was a broken laser pointer, for $14.83.",
  "Some penguins can leap about 6 feet straight out of the water.",
  "Your eyes are closed for roughly 10% of your waking hours, just from blinking.",
  "A group of pandas is called an embarrassment.",
  "The loudest sound in recorded history was Krakatoa in 1883, heard 3,000 miles away.",
  "Carrots were originally purple. Orange ones were bred later by Dutch farmers.",
  "A woodpecker can peck around 20 times per second.",
  "Your body holds enough iron to forge a small nail.",
  "Dreamt is one of the only English words that ends in the letters mt.",
  "The longest place name in common use has 85 letters and belongs to a hill in New Zealand.",
  "An octopus squirts ink that dulls a predator's sense of smell as well as its sight.",
  "A chameleon's tongue can be twice as long as its body.",
  "The Moon is drifting away from Earth by about 4 centimetres a year.",
  "The average person spends around 26 years of life asleep.",
  "Scissors were invented in ancient Egypt, around 1500 BC.",
  "Wood frogs can freeze solid in winter and thaw out alive in spring.",
  "Giraffes have exactly the same number of neck bones as humans: seven.",
  "The hashtag symbol's proper name is the octothorpe.",
  "Honeybees can be trained to count to four.",
  "The first webcam was built to check whether the office coffee pot was full.",
  "There is a basketball court on the top floor of the US Supreme Court building.",
  "A standard pencil can draw a line about 35 miles long.",
  "Some sea stars can rebuild a whole body from a single arm plus a fragment of its middle.",
  "Cheese is reportedly the most shoplifted food in the world.",
  "The human nose can detect at least a trillion different scents.",
  "The word robot comes from a Czech word for forced labour, coined in a 1920 play.",
  "A wombat's pouch faces backwards so digging doesn't fill it with dirt.",
  "The world's shortest scheduled flight lasts about 90 seconds, between two Scottish islands.",
  "Your fingernails grow roughly three and a half centimetres a year.",
  "Every possible shuffle of a deck of cards has almost certainly never happened before. The combinations dwarf the seconds since the Big Bang.",
  "You produce about 25,000 quarts of saliva in a lifetime, enough to fill two swimming pools.",
  "Cows give more milk when they listen to slow, soothing music.",
  "Oranges grown in warm climates can stay green even when fully ripe.",
  "Opposite faces of a die always add up to seven.",
  "Tug of war used to be an Olympic sport, from 1900 to 1920.",
  "Some penguins propose to their mates with a pebble.",
  "The human eye can tell apart around 10 million different colours.",
  "The word quarantine comes from the Italian for forty days, the isolation period for arriving ships.",
  "Butterflies can see ultraviolet light, invisible to us.",
  "The longest bout of hiccups on record lasted 68 years.",
  "Squirrels plant far more trees than they mean to, by forgetting buried acorns.",
  "The first alarm clock could only ring at one time: 4am.",
  "Uranus rolls around the Sun on its side, tilted 98 degrees.",
  "You shed hundreds of thousands of skin flakes every hour.",
  "The word muscle comes from the Latin for little mouse, because a flexed bicep looks like one.",
  "Honeybees tell each other where flowers are by dancing.",
  "A typical car is made of around 30,000 parts.",
  "The word nice originally meant foolish.",
  "The first message sent over the internet was just 'LO'. The system crashed before 'LOGIN' finished.",
  "The average yawn lasts about six seconds.",
  "A group of hedgehogs is called a prickle.",
  "Alphabet comes from alpha and beta, the first two Greek letters.",
  "Uncoiled, the DNA in your body would stretch to the Sun and back hundreds of times.",
  "The average person spends about three months of life sitting on the toilet.",
  "The first vending machine dispensed holy water, in ancient Alexandria.",
  "The word clue comes from clew, a ball of thread like the one that guided Theseus out of the maze.",
  "You take around 20,000 breaths a day.",
  "The first computer mouse was carved out of wood.",
  "Your heart will beat roughly two and a half billion times in your lifetime.",
  "The sandwich is named after an Earl who wanted to eat without leaving the card table.",
  "Your feet house hundreds of thousands of sweat glands, more per inch than anywhere else on you.",
  "A group of zebras is called a dazzle.",
  "A group of owls is called a parliament.",
  "Stomach acid is strong enough to corrode some metals.",
  "The Frisbee began life as an empty pie tin from the Frisbie Pie Company.",
  "The word salary is often linked to the salt once issued to Roman soldiers.",
  "A group of rhinos is called a crash.",
  "Your tongue print is unique, like a fingerprint.",
  "An Alaskan town once had a cat as its honorary mayor for 20 years."
];

(function initFactsMachine() {
  const text = document.querySelector("#factText");
  const button = document.querySelector("#factButton");
  const reset = document.querySelector("#factReset");
  const count = document.querySelector("#factCount");
  if (!text || !button) return;
  const DECK_KEY = "trinkets-facts-deck-v1";
  let deck = null;
  try {
    const raw = JSON.parse(localStorage.getItem(DECK_KEY));
    if (Array.isArray(raw)) deck = raw.filter((i) => Number.isInteger(i) && i >= 0 && i < FACTS.length);
  } catch (err) {
    deck = null;
  }
  if (!deck || deck.length === 0) {
    deck = shuffleArray(FACTS.map((_, i) => i));
  }

  function save() {
    try {
      localStorage.setItem(DECK_KEY, JSON.stringify(deck));
    } catch (err) {}
  }

  function showCount() {
    const seen = FACTS.length - deck.length;
    count.textContent = deck.length === 0 ? `All ${FACTS.length} seen. Show-off.` : `${seen} of ${FACTS.length} seen`;
  }

  function swapText(next) {
    text.classList.add("swap");
    setTimeout(() => {
      text.textContent = next;
      text.classList.remove("swap");
    }, 160);
  }

  function next() {
    if (deck.length === 0) return;
    const index = deck.splice(Math.floor(Math.random() * deck.length), 1)[0];
    save();
    swapText(FACTS[index]);
    if (button.textContent !== "Tell me another") button.textContent = "Tell me another";
    showCount();
    if (deck.length === 0) {
      button.disabled = true;
      button.textContent = "No more facts";
      reset.hidden = false;
    }
  }

  button.addEventListener("click", next);
  reset.addEventListener("click", () => {
    deck = shuffleArray(FACTS.map((_, i) => i));
    save();
    button.disabled = false;
    button.textContent = "Tell me a fact";
    reset.hidden = true;
    showCount();
    swapText("Deck reshuffled. The facts remember nothing, and neither do we.");
  });
  save();
  showCount();
})();
