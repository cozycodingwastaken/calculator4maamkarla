const roster = [
  { character: "Scorpion", variations: ["Ninjutsu", "Hellfire", "Inferno"] },
  { character: "Sub-Zero", variations: ["Grandmaster", "Cryomancer", "Unbreakable"] },
  { character: "Raiden", variations: ["Thunder God", "Displacer", "Master of Storms"] },
  { character: "Liu Kang", variations: ["Dragon's Fire", "Flame Fist", "Dualist"] },
  { character: "Kung Lao", variations: ["Tempest", "Buzz Saw", "Hat Trick"] },
  { character: "Johnny Cage", variations: ["A-List", "Fisticuffs", "Stunt Double"] },
  { character: "Sonya Blade", variations: ["Demolition", "Covert Ops", "Special Forces"] },
  { character: "Jax", variations: ["Wrestler", "Heavy Weapons", "Pumped Up"] },
  { character: "Cassie Cage", variations: ["Hollywood", "Spec Ops", "Brawler"] },
  { character: "Jacqui Briggs", variations: ["Shotgun", "High Tech", "Full Auto"] },
  { character: "Kenshi", variations: ["Balanced", "Possessed", "Kenjutsu"] },
  { character: "Kitana", variations: ["Royal Storm", "Assassin", "Mournful"] },
  { character: "Mileena", variations: ["Piercing", "Ravenous", "Ethereal"] },
  { character: "Tanya", variations: ["Kobu Jutsu", "Pyromancer", "Dragon Naginata"] },
  { character: "Takeda", variations: ["Ronin", "Shirai Ryu", "Lasher"] },
  { character: "Erron Black", variations: ["Gunslinger", "Marksman", "Outlaw"] },
  { character: "Kotal Kahn", variations: ["War God", "Blood God", "Sun God"] },
  { character: "Ferra/Torr", variations: ["Vicious", "Ruthless", "Lackey"] },
  { character: "D'Vorah", variations: ["Swarm Queen", "Venomous", "Brood Mother"] },
  { character: "Reptile", variations: ["Noxious", "Deceptive", "Nimble"] },
  { character: "Ermac", variations: ["Mystic", "Master of Souls", "Spectral"] },
  { character: "Quan Chi", variations: ["Summoner", "Sorcerer", "Warlock"] },
  { character: "Shinnok", variations: ["Impostor", "Bone Shaper", "Necromancer"] },
  { character: "Kano", variations: ["Cutthroat", "Cybernetic", "Commando"] },
  { character: "Goro", variations: ["Kuatan Warrior", "Tigrar Fury", "Dragon Fangs"] },
  { character: "Tremor", variations: ["Crystalline", "Aftershock", "Metallic"] },
  { character: "Bo' Rai Cho", variations: ["Dragon Breath", "Drunken Master", "Bartitsu"] },
  { character: "Triborg", variations: ["Sektor (LK-9T9)", "Cyrax (LK-4D4)", "Smoke (LK-7T2)", "Cyber Sub-Zero (LK-520)"] },
  { character: "Alien", variations: ["Acidic", "Tarkatan", "Konjurer"] },
  { character: "Predator", variations: ["Hish-Qu-Ten", "Warrior", "Hunter"] },
  { character: "Leatherface", variations: ["Killer", "Butcher", "Pretty Lady"] },
  { character: "Jason Voorhees", variations: ["Unstoppable", "Relentless", "Slasher"] }
];

const characterName = document.getElementById("characterName");
const variationName = document.getElementById("variationName");
const resultBox = document.getElementById("resultBox");
const pickBtn = document.getElementById("pickBtn");
const resetBtn = document.getElementById("resetBtn");

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickRandomFighter() {
  const fighter = randomItem(roster);
  const variation = randomItem(fighter.variations);

  characterName.textContent = fighter.character;
  variationName.textContent = variation;

  resultBox.classList.remove("flash");
  // Trigger a small animation each pick.
  void resultBox.offsetWidth;
  resultBox.classList.add("flash");
}

function resetPicker() {
  characterName.textContent = "-";
  variationName.textContent = "-";
  resultBox.classList.remove("flash");
}

pickBtn.addEventListener("click", pickRandomFighter);
resetBtn.addEventListener("click", resetPicker);
