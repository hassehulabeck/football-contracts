import { PrismaClient, League } from '@prisma/client';

const prisma = new PrismaClient();

// External IDs are placeholder values. Phase 5 (API-Football integration) will replace
// them with real api-football.com team IDs fetched from the league rosters endpoint.
const teams: Array<{ externalId: number; name: string; league: League }> = [
  // Allsvenskan — men's top division
  { externalId: 1001, name: 'AIK', league: 'ALLSVENSKAN' },
  { externalId: 1002, name: 'IF Elfsborg', league: 'ALLSVENSKAN' },
  { externalId: 1003, name: 'Malmö FF', league: 'ALLSVENSKAN' },
  { externalId: 1004, name: 'Djurgårdens IF', league: 'ALLSVENSKAN' },
  { externalId: 1005, name: 'BK Häcken', league: 'ALLSVENSKAN' },
  { externalId: 1006, name: 'Hammarby IF', league: 'ALLSVENSKAN' },
  { externalId: 1007, name: 'IFK Göteborg', league: 'ALLSVENSKAN' },
  { externalId: 1008, name: 'IFK Norrköping', league: 'ALLSVENSKAN' },
  { externalId: 1009, name: 'Kalmar FF', league: 'ALLSVENSKAN' },
  { externalId: 1010, name: 'Värnamo', league: 'ALLSVENSKAN' },
  { externalId: 1011, name: 'Halmstads BK', league: 'ALLSVENSKAN' },
  { externalId: 1012, name: 'Mjällby AIF', league: 'ALLSVENSKAN' },

  // Superettan — men's second division
  { externalId: 1101, name: 'Örebro SK', league: 'SUPERETTAN' },
  { externalId: 1102, name: 'Helsingborgs IF', league: 'SUPERETTAN' },
  { externalId: 1103, name: 'GIF Sundsvall', league: 'SUPERETTAN' },
  { externalId: 1104, name: 'Degerfors IF', league: 'SUPERETTAN' },
  { externalId: 1105, name: 'Örgryte IS', league: 'SUPERETTAN' },
  { externalId: 1106, name: 'Jönköpings Södra IF', league: 'SUPERETTAN' },
  { externalId: 1107, name: 'Landskrona BK', league: 'SUPERETTAN' },
  { externalId: 1108, name: 'Trelleborgs FF', league: 'SUPERETTAN' },

  // OBOS Damallsvenskan — women's top division
  { externalId: 1201, name: 'FC Rosengård', league: 'DAMALLSVENSKAN' },
  { externalId: 1202, name: 'Linköpings FC', league: 'DAMALLSVENSKAN' },
  { externalId: 1203, name: 'BK Häcken Women', league: 'DAMALLSVENSKAN' },
  { externalId: 1204, name: 'Djurgårdens IF Women', league: 'DAMALLSVENSKAN' },
  { externalId: 1205, name: 'Hammarby IF Women', league: 'DAMALLSVENSKAN' },
  { externalId: 1206, name: 'Kristianstads DFF', league: 'DAMALLSVENSKAN' },
  { externalId: 1207, name: 'IK Uppsala', league: 'DAMALLSVENSKAN' },
  { externalId: 1208, name: 'Vittsjö GIK', league: 'DAMALLSVENSKAN' },

  // Elitettan — women's second division
  { externalId: 1301, name: 'Göteborg FC', league: 'ELITETTAN' },
  { externalId: 1302, name: 'Kungsbacka DFF', league: 'ELITETTAN' },
  { externalId: 1303, name: 'FC Husqvarna', league: 'ELITETTAN' },
  { externalId: 1304, name: 'Umeå IK', league: 'ELITETTAN' },
  { externalId: 1305, name: 'Örebro SK Women', league: 'ELITETTAN' },
  { externalId: 1306, name: 'Helsingborgs IF Women', league: 'ELITETTAN' },
  { externalId: 1307, name: 'Sunnanå SK', league: 'ELITETTAN' },
  { externalId: 1308, name: 'Lidköpings FK', league: 'ELITETTAN' },
];

async function main() {
  for (const team of teams) {
    await prisma.team.upsert({
      where: { externalId: team.externalId },
      update: { name: team.name, league: team.league },
      create: team,
    });
  }
  console.log(`Seeded ${teams.length} teams across 4 leagues`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
