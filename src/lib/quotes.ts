// The house quotes — one shows at a time in the right rail, shuffled, rotating
// slowly enough that seeing a repeat means you really stayed a while.
//
// RYAN: add your own lines here anytime. attribution: null renders the line
// alone, as the site's own voice. Keep them Dickinson/Thoreau, never Robbins.

export type Quote = { text: string; attribution: string | null }

export const QUOTES: Quote[] = [
  { text: 'There are no lines.', attribution: null },
  { text: 'Made by hand, on our own machines, for each other.', attribution: null },
  { text: 'I dwell in Possibility —', attribution: 'Emily Dickinson' },
  {
    text: 'If a man does not keep pace with his companions, perhaps it is because he hears a different drummer.',
    attribution: 'Henry David Thoreau',
  },
  {
    text: 'The powerful play goes on, and you may contribute a verse.',
    attribution: 'Walt Whitman',
  },
  { text: 'All art is quite useless.', attribution: 'Oscar Wilde' },
  {
    text: 'The purpose of art is to lay bare the questions that have been hidden by the answers.',
    attribution: 'James Baldwin',
  },
  {
    text: 'We live in capitalism. Its power seems inescapable. So did the divine right of kings.',
    attribution: 'Ursula K. Le Guin',
  },
  {
    text: 'The arts are not a way to make a living. They are a very human way of making life more bearable.',
    attribution: 'Kurt Vonnegut',
  },
  {
    text: 'The role of the artist is to make the revolution irresistible.',
    attribution: 'Toni Cade Bambara',
  },
  {
    text: 'Have nothing in your houses that you do not know to be useful, or believe to be beautiful.',
    attribution: 'William Morris',
  },
  { text: 'No bird soars too high, if he soars with his own wings.', attribution: 'William Blake' },
  {
    text: 'Another world is not only possible, she is on her way. On a quiet day, I can hear her breathing.',
    attribution: 'Arundhati Roy',
  },
  { text: 'Art is the nearest thing to life.', attribution: 'George Eliot' },
  {
    text: 'The most regretful people on earth are those who felt the call to creative work, who felt their own creative power restive and uprising, and gave to it neither power nor time.',
    attribution: 'Mary Oliver',
  },
  { text: 'What is done in love is done well.', attribution: 'Vincent van Gogh' },
]
