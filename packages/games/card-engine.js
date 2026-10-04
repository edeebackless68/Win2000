export const suits = ["♠", "♥", "♣", "♦"];
export const cardColor = (c) =>
  c.suit === 1 || c.suit === 3 ? "red" : "black";
export const cardRank = (c) =>
  ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"][
    c.rank
  ];
export function createDeck(random = Math.random) {
  const deck = suits.flatMap((_, suit) =>
    Array.from({ length: 13 }, (_, i) => ({
      suit,
      rank: i + 1,
      up: false,
      id: suit * 13 + i,
    })),
  );
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
export function canStack(card, target) {
  return target
    ? cardColor(card) !== cardColor(target) && card.rank === target.rank - 1
    : card.rank === 13;
}
export function canFoundation(card, pile) {
  return pile.length
    ? pile.at(-1).suit === card.suit && card.rank === pile.at(-1).rank + 1
    : card.rank === 1;
}
